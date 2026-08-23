/**
 * Admin Audit Trail
 *
 * Logs admin actions to the database with:
 * - Who: admin email, IP address
 * - What: action type, entity type, entity ID
 * - When: timestamp
 * - Details: JSONB payload with before/after values
 */

import { supabaseServer } from "~/utils/supabase.server";

export function extractClientIp(request: Request): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		request.headers.get("cf-connecting-ip") ||
		"127.0.0.1"
	);
}

type AdminAuditAction =
	| "admin_login"
	| "admin_logout"
	| "admin_session_revoked"
	| "admin_session_bulk_revoked"
	| "plan_created"
	| "plan_updated"
	| "plan_deleted"
	| "plan_assigned"
	| "plan_unassigned"
	| "key_created"
	| "key_updated"
	| "key_deleted"
	| "key_status_changed"
	| "key_tokens_edited"
	| "child_key_created"
	| "child_key_deleted"
	| "child_key_tokens_edited"
	| "settings_updated"
	| "payment_settings_updated"
	| "order_created"
	| "order_updated"
	| "order_refunded"
	| "gateway_config_updated";

export interface AuditLogEntry {
	action: AdminAuditAction;
	entityType: "plan" | "api_key" | "child_key" | "assignment" | "setting" | "order" | "session";
	entityId: string;
	details?: Record<string, unknown>;
	adminEmail?: string;
	adminIp?: string;
}

/**
 * Write an audit log entry to the database.
 * This is fire-and-forget — failures are logged but never thrown.
 */
export async function logAdminAction(request: Request, entry: AuditLogEntry): Promise<void> {
	try {
		const adminEmail = extractAdminEmail(request);
		const adminIp = extractClientIp(request);

		await supabaseServer.from("admin_activity_logs").insert({
			action: entry.action,
			entity_type: entry.entityType,
			entity_id: entry.entityId,
			admin_email: adminEmail,
			admin_ip: adminIp,
			details: entry.details ?? {},
		});
	} catch (error) {
		// Never throw from audit logging — we don't want audit failures
		// to break the action that triggered them
		console.error(`[audit] Failed to log ${entry.action}:`, error);
	}
}

/**
 * Extract admin email from the admin session cookie.
 * Returns null if session is invalid.
 */
async function extractAdminEmail(request: Request): Promise<string | null> {
	try {
		const raw = request.headers.get("Cookie") || request.headers.get("cookie") || "";
		const cookies = Object.fromEntries(
			raw.split("; ").map(c => {
				const eq = c.indexOf("=");
				return [c.slice(0, eq), c.slice(eq + 1)];
			})
		);
		const sessionCookie = cookies["admin_session"];
		if (!sessionCookie) return null;

		// The cookie format is: nonce|email|ipPrefix|timestamp|signature
		// Values are decodeURIComponent-encoded in parseCookies, but we
		// parse the raw string here to avoid double-decoding.
		const decoded = decodeURIComponent(sessionCookie);
		const parts = decoded.split("|");
		return parts.length === 5 ? parts[1] : null;
	} catch {
		return null;
	}
}

/**
 * Convenience: log an admin login event.
 */
export async function logAdminLogin(request: Request, success: boolean): Promise<void> {
	try {
		const raw = request.headers.get("Cookie") || request.headers.get("cookie") || "";
		const cookies = Object.fromEntries(
			raw.split("; ").map(c => {
				const eq = c.indexOf("=");
				return [c.slice(0, eq), c.slice(eq + 1)];
			})
		);
		const sessionCookie = cookies["admin_session"];
		const parts = sessionCookie ? decodeURIComponent(sessionCookie).split("|") : [];
		const email = parts.length === 5 ? parts[1] : null;

		await logAdminAction(request, {
			action: "admin_login",
			entityType: "session",
			entityId: email || "unknown",
			adminEmail: email || undefined,
			details: { success },
		});
	} catch {
		// best-effort
	}
}
