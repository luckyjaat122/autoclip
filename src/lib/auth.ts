import "server-only";
import { supabaseServer } from "./supabaseServer";
import {
  createUserProfile,
  findUserById,
  refreshUsageWindow,
  updateUser,
} from "./repo";
import { User } from "./types";

function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export type SafeUser = User;
export function toSafeUser(u: User): SafeUser {
  return u;
}

/** Ensure a profiles row exists for an authenticated Supabase user. */
export async function ensureProfile(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
}): Promise<User> {
  let existing = await findUserById(authUser.id);
  if (!existing) {
    const name =
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      (authUser.email ? authUser.email.split("@")[0] : "Creator");
    existing = await createUserProfile({
      uid: authUser.id,
      name,
      email: authUser.email || "",
    });
  }
  // Promote configured admin emails (even if the signup trigger pre-created
  // the row with the default 'user' role).
  if (existing.role !== "admin" && isAdminEmail(existing.email || authUser.email)) {
    const upgraded = await updateUser(existing.id, { role: "admin" });
    if (upgraded) existing = upgraded;
  }
  return existing;
}

/** Current user (Supabase session → Postgres profile, usage refreshed) or null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await ensureProfile(user);
  return refreshUsageWindow(profile);
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}
