/**
 * Gateway Service
 * The core proxy engine: routes requests through master keys with automatic failover.
 *
 * Flow:
 * 1. Validate user API key
 * 2. Select best master API key by priority
 * 3. Forward request to provider
 * 4. On failure (429/5xx/timeout/quota), mark key, try next
 * 5. Log everything
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import type {
	MasterApiKeyRow,
	GatewayRequestContext,
	GatewayResponseContext,
	FailoverEvent,
	ChatCompletionResponse,
	ChatCompletionRequest,
	TokenUsage,
	ProviderConfig,
} from "~/types/gateway";
import {
	markMasterKeyFailed,
	markMasterKeySuccess,
	markMasterKeyRateLimited,
	markMasterKeyQuotaExhausted,
	getAllMasterKeys,
} from "~/utils/master-key-service";
import {
	recordUserKeyUsage,
} from "~/utils/user-key-service";
import { logApiRequest, logFailover } from "~/utils/logging-service";
import { recordHealthSuccess, recordHealthFailure } from "~/utils/health-service.server";
import { calculateCredits, recordUsage } from "~/utils/usage-service";
import { getGatewayConfig } from "~/utils/gateway-config";
import { inferTokenLimitFromPlan } from "~/utils/plan-service";

// ---------------------------------------------------------------------------
// Provider configurations & domain validation
// ---------------------------------------------------------------------------
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
	opusmax: {
		name: 'opusmax',
		baseUrl: 'https://api.opusmax.live/v1',
		authHeader: 'Authorization',
		modelsEndpoint: '/models',
		supportsStreaming: true,
		tokenPricing: {},
	},
};

function getProviderConfig(provider: string): ProviderConfig {
	if (provider.startsWith('http://') || provider.startsWith('https://')) {
		const baseUrl = provider.endsWith('/') ? provider.slice(0, -1) : provider;

		// SSRF protection: block local/internal IP ranges while allowing public API domains (e.g. api.domain, api.opuszen.shop, etc.)
		try {
			const parsed = new URL(baseUrl);
			const hostname = parsed.hostname.toLowerCase();
			const isInternal =
				hostname === 'localhost' ||
				hostname === '127.0.0.1' ||
				hostname === '0.0.0.0' ||
				hostname === '::1' ||
				hostname.startsWith('169.254.') ||
				hostname.startsWith('10.') ||
				hostname.startsWith('192.168.') ||
				(hostname.startsWith('172.') && parseInt(hostname.split('.')[1], 10) >= 16 && parseInt(hostname.split('.')[1], 10) <= 31);

			if (isInternal) {
				throw new Error('Internal network addresses are not allowed for provider URL: ' + hostname);
			}
		} catch (e) {
			if (e instanceof Error && e.message.includes('not allowed')) throw e;
		}

		const isAnthropic = baseUrl.toLowerCase().includes('anthropic');
		const isGoogle = baseUrl.toLowerCase().includes('generativelanguage');

		return {
			name: provider,
			baseUrl,
			authHeader: isAnthropic ? 'x-api-key' : isGoogle ? 'x-goog-api-key' : 'Authorization',
			modelsEndpoint: isAnthropic ? '/messages' : '/models',
			supportsStreaming: true,
			tokenPricing: {},
		};
	}

	const normalized = provider.toLowerCase();
	// Try exact match first, then case-insensitive fallback
	if (PROVIDER_CONFIGS[provider]) return PROVIDER_CONFIGS[provider];
	for (const key of Object.keys(PROVIDER_CONFIGS)) {
		if (key.toLowerCase() === normalized) return PROVIDER_CONFIGS[key];
	}
	throw new Error('Unsupported provider: ' + provider + '. Configure it in PROVIDER_CONFIGS.');
}

function shouldFailover(statusCode: number, error: string | null | undefined): boolean {
	if (statusCode === 429) return true;
	if (statusCode === 402) return true;
	if (statusCode === 413) return true;
	if (statusCode >= 500 && statusCode < 600) return true;

	const lower = (error || '').toLowerCase();
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
function extractUsage(responseBody: any): TokenUsage {
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
	masterKey: MasterApiKeyRow
): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	// All upstream requests go to opusmax (OpenAI-compatible), always use Bearer
	headers['Authorization'] = `Bearer ${masterKey.api_key}`;
	return headers;
}

// ---------------------------------------------------------------------------
// Build request URL
// ---------------------------------------------------------------------------
function buildProviderUrl(provider: string, model: string): string {
	const config = getProviderConfig(provider);
	const base = config.baseUrl.replace(/\/+$/, '');

	if (base.endsWith('/chat/completions') || base.endsWith('/messages')) {
		return base;
	}

	const isAnthropic = provider.toLowerCase().includes('anthropic') || model.toLowerCase().startsWith('claude');
	if (isAnthropic && (base.includes('anthropic') || provider === 'Anthropic')) {
		return `${base}/messages`;
	}

	return `${base}/chat/completions`;
}

// ---------------------------------------------------------------------------
// Transform request for provider
// ---------------------------------------------------------------------------
function transformRequestBody(
	provider: string,
	request: ChatCompletionRequest
): Record<string, any> {
	if (provider === 'Anthropic') {
		const systemMsgs = request.messages?.filter((m) => m.role === 'system') ?? [];
		const otherMsgs = request.messages?.filter((m) => m.role !== 'system') ?? [];

		let systemContent: any = request.system;
		if (systemMsgs.length > 0) {
			const extracted = systemMsgs.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n');
			systemContent = systemContent
				? (typeof systemContent === 'string' ? `${systemContent}\n${extracted}` : [systemContent, extracted])
				: extracted;
		}

		const anthropicMessages = otherMsgs.map((m) => {
			if (m.role === 'assistant') {
				// Handle assistant messages with tool_calls (multi-turn tool use)
				if ((m as any).tool_calls && Array.isArray((m as any).tool_calls)) {
					const content = (m as any).tool_calls.map((tc: any) => ({
						type: 'tool_use',
						id: tc.id || `tool_${Date.now()}`,
						name: tc.function?.name || tc.name,
						input: tc.function?.arguments
							? (() => { try { return JSON.parse(tc.function.arguments); } catch { return tc.function.arguments; } })()
							: tc.arguments,
					}));
					// Include text content if present alongside tool_calls
					if (m.content) {
						content.unshift({ type: 'text', text: m.content });
					}
					return { role: 'assistant', content };
				}
				return { role: 'assistant', content: m.content };
			}
			if ((m as any).role === 'tool') {
				const toolMsg = m as any;
				return {
					role: 'user',
					content: [{
						type: 'tool_result',
						tool_use_id: toolMsg.tool_call_id || '',
						content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
					}],
				};
			}
			return { role: 'user', content: m.content };
		});

		const payload: Record<string, any> = {
			model: request.model,
			max_tokens: request.max_tokens ?? 4096,
			temperature: request.temperature ?? 0.7,
			messages: anthropicMessages,
		};

		if (systemContent) payload.system = systemContent;
		if (request.tools) payload.tools = request.tools;
		if (request.tool_choice) payload.tool_choice = request.tool_choice;
		if (request.top_p !== undefined) payload.top_p = request.top_p;
		if (request.stop !== undefined) payload.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop];

		return payload;
	}

	return { ...request };
}

// ---------------------------------------------------------------------------
// Transform provider response back to OpenAI-compatible format
// ---------------------------------------------------------------------------
function transformResponse(
	provider: string,
	body: any,
	model: string,
	endpointPath?: string
): any {
	const isMessagesEndpoint = endpointPath ? endpointPath.includes('/messages') : false;

	if (isMessagesEndpoint) {
		// Client expects Anthropic message format
		if (provider === 'Anthropic') {
			return body;
		}
		// Transform OpenAI/Google/Groq/etc. format into Anthropic message format
		const firstChoice = Array.isArray(body?.choices) ? body.choices[0] : null;
		const messageText = firstChoice?.message?.content ?? "";
		return {
			id: body?.id ?? `msg_${Date.now()}`,
			type: "message",
			role: "assistant",
			model: body?.model ?? model,
			content: [{ type: "text", text: messageText }],
			stop_reason: firstChoice?.finish_reason === "stop" ? "end_turn" : (firstChoice?.finish_reason ?? "end_turn"),
			usage: {
				input_tokens: body?.usage?.prompt_tokens ?? body?.usage?.promptTokens ?? 0,
				output_tokens: body?.usage?.completion_tokens ?? body?.usage?.completionTokens ?? 0,
			},
		};
	} else {
		// Client expects OpenAI chat completion format
		if (provider === 'Anthropic') {
			return {
				id: body?.id ?? `chatcmpl-${Date.now()}`,
				object: "chat.completion",
				created: Math.floor(Date.now() / 1000),
				model: body?.model ?? model,
				choices: Array.isArray((body as any)?.content)
					? (body as any).content.map((c: Record<string, unknown>, idx: number) => ({
						index: idx,
						message: { content: (c as any).text ?? "", role: "assistant" },
						finish_reason: body.stop_reason === "end_turn" ? "stop" : (body.stop_reason ?? "stop"),
					}))
					: [],
				usage: body?.usage ? {
					prompt_tokens: Number(body.usage.input_tokens ?? 0),
					completion_tokens: Number(body.usage.output_tokens ?? 0),
					total_tokens: Number(body.usage.input_tokens ?? 0) + Number(body.usage.output_tokens ?? 0),
				} : undefined,
				provider,
			};
		}

		return {
			id: body?.id ?? `chatcmpl-${Date.now()}`,
			object: body?.object ?? "chat.completion",
			created: body?.created ?? Math.floor(Date.now() / 1000),
			model: body?.model ?? model,
			choices: body?.choices ?? [],
			usage: body?.usage,
			provider,
		};
	}
}

// ---------------------------------------------------------------------------
// Sanitize error message for client response (strip sensitive details)
// ---------------------------------------------------------------------------
function sanitizeErrorMessage(message: string, statusCode: number): string {
	if (statusCode >= 500 && statusCode < 600) {
		return 'Upstream provider error. Please try again.';
	}
	if (statusCode === 429) {
		return 'Rate limit exceeded. Please retry after a moment.';
	}
	if (statusCode === 402 || statusCode === 413) {
		return 'Request quota exceeded.';
	}
	// Client errors: return only the message (already filtered upstream)
	// but cap at 200 chars to prevent information disclosure
	if (statusCode >= 400 && statusCode < 500) {
		return message.length > 200 ? message.slice(0, 197) + '...' : message;
	}
	return 'Request failed. Please try again.';
}

// ---------------------------------------------------------------------------
// Hash a key for safe logging (one-way, not reversible)
// ---------------------------------------------------------------------------
function hashForLogging(key: string, maxLen: number = 4): string {
	let hash = 0;
	for (let i = 0; i < key.length; i++) {
		hash = ((hash << 5) - hash) + key.charCodeAt(i);
		hash |= 0;
	}
	const hex = Math.abs(hash).toString(16).padStart(maxLen, '0');
	return `key_***${hex}`;
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
	const requestTimeoutMs = await getGatewayConfig('request_timeout_ms') ?? 120000;

	// Provider matching helper — matches master keys from any existing provider
	// All requests are forwarded to api.opusmax.live regardless of key provider name
	const matchesProvider = (keyProvider: string, reqProvider: string): boolean => {
		const kp = (keyProvider || '').toLowerCase().trim();
		const rp = (reqProvider || '').toLowerCase().trim();
		if (!rp) return true; // no provider specified → accept any
		if (!kp) return true; // key has no provider → accept any

		// OpusMax variants
		if (kp.includes('opusmax') || kp.includes('api.opusmax')) return true;

		// Match by provider name: opuslive, opuszen, anthropic, openai, google, groq, mistral, cohere
		if ((rp === 'opuslive' || rp.includes('opuslive')) && (kp.includes('opuslive') || kp.includes('opus'))) return true;
		if ((rp === 'anthropic' || rp.includes('claude')) && (kp.includes('anthropic') || kp.includes('claude'))) return true;
		if ((rp === 'openai' || rp.includes('gpt')) && (kp.includes('openai') || kp.includes('gpt'))) return true;
		if ((rp === 'google' || rp.includes('gemini')) && (kp.includes('google') || kp.includes('gemini'))) return true;
		if ((rp === 'groq') && (kp.includes('groq'))) return true;
		if ((rp === 'mistral') && (kp.includes('mistral'))) return true;
		if ((rp === 'cohere') && (kp.includes('cohere'))) return true;

		// Universal match: opuszen domains and api.opus variants can serve any request
		if (kp.includes('opuszen') || kp.includes('api.opus')) return true;
		if (rp.includes('opuszen') || rp.includes('opuslive') || rp.includes('opusmax')) return true;

		return false;
	};

	// Get all active master keys sorted by priority
	const allKeys = await getAllMasterKeys();
	const activeKeys = allKeys.filter((k) => {
		if (k.api_key === '[encrypted — decryption failed]') return false;
		const isHealthy = k.status === 'active'
			&& !['quota_exhausted', 'rate_limited', 'temporarily_failed', 'disabled'].includes(k.health_status)
			&& (k.remaining_credits ?? 0) > 0;
		if (!isHealthy) return false;

		if (ctx.userApiKey.allowed_providers && ctx.userApiKey.allowed_providers.length > 0) {
			const isAllowed = ctx.userApiKey.allowed_providers.some(ap => matchesProvider(k.provider, ap));
			if (!isAllowed) return false;
		}

		return matchesProvider(k.provider, ctx.provider);
	});

	if (activeKeys.length === 0) {
		return {
			requestId,
			masterKeyId: '',
			provider: ctx.provider,
			httpStatus: 503,
			isSuccess: false,
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			creditsUsed: 0,
			responseTimeMs: 0,
			errorMessage: `No active provider keys available for "${ctx.provider}". Please try again later.`,
			responseBody: { error: { message: `Service Unavailable — no active master key configured for provider "${ctx.provider}".`, type: 'service_unavailable' } },
			retryNumber: 0,
		};
	}

	// Prepare request — build from full body parameters
	const request: ChatCompletionRequest = {
		model: ctx.model,
		messages: ctx.messages,
		...(ctx.body ?? {}),
	};

	const startTime = Date.now();

	let lastError = '';
	let lastStatusCode = 0;
	let masterKey: MasterApiKeyRow | null = null;

	// When failover is disabled, only try the first (highest-priority) key.
	// Bug fix: the original condition 'retryNumber > 0' broke the loop after a single
	// retry even when failover was enabled, so secondary keys were never tried.
	const keysToTry = failoverEnabled ? activeKeys : [activeKeys[0]];

	for (const candidate of keysToTry) {
		masterKey = candidate;

		// All upstream requests go to opusmax regardless of key's stored provider name
		const upstreamProvider = 'opusmax';
		const url = buildProviderUrl(upstreamProvider, ctx.model);
		const headers = buildProviderHeaders(candidate);
		const body = transformRequestBody(upstreamProvider, {
			...request,
			model: ctx.model,
		});

		const fetchStart = Date.now();
		let response: Response;
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
			response = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
		} catch (fetchErr: unknown) {
			const errorMsg = fetchErr instanceof Error ? fetchErr.message : 'Network error';
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
		let responseBody: unknown;
		const contentType = response.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			responseBody = await response.json().catch(() => ({}));
		} else {
			const text = await response.text().catch(() => '');
			responseBody = { error: { message: text || `HTTP ${response.status}` } };
		}

		if (response.ok) {
			// Success
			const usage = extractUsage(responseBody as ChatCompletionResponse);

			// Per-token plan billing: use plan's per-token pricing instead of model pricing
			const userKey = ctx.userApiKey as any;
			const planInputPrice = Number(userKey?.price_per_1m_input_tokens ?? 0);
			const planOutputPrice = Number(userKey?.price_per_1m_output_tokens ?? 0);
			const isPerTokenPlan = (userKey?.pricing_type === 'per_token') && !isNaN(planInputPrice) && !isNaN(planOutputPrice) && (planInputPrice > 0 || planOutputPrice > 0);

			let credits: number;
			if (isPerTokenPlan) {
				credits = Math.round(
					((usage.promptTokens / 1_000_000) * planInputPrice +
						(usage.completionTokens / 1_000_000) * planOutputPrice) * 10_000
				) / 10_000;
			} else {
				credits = calculateCredits(ctx.model, usage);
			}

			await markMasterKeySuccess(candidate.id);
			await recordHealthSuccess(candidate.id, responseTimeMs);
			await recordUsage(candidate.id, candidate.provider, usage.totalTokens, credits, responseTimeMs);

			// Atomically update master key credits using SQL RPC to avoid lost-update race conditions
			const { error: rpcError } = await supabase.rpc('increment_master_key_credits', {
				p_master_key_id: candidate.id,
				p_credits: credits,
			});

			if (rpcError) {
				// Fallback: atomic compare-and-swap to avoid lost-update race condition
				// Step 1: Read current state
				const { data: currentKey } = await supabase
					.from('master_api_keys')
					.select('used_credits, total_credits, remaining_credits')
					.eq('id', candidate.id)
					.single();

				if (!currentKey) continue;

				const prevUsed = currentKey.used_credits ?? 0;
				const prevRemaining = currentKey.remaining_credits ?? 0;

				if (prevRemaining <= 0) continue; // no credits left

				const newUsed = prevUsed + credits;
				const newRemaining = Math.max(0, prevRemaining - credits);

				// Step 2: Atomic compare-and-swap — update ONLY if values haven't changed
				// since we read them (prevents concurrent writes from being overwritten)
				const { error: updError, count } = await supabase
					.from('master_api_keys')
					.update({
						used_credits: newUsed,
						remaining_credits: newRemaining,
						last_used: new Date().toISOString(),
					})
					.eq('id', candidate.id)
					.eq('used_credits', prevUsed)
					.eq('remaining_credits', prevRemaining);

				if (updError || count === 0) {
					// Compare-and-swap failed: concurrent write detected
					// Re-read and re-derive remaining_credits from authoritative totals
					const { data: refreshed } = await supabase
						.from('master_api_keys')
						.select('used_credits, total_credits')
						.eq('id', candidate.id)
						.single();

					if (refreshed) {
						await supabase
							.from('master_api_keys')
							.update({
								remaining_credits: Math.max(0, (refreshed.total_credits ?? 0) - (refreshed.used_credits ?? 0)),
							})
							.eq('id', candidate.id);
					} else {
						// Could not re-read key state — mark as exhausted to prevent stale usage
						await supabase
							.from('master_api_keys')
							.update({ remaining_credits: 0 })
							.eq('id', candidate.id);
					}
				}
			}

			// Record user key usage
			if (ctx.userApiKey.id) {
				const planPricing = isPerTokenPlan
					? { input: planInputPrice, output: planOutputPrice }
					: null;

				// Update token counters on user key
				const keyUpdates: Record<string, unknown> = {
					last_prompt_tokens: usage.promptTokens,
					last_completion_tokens: usage.completionTokens,
				};
				const existingKey = ctx.userApiKey as any;
				if (existingKey) {
					keyUpdates.total_prompt_tokens = (existingKey.total_prompt_tokens ?? 0) + usage.promptTokens;
					keyUpdates.total_completion_tokens = (existingKey.total_completion_tokens ?? 0) + usage.completionTokens;
				}
				try {
					await supabase.from('user_api_keys').update(keyUpdates).eq('id', ctx.userApiKey.id);
				} catch { /* best-effort */ }

				await recordUserKeyUsage(ctx.userApiKey.id, usage.totalTokens, credits, true, planPricing);
			}

			// Log the successful request (use hashed prefixes instead of raw key material)
			await logApiRequest({
				requestId,
				userId: ctx.userApiKey.user_id,
				userApiKeyId: ctx.userApiKey.id,
				userApiKeyPrefix: hashForLogging(ctx.userApiKey.api_key, 8),
				masterApiKeyId: candidate.id,
				masterKeyPrefix: hashForLogging(candidate.api_key, 4),
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

			// Log failover events if any occurred — now with resolution data
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
				responseBody: transformResponse(candidate.provider, responseBody, ctx.model, ctx.endpointPath),
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
			const usage = extractUsage(responseBody as ChatCompletionResponse);

		await logApiRequest({
			requestId,
			userId: ctx.userApiKey.user_id,
			userApiKeyId: ctx.userApiKey.id,
			userApiKeyPrefix: hashForLogging(ctx.userApiKey.api_key, 8),
			masterApiKeyId: candidate.id,
			masterKeyPrefix: hashForLogging(candidate.api_key, 4),
			provider: candidate.provider,
			model: ctx.model,
			...usage,
			creditsUsed: 0,
			responseTimeMs,
			httpStatus: response.status,
			isSuccess: false,
			errorMessage: sanitizeErrorMessage(errorMsg, response.status),
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
			errorMessage: sanitizeErrorMessage(errorMsg, response.status),
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
			userApiKeyPrefix: hashForLogging(ctx.userApiKey.api_key, 8),
			masterApiKeyId: masterKey.id,
			masterKeyPrefix: hashForLogging(masterKey.api_key, 4),
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
export async function getKeyStatus(apiKey: string): Promise<{ status: string;[key: string]: unknown }> {
	if (!apiKey) {
		return { status: 'error', error: 'API key is required. Please provide your API key.' };
	}
	const cleanKey = apiKey
		.trim()
		.replace(/^Bearer\s+/i, "")
		.trim()
		.replace(/^["']|["']$/g, "")
		.trim();

	if (!cleanKey) {
		return { status: 'error', error: 'API key is empty. Please check your key and try again.' };
	}

	const isUuidKey = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey);

	// 1. Check user_api_keys table (including child keys)
	const { data: userKeyData } = await supabase
		.from('user_api_keys')
		.select('*')
		.or(isUuidKey ? `api_key.eq.${cleanKey},id.eq.${cleanKey}` : `api_key.eq.${cleanKey}`)
		.maybeSingle();

	if (userKeyData) {
		const key = userKeyData as any;
		let effectiveStatus = key.status || 'active';

		// Check expiry
		if (key.expiry_date && new Date(key.expiry_date) < new Date()) {
			effectiveStatus = 'expired';
			if (key.status !== 'expired') {
				await supabase.from('user_api_keys').update({ status: 'expired' }).eq('id', key.id);
			}
		} else if (key.allocated_credits > 0 && (key.remaining_credits ?? (key.allocated_credits - key.used_credits)) <= 0) {
			effectiveStatus = 'disabled';
			if (key.status !== 'disabled') {
				await supabase.from('user_api_keys').update({ status: 'disabled' }).eq('id', key.id);
			}
		}

		// 1. Check user_api_keys table (including child keys)
		const allocated = Number(key.allocated_credits || key.tokens_limit || 0);
		let allocatedTokens = key.tokens_limit && Number(key.tokens_limit) > 0
			? Number(key.tokens_limit)
			: allocated > 100_000
				? allocated
				: allocated > 0
					? allocated * 1000
					: 0;

		// Check if key is assigned to an admin plan for token limits
		try {
			const { data: planAssignment } = await supabase
				.from('api_key_plan_assignments')
				.select('custom_monthly_token_limit, custom_daily_token_limit, plan:admin_plans(monthly_token_limit, daily_token_limit)')
				.eq('user_api_key_id', key.id)
				.eq('is_active', true)
				.maybeSingle();

			if (planAssignment) {
				const planLimit = Number(planAssignment.custom_monthly_token_limit || (planAssignment.plan as any)?.monthly_token_limit || 0);
				if (planLimit > 0 && allocatedTokens === 0) {
					allocatedTokens = planLimit;
				}
			}
		} catch {
			// ignore plan assignment error
		}

		// Real-time queries for 24h count, last activity, recent request logs, and actual tokens used
		let recentLogs: any[] = [];
		let last24hCount = key.total_requests || 0;
		let lastUsedAt = key.last_used;
		let totalTokensFromLogs = 0;
		let windowTokensFromLogs = 0;

		try {
			const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
			const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

			const [logsRes, countRes, allLogsRes, windowRes] = await Promise.all([
				supabase
					.from('api_request_logs')
					.select('created_at, model, http_status, is_success, total_tokens, prompt_tokens, completion_tokens')
					.or(`user_api_key_id.eq.${key.id},user_id.eq.${key.user_id}`)
					.order('created_at', { ascending: false })
					.limit(20),
				supabase
					.from('api_request_logs')
					.select('id', { count: 'exact', head: true })
					.or(`user_api_key_id.eq.${key.id},user_id.eq.${key.user_id}`)
					.gte('created_at', twentyFourHoursAgo),
				supabase
					.from('api_request_logs')
					.select('total_tokens, prompt_tokens, completion_tokens, created_at')
					.or(`user_api_key_id.eq.${key.id},user_id.eq.${key.user_id}`),
				supabase
					.from('token_usage_windows')
					.select('total_tokens')
					.eq('user_api_key_id', key.id)
					.gte('window_start', fiveHoursAgo)
			]);

			if (logsRes.data && logsRes.data.length > 0) {
				recentLogs = logsRes.data.map(l => ({
					time: l.created_at,
					model: l.model || 'claude-3-5-sonnet-20241022',
					status: l.http_status || (l.is_success ? 200 : 500),
					tokens: l.total_tokens || (Number(l.prompt_tokens || 0) + Number(l.completion_tokens || 0)),
				}));
				if (!lastUsedAt) {
					lastUsedAt = logsRes.data[0].created_at;
				}
			}
			if (typeof countRes.count === 'number' && countRes.count > 0) {
				last24hCount = countRes.count;
			}

			if (allLogsRes.data && allLogsRes.data.length > 0) {
				for (const r of allLogsRes.data) {
					const t = Number(r.total_tokens || 0) || (Number(r.prompt_tokens || 0) + Number(r.completion_tokens || 0));
					totalTokensFromLogs += t;
					if (r.created_at && new Date(r.created_at) >= new Date(fiveHoursAgo)) {
						windowTokensFromLogs += t;
					}
				}
			}

			if (windowRes.data && windowRes.data.length > 0) {
				const windowUsageFromTable = windowRes.data.reduce((sum, r) => sum + Number(r.total_tokens || 0), 0);
				if (windowUsageFromTable > windowTokensFromLogs) {
					windowTokensFromLogs = windowUsageFromTable;
				}
			}
		} catch (e) {
			// silence log fetch errors
		}

		const totalLoggedTokens = Math.max(
			totalTokensFromLogs,
			(Number(key.total_prompt_tokens || 0) + Number(key.total_completion_tokens || 0)),
			Number(key.tokens_used || 0)
		);
		const usedCredits = Number(key.used_credits || 0);
		const usedTokens = totalLoggedTokens > 0
			? totalLoggedTokens
			: allocated > 100_000
				? Math.round(usedCredits)
				: Math.round(usedCredits * 1000);

		// If allocated tokens is still 0 but key has credit history or default allowance
		const finalLimit = allocatedTokens > 0 ? allocatedTokens : (allocated === 0 ? 0 : 10_000_000);
		const remainingTokens = finalLimit > 0 ? Math.max(0, finalLimit - usedTokens) : 0;
		const usagePercent = finalLimit > 0 ? Math.min(100, Math.round((usedTokens / finalLimit) * 1000) / 10) : 0;
		const isActive = effectiveStatus === 'active';

		const fiveHoursMs = 5 * 60 * 60 * 1000;
		const lastUsedMs = lastUsedAt ? new Date(lastUsedAt).getTime() : NaN;
		const windowResetAt = !isNaN(lastUsedMs) && (Date.now() - lastUsedMs < fiveHoursMs)
			? new Date(lastUsedMs + fiveHoursMs).toISOString()
			: new Date(Date.now() + fiveHoursMs).toISOString();

		return {
			status: 'ok',
			isRealtime: true,
			keyStatus: effectiveStatus,
			name: key.name || 'User API Key',
			planName: key.plan_name || 'Standard Plan',
			unlimited: finalLimit === 0,
			usagePercent,
			totalRequests: key.total_requests || 0,
			successRequests: key.success_requests || 0,
			failedRequests: key.failed_requests || 0,
			last24h: { requests: last24hCount },
			rateLimit: key.rate_limit || 60,
			expiresAt: key.expiry_date,
			createdAt: key.created_at,
			lastUsedAt,
			connectionStatus: isActive ? "Online" : "Offline",
			isActive,
			windowActive: isActive,
			windowTokensLimit: finalLimit > 0 ? finalLimit : 10000000,
			windowTokensUsed: windowTokensFromLogs > 0 ? windowTokensFromLogs : usedTokens,
			remainingTokens,
			windowResetAt,
			allowedModels: key.allowed_models?.length ? key.allowed_models : ["claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
			allowedProviders: key.allowed_providers || [],
			allocatedCredits: allocated,
			usedCredits,
			remainingCredits: key.remaining_credits ?? Math.max(0, allocated - usedCredits),
			totalPromptTokens: key.total_prompt_tokens || 0,
			totalCompletionTokens: key.total_completion_tokens || 0,
			recentLogs,
			...(effectiveStatus !== 'active' ? { warning: `Key status: ${effectiveStatus}.` } : {}),
		};
	}

	// 2. Check master_api_keys table (including encrypted and decrypted match)
	let masterKeyData: any = null;
	if (isUuidKey) {
		const { data } = await supabase.from('master_api_keys').select('*').eq('id', cleanKey).maybeSingle();
		if (data) masterKeyData = data;
	}
	if (!masterKeyData) {
		const allMasters = await getAllMasterKeys().catch(() => []);
		masterKeyData = allMasters.find((m) => m.api_key === cleanKey || m.id === cleanKey) || null;
	}

	if (masterKeyData) {
		const m = masterKeyData as any;
		const allocated = Number(m.allocated_credits || 0);
		const allocatedTokens = allocated > 100_000 ? allocated : allocated > 0 ? allocated * 1000 : 0;
		const used = Number(m.used_credits || 0);
		const usedTokens = allocated > 100_000 ? Math.round(used) : Math.round(used * 1000);
		const remainingTokens = allocatedTokens > 0 ? Math.max(0, allocatedTokens - usedTokens) : 0;
		const usagePercent = allocatedTokens > 0 ? Math.min(100, Math.round((usedTokens / allocatedTokens) * 1000) / 10) : 0;
		const isActive = m.status === 'active' && m.health_status === 'healthy';

		return {
			status: 'ok',
			keyStatus: m.status || 'active',
			healthStatus: m.health_status || 'healthy',
			name: m.name || `${m.provider} Master Key`,
			provider: m.provider,
			planName: `Master Key (${m.provider})`,
			unlimited: allocatedTokens === 0,
			usagePercent,
			totalRequests: m.total_requests || 0,
			successRequests: m.success_requests || 0,
			failedRequests: m.failed_requests || 0,
			last24h: { requests: m.total_requests || 0 },
			rateLimit: m.rate_limit || 600,
			priority: m.priority || 1,
			expiresAt: m.expiry_date,
			createdAt: m.created_at,
			lastUsedAt: m.last_used,
			connectionStatus: isActive ? "Online" : "Offline",
			isActive,
			windowActive: isActive,
			windowTokensLimit: allocatedTokens > 0 ? allocatedTokens : 100000000,
			windowTokensUsed: usedTokens,
			remainingTokens,
			windowResetAt: m.expiry_date,
			allowedModels: ["claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
			allowedProviders: [m.provider],
			allocatedCredits: allocated,
			usedCredits: used,
			remainingCredits: m.remaining_credits ?? Math.max(0, allocated - used),
			recentLogs: [],
		};
	}

	// 3. Fallback: Query upstream key status endpoints (api.opuslive.pro, api.opusmax.live, api.opuszen.shop)
	const upstreamData = await fetchUpstreamKeyStatus(cleanKey);
	if (upstreamData) {
		return upstreamData;
	}

	if (cleanKey.startsWith("sk-ant-")) {
		return { status: 'error', error: "This looks like a direct Anthropic API key ('sk-ant-...'). Please enter your OpusZen Gateway key ('sk_live_...')." };
	}
	if (cleanKey.startsWith("sk-proj-")) {
		return { status: 'error', error: "This looks like an OpenAI project API key ('sk-proj-...'). Please enter your OpusZen Gateway key ('sk_live_...')." };
	}
	if (cleanKey.toLowerCase().includes("your_") || cleanKey.toLowerCase().includes("placeholder") || cleanKey.includes("<")) {
		return { status: 'error', error: "Please enter your actual OpusZen API key rather than placeholder text." };
	}

	return { status: 'error', error: `API key not found. Please make sure to copy your full key starting with 'sk_live_' from your dashboard.` };
}

/**
 * Query upstream providers (api.opuslive.pro, api.opusmax.live, api.opuszen.shop) as a fallback
 */
async function fetchUpstreamKeyStatus(cleanKey: string): Promise<{ status: string;[key: string]: unknown } | null> {
	const endpoints = [
		`https://api.opuslive.pro/api/key-status?key=${encodeURIComponent(cleanKey)}`,
		`https://api.opusmax.live/api/key-status?key=${encodeURIComponent(cleanKey)}`,
		`https://api.opuszen.shop/api/key-status?key=${encodeURIComponent(cleanKey)}`,
	];

	for (const ep of endpoints) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 6000);
			const res = await fetch(ep, {
				headers: {
					'User-Agent': 'OpusZen-Gateway/1.4',
					'Accept': 'application/json',
					'x-api-key': cleanKey,
					'Authorization': `Bearer ${cleanKey}`,
				},
				signal: controller.signal,
			});
			clearTimeout(timeoutId);

			if (res.ok) {
				const rawJson: any = await res.json().catch(() => null);
				if (!rawJson) continue;

				// Handle wrapped payloads (e.g. { data: { ... } } or { result: { ... } })
				const json = rawJson.data || rawJson.result || rawJson.keyData || rawJson.key || rawJson;

				if (json && json.status !== 'error' && !json.error) {
					// Parse Limit with all possible upstream field names
					const rawLimit = Number(
						json.windowTokensLimit ??
						json.window_tokens_limit ??
						json.windowTokenLimit ??
						json.window_token_limit ??
						json.tokensLimit ??
						json.tokens_limit ??
						json.tokenLimit ??
						json.token_limit ??
						json.totalTokenLimit ??
						json.total_token_limit ??
						json.allocatedTokens ??
						json.allocated_tokens ??
						json.max_tokens ??
						json.maxTokens ??
						json.quota ??
						json.total_tokens ??
						json.totalTokens ??
						0
					);

					const rawCreditsAllocated = Number(json.allocatedCredits ?? json.allocated_credits ?? json.totalCredits ?? json.total_credits ?? 0);
					const planInferredLimit = inferTokenLimitFromPlan(json.planName || json.plan || json.name || json.keyName || json.label || '');

					const finalTokensLimit = rawLimit > 0
						? rawLimit
						: rawCreditsAllocated > 100_000
							? rawCreditsAllocated
							: rawCreditsAllocated > 0
								? rawCreditsAllocated * 1000
								: planInferredLimit > 0
									? planInferredLimit
									: (json.unlimited ? 0 : 10_000_000);

					// Parse Used with all possible upstream field names
					const rawUsed = Number(
						json.windowTokensUsed ??
						json.window_tokens_used ??
						json.windowTokenUsed ??
						json.window_token_used ??
						json.tokensUsed ??
						json.tokens_used ??
						json.usedTokens ??
						json.used_tokens ??
						json.tokenUsage ??
						json.token_usage ??
						json.used_quota ??
						json.usedQuota ??
						(json.totalPromptTokens || json.totalCompletionTokens
							? Number(json.totalPromptTokens || 0) + Number(json.totalCompletionTokens || 0)
							: undefined) ??
						(json.prompt_tokens || json.completion_tokens
							? Number(json.prompt_tokens || 0) + Number(json.completion_tokens || 0)
							: undefined) ??
						0
					);

					const rawCreditsUsed = Number(json.usedCredits ?? json.used_credits ?? json.spentCredits ?? json.spent_credits ?? 0);

					// Parse Remaining
					const rawRemaining = Number(
						json.remainingTokens ??
						json.remaining_tokens ??
						json.windowTokensRemaining ??
						json.window_tokens_remaining ??
						json.tokensRemaining ??
						json.tokens_remaining ??
						json.remaining_quota ??
						json.remainingQuota ??
						0
					);

					const rawCreditsRemaining = Number(json.remainingCredits ?? json.remaining_credits ?? 0);
					const rawPercent = Number(json.usagePercent ?? json.usage_percent ?? json.usagePercentage ?? json.usage_percentage ?? json.usage_pct ?? 0);

					// Check if usage object exists
					const usageObjTokens = typeof json.usage === 'object' && json.usage !== null
						? Number(
							json.usage.total_tokens ??
							json.usage.totalTokens ??
							json.usage.tokens ??
							json.usage.used ??
							(json.usage.prompt_tokens || json.usage.completion_tokens
								? Number(json.usage.prompt_tokens || 0) + Number(json.usage.completion_tokens || 0)
								: 0)
						  )
						: 0;

					// Check if logs contain token usage
					const logsTokens = (Array.isArray(json.recentLogs) ? json.recentLogs : Array.isArray(json.recent_logs) ? json.recent_logs : Array.isArray(json.logs) ? json.logs : [])
						.reduce((sum: number, l: any) => sum + Number(l?.tokens || l?.total_tokens || (Number(l?.prompt_tokens || 0) + Number(l?.completion_tokens || 0)) || 0), 0);

					let finalTokensUsed = rawUsed > 0
						? rawUsed
						: usageObjTokens > 0
							? usageObjTokens
							: logsTokens > 0
								? logsTokens
								: rawCreditsAllocated > 100_000
									? Math.round(rawCreditsUsed)
									: rawCreditsUsed > 0
										? Math.round(rawCreditsUsed * 1000)
										: 0;

					// If still 0, check if remaining tokens is less than limit (Used = Limit - Remaining)
					if (finalTokensUsed === 0 && rawRemaining > 0 && finalTokensLimit > rawRemaining) {
						finalTokensUsed = finalTokensLimit - rawRemaining;
					} else if (finalTokensUsed === 0 && rawCreditsAllocated > 0 && rawCreditsRemaining > 0 && rawCreditsAllocated > rawCreditsRemaining) {
						const diff = rawCreditsAllocated - rawCreditsRemaining;
						finalTokensUsed = rawCreditsAllocated > 100_000 ? Math.round(diff) : Math.round(diff * 1000);
					} else if (finalTokensUsed === 0 && rawPercent > 0 && finalTokensLimit > 0) {
						finalTokensUsed = Math.round(finalTokensLimit * (rawPercent / 100));
					}

					const finalTokensRemaining = rawRemaining > 0
						? rawRemaining
						: rawCreditsAllocated > 100_000 && rawCreditsRemaining > 0
							? Math.round(rawCreditsRemaining)
							: rawCreditsRemaining > 0
								? Math.round(rawCreditsRemaining * 1000)
								: finalTokensLimit > 0
									? Math.max(0, finalTokensLimit - finalTokensUsed)
									: 0;

					const finalUsagePercent = rawPercent > 0
						? rawPercent
						: finalTokensLimit > 0 && finalTokensUsed > 0
							? Math.min(100, Math.round((finalTokensUsed / finalTokensLimit) * 1000) / 10)
							: 0;

					const expiresAt = json.expiresAt || json.expires_at || json.expiry_date || json.expiryDate || json.expire_at;
					const createdAt = json.createdAt || json.created_at || json.created;
					const lastUsedAt = json.lastUsedAt || json.last_used_at || json.last_used || json.lastUsed;

					const fiveHoursMs = 5 * 60 * 60 * 1000;
					const lastUsedMs = lastUsedAt ? new Date(lastUsedAt).getTime() : NaN;
					const computedRollingReset = !isNaN(lastUsedMs) && (Date.now() - lastUsedMs < fiveHoursMs)
						? new Date(lastUsedMs + fiveHoursMs).toISOString()
						: new Date(Date.now() + fiveHoursMs).toISOString();

					const rawWindowReset = json.windowResetAt || json.window_reset_at || json.resetAt || json.reset_at || json.reset_time;
					const windowResetAt = rawWindowReset && !isNaN(new Date(rawWindowReset).getTime()) && new Date(rawWindowReset).getTime() > Date.now()
						? rawWindowReset
						: computedRollingReset;

					return {
						status: 'ok',
						isRealtime: true,
						keyStatus: json.keyStatus || json.status || (json.isActive === false ? 'disabled' : 'active'),
						name: json.name || json.keyName || json.label || 'API Key',
						unlimited: Boolean(json.unlimited ?? (finalTokensLimit === 0)),
						usagePercent: finalUsagePercent,
						totalRequests: Number(json.totalRequests ?? json.total_requests ?? json.requests ?? json.request_count ?? 0),
						successRequests: Number(json.successRequests ?? json.success_requests ?? 0),
						failedRequests: Number(json.failedRequests ?? json.failed_requests ?? 0),
						last24h: json.last24h || { requests: Number(json.last24hRequests ?? json.last_24h_requests ?? 0) },
						rateLimit: Number(json.rateLimit ?? json.rate_limit ?? json.rpm ?? 60),
						expiresAt,
						createdAt,
						lastUsedAt,
						connectionStatus: json.connectionStatus || 'Online',
						isActive: json.isActive ?? (json.status === 'active' || !json.status),
						windowActive: json.windowActive ?? true,
						windowTokensLimit: finalTokensLimit,
						windowTokensUsed: finalTokensUsed,
						remainingTokens: finalTokensRemaining,
						windowResetAt,
						allowedModels: json.allowedModels || json.allowed_models || json.models || ["claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
						allowedProviders: json.allowedProviders || json.allowed_providers || ["opuslive"],
						allocatedCredits: rawCreditsAllocated,
						usedCredits: rawCreditsUsed,
						remainingCredits: rawCreditsRemaining,
						recentLogs: json.recentLogs || json.recent_logs || json.logs || [],
					};
				}
			}
		} catch {
			// continue to next endpoint
		}
	}
	return null;
}
