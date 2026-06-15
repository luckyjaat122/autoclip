import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, requireApiUser } from "@/lib/api";
import { RAZORPAY_ENABLED, verifyPaymentSignature } from "@/lib/razorpay";
import { activateSubscription, findUserById, updatePayment } from "@/lib/repo";
import { toSafeUser } from "@/lib/auth";
import { Plan } from "@/lib/types";

const schema = z.object({
  paymentId: z.string(),
  planId: z.enum(["starter", "creator", "pro"]),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
  simulated: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid payment payload");
  const p = parsed.data;
  const planId = p.planId as Plan;

  if (!RAZORPAY_ENABLED || p.simulated) {
    await updatePayment(p.paymentId, {
      status: "paid",
      razorpayPaymentId: "sim_" + Date.now(),
    });
    await activateSubscription(user.id, planId, {
      razorpayPaymentId: "sim_" + Date.now(),
    });
    const fresh = await findUserById(user.id);
    return ok({ user: fresh ? toSafeUser(fresh) : null, simulated: true });
  }

  if (!p.razorpay_order_id || !p.razorpay_payment_id || !p.razorpay_signature) {
    return fail("Missing Razorpay confirmation fields");
  }
  const valid = verifyPaymentSignature({
    orderId: p.razorpay_order_id,
    paymentId: p.razorpay_payment_id,
    signature: p.razorpay_signature,
  });
  if (!valid) {
    await updatePayment(p.paymentId, { status: "failed" });
    return fail("Payment verification failed", 400);
  }

  await updatePayment(p.paymentId, {
    status: "paid",
    razorpayPaymentId: p.razorpay_payment_id,
    razorpaySignature: p.razorpay_signature,
  });
  await activateSubscription(user.id, planId, {
    razorpayPaymentId: p.razorpay_payment_id,
  });
  const fresh = await findUserById(user.id);
  return ok({ user: fresh ? toSafeUser(fresh) : null });
}
