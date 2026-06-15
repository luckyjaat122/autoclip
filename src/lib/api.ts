import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { User } from "./types";

export function ok(data: any = {}, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function withUser(): Promise<User | null> {
  return getCurrentUser();
}

export async function requireApiUser(): Promise<
  { user: User } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { response: fail("Unauthorized", 401) };
  return { user };
}

export async function requireAdmin(): Promise<
  { user: User } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { response: fail("Unauthorized", 401) };
  if (user.role !== "admin") return { response: fail("Forbidden", 403) };
  return { user };
}
