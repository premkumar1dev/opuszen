/**
 * API Key Status Endpoint
 * POST /api/key-status
 *
 * Returns real-time status for a user API key.
 * Keys are accepted ONLY via POST body — never via query parameters.
 */
import { type MetaFunction, type ActionFunctionArgs, data } from "react-router";
import { getKeyStatus } from "~/utils/gateway-service";

export const meta: MetaFunction = () => [{ title: "Key Status API" }];

export const loader = () => data({ error: "Method not allowed. Use POST." }, { status: 405 });

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
		return data({ error: "Missing API key" }, { status: 400 });
	}

	try {
		const result = await getKeyStatus(apiKey);
		return data(result);
	} catch (err: any) {
		return data({ error: err.message ?? "Failed to check key status" }, { status: 500 });
	}
}
