import { ok } from "@/lib/api";
import { getCurrentUser, toSafeUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  return ok({ user: user ? toSafeUser(user) : null });
}
