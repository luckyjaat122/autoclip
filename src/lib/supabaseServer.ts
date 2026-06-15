import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";

/**
 * Supabase client bound to the request cookies (reads the logged-in user's
 * session). In server components cookie writes are no-ops (read-only); in route
 * handlers / server actions they persist the refreshed session.
 */
export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a server component — safe to ignore (middleware refreshes).
        }
      },
    },
  });
}
