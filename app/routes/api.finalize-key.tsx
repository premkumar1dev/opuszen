import { type ActionFunctionArgs } from "react-router";
import { supabaseServer } from "~/utils/supabase.server";
import crypto from "node:crypto";

function generateSecureKey(prefix: string, length: number): string {
	return prefix + crypto.randomBytes(Math.ceil(length / 2)).toString("base64url").slice(0, length);
}

function jsonResponse(body: any, error?: string, status = 200): Response {
	const payload =
		typeof body === "boolean"
			? { success: body, ...(error ? { error } : {}) }
			: body;
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
	const cookieHeader = request.headers.get("Cookie") || request.headers.get("cookie") || "";
	const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
	if (!accessTokenMatch) return null;

	try {
		const { data, error } = await supabaseServer.auth.getUser(accessTokenMatch[1]);
		if (error || !data.user) return null;
		return data.user.id;
	} catch {
		return null;
	}
}

/**
 * POST /api/finalize-key
 *
 * Server-side endpoint that creates an API key for a paid order.
 * Requires authenticated user session.
 *
 * SECURITY: All key parameters (duration, multiplier, credits, pricing)
 * are derived from the confirmed order in the database — NOT from client input.
 */
export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== "POST") {
		return jsonResponse(false, "Method not allowed", 405);
	}

	try {
		const userId = await getAuthenticatedUserId(request);
		if (!userId) {
			return jsonResponse(false, "Authentication required", 401);
		}

		const formData = await request.formData();
		const orderId = (formData.get("orderId") as string) || "";

		if (!orderId) {
			return jsonResponse(false, "Missing order ID", 400);
		}

		// Look up the order from the database — this is the source of truth
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

		let order: {
			id: string;
			user_id: string;
			plan_name: string;
			status: string;
			duration_days: number;
			multiplier: number;
			min_credits: number;
			price_per_1m_input: number;
			price_per_1m_output: number;
			pricing_type: string;
			payment_method: string;
		} | null = null;

		if (isUuid) {
			const { data } = await supabaseServer
				.from("orders")
				.select("id, user_id, plan_name, status, duration_days, multiplier, min_credits, price_per_1m_input, price_per_1m_output, pricing_type, payment_method")
				.eq("id", orderId)
				.maybeSingle();
			order = data;
		} else {
			const { data } = await supabaseServer
				.from("orders")
				.select("id, user_id, plan_name, status, duration_days, multiplier, min_credits, price_per_1m_input, price_per_1m_output, pricing_type, payment_method")
				.or(`display_id.eq.${orderId},payment_ref.eq.${orderId}`)
				.maybeSingle();
			order = data;
		}

		if (!order) {
			return jsonResponse(false, "Order not found", 404);
		}

		// Verify the order belongs to the authenticated user
		if (order.user_id !== userId) {
			return jsonResponse(false, "Access denied — order does not belong to you", 403);
		}

		// Verify the order is paid (not pending or cancelled)
		if (order.status === "cancelled" || order.status === "refunded") {
			return jsonResponse(false, `Order is ${order.status} — cannot finalize`, 400);
		}

		// Check idempotency: if already completed, return success
		if (order.status === "completed") {
			return jsonResponse({ success: true, alreadyFinalized: true });
		}

		// Derive key parameters from the DB order — ignore client-provided values
		const planName = order.plan_name || "Purchased Key";
		const durationDays = order.duration_days || 30;
		const multiplier = order.multiplier || 1;
		const tokenPricing = order.pricing_type === "per_token";
		const minCredits = order.min_credits || 0;
		const pricePer1mInput = order.price_per_1m_input || 0;
		const pricePer1mOutput = order.price_per_1m_output || 0;
		const utr = (formData.get("utr") as string) || "";

		// Mark order as completed
		const { error: orderError } = await supabaseServer
			.from("orders")
			.update({
				status: "completed",
				payment_ref: utr || orderId || null,
				notes: `Order ${orderId} — ${order.payment_method || "payment"} confirmed${utr ? ` (UTR ${utr})` : ""}`,
			})
			.eq("id", order.id)
			.eq("status", "pending");

		if (orderError) {
			console.error("[api/finalize-key] Failed to update order:", orderError);
			return jsonResponse(false, "Failed to update order status", 500);
		}

		// Generate API key (CSPRNG)
		const fullKey = generateSecureKey("sk_live_", 18);

		// Insert the API key (service-role bypasses RLS)
		const { data: keyRow, error: keyError } = await supabaseServer
			.from("user_api_keys")
			.insert({
				user_id: userId,
				api_key: fullKey,
				name: planName,
				status: "active",
				allocated_credits: tokenPricing ? (minCredits || 0) : 0,
				used_credits: 0,
				remaining_credits: tokenPricing ? (minCredits || 0) : 0,
				expiry_date: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
				rate_limit: multiplier >= 20 ? 240 : multiplier >= 10 ? 120 : multiplier >= 5 ? 60 : 20,
				allowed_models: [],
				allowed_providers: [],
				total_requests: 0,
				success_requests: 0,
				failed_requests: 0,
				plan_name: planName,
				pricing_type: tokenPricing ? "per_token" : "flat",
				price_per_1m_input_tokens: pricePer1mInput || 0,
				price_per_1m_output_tokens: pricePer1mOutput || 0,
				tokens_limit:
					multiplier >= 20 ? 50_000_000 : multiplier >= 10 ? 15_000_000 : multiplier >= 5 ? 5_000_000 : 1_000_000,
			})
			.select("id")
			.single();

		if (keyError || !keyRow?.id) {
			console.error("[api/finalize-key] Failed to insert API key:", keyError);
			// Roll back order status
			await supabaseServer.from("orders").update({ status: "pending" }).eq("id", order.id);
			return jsonResponse(false, "Failed to create API key", 500);
		}

		const keyId = keyRow.id;

		// Credit history
		const allocated = tokenPricing ? (minCredits || 0) : 0;
		await supabaseServer.from("user_credit_history").insert({
			user_id: userId,
			user_api_key_id: keyId,
			action: "purchased",
			amount: allocated,
			balance_after: allocated,
			description: `Plan purchased: ${planName}`,
		});

		console.log(`[api/finalize-key] Key generated for user ${userId}, order ${orderId}`);
		return jsonResponse({ success: true, keyId, key: fullKey });
	} catch (err: any) {
		console.error("[api/finalize-key] Unhandled error:", err);
		return jsonResponse(false, "Internal server error", 500);
	}
}
