export interface AdminSessionPayload {
	isAdmin: boolean;
	adminEmail?: string;
	email: string | null;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
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

type LogFunction = (message: string) => void;

let serverLogFn: LogFunction | null = null;

export function setAdminAuthLogger(fn: LogFunction | null) {
	serverLogFn = fn;
}

function logAuth(message: string) {
	try {
		serverLogFn?.(`[admin-auth] ${message}`);
	} catch {
		// never throw from logging
	}
}

async function computeHMAC(secret: string, message: string): Promise<string> {
	const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
	if (!cryptoObj || !cryptoObj.subtle) {
		throw new Error("Web Crypto API is not supported in this environment.");
	}
	const enc = new TextEncoder();
	const key = await cryptoObj.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: { name: "SHA-256" } },
		false,
		["sign"]
	);
	const signature = await cryptoObj.subtle.sign("HMAC", key, enc.encode(message));
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function timingSafeEqual(a: string, b: string): boolean {
	// Pad both to the same length to avoid leaking length info via early return
	const maxLen = Math.max(a.length, b.length);
	const paddedA = a.padEnd(maxLen, '\0');
	const paddedB = b.padEnd(maxLen, '\0');
	let result = a.length ^ b.length; // will be non-zero if lengths differ
	for (let i = 0; i < maxLen; i++) {
		result |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i);
	}
	return result === 0;
}

function getSecret(): string | null {
	if (typeof process !== "undefined" && process.env?.ADMIN_SESSION_SECRET) {
		return process.env.ADMIN_SESSION_SECRET;
	}
	if (import.meta.env?.ADMIN_SESSION_SECRET) {
		return import.meta.env.ADMIN_SESSION_SECRET;
	}
	return null;
}

function getAdminEmail(): string | null {
	if (typeof process !== "undefined" && process.env?.VITE_ADMIN_EMAIL) {
		return process.env.VITE_ADMIN_EMAIL;
	}
	if (import.meta.env?.VITE_ADMIN_EMAIL) {
		return import.meta.env.VITE_ADMIN_EMAIL;
	}
	return null;
}

export async function verifyAdminSession(request?: Request): Promise<AdminSessionPayload> {
	try {
		let cookieString: string | null = null;
		if (request) {
			cookieString = request.headers.get("Cookie") || request.headers.get("cookie");
		} else if (typeof document !== "undefined") {
			cookieString = document.cookie;
		}

		const cookies = parseCookies(cookieString);
		const sessionCookieValue = cookies["admin_session"];

		const secret = getSecret();
		const adminEmail = getAdminEmail();

		if (!secret) {
			logAuth("ADMIN_SESSION_SECRET not configured — bypass disabled");
			return { isAdmin: false, email: null };
		}

		if (!sessionCookieValue) {
			return { isAdmin: false, email: null };
		}

		const parts = sessionCookieValue.split("|");
		if (parts.length !== 3) {
			return { isAdmin: false, email: null };
		}

		const [email, timestampStr, signature] = parts;
		const timestamp = parseInt(timestampStr, 10);

		if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
			return { isAdmin: false, email: null };
		}

		const payload = `${email}|${timestamp}`;
		const expectedSignature = await computeHMAC(secret, payload);

		if (!timingSafeEqual(signature, expectedSignature)) {
			logAuth("HMAC signature mismatch — session rejected");
			return { isAdmin: false, email: null };
		}

		return { isAdmin: true, adminEmail: email, email };
	} catch (error) {
		logAuth(`verifyAdminSession error: ${error instanceof Error ? error.message : String(error)}`);
		return { isAdmin: false, email: null };
	}
}

export async function createAdminSession(email: string): Promise<string> {
	const secret = getSecret();
	if (!secret) {
		console.warn(
			"ADMIN_SESSION_SECRET is not configured — skipping server-side session creation. " +
			"Set ADMIN_SESSION_SECRET in your server environment for full session support."
		);
		return "";
	}

	const timestamp = Date.now();
	const payload = `${email}|${timestamp}`;
	const signature = await computeHMAC(secret, payload);

	return `${payload}|${signature}`;
}

export async function destroyAdminSession(): Promise<void> {
	try {
		if (typeof document !== "undefined") {
			const expiration = new Date(0).toUTCString();
			document.cookie = "admin_session=; path=/; max-age=0; expires=" + expiration + "; SameSite=Strict";
			document.cookie = "admin_bypass=; path=/; max-age=0; expires=" + expiration + "; SameSite=Strict";
		}
	} catch {
		// best-effort cleanup
	}
}
