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
  // In production redirect to the deployed domain; in dev use the request
  // origin (so the actual local port is respected). Never localhost in prod.
  const base =
    process.env.NODE_ENV === "production" ? appUrl() : req.nextUrl.origin;
  const dest = next.startsWith("http") ? next : new URL(next, base).toString();
  return NextResponse.redirect(dest);
}
