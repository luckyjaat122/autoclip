import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabaseServer";
import { ensureProfile, toSafeUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2, "Name is too short").max(60),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || "Invalid input");
  }
  const { name, email, password } = parsed.data;

  // Create the auth user (email pre-confirmed so they can sign in immediately).
  const { data: created, error } = await supabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !created.user) {
    const msg = (error?.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return fail("An account with this email already exists");
    }
    return fail(error?.message || "Could not create account");
  }

  // Sign in to set the session cookies.
  const supabase = supabaseServer();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) return fail("Account created — please sign in.");

  const user = await ensureProfile(created.user);
  return ok({ user: toSafeUser(user) });
}
