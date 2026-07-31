import { type ActionFunctionArgs, data } from "react-router";
import { verifyAdminSession } from "./admin-auth";

/**
 * Wraps a server action with admin session verification.
 * Throws 401 if the admin session is invalid.
 * Returns { isAdmin: true, email, adminEmail } on success.
 */
export async function requireAdmin(request: Request): Promise<{ isAdmin: true; email: string | null; adminEmail?: string }> {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) {
 const cookieHeader = request.headers.get("Cookie") || request.headers.get("cookie") || "";
 const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
 if (accessTokenMatch) {
 try {
 const { createClient } = await import("@supabase/supabase-js");
 const url = import.meta.env.VITE_SUPABASE_URL;
 const pubKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if (url && pubKey) {
 const supa = createClient(url, pubKey);
 const { data, error } = await supa.auth.getUser(accessTokenMatch[1]);
 if (!error && data.user) {
 const role = (data.user as any).app_metadata?.role;
 if (role === "admin") {
 return { isAdmin: true, email: data.user.email ?? null, adminEmail: data.user.email ?? undefined };
 }
 }
 }
 } catch {
 // fall through to 401
 }
 }
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
