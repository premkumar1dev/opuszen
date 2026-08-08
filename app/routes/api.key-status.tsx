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

export async function loader({ request }: LoaderFunctionArgs) {
	return data(
		{ error: "GET /api/key-status does not accept query parameters — use POST with the key in the body or an Authorization header." },
		{ status: 405 }
	);
}

export async function action({ request }: ActionFunctionArgs) {
	let apiKey = "";

	try {
		const formData = await request.formData();
		apiKey = String(formData.get("key") ?? "").trim();
	} catch {
		try {
			const body = await request.json();
			apiKey = String(body.key ?? "").trim();
		} catch {
			apiKey = "";
		}
	}

	if (!apiKey) {
		const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization") ?? request.headers.get("x-api-key") ?? "";
		apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
	}

	if (!apiKey) {
		return data({ error: "Missing API key" }, { status: 400 });
	}

	try {
		const result = await getSanitizedKeyStatus(apiKey);
		return data(result);
	} catch (err: any) {
		return data({ error: err.message ?? "Failed to check key status" }, { status: 500 });
	}
}
