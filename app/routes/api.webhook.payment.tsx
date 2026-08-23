/**
 * Payment Webhook Endpoint
 * POST /api/webhook/payment
 *
 * Receives callbacks from the payment gateway.
 * Verifies HMAC-SHA256 signature before processing.
 */
import { type ActionFunctionArgs } from "react-router";
import { supabaseServer } from "~/utils/supabase.server";
import { verifyWebhookSignature } from "~/utils/payment-webhook";
import { securityHeaders } from "~/utils/security-headers";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json", ...securityHeaders() },
		});
	}

	// 1. Read raw body for signature verification
	const rawBody = await request.text();

	// 2. Verify webhook signature
	const signature = request.headers.get("x-webhook-signature");
	if (!verifyWebhookSignature(rawBody, signature)) {
		console.warn("[webhook/payment] Rejected unverified webhook");
		return new Response(JSON.stringify({ error: "Invalid signature" }), {
			status: 401,
			headers: { "Content-Type": "application/json", ...securityHeaders() },
		});
	}

	// 3. Parse payload
	let payload: Record<string, any>;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json", ...securityHeaders() },
		});
	}

	// 4. Process payment confirmation
	const { order_id, txn_status, utr, amount } = payload;

	if (!order_id) {
		return new Response(JSON.stringify({ error: "Missing order_id" }), {
			status: 400,
			headers: { "Content-Type": "application/json", ...securityHeaders() },
		});
	}

	try {
		// Look up the order
		const sanitizedId = String(order_id).replace(/[^a-zA-Z0-9_-]/g, "");
		const { data: order } = await supabaseServer
			.from("orders")
			.select("*")
			.or(`id.eq.${sanitizedId},payment_ref.eq.${sanitizedId}`)
			.maybeSingle();

		if (!order) {
			return new Response(JSON.stringify({ error: "Order not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json", ...securityHeaders() },
			});
		}

		// Idempotency: already processed
		if (order.status === "completed") {
			return new Response(JSON.stringify({ success: true, alreadyProcessed: true }), {
				status: 200,
				headers: { "Content-Type": "application/json", ...securityHeaders() },
			});
		}

		// Update order status based on payment confirmation
		const isSuccess = txn_status === "SUCCESS" || txn_status === "success" || txn_status === "COMPLETED";

		const { error: updateError } = await supabaseServer
			.from("orders")
			.update({
				status: isSuccess ? "completed" : "failed",
				payment_ref: utr || order_id,
				notes: `Webhook: ${txn_status}${utr ? ` (UTR ${utr})` : ""}`,
			})
			.eq("id", order.id);

		if (updateError) {
			console.error("[webhook/payment] Failed to update order:", updateError);
			return new Response(JSON.stringify({ error: "Database update failed" }), {
				status: 500,
				headers: { "Content-Type": "application/json", ...securityHeaders() },
			});
		}

		return new Response(JSON.stringify({ success: true, orderStatus: isSuccess ? "completed" : "failed" }), {
			status: 200,
			headers: { "Content-Type": "application/json", ...securityHeaders() },
		});
	} catch (err: any) {
		console.error("[webhook/payment] Error:", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json", ...securityHeaders() },
		});
	}
}
