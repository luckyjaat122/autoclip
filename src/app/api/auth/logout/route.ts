import { ok } from "@/lib/api";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  await supabaseServer().auth.signOut();
  return ok();
}
