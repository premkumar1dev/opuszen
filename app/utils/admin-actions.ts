import { type ActionFunctionArgs, data } from "react-router";
import { verifyAdminSession } from "./admin-auth";

/**
 * Wraps a server action with admin session verification.
 * Throws 401 if the admin session is invalid.
 *
 * IMPORTANT: Admin status is determined exclusively from the server-side
 * HMAC-signed admin_session cookie. The previous Supabase auth fallback
 * (checking app_metadata.role) has been removed because it bypassed
 * server-side authorization and allowed privilege escalation.
 */
export async function requireAdmin(request: Request): Promise<{ isAdmin: true; email: string | null; adminEmail?: string }> {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) {
		throw data({ error: "Authentication required" }, { status: 401 });
	}
	return { isAdmin: true, email: adminCheck.email, adminEmail: adminCheck.adminEmail };
}

/**
 * Parse JSON body from request, handling both JSON and form-data.
 */
export async function parseRequestBody(request: Request): Promise<any> {
 const contentType = request.headers.get("content-type") || "";
 if (contentType.includes("application/json")) {
 try {
 return await request.json();
 } catch {
 return null;
 }
 }
 try {
 const formData = await request.formData();
 const obj: Record<string, any> = {};
 formData.forEach((value, key) => {
 obj[key] = value;
 });
 return obj;
 } catch {
 return null;
 }
}

/**
 * Validate that required fields are present in the parsed body.
 */
export function validateRequired(body: Record<string, any>, fields: string[]): string | null {
 for (const field of fields) {
 if (body[field] === undefined || body[field] === null || String(body[field]).trim() === "") {
 return `Missing required field: ${field}`;
 }
 }
 return null;
}

/**
 * Sanitize a string input by trimming and removing null bytes.
 */
export function sanitizeString(input: string | undefined | null): string {
 if (!input) return "";
 return input.replace(/\0/g, "").trim();
}

/**
 * Sanitize a number input, returning NaN if invalid.
 */
export function sanitizeNumber(input: any): number {
 const n = Number(input);
 return Number.isFinite(n) ? n : NaN;
}
