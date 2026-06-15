import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "clips";

/** Whether Supabase env is configured (read at call time, not module load). */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Server-side admin client (service_role) — BYPASSES Row Level Security.
 * Env is read inside the function so runtime values are always used.
 */
let _admin: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SUPABASE_NOT_CONFIGURED");
  if (!_admin) {
    _admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
