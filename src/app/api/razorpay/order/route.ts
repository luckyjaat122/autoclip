import { NextRequest } from "next/server";
import { ok, fail, requireApiUser } from "@/lib/api";
import { planById } from "@/lib/types";
import {
  RAZORPAY_ENABLED,
  RAZORPAY_KEY_ID_PUBLIC,
  razorpay,
} from "@/lib/razorpay";
import { createPayment, updatePayment } from "@/lib/repo";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* default starter */
  }
  const plan = planById(body?.planId || "pro");
  if (!plan) return fail("Unknown plan");

  const payment = await createPayment({
    userId: user.id,
    amount: plan.amountPaise,
    currency: plan.currency,
    status: "created",
    description: `AutoClip ${plan.name} — Monthly`,
  });

  if (!RAZORPAY_ENABLED) {
    return ok({
      configured: false,
      paymentId: payment.id,
      planId: plan.id,
      amount: plan.amountPaise,
      currency: plan.currency,
      keyId: null,
    });
  }

  try {
    const order = await razorpay().orders.create({
      amount: plan.amountPaise,
      currency: plan.currency,
      receipt: payment.id,
      notes: { userId: user.id, email: user.email, planId: plan.id },
    });
    await updatePayment(payment.id, { razorpayOrderId: order.id });
    return ok({
      configured: true,
      paymentId: payment.id,
      planId: plan.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID_PUBLIC,
      prefill: { name: user.name, email: user.email },
    });
  } catch (e: any) {
    return fail(e?.error?.description || e?.message || "Could not start checkout", 502);
  }
}
