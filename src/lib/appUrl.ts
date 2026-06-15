/**
 * Absolute base URL of the app, used for OAuth redirectTo and callbacks.
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL (explicit override)
 *   2. In production → the deployed domain (never a local address)
 *   3. In development → the live browser origin (or :3000 on the server)
 */
const PROD_URL = "https://autoclip-production-63f9.up.railway.app";

export function appUrl(path = ""): string {
  let base: string;
  if (process.env.NEXT_PUBLIC_APP_URL) {
    base = process.env.NEXT_PUBLIC_APP_URL;
  } else if (process.env.NODE_ENV === "production") {
    base = PROD_URL;
  } else if (typeof window !== "undefined") {
    base = window.location.origin;
  } else {
    base = "http://localhost:3000";
  }
  return base.replace(/\/$/, "") + path;
}
