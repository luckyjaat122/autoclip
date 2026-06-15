/**
 * Absolute base URL of the app, used for OAuth redirectTo.
 * Priority: NEXT_PUBLIC_APP_URL → the live browser origin → the prod fallback.
 * On the client, window.location.origin is always the real deployed origin, so
 * this is correct in prod and local without any hardcoded localhost.
 */
const PROD_FALLBACK = "https://autoclip-production-63f9.up.railway.app";

export function appUrl(path = ""): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  let base: string;
  if (fromEnv) {
    base = fromEnv;
  } else if (typeof window !== "undefined") {
    base = window.location.origin;
  } else {
    base = PROD_FALLBACK;
  }
  return base.replace(/\/$/, "") + path;
}
