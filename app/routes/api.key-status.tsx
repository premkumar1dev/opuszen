/**
 * API Key Status Endpoint
 * GET /api/key-status?key=YOUR_KEY
 * POST /api/key-status
 *
 * Returns real-time status for a user or master API key.
 */
import { type MetaFunction, type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { getKeyStatus } from "~/utils/gateway-service";

export const meta: MetaFunction = () => [{ title: "Key Status API" }];

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	let apiKey = (url.searchParams.get("key") ?? "").trim();
	if (!apiKey) {
		const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization") ?? request.headers.get("x-api-key") ?? "";
		apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
	}

	if (!apiKey) {
		return data({ error: "Missing API key. Provide ?key= query parameter, Authorization header, or POST body." }, { status: 400 });
	}

	try {
		const result = await getKeyStatus(apiKey);
		return data(result);
	} catch (err: any) {
		return data({ error: err.message ?? "Failed to check key status" }, { status: 500 });
	}
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
		const result = await getKeyStatus(apiKey);
		return data(result);
	} catch (err: any) {
		return data({ error: err.message ?? "Failed to check key status" }, { status: 500 });
	}
}
