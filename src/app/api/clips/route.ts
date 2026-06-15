import { ok, requireApiUser } from "@/lib/api";
import { listClipsByUser } from "@/lib/repo";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const clips = await listClipsByUser(auth.user.id);
  return ok({ clips });
}
