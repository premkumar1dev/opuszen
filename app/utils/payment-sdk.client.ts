import { type AxiosResponse } from "axios";
import axios from "axios";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export interface CreateOrderPayload {
	customer_mobile: string;
	user_token: string;
	amount: string;
	order_id: string;
	redirect_url: string;
	remark1: string;
	remark2: string;
}

export interface CreateOrderResponse {
	status?: boolean;
	message?: string;
	result?: {
		orderId: string;
		amount: string;
		status: string;
		paymentUrl?: string;
		payment_link?: string;
		checkoutUrl?: string;
		deepLink?: string;
		[key: string]: unknown;
	};
}

export interface CheckOrderPayload {
	user_token: string;
	order_id: string;
}

export interface CheckOrderResponse {
	status: string;
	message: string;
	result?: {
		txnStatus: string;
		resultInfo: string;
		orderId: string;
		status: string;
		amount: string;
		date: string;
		utr: string;
		[key: string]: unknown;
	};
}

/* ------------------------------------------------------------------ */
/* Configuration */
/* ------------------------------------------------------------------ */

const PAYMENT_BASE_URL =
	import.meta?.env?.VITE_PAYMENT_BASE_URL || "https://khilaadixpro.shop";

/* ------------------------------------------------------------------ */
/* SDK Class */
/* ------------------------------------------------------------------ */

class PaymentSDK {
	private baseUrl: string;

	constructor(baseUrl: string = PAYMENT_BASE_URL) {
		this.baseUrl = baseUrl.replace(/\/$/, "");
	}

	/**
	 * Create a payment order and return the checkout URL
	 */
	async createOrder(
		payload: CreateOrderPayload
	): Promise<CreateOrderResponse> {
		try {
			const params = new URLSearchParams();
			for (const [k, v] of Object.entries(payload)) {
				params.set(k, v);
			}
			const response: AxiosResponse<CreateOrderResponse> = await axios.post(
				`${this.baseUrl}/api/create-order`,
				params.toString(),
				{
					headers: {
						"Content-Type":
							"application/x-www-form-urlencoded",
					},
				}
			);
			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				return (
					error.response?.data || {
						status: false,
						message: "Network error",
					}
				);
			}
			return { status: false, message: "Unexpected error" };
		}
	}

	/**
	 * Check the status of an existing order
	 */
	async checkOrderStatus(
		payload: CheckOrderPayload
	): Promise<CheckOrderResponse> {
		try {
			const params = new URLSearchParams();
			for (const [k, v] of Object.entries(payload)) {
				params.set(k, v);
			}
			const response: AxiosResponse<CheckOrderResponse> = await axios.post(
				`${this.baseUrl}/api/check-order-status`,
				params.toString(),
				{
					headers: {
						"Content-Type":
							"application/x-www-form-urlencoded",
					},
				}
			);
			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				throw error.response?.data || error.message;
			}
			throw error;
		}
	}
}

/* ------------------------------------------------------------------ */
/* Singleton */
/* ------------------------------------------------------------------ */

export const paymentSDK = new PaymentSDK();

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

export function getPaymentUrl(
	response: CreateOrderResponse
): string | null {
	if (!response.result) return null;
	const url =
		response.result.paymentUrl ||
		response.result.payment_link ||
		response.result.checkoutUrl ||
		response.result.deepLink ||
		null;
	if (url && typeof url === "string") return url;
	return null;
}

/** Build a stable user token from Supabase user id */
export function buildUserToken(userId: string): string {
	const raw = `opuszen_${userId}_${Date.now().toString(36)}`;
	return btoa(raw).replace(/[+/=]/g, "").slice(0, 32);
}

/** Extract a phone-like string from a user profile */
export function extractMobile(user: { phone?: string | null; email?: string | null }): string {
	return (user.phone || "0000000000").replace(/\D/g, "").slice(-10) || "0000000000";
}
