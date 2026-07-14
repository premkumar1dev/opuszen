/**
 * Gateway Service
 * The core proxy engine: routes requests through master keys with automatic failover.
 *
 * Flow:
 * 1. Validate user API key
 * 2. Select best master key by priority
 * 3. Forward request to provider
 * 4. On failure (429/5xx/timeout/quota), mark key, try next
 * 5. Log everything
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import type {
 MasterApiKeyRow,
 MasterApiKeyStats,
 UserApiKeyRow,
 GatewayRequestContext,
 GatewayResponseContext,
 FailoverEvent,
 ChatCompletionResponse,
 ChatCompletionRequest,
 TokenUsage,
 ProviderConfig,
} from "~/types/gateway";
import {
 selectBestMasterKey,
 markMasterKeyFailed,
 markMasterKeySuccess,
 markMasterKeyRateLimited,
 markMasterKeyQuotaExhausted,
 getMasterKeyStats,
 getAllMasterKeys,
 getMasterKeyById,
} from "~/utils/master-key-service";
import {
 validateUserApiKey,
 recordUserKeyUsage,
} from "~/utils/user-key-service";
import { logApiRequest, logFailover } from "~/utils/logging-service";
import { recordHealthSuccess, recordHealthFailure, runHealthCheck } from "~/utils/health-service";
import { calculateCredits, estimateTokens, recordUsage } from "~/utils/usage-service";
import { getGatewayConfig } from "~/utils/gateway-config";

// ---------------------------------------------------------------------------
// Provider configurations
// ---------------------------------------------------------------------------
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
 OpenAI: {
 name: 'OpenAI',
 baseUrl: 'https://api.openai.com/v1',
 authHeader: 'Authorization',
 modelsEndpoint: '/models',
 supportsStreaming: true,
 tokenPricing: {},
 },
 Anthropic: {
 name: 'Anthropic',
 baseUrl: 'https://api.anthropic.com/v1',
 authHeader: 'x-api-key',
 modelsEndpoint: '/messages',
 supportsStreaming: true,
 tokenPricing: {},
 },
 Google: {
 name: 'Google',
 baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
 authHeader: 'x-goog-api-key',
 modelsEndpoint: '/models',
 supportsStreaming: true,
 tokenPricing: {},
 },
 Groq: {
 name: 'Groq',
 baseUrl: 'https://api.groq.com/openai/v1',
 authHeader: 'Authorization',
 modelsEndpoint: '/models',
 supportsStreaming: true,
 tokenPricing: {},
 },
 Mistral: {
 name: 'Mistral',
 baseUrl: 'https://api.mistral.ai/v1',
 authHeader: 'Authorization',
 modelsEndpoint: '/models',
 supportsStreaming: true,
 tokenPricing: {},
 },
 Cohere: {
 name: 'Cohere',
 baseUrl: 'https://api.cohere.ai/v1',
 authHeader: 'Authorization',
 modelsEndpoint: '/models',
 supportsStreaming: true,
 tokenPricing: {},
 },
 opuslive: {
 name: 'opuslive',
 baseUrl: 'https://api.opusmax.live/v1',
 authHeader: 'Authorization',
 modelsEndpoint: '/models',
 supportsStreaming: true,
 tokenPricing: {},
 },
};

function getProviderConfig(provider: string): ProviderConfig {
 return PROVIDER_CONFIGS[provider] ?? PROVIDER_CONFIGS['OpenAI'];
}

// ---------------------------------------------------------------------------
// Error classification — determines whether to failover
// ---------------------------------------------------------------------------
function shouldFailover(statusCode: number, error: string): boolean {
 if (statusCode === 429) return true;
 if (statusCode === 402) return true;
 if (statusCode === 413) return true;
 if (statusCode >= 500 && statusCode < 600) return true;

 const lower = error.toLowerCase();
 if (lower.includes('rate limit')) return true;
 if (lower.includes('quota')) return true;
 if (lower.includes('exceeded')) return true;
 if (lower.includes('timeout')) return true;
 if (lower.includes('overloaded')) return true;
 if (lower.includes('capacity')) return true;
 if (lower.includes('temporarily')) return true;
 if (lower.includes('api key disabled')) return true;
 if (lower.includes('invalid_api_key')) return true;

 return false;
}

// ---------------------------------------------------------------------------
// Extract usage from provider response
// ---------------------------------------------------------------------------
function extractUsage(responseBody: any, model: string): TokenUsage {
 const usage = responseBody?.usage;
 if (!usage) return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
 // Handle both camelCase (our type) and snake_case (OpenAI/Groq/Mistral raw response)
 return {
  promptTokens: usage.promptTokens ?? usage.prompt_tokens ?? 0,
  completionTokens: usage.completionTokens ?? usage.completion_tokens ?? 0,
  totalTokens: usage.totalTokens ?? usage.total_tokens ?? 0,
 };
}

// ---------------------------------------------------------------------------
// Transform OpenAI-compatible request to provider format
// ---------------------------------------------------------------------------
function buildProviderHeaders(
 provider: string,
 masterKey: MasterApiKeyRow
): Record<string, string> {
 const config = getProviderConfig(provider);
 const headers: Record<string, string> = {
  'Content-Type': 'application/json',
 };

 if (provider === 'Anthropic') {
  headers['x-api-key'] = masterKey.api_key;
  headers['anthropic-version'] = '2023-06-01';
  headers['anthropic-dangerous-direct-browser-access'] = 'true';
 } else {
  headers[config.authHeader] = `Bearer ${masterKey.api_key}`;
 }

 return headers;
}

// ---------------------------------------------------------------------------
// Build request URL
// ---------------------------------------------------------------------------
function buildProviderUrl(provider: string, model: string): string {
 const config = getProviderConfig(provider);

 if (provider === 'Anthropic') {
  return `${config.baseUrl}/messages`;
 }

 return `${config.baseUrl}/chat/completions`;
}

// ---------------------------------------------------------------------------
// Transform request for provider
// ---------------------------------------------------------------------------
function transformRequestBody(
 provider: string,
 request: ChatCompletionRequest
): Record<string, any> {
 if (provider === 'Anthropic') {
  const systemMsg = request.messages.filter((m) => m.role === 'system');
  const otherMsgs = request.messages.filter((m) => m.role !== 'system');

  return {
   model: request.model,
   max_tokens: request.max_tokens ?? 4096,
   temperature: request.temperature ?? 0.7,
   system: systemMsg.length > 0 ? systemMsg[0].content : undefined,
   messages: otherMsgs.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
   })),
   stream: false,
  };
 }

 return { ...request };
}

// ---------------------------------------------------------------------------
// Transform provider response back to OpenAI-compatible format
// ---------------------------------------------------------------------------
function transformResponse(
 provider: string,
 body: any,
 model: string
): ChatCompletionResponse {
 if (provider === 'Anthropic') {
  return {
   id: body.id ?? `chatcmpl-${Date.now()}`,
   choices: body.content?.map((c: any) => ({
    message: { content: c.text ?? '', role: 'assistant' },
    finish_reason: c.stop_reason ?? 'stop',
   })) ?? [],
   usage: body.usage ? {
    promptTokens: body.usage.input_tokens,
    completionTokens: body.usage.output_tokens,
    totalTokens: body.usage.input_tokens + body.usage.output_tokens,
   } : undefined,
   provider,
  };
 }

 return {
  id: body.id ?? `chatcmpl-${Date.now()}`,
  choices: body.choices ?? [],
  usage: body.usage,
  provider,
 };
}

// ---------------------------------------------------------------------------
// Main gateway handler with failover
// ---------------------------------------------------------------------------
export async function handleGatewayRequest(
 ctx: GatewayRequestContext
): Promise<GatewayResponseContext> {
 const requestId = ctx.requestId;
 const failoverEvents: FailoverEvent[] = [];
 let retryNumber = 0;
 const maxRetries = await getGatewayConfig('retry_count') ?? 3;
 const retryDelayMs = await getGatewayConfig('retry_delay_ms') ?? 1000;
 const failoverEnabled = await getGatewayConfig('failover_enabled') ?? true;

 // Get all active master keys sorted by priority
 const allKeys = await getAllMasterKeys();
 const activeKeys = allKeys.filter((k) => {
 return (
 k.status === 'active'
 && !['quota_exhausted', 'rate_limited', 'temporarily_failed', 'disabled'].includes(k.health_status)
 && (k.remaining_credits ?? 0) > 0
 );
 });

 if (activeKeys.length === 0) {
 return {
 requestId,
 masterKeyId: '',
 provider: '',
 httpStatus: 503,
 isSuccess: false,
 promptTokens: 0,
 completionTokens: 0,
 totalTokens: 0,
 creditsUsed: 0,
 responseTimeMs: 0,
 errorMessage: 'All provider keys are currently unavailable. Please try again later.',
 responseBody: { error: { message: 'Service Unavailable — all upstream providers are unreachable.', type: 'service_unavailable' } },
 retryNumber: 0,
 };
 }

 // Prepare request — build from full message array
 const request: ChatCompletionRequest = {
  model: ctx.model,
  messages: ctx.messages,
 };

 const estimatedTokens = estimateTokens(ctx.messages, ctx.model);
 const startTime = Date.now();

 let lastError = '';
 let lastStatusCode = 0;
 let masterKey: MasterApiKeyRow | null = null;

 for (const candidate of activeKeys) {
 masterKey = candidate;

 if (!failoverEnabled && retryNumber > 0) break;

 const config = getProviderConfig(candidate.provider);
 const url = buildProviderUrl(candidate.provider, ctx.model);
 const headers = buildProviderHeaders(candidate.provider, candidate);
 const body = transformRequestBody(candidate.provider, {
 ...request,
 model: ctx.model,
 });

 const fetchStart = Date.now();
 let response: Response;
 try {
 response = await fetch(url, {
 method: 'POST',
 headers,
 body: JSON.stringify(body),
 signal: AbortSignal.timeout(await getGatewayConfig('request_timeout_ms') ?? 120000),
 });
 } catch (fetchErr: any) {
 const errorMsg = fetchErr?.message ?? 'Network error';
 lastError = errorMsg;
 lastStatusCode = 0;

 await markMasterKeyFailed(candidate.id, errorMsg);
 await recordHealthFailure(candidate.id, errorMsg);

 failoverEvents.push({
 requestId,
 originalKeyId: candidate.id,
 newKeyId: '',
 originalProvider: candidate.provider,
 newProvider: '',
 failureReason: errorMsg,
 httpStatus: null,
 errorMessage: errorMsg,
 retryNumber: retryNumber + 1,
 model: ctx.model,
 ipAddress: ctx.ipAddress,
 });

 retryNumber++;
 if (retryNumber >= maxRetries || !failoverEnabled) break;

 // Wait before next retry
 await new Promise((r) => setTimeout(r, retryDelayMs));
 continue;
 }

 const responseTimeMs = Date.now() - fetchStart;
 const responseBody = await response.json().catch(() => ({}));

 if (response.ok) {
 // Success
 const usage = extractUsage(responseBody as ChatCompletionResponse, ctx.model);
 const credits = calculateCredits(ctx.model, usage);

 await markMasterKeySuccess(candidate.id);
 await recordHealthSuccess(candidate.id, responseTimeMs);
 await recordUsage(candidate.id, candidate.provider, usage.totalTokens, credits, responseTimeMs);

 // Update master key credits only (counters already incremented by markMasterKeySuccess)
 const updatedKey = await getMasterKeyById(candidate.id);
 if (updatedKey) {
 const newUsed = updatedKey.used_credits + credits;
 await supabase.from('master_api_keys').update({
 used_credits: newUsed,
 remaining_credits: Math.max(0, updatedKey.total_credits - newUsed),
 last_used: new Date().toISOString(),
 }).eq('id', candidate.id);
 }

 // Record user key usage
 if (ctx.userApiKey.id) {
 await recordUserKeyUsage(ctx.userApiKey.id, usage.totalTokens, credits, true);
 }

 // Log the successful request
 await logApiRequest({
 requestId,
 userId: ctx.userApiKey.user_id,
 userApiKeyId: ctx.userApiKey.id,
 userApiKeyPrefix: ctx.userApiKey.api_key.slice(0, 12),
 masterApiKeyId: candidate.id,
 masterKeyPrefix: candidate.api_key.slice(0, 8),
 provider: candidate.provider,
 model: ctx.model,
 ...usage,
 creditsUsed: credits,
 responseTimeMs,
 httpStatus: response.status,
 isSuccess: true,
 ipAddress: ctx.ipAddress,
 userAgent: ctx.userAgent,
 });

 // Log failover events if any occurred
 for (const fe of failoverEvents) {
 await logFailover({
 ...fe,
 newKeyId: candidate.id,
 newProvider: candidate.provider,
 });
 }

 return {
 requestId,
 masterKeyId: candidate.id,
 provider: candidate.provider,
 httpStatus: response.status,
 isSuccess: true,
 ...usage,
 creditsUsed: credits,
 responseTimeMs,
 responseBody: transformResponse(candidate.provider, responseBody, ctx.model),
 retryNumber: retryNumber + 1,
 };
 }

 // Error response
 const errorMsg = (responseBody as any)?.error?.message ?? `HTTP ${response.status}`;
 lastError = errorMsg;
 lastStatusCode = response.status;

 if (shouldFailover(response.status, errorMsg) && failoverEnabled) {
 // Determine type of failure
 if (response.status === 429) {
 await markMasterKeyRateLimited(candidate.id);
 } else if (response.status === 402 || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('exceeded')) {
 await markMasterKeyQuotaExhausted(candidate.id);
 } else {
 await markMasterKeyFailed(candidate.id, errorMsg);
 }

 failoverEvents.push({
 requestId,
 originalKeyId: candidate.id,
 newKeyId: '',
 originalProvider: candidate.provider,
 newProvider: '',
 failureReason: errorMsg,
 httpStatus: response.status,
 errorMessage: errorMsg,
 retryNumber: retryNumber + 1,
 model: ctx.model,
 ipAddress: ctx.ipAddress,
 });

 retryNumber++;
 if (retryNumber >= maxRetries) break;

 // Delay before next retry
 await new Promise((r) => setTimeout(r, retryDelayMs));
 continue;
 }

 // Non-failover error — log and return immediately
 const usage = extractUsage(responseBody as ChatCompletionResponse, ctx.model);

 await logApiRequest({
 requestId,
 userId: ctx.userApiKey.user_id,
 userApiKeyId: ctx.userApiKey.id,
 userApiKeyPrefix: ctx.userApiKey.api_key.slice(0, 12),
 masterApiKeyId: candidate.id,
 masterKeyPrefix: candidate.api_key.slice(0, 8),
 provider: candidate.provider,
 model: ctx.model,
 ...usage,
 creditsUsed: 0,
 responseTimeMs,
 httpStatus: response.status,
 isSuccess: false,
 errorMessage: errorMsg,
 ipAddress: ctx.ipAddress,
 userAgent: ctx.userAgent,
 });

 // Log any prior failover events
 for (const fe of failoverEvents) {
 await logFailover({ ...fe, newKeyId: candidate.id, newProvider: candidate.provider });
 }

 return {
 requestId,
 masterKeyId: candidate.id,
 provider: candidate.provider,
 httpStatus: response.status,
 isSuccess: false,
 ...usage,
 creditsUsed: 0,
 responseTimeMs,
 errorMessage: errorMsg,
 responseBody: transformResponse(candidate.provider, responseBody, ctx.model),
 retryNumber: retryNumber + 1,
 };
 }

 // All keys exhausted
 const totalResponseTime = Date.now() - startTime;

 // Log failure for last tried key
 if (masterKey) {
 await logApiRequest({
 requestId,
 userId: ctx.userApiKey.user_id,
 userApiKeyId: ctx.userApiKey.id,
 userApiKeyPrefix: ctx.userApiKey.api_key.slice(0, 12),
 masterApiKeyId: masterKey.id,
 masterKeyPrefix: masterKey.api_key.slice(0, 8),
 provider: masterKey.provider,
 model: ctx.model,
 promptTokens: 0,
 completionTokens: 0,
 totalTokens: 0,
 creditsUsed: 0,
 responseTimeMs: totalResponseTime,
 httpStatus: lastStatusCode || 503,
 isSuccess: false,
 errorMessage: lastError,
 ipAddress: ctx.ipAddress,
 userAgent: ctx.userAgent,
 });
 }

 for (const fe of failoverEvents) {
 await logFailover(fe);
 }

 return {
 requestId,
 masterKeyId: masterKey?.id ?? '',
 provider: masterKey?.provider ?? '',
 httpStatus: 503,
 isSuccess: false,
 promptTokens: 0,
 completionTokens: 0,
 totalTokens: 0,
 creditsUsed: 0,
 responseTimeMs: totalResponseTime,
 errorMessage: 'All provider keys exhausted. Please try again later.',
 responseBody: {
 error: {
 message: 'Service Unavailable — all upstream providers are unreachable after multiple retries.',
 type: 'service_unavailable',
 retries: retryNumber,
 },
 },
 retryNumber: retryNumber + 1,
 };
}

// ---------------------------------------------------------------------------
// User API key status endpoint
// ---------------------------------------------------------------------------
export async function getKeyStatus(apiKey: string): Promise<any> {
 // If this looks like a remote official key, fetch from the official API
 if (apiKey.startsWith("sk-ant-opm-") || apiKey.startsWith("sk-ant-api") || apiKey.startsWith("sk-")) {
  try {
   const res = await fetch(`https://api.opusmax.live/api/key-status?key=${apiKey}`);
   if (res.ok) {
    const remoteData = await res.json();
    if (remoteData && remoteData.status !== "error") {
     return remoteData;
    }
   }
  } catch (e) {
   console.error("Failed to fetch key status from remote API:", e);
  }
 }

 const key = await validateUserApiKey(apiKey);
 if (!key) {
 return { status: 'error', error: 'Invalid or expired API key' };
 }

 const usagePercent = key.allocated_credits > 0
 ? Math.round((key.used_credits / key.allocated_credits) * 100)
 : 0;

 return {
 status: 'ok',
 name: key.name,
 planName: 'Custom Plan',
 unlimited: key.allocated_credits === 0,
 usagePercent,
 totalRequests: key.total_requests,
 last24h: { requests: key.total_requests },
 rateLimit: key.rate_limit,
 expiresAt: key.expiry_date,
 createdAt: key.created_at,
 lastUsedAt: key.last_used,
 isActive: key.status === 'active',
 windowActive: key.status === 'active',
 windowTokensLimit: key.allocated_credits > 0 ? key.allocated_credits * 1000 : 10000000,
 windowTokensUsed: Math.round(key.used_credits * 1000),
 windowResetAt: key.expiry_date,
 allowedModels: key.allowed_models,
 allowedProviders: key.allowed_providers,
 remainingCredits: key.remaining_credits,
 };
}
