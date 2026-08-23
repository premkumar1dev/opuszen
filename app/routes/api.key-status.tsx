/**
 * API Key Status Endpoint
 * GET /api/key-status?key=YOUR_KEY
 * POST /api/key-status
 *
 * Returns SANITIZED real-time status for a user or master API key.
 * OpusLive plan names (5X, 20X, etc.) are NEVER exposed to customers.
 * All plan branding comes from the OpusZen admin_plans table.
 */
import { type MetaFunction, type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { getSanitizedKeyStatus } from "~/utils/sanitized-key-status";

export const meta: MetaFunction = () => [{ title: "Key Status API" }];

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, api-key",
};

async function handleKeyStatusRequest(request: Request) {
	let apiKey = "";

	// 1. Check URL query param ?key=
	const url = new URL(request.url);
	apiKey = (url.searchParams.get("key") || "").trim();

	// 2. Check Authorization / x-api-key headers
	if (!apiKey) {
		const authHeader =
			request.headers.get("authorization") ??
			request.headers.get("Authorization") ??
			request.headers.get("x-api-key") ??
			request.headers.get("api-key") ??
			"";
		apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
	}

	// 3. If POST, check form data or JSON body
	if (!apiKey && request.method === "POST") {
		try {
			const cloned = request.clone();
			const contentType = request.headers.get("content-type") || "";
			if (contentType.includes("application/json")) {
				const body = await cloned.json().catch(() => ({}));
				apiKey = String(body.key ?? body.apiKey ?? body.api_key ?? "").trim();
			} else {
				const formData = await cloned.formData().catch(() => null);
				if (formData) {
					apiKey = String(formData.get("key") ?? formData.get("apiKey") ?? "").trim();
				}
			}
		} catch {
			apiKey = "";
		}
	}

	apiKey = apiKey.replace(/^["']|["']$/g, "").trim();

	if (!apiKey) {
		return data(
			{ error: "Missing API key. Pass ?key=YOUR_KEY, Authorization: Bearer YOUR_KEY, or a JSON body with { \"key\": \"...\" }." },
			{ status: 400, headers: CORS_HEADERS }
		);
	}

	try {
		const result = await getSanitizedKeyStatus(apiKey);
		const statusCode = result.status === "error" ? 401 : 200;
		return data(result, { status: statusCode, headers: CORS_HEADERS });
	} catch (err: any) {
		return data({ error: err.message ?? "Failed to check key status" }, { status: 500, headers: CORS_HEADERS });
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}
	return await handleKeyStatusRequest(request);
}

export async function action({ request }: ActionFunctionArgs) {
	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}
	return await handleKeyStatusRequest(request);
}
