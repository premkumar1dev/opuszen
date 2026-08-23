/**
 * Lightweight input validation utilities for route handlers.
 * No external dependencies — pure TypeScript validation.
 */

/**
 * Validate that a string is a non-empty, trimmed value within optional length bounds.
 * Rejects strings with null bytes and trims whitespace.
 */
export function validateString(
	value: unknown,
	options: {
		minLength?: number;
		maxLength?: number;
		pattern?: RegExp;
		message?: string;
		allowEmpty?: boolean;
	} = {}
): { valid: boolean; value: string; error?: string } {
	const {
		minLength = 0,
		maxLength = 10000,
		pattern,
		message = "Invalid input",
		allowEmpty = false,
	} = options;

	if (typeof value !== "string") {
		return { valid: false, value: "", error: message };
	}

	const trimmed = value.trim();

	if (!allowEmpty && trimmed.length === 0) {
		return { valid: false, value: "", error: message };
	}

	if (trimmed.length < minLength) {
		return { valid: false, value: "", error: `${message}: too short (min ${minLength} chars)` };
	}

	if (trimmed.length > maxLength) {
		return { valid: false, value: "", error: `${message}: too long (max ${maxLength} chars)` };
	}

	if (/\0/.test(trimmed)) {
		return { valid: false, value: "", error: message };
	}

	if (pattern && !pattern.test(trimmed)) {
		return { valid: false, value: "", error: message };
	}

	return { valid: true, value: trimmed };
}

/**
 * Validate a number is within a range.
 */
export function validateNumber(
	value: unknown,
	options: {
		min?: number;
		max?: number;
		integer?: boolean;
		message?: string;
		required?: boolean;
	} = {}
): { valid: boolean; value: number | null; error?: string } {
	const {
		min = -Infinity,
		max = Infinity,
		integer = false,
		message = "Invalid number",
		required = false,
	} = options;

	if (value === undefined || value === null || value === "") {
		if (required) return { valid: false, value: null, error: message };
		return { valid: true, value: null };
	}

	const num = Number(value);
	if (!Number.isFinite(num)) {
		return { valid: false, value: null, error: message };
	}

	if (integer && !Number.isInteger(num)) {
		return { valid: false, value: null, error: `${message}: must be an integer` };
	}

	if (num < min || num > max) {
		return { valid: false, value: null, error: `${message}: must be between ${min} and ${max}` };
	}

	return { valid: true, value: num };
}

/**
 * Validate an array of strings.
 */
export function validateStringArray(
	value: unknown,
	options: {
		minLength?: number;
		maxLength?: number;
		maxItems?: number;
		message?: string;
	} = {}
): { valid: boolean; value: string[]; error?: string } {
	const {
		minLength = 0,
		maxLength = 200,
		maxItems = 100,
		message = "Invalid array",
	} = options;

	if (!Array.isArray(value)) {
		return { valid: false, value: [], error: message };
	}

	if (value.length > maxItems) {
		return { valid: false, value: [], error: `${message}: too many items (max ${maxItems})` };
	}

	const sanitized: string[] = [];
	for (const item of value) {
		if (typeof item !== "string") continue;
		const trimmed = item.trim().replace(/\0/g, "");
		if (trimmed.length > maxLength) {
			return { valid: false, value: [], error: `${message}: item too long (max ${maxLength} chars)` };
		}
		if (trimmed.length >= minLength) {
			sanitized.push(trimmed);
		}
	}

	return { valid: true, value: sanitized };
}

/**
 * Validate a UUID format.
 */
export function validateUuid(
	value: unknown,
	message = "Invalid ID format"
): { valid: boolean; value: string; error?: string } {
	if (typeof value !== "string") {
		return { valid: false, value: "", error: message };
	}
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(value)) {
		return { valid: false, value: "", error: message };
	}
	return { valid: true, value };
}

/**
 * Validate an email format (basic RFC 5322 compliance).
 */
export function validateEmail(
	value: unknown,
	message = "Invalid email address"
): { valid: boolean; value: string; error?: string } {
	if (typeof value !== "string") {
		return { valid: false, value: "", error: message };
	}
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.length > 254) {
		return { valid: false, value: "", error: message };
	}
	// Basic RFC 5322-ish pattern
	const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
	if (!emailRegex.test(trimmed)) {
		return { valid: false, value: "", error: message };
	}
	return { valid: true, value: trimmed };
}
