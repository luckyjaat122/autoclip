import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { supabaseServer } from "@/lib/supabaseServer";
import { ensureProfile, toSafeUser } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid credentials");

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return fail("Incorrect email or password", 401);
  }
  const user = await ensureProfile(data.user);
  return ok({ user: toSafeUser(user) });
}
