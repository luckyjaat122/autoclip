import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { appUrl } from "@/lib/appUrl";

// OAuth (Google/Apple) redirect lands here with ?code=... → exchange for a
// session (sets cookies) → bounce to the app.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/";
  if (code) {
    const supabase = supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  // Prefer the request origin (real deployed host); fall back to appUrl.
  const base = req.nextUrl.origin || appUrl();
  const dest = next.startsWith("http") ? next : new URL(next, base).toString();
  return NextResponse.redirect(dest);
}
