import { ok, requireApiUser } from "@/lib/api";
import { cancelSubscription, findUserById } from "@/lib/repo";
import { toSafeUser } from "@/lib/auth";

export async function POST() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  await cancelSubscription(auth.user.id);
  const fresh = await findUserById(auth.user.id);
  return ok({ user: fresh ? toSafeUser(fresh) : null });
}
