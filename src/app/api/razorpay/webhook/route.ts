import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook receiver. Configure the endpoint + secret in the Razorpay
 * dashboard (RAZORPAY_WEBHOOK_SECRET). Handles payment + subscription events.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-razorpay-signature") || "";
  const raw = await req.text();

  if (!verifyWebhookSignature(raw, signature)) {
    return fail("Invalid webhook signature", 400);
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return fail("Invalid payload");
  }

  // Idempotent handling — activation also happens on client verify, this is a
  // server-side safety net for async confirmations.
  switch (event?.event) {
    case "payment.captured":
    case "subscription.charged":
    case "subscription.activated":
      // Look up by notes.userId if present and activate.
      try {
        const notes =
          event.payload?.payment?.entity?.notes ||
          event.payload?.subscription?.entity?.notes;
        const userId = notes?.userId;
        const planId = notes?.planId || "pro";
        if (userId) {
          const repo = await import("@/lib/repo");
          await repo.activateSubscription(userId, planId, {
            razorpayPaymentId: event.payload?.payment?.entity?.id,
            razorpaySubscriptionId: event.payload?.subscription?.entity?.id,
          });
        }
      } catch {
        /* swallow — webhook must 200 */
      }
      break;
    default:
      break;
  }

  return ok({ received: true });
}
