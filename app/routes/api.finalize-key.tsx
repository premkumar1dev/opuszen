import { type ActionFunctionArgs } from "react-router";
import { supabaseServer } from "~/utils/supabase.server";
import crypto from "node:crypto";

function generateSecureKey(prefix: string, length: number): string {
	return prefix + crypto.randomBytes(Math.ceil(length / 2)).toString("base64url").slice(0, length);
}

function jsonResponse(body: any, error?: string, status = 200): Response {
	const payload = typeof body === "boolean" ? { success: body, error } : body;
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
 */
export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== "POST") {
		return jsonResponse(false, "Method not allowed", 405);
	}

	try {
		const userId = getAuthenticatedUserId(request);
		if (!userId) {
			return jsonResponse(false, "Authentication required", 401);
		}

		const formData = await request.formData();
		const orderId = formData.get("orderId") as string;
		const planId = formData.get("planId") as string;
		const planName = formData.get("planName") as string;
		const durationDays = parseInt(formData.get("duration") as string || "30", 10);
		const multiplier = parseFloat(formData.get("multiplier") as string || "1");
		const keyName = (formData.get("keyName") as string) || "Purchased Key";
		const tokenPricing = formData.get("tokenPricing") === "1";
		const pricePer1mInput = parseFloat(formData.get("pricePer1mInput") as string || "0");
		const pricePer1mOutput = parseFloat(formData.get("pricePer1mOutput") as string || "0");
		const minCredits = parseFloat(formData.get("minCredits") as string || "0");
		const paymentMethod = formData.get("method") as string || "PAY0";
		const txnRef = (formData.get("txnRef") as string) || "";
		const utr = (formData.get("utr") as string) || "";
		const _amount = (formData.get("amount") as string) || "0";

		if (!orderId || !userId) {
			return jsonResponse(false, "Missing order ID or user ID", 400);
		}

		// Check idempotency: if already completed, return success
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
		let existingOrder: { id: string; status: string } | null = null;

		if (isUuid) {
			const { data } = await supabaseServer
				.from("orders")
				.select("id, status")
				.eq("id", orderId)
				.maybeSingle();
			existingOrder = data;
		} else {
			const { data } = await supabaseServer
				.from("orders")
				.select("id, status")
				.or(`display_id.eq.${orderId},payment_ref.eq.${orderId}`)
				.maybeSingle();
			existingOrder = data;
		}

		if (existingOrder?.status === "completed") {
			return jsonResponse({ success: true, alreadyFinalized: true });
		}

		const dbOrderId = existingOrder?.id || (isUuid ? orderId : null);

		if (dbOrderId) {
			// Mark order as completed
			const { error: orderError } = await supabaseServer
				.from("orders")
				.update({
					status: "completed",
					payment_ref: utr || txnRef || orderId || null,
					notes: `Order ${orderId} — ${paymentMethod} confirmed${utr ? ` (UTR ${utr})` : ""}`,
				})
				.eq("id", dbOrderId)
				.eq("status", "pending");

			if (orderError) {
				console.error("[api/finalize-key] Failed to update order:", orderError);
				return jsonResponse(false, "Failed to update order status", 500);
			}
		}

		// Generate API key (CSPRNG)
		const fullKey = generateSecureKey("sk_live_", 18);

		// Insert the API key (service-role bypasses RLS)
		const { data: keyRow, error: keyError } = await supabaseServer
			.from("user_api_keys")
			.insert({
				user_id: userId,
				api_key: fullKey,
				name: keyName || "Purchased Key",
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
			await supabaseServer.from("orders").update({ status: "pending" }).eq("id", dbOrderId);
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
