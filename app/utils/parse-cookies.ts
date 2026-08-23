/**
 * Shared cookie parsing utility.
 * Used by both admin-auth.ts and csrf.server.ts.
 */

/**
 * Parse a cookie header string into a key-value map.
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
	const cookies: Record<string, string> = {};
	if (!cookieHeader) return cookies;

	cookieHeader.split(";").forEach((cookie) => {
		const trimmed = cookie.trim();
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) return;
		const name = trimmed.slice(0, eqIndex);
		const value = trimmed.slice(eqIndex + 1);
		if (name) {
			cookies[name] = decodeURIComponent(value || "");
		}
	});

	return cookies;
}
