/**
 * API Gateway - Chat Completions Proxy
 * POST /api/chat/completions
 *
 * Flow:
 * 1. Extract user API key from Authorization header
 * 2. Validate key (active, not expired, has credits)
 * 3. Select best master API key by priority
 * 4. Forward request to upstream provider with automatic failover
 * 5. Log request and return response
 */

import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction, data } from "react-router";
import { handleGatewayRequest } from "~/utils/gateway-service";
import { checkRateLimit } from "~/utils/rate-limiter";

const MAX_BODY_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const meta: MetaFunction = () => [{ title: "API Gateway" }];

export async function loader({ request }: LoaderFunctionArgs) {
	return data({
		status: "ok",
		service: "OpusZen API Gateway",
		version: "1.3.1",
		timestamp: new Date().toISOString(),
		endpoints: {
			chat: "/api/chat/completions",
			keyStatus: "/api/key-status",
			models: "/api/models",
			health: "/api/health",
		},
	});
}

export async function action({ request }: ActionFunctionArgs) {
	const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
	const startTime = Date.now();

	try {
		// 1. Extract and validate user API key
		const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization") ?? "";
		const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

		if (!apiKey) {
			return data({ error: "Missing API key. Provide Authorization: Bearer <key> header." }, { status: 401 });
		}

		const userKey = await import("~/utils/user-key-service").then(m => m.validateUserApiKey(apiKey));
		if (!userKey) {
			return data({ error: "Invalid or expired API key." }, { status: 401 });
		}

		// 1b. Enforce body size limit to prevent memory exhaustion
		const contentLength = request.headers.get("content-length");
		if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE_BYTES) {
			return data({ error: `Request body too large. Maximum size is ${MAX_BODY_SIZE_BYTES / 1024 / 1024} MB.` }, { status: 413 });
		}

		// 2. Parse request body
		let body: any;
		try {
			body = await request.json();
		} catch {
			return data({ error: "Invalid JSON body." }, { status: 400 });
		}

		// 3. Determine provider from model
		const model = body.model ?? "";
		let provider = 'OpenAI';
		if (model.toLowerCase().includes('opuslive')) provider = 'opuslive';
		else if (model.toLowerCase().includes('claude')) provider = 'Anthropic';
		else if (model.toLowerCase().includes('gemini')) provider = 'Google';
		else if (model.toLowerCase().includes('llama') || model.toLowerCase().includes('mixtral')) provider = 'Groq';
		else if (model.toLowerCase().includes('mistral')) provider = 'Mistral';
		else if (model.toLowerCase().includes('command')) provider = 'Cohere';

		// 3b. Enforce allowed models restriction
		if (userKey.allowed_models && userKey.allowed_models.length > 0) {
			const modelAllowed = userKey.allowed_models.some(
				(m: string) => model.toLowerCase().includes(m.toLowerCase())
			);
			if (!modelAllowed) {
				return data({
					error: `Model "${model}" is not allowed for this API key. Allowed: ${userKey.allowed_models.join(", ")}`,
				}, { status: 403 });
			}
		}

		// 3c. Enforce allowed providers restriction
		if (userKey.allowed_providers && userKey.allowed_providers.length > 0) {
			if (!userKey.allowed_providers.includes(provider)) {
				return data({
					error: `Provider "${provider}" is not allowed for this API key. Allowed: ${userKey.allowed_providers.join(", ")}`,
				}, { status: 403 });
			}
		}

		// 3d. Rate limiting (Supabase-backed sliding window)
		if (userKey.rate_limit && userKey.rate_limit > 0) {
			const rateResult = await checkRateLimit(userKey.id, userKey.rate_limit);
			if (!rateResult.allowed) {
				return data({
					error: `Rate limit exceeded. Max ${userKey.rate_limit} requests per minute.`,
					retry_after: rateResult.retryAfter,
				}, { status: 429 });
			}
		}

		const ctx = {
			requestId,
			userApiKey: userKey,
			provider,
			model,
			messages: body.messages ?? [],
			ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "",
			userAgent: request.headers.get("user-agent") ?? "",
		};

		// 4. Execute gateway with failover
		const result = await handleGatewayRequest(ctx);

		// 5. Return response
		if (result.isSuccess) {
			return data(result.responseBody ?? { choices: [] }, {
				status: result.httpStatus === 0 ? 200 : result.httpStatus,
				headers: {
					'X-Request-Id': requestId,
					'X-Master-Key-Id': result.masterKeyId,
					'X-Provider': result.provider,
					'X-Retry-Count': String(result.retryNumber),
					'X-Tokens-Used': String(result.totalTokens),
					'X-Credits-Used': String(result.creditsUsed.toFixed(6)),
				},
			});
		} else {
			const status = result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 500;
			return data({
				error: {
					message: result.errorMessage ?? 'Request failed',
					type: result.httpStatus === 503 ? 'service_unavailable' : 'api_error',
					request_id: requestId,
					retries: result.retryNumber,
				},
			}, { status });
		}

	} catch (err: any) {
		console.error(`[gateway] Unhandled error for ${requestId}:`, err);
		return data({
			error: {
				message: "Internal gateway error. Please try again.",
				type: "internal_error",
				request_id: requestId,
			},
		}, { status: 500 });
	}
}
