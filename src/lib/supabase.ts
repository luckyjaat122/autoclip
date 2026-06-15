import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SUPABASE_ENABLED = Boolean(url && anonKey);
export const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "clips";
export const SUPABASE_URL = url || "";
export const SUPABASE_ANON_KEY = anonKey || "";

/**
 * Server-side admin client (service_role) — BYPASSES Row Level Security.
 * Use only in trusted server code (API routes, pipeline). Never expose to the
 * browser.
 */
let _admin: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) throw new Error("SUPABASE_NOT_CONFIGURED");
  if (!_admin) {
    _admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
