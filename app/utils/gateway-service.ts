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
	validateUserApiKey,
	recordUserKeyUsage,
} from "~/utils/user-key-service";
import { logApiRequest, logFailover } from "~/utils/logging-service";
import { recordHealthSuccess, recordHealthFailure } from "~/utils/health-service.server";
import { calculateCredits, estimateTokens, recordUsage } from "~/utils/usage-service";
import { getGatewayConfig } from "~/utils/gateway-config";

// ---------------------------------------------------------------------------
// Provider configurations & domain validation
// ---------------------------------------------------------------------------
const ALLOWED_PROVIDER_DOMAINS = [
	"api.openai.com",
	"api.anthropic.com",
	"generativelanguage.googleapis.com",
	"api.groq.com",
	"api.mistral.ai",
	"api.cohere.ai",
	"api.opuszen.com",
	"api.opuszen.live",
	"api.opuszen.shop",
	"api.domain",
	"api.domain.com",
];

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
		baseUrl: 'https://api.opuszen.shop/v1',
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
		const systemMsgs = request.messages.filter((m) => m.role === 'system');
		const otherMsgs = request.messages.filter((m) => m.role !== 'system');

		const systemContent = systemMsgs.length > 0
			? systemMsgs.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n')
			: undefined;

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

		return {
			model: request.model,
			max_tokens: request.max_tokens ?? 4096,
			temperature: request.temperature ?? 0.7,
			...(systemContent ? { system: systemContent } : {}),
			messages: anthropicMessages,
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
			choices: Array.isArray((body as any)?.content)
				? (body as any).content.map((c: Record<string, unknown>) => ({
					message: { content: (c as any).text ?? "", role: "assistant" },
					finish_reason: (c as any).stop_reason ?? "stop",
				}))
				: [],
			usage: body.usage ? {
				promptTokens: Number(body.usage.input_tokens ?? 0),
				completionTokens: Number(body.usage.output_tokens ?? 0),
				totalTokens: Number(body.usage.input_tokens ?? 0) + Number(body.usage.output_tokens ?? 0),
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

	// When failover is disabled, only try the first (highest-priority) key.
	// Bug fix: the original condition 'retryNumber > 0' broke the loop after a single
	// retry even when failover was enabled, so secondary keys were never tried.
	const keysToTry = failoverEnabled ? activeKeys : [activeKeys[0]];

	for (const candidate of keysToTry) {
		masterKey = candidate;

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
			const usage = extractUsage(responseBody as ChatCompletionResponse, ctx.model);

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
				const totalCredits = currentKey.total_credits ?? 0;
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
					const { data: refreshed, error: refetchError } = await supabase
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
		return { status: 'error', error: 'API key is required' };
	}
	const cleanKey = apiKey.trim().replace(/^Bearer\s+/i, "");
	if (!cleanKey) {
		return { status: 'error', error: 'API key is empty' };
	}

	// 0. Upstream Remote API Gateway fetch (from commit 1e9da231ffa3c5992a42cefe792d41b61cdfda80)
	if (cleanKey.startsWith("sk-ant-opm-") || cleanKey.startsWith("sk-ant-api") || cleanKey.startsWith("sk-ant-") || cleanKey.startsWith("sk-")) {
		try {
			const res = await fetch(`https://api.opusmax.live/api/key-status?key=${encodeURIComponent(cleanKey)}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});
			if (res.ok) {
				const remoteData = await res.json();
				if (remoteData && remoteData.status !== "error" && !remoteData.error) {
					return {
						status: 'ok',
						isRealtime: true,
						...remoteData,
					};
				}
			}
		} catch (e) {
			console.error("[gateway] Failed to fetch key status from remote API:", e);
		}
	}

	// 1. Check user_api_keys table (regardless of status, so detailed status can be reported)
	const { data: userKeyData } = await supabase
		.from('user_api_keys')
		.select('*')
		.eq('api_key', cleanKey)
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

		const allocated = key.allocated_credits || 0;
		const used = key.used_credits || 0;
		const remaining = key.remaining_credits ?? Math.max(0, allocated - used);
		const usagePercent = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
		const isActive = effectiveStatus === 'active';

		// Real-time queries for 24h count, last activity, and recent request logs
		let recentLogs: any[] = [];
		let last24hCount = key.total_requests || 0;
		let lastUsedAt = key.last_used;

		try {
			const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
			const [logsRes, countRes] = await Promise.all([
				supabase
					.from('api_request_logs')
					.select('created_at, model, http_status, is_success')
					.or(`user_api_key_id.eq.${key.id},user_id.eq.${key.user_id}`)
					.order('created_at', { ascending: false })
					.limit(20),
				supabase
					.from('api_request_logs')
					.select('id', { count: 'exact', head: true })
					.or(`user_api_key_id.eq.${key.id},user_id.eq.${key.user_id}`)
					.gte('created_at', twentyFourHoursAgo)
			]);

			if (logsRes.data && logsRes.data.length > 0) {
				recentLogs = logsRes.data.map(l => ({
					time: l.created_at,
					model: l.model || 'claude-3-5-sonnet-20241022',
					status: l.http_status || (l.is_success ? 200 : 500)
				}));
				if (!lastUsedAt) {
					lastUsedAt = logsRes.data[0].created_at;
				}
			}
			if (typeof countRes.count === 'number' && countRes.count > 0) {
				last24hCount = countRes.count;
			}
		} catch (e) {
			// silence log fetch errors
		}

		return {
			status: 'ok',
			isRealtime: true,
			keyStatus: effectiveStatus,
			name: key.name || 'User API Key',
			planName: key.plan_name || 'Custom Plan',
			unlimited: allocated === 0,
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
			windowTokensLimit: allocated > 0 ? allocated * 1000 : 10000000,
			windowTokensUsed: Math.round(used * 1000),
			remainingTokens: Math.max(0, (allocated * 1000) - Math.round(used * 1000)),
			windowResetAt: key.expiry_date,
			allowedModels: key.allowed_models?.length ? key.allowed_models : ["claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
			allowedProviders: key.allowed_providers || [],
			allocatedCredits: allocated,
			usedCredits: used,
			remainingCredits: remaining,
			recentLogs,
			...(effectiveStatus !== 'active' ? { warning: `Key is currently ${effectiveStatus}.` } : {}),
		};
	}

	// 2. If not found in user_api_keys, check master_api_keys table
	const isUuidKey = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey);
	const { data: masterKeyData } = await supabase
		.from('master_api_keys')
		.select('*')
		.or(isUuidKey ? `api_key.eq.${cleanKey},id.eq.${cleanKey}` : `api_key.eq.${cleanKey}`)
		.maybeSingle();

	if (masterKeyData) {
		const m = masterKeyData as any;
		const allocated = m.allocated_credits || 0;
		const used = m.used_credits || 0;
		const remaining = m.remaining_credits ?? Math.max(0, allocated - used);
		const usagePercent = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
		const isActive = m.status === 'active' && m.health_status === 'healthy';

		return {
			status: 'ok',
			keyStatus: m.status || 'active',
			healthStatus: m.health_status || 'healthy',
			name: m.name || `${m.provider} Master Key`,
			provider: m.provider,
			planName: `Master Key (${m.provider})`,
			unlimited: allocated === 0,
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
			windowTokensLimit: allocated > 0 ? allocated * 1000 : 100000000,
			windowTokensUsed: Math.round(used * 1000),
			remainingTokens: Math.max(0, (allocated * 1000) - Math.round(used * 1000)),
			windowResetAt: m.expiry_date,
			allowedModels: ["claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
			allowedProviders: [m.provider],
			allocatedCredits: allocated,
			usedCredits: used,
			remainingCredits: remaining,
			recentLogs: [],
		};
	}

	return { status: 'error', error: 'Invalid or expired API key' };
}
