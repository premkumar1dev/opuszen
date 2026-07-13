import { Request, Response } from 'express';
import crypto from 'crypto';

interface WebhookPayload {
	status?: string;
	order_id?: string;
	remark1?: string;
	amount?: string;
	[key: string]: unknown;
}

function verifyWebhookSignature(req: Request, secret: string): boolean {
	const signature = req.headers['x-webhook-signature'];
	if (!signature || typeof signature !== 'string') {
		return false;
	}

	const payload = JSON.stringify(req.body);
	const expectedSignature = crypto
		.createHmac('sha256', secret)
		.update(payload)
		.digest('hex');

	return crypto.timingSafeEqual(
		Buffer.from(signature),
		Buffer.from(expectedSignature)
	);
}

const handleWebhook = (req: Request, res: Response): void => {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	if (!req.body || !req.body.order_id) {
		return res.status(400).json({ error: 'Missing required field: order_id' });
	}

	const secret = process.env.PAYMENT_WEBHOOK_SECRET;
	if (!secret) {
		console.error('[webhook] PAYMENT_WEBHOOK_SECRET is not configured — rejecting webhook for safety');
		return res.status(500).json({ error: 'Webhook not configured on server' });
	}

	if (!verifyWebhookSignature(req, secret)) {
		console.warn(`[webhook] Invalid signature for order ${req.body.order_id}`);
		return res.status(401).json({ error: 'Invalid signature' });
	}

	const { status, order_id, remark1, amount } = req.body as WebhookPayload;

	console.log(`[webhook] Received order ${order_id} status=${status}`);

	if (status === 'SUCCESS') {
		res.status(200).json({ received: true, order_id, status: 'processed' });
	} else if (status === 'FAILED' || status === 'CANCELLED') {
		res.status(200).json({ received: true, order_id, status: 'acknowledged' });
	} else {
		res.status(200).json({ received: true, order_id, status: 'unknown_status' });
	}
};

export { handleWebhook };
