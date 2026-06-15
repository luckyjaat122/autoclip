import { fail, ok, requireApiUser } from "@/lib/api";
import { getGeneration, listClipsByGeneration } from "@/lib/repo";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const gen = await getGeneration(params.id);
  if (!gen || gen.userId !== auth.user.id) return fail("Not found", 404);
  const clips = await listClipsByGeneration(gen.id);
  return ok({ generation: gen, clips });
}
