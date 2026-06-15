import { ok, requireApiUser } from "@/lib/api";
import { getActiveSubscription, listPaymentsByUser } from "@/lib/repo";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const [payments, subscription] = await Promise.all([
    listPaymentsByUser(auth.user.id),
    getActiveSubscription(auth.user.id),
  ]);
  return ok({ payments, subscription });
}
