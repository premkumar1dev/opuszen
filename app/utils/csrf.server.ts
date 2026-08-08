/**
 * CSRF protection for server actions and API endpoints.
 *
 * Uses the Origin/Referer header check for same-origin form submissions.
 * For form-based actions (React Router), also supports a double-submit
 * cookie pattern as defense-in-depth.
 */

import crypto from "node:crypto";

const CSRF_COOKIE = "_csrf";
const TOKEN_BYTES = 32;

/** Generate a cryptographically random CSRF token */
export function generateCsrfToken(): string {
	return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

/** Parse a cookie header into a simple key-value map */
export function parseCookies(header: string | null): Record<string, string> {
	if (!header) return {};
	return header.split(";").reduce<Record<string, string>>((acc, part) => {
		const idx = part.indexOf("=");
		if (idx === -1) return acc;
		const rawKey = part.slice(0, idx).trim();
		const rawVal = part.slice(idx + 1).trim();
		acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal);
		return acc;
	}, {});
}

/**
 * Verify a CSRF token from a form submission.
 *
 * @param request - The incoming Request
 * @param csrfFieldName - The name of the hidden form field (default: "_csrf")
 * @returns true if the request passes CSRF checks
 */
export async function verifyCsrf(request: Request, csrfFieldName = "_csrf"): Promise<boolean> {
	// 1. Check Origin header (modern browsers send this for POST)
	const origin = request.headers.get("Origin") || request.headers.get("origin");
	const referer = request.headers.get("Referer") || request.headers.get("referer");
	const host = request.headers.get("Host") || request.headers.get("host");

	// For same-origin requests, the Origin header will match our host
	if (origin && host) {
		const originHost = new URL(origin).host;
		if (originHost !== host) {
			console.warn(`[csrf] Origin mismatch: ${originHost} !== ${host}`);
			return false;
		}
		return true;
	}

	// 2. Fallback: check Referer header
	if (referer && host) {
		try {
			const refHost = new URL(referer).host;
			if (refHost !== host) {
				console.warn(`[csrf] Referer mismatch: ${refHost} !== ${host}`);
				return false;
			}
			return true;
		} catch {
			console.warn("[csrf] Invalid Referer header");
			return false;
		}
	}

	// 3. If no Origin/Referer, require the double-submit cookie token
	// (This covers cases where the browser doesn't send Origin for same-site requests)
	const cookieHeader = request.headers.get("Cookie") || "";
	const cookies = parseCookies(cookieHeader);
	const cookieToken = cookies[CSRF_COOKIE];

	if (!cookieToken) {
		console.warn("[csrf] No Origin/Referer and no CSRF cookie — rejecting");
		return false;
	}

	// Read the form field
	let formToken: string | null = null;
	try {
		const formData = await request.clone().formData();
		formToken = formData.get(csrfFieldName) as string | null;
	} catch {
		console.warn("[csrf] Failed to read form data for CSRF check");
		return false;
	}

	if (!verifyCsrfToken(cookieToken, formToken)) {
		return false;
	}

	return true;
}

/**
 * Verify a CSRF token using double-submit cookie pattern.
 * Caller reads the form first, then passes both values.
 */
export function verifyCsrfToken(cookieToken: string, formToken: string | null): boolean {
	if (!cookieToken || !formToken) {
		console.warn("[csrf] Missing token — rejecting request");
		return false;
	}

	// Timing-safe comparison
	const cookieBuf = Buffer.from(cookieToken);
	const formBuf = Buffer.from(formToken);

	if (cookieBuf.length !== formBuf.length) {
		console.warn("[csrf] Token length mismatch — rejecting request");
		return false;
	}

	let result = 0;
	for (let i = 0; i < cookieBuf.length; i++) {
		result |= cookieBuf[i] ^ formBuf[i];
	}

	if (result !== 0) {
		console.warn("[csrf] Token mismatch — rejecting request");
		return false;
	}

	return true;
}

/** Build a Set-Cookie header for the CSRF token */
export function buildCsrfCookie(token: string): string {
	const parts = [
		`${CSRF_COOKIE}=${token}`,
		"HttpOnly",
		"SameSite=Strict",
		"Path=/",
		"Max-Age=3600",
	];
	// In production, add Secure flag
	if (process.env.NODE_ENV === "production") {
		parts.push("Secure");
	}
	return parts.join("; ");
}
