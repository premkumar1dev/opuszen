/**
 * API Key Status Endpoint
 * POST /api/key-status
 *
 * Returns real-time status for a user API key.
 */
import { type MetaFunction, type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";

export const meta: MetaFunction = () => [{ title: "Key Status API" }];
import { getKeyStatus } from "~/utils/gateway-service";

export async function action({ request }: ActionFunctionArgs) {
 let apiKey = "";

 try {
 const formData = await request.formData();
 apiKey = String(formData.get("key") ?? "").trim();
 } catch {
 // Also try JSON body
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

export async function loader({ request }: LoaderFunctionArgs) {
 const url = new URL(request.url);
 const apiKey = String(url.searchParams.get("key") || "").trim();

 if (!apiKey) {
 return data({ error: "Missing API key. Provide it as a query parameter ?key=" }, { status: 400 });
 }

 try {
 const result = await getKeyStatus(apiKey);
 return data(result);
 } catch (err: any) {
 return data({ error: err.message ?? "Failed to check key status" }, { status: 500 });
 }
}
