import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

export const RAZORPAY_ENABLED = Boolean(keyId && keySecret);
export const RAZORPAY_PLAN_ID = process.env.RAZORPAY_PLAN_ID || "";
export const RAZORPAY_KEY_ID_PUBLIC = keyId || "";

let _client: Razorpay | null = null;
export function razorpay(): Razorpay {
  if (!RAZORPAY_ENABLED) throw new Error("RAZORPAY_NOT_CONFIGURED");
  if (!_client) {
    _client = new Razorpay({ key_id: keyId!, key_secret: keySecret! });
  }
  return _client;
}

/** Verify the checkout signature returned to the client. */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!keySecret) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return expected === params.signature;
}

/** Verify a webhook payload signature. */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expected === signature;
}
