/**
 * Payment Webhook Signature Verification
 *
 * Verifies that incoming webhook callbacks from the payment gateway
 * are authentic by checking HMAC-SHA256 signatures.
 *
 * Env var required: PAYMENT_WEBHOOK_SECRET (server-side only)
 */

import crypto from "node:crypto";

/**
 * Verify a webhook payload signature.
 *
 * The gateway should sign the raw request body using HMAC-SHA256
 * and include the signature in the X-Webhook-Signature header.
 *
 * @param rawBody - The raw (unparsed) request body bytes
 * @param signatureHeader - The X-Webhook-Signature header value
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(
	rawBody: string | Buffer,
	signatureHeader: string | null
): boolean {
	const secret = process.env.PAYMENT_WEBHOOK_SECRET;

	if (!secret) {
		// FAIL-CLOSED: reject all webhooks if the secret is not configured.
		// This prevents forged payment confirmations in misconfigured deployments.
		console.error("[payment-webhook] CRITICAL: PAYMENT_WEBHOOK_SECRET is not configured — rejecting all webhooks. Set this env var to enable webhook processing.");
		return false;
	}

	if (!signatureHeader) {
		console.warn("[payment-webhook] Missing X-Webhook-Signature header");
		return false;
	}

	const expectedSignature = crypto
		.createHmac("sha256", secret)
		.update(rawBody)
		.digest("hex");

	// Timing-safe comparison
	const sigBuf = Buffer.from(signatureHeader);
	const expectedBuf = Buffer.from(expectedSignature);

	if (sigBuf.length !== expectedBuf.length) {
		console.warn("[payment-webhook] Signature length mismatch");
		return false;
	}

	let result = 0;
	for (let i = 0; i < sigBuf.length; i++) {
		result |= sigBuf[i] ^ expectedBuf[i];
	}

	if (result !== 0) {
		console.warn("[payment-webhook] Signature mismatch");
		return false;
	}

	return true;
}

/**
 * Compute a webhook signature for outbound callbacks (if needed).
 */
export function computeWebhookSignature(rawBody: string | Buffer): string {
	const secret = process.env.PAYMENT_WEBHOOK_SECRET || "";
	return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}
