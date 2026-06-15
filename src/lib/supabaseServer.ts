import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client bound to the request cookies (reads the logged-in user's
 * session). Env is read inside the function so runtime values are always used.
 * In server components cookie writes are no-ops (read-only); in route handlers /
 * server actions they persist the refreshed session.
 */
export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );
}
