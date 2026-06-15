import "server-only";
import { supabaseAdmin } from "./supabase";
import {
  Clip,
  Generation,
  Payment,
  Plan,
  planById,
  Subscription,
  User,
} from "./types";

const now = () => new Date().toISOString();
const db = () => supabaseAdmin();

// ---------------- mappers (snake_case DB <-> camelCase app) ----------------
function userFromDb(r: any): User {
  return {
    id: r.id,
    name: r.name || "",
    email: r.email || "",
    plan: r.plan,
    subscriptionStatus: r.subscription_status,
    role: r.role,
    generationsUsed: r.generations_used ?? 0,
    generationsLimit: r.generations_limit ?? 0,
    createdAt: r.created_at,
    cycleStart: r.cycle_start,
  };
}
function userToDb(p: Partial<User>): Record<string, any> {
  const o: Record<string, any> = {};
  if (p.name !== undefined) o.name = p.name;
  if (p.email !== undefined) o.email = p.email;
  if (p.plan !== undefined) o.plan = p.plan;
  if (p.subscriptionStatus !== undefined) o.subscription_status = p.subscriptionStatus;
  if (p.role !== undefined) o.role = p.role;
  if (p.generationsUsed !== undefined) o.generations_used = p.generationsUsed;
  if (p.generationsLimit !== undefined) o.generations_limit = p.generationsLimit;
  if (p.cycleStart !== undefined) o.cycle_start = p.cycleStart;
  return o;
}
function subFromDb(r: any): Subscription {
  return {
    id: r.id,
    userId: r.user_id,
    plan: r.plan,
    status: r.status,
    amount: r.amount,
    razorpaySubscriptionId: r.razorpay_subscription_id || undefined,
    razorpayPaymentId: r.razorpay_payment_id || undefined,
    startDate: r.start_date,
    renewalDate: r.renewal_date,
    createdAt: r.created_at,
  };
}
function paymentFromDb(r: any): Payment {
  return {
    id: r.id,
    userId: r.user_id,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    razorpayOrderId: r.razorpay_order_id || undefined,
    razorpayPaymentId: r.razorpay_payment_id || undefined,
    razorpaySignature: r.razorpay_signature || undefined,
    description: r.description || "",
    createdAt: r.created_at,
  };
}
function genFromDb(r: any): Generation {
  return {
    id: r.id,
    userId: r.user_id,
    youtubeUrl: r.youtube_url,
    videoId: r.video_id || "",
    title: r.title || "",
    channel: r.channel || "",
    description: r.description || "",
    durationSeconds: r.duration_seconds ?? 0,
    thumbnail: r.thumbnail || "",
    status: r.status,
    progress: r.progress ?? 0,
    stageLabel: r.stage_label || "",
    error: r.error || undefined,
    clipCount: r.clip_count ?? 0,
    clipIds: [],
    captionStyle: r.caption_style || { preset: "bold-pop", language: "english" },
    engine: r.engine || "real",
    logs: r.logs || [],
    createdAt: r.created_at,
    completedAt: r.completed_at || undefined,
  };
}
function genToDb(p: Partial<Generation>): Record<string, any> {
  const o: Record<string, any> = {};
  if (p.userId !== undefined) o.user_id = p.userId;
  if (p.youtubeUrl !== undefined) o.youtube_url = p.youtubeUrl;
  if (p.videoId !== undefined) o.video_id = p.videoId;
  if (p.title !== undefined) o.title = p.title;
  if (p.channel !== undefined) o.channel = p.channel;
  if (p.description !== undefined) o.description = p.description;
  if (p.durationSeconds !== undefined) o.duration_seconds = p.durationSeconds;
  if (p.thumbnail !== undefined) o.thumbnail = p.thumbnail;
  if (p.status !== undefined) o.status = p.status;
  if (p.progress !== undefined) o.progress = p.progress;
  if (p.stageLabel !== undefined) o.stage_label = p.stageLabel;
  if (p.error !== undefined) o.error = p.error;
  if (p.clipCount !== undefined) o.clip_count = p.clipCount;
  if (p.captionStyle !== undefined) o.caption_style = p.captionStyle;
  if (p.engine !== undefined) o.engine = p.engine;
  if (p.logs !== undefined) o.logs = p.logs;
  if (p.completedAt !== undefined) o.completed_at = p.completedAt;
  return o;
}
function clipFromDb(r: any): Clip {
  return {
    id: r.id,
    generationId: r.generation_id,
    userId: r.user_id,
    title: r.title || "",
    hookType: r.hook_type || "",
    viralScore: r.viral_score ?? 0,
    start: r.start_seconds ?? 0,
    end: r.end_seconds ?? 0,
    duration: r.duration ?? 0,
    reason: r.reason || "",
    transcript: r.transcript || "",
    videoUrl: r.video_url || "",
    thumbnailUrl: r.thumbnail_url || "",
    width: r.width ?? 1080,
    height: r.height ?? 1920,
    createdAt: r.created_at,
  };
}

// ---------------- Users (profiles) ----------------
export async function findUserById(id: string): Promise<User | undefined> {
  const { data } = await db().from("profiles").select("*").eq("id", id).maybeSingle();
  return data ? userFromDb(data) : undefined;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const { data } = await db()
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  return data ? userFromDb(data) : undefined;
}

export async function createUserProfile(input: {
  uid: string;
  name: string;
  email: string;
}): Promise<User> {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const { count } = await db()
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const isFirst = (count ?? 0) === 0;
  const role =
    isFirst || adminEmails.includes(input.email.toLowerCase()) ? "admin" : "user";

  const row = {
    id: input.uid,
    name: input.name,
    email: input.email.toLowerCase(),
    plan: "free",
    subscription_status: "inactive",
    role,
    generations_used: 0,
    generations_limit: 0,
    cycle_start: now(),
  };
  const { data, error } = await db()
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .maybeSingle();
  if (data) return userFromDb(data);

  // Upsert returned nothing (or errored) — the trigger likely created the row.
  const existing = await findUserById(input.uid);
  if (existing) {
    if (role === "admin" && existing.role !== "admin") {
      const upgraded = await updateUser(input.uid, { role: "admin" });
      return upgraded || existing;
    }
    return existing;
  }
  throw new Error(
    "createUserProfile failed: " + (error?.message || "no row returned")
  );
}

export async function updateUser(
  id: string,
  patch: Partial<User>
): Promise<User | undefined> {
  const { data } = await db()
    .from("profiles")
    .update(userToDb(patch))
    .eq("id", id)
    .select("*")
    .maybeSingle();
  return data ? userFromDb(data) : undefined;
}

export async function refreshUsageWindow(user: User): Promise<User> {
  if (user.plan === "free" || user.subscriptionStatus !== "active") return user;
  const start = new Date(user.cycleStart).getTime();
  const elapsedDays = (Date.now() - start) / (1000 * 60 * 60 * 24);
  if (elapsedDays >= 30) {
    const updated = await updateUser(user.id, { generationsUsed: 0, cycleStart: now() });
    return updated || user;
  }
  return user;
}

// ---------------- Subscriptions ----------------
export async function activateSubscription(
  userId: string,
  planId: Plan,
  payment: { razorpayPaymentId?: string; razorpaySubscriptionId?: string }
): Promise<void> {
  const plan = planById(planId);
  if (!plan) return;
  await updateUser(userId, {
    plan: plan.id,
    subscriptionStatus: "active",
    generationsLimit: plan.generations,
    generationsUsed: 0,
    cycleStart: now(),
  });
  const renewal = new Date();
  renewal.setDate(renewal.getDate() + 30);
  await db().from("subscriptions").insert({
    user_id: userId,
    plan: plan.id,
    status: "active",
    amount: plan.amountPaise,
    razorpay_subscription_id: payment.razorpaySubscriptionId,
    razorpay_payment_id: payment.razorpayPaymentId,
    start_date: now(),
    renewal_date: renewal.toISOString(),
  });
}

export async function cancelSubscription(userId: string): Promise<void> {
  await updateUser(userId, { subscriptionStatus: "cancelled" });
  await db()
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("status", "active");
}

export async function getActiveSubscription(
  userId: string
): Promise<Subscription | undefined> {
  const { data } = await db()
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? subFromDb(data) : undefined;
}

// ---------------- Payments ----------------
export async function createPayment(
  p: Omit<Payment, "id" | "createdAt">
): Promise<Payment> {
  const { data } = await db()
    .from("payments")
    .insert({
      user_id: p.userId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      razorpay_order_id: p.razorpayOrderId,
      razorpay_payment_id: p.razorpayPaymentId,
      razorpay_signature: p.razorpaySignature,
      description: p.description,
    })
    .select("*")
    .single();
  return paymentFromDb(data);
}

export async function updatePayment(
  id: string,
  patch: Partial<Payment>
): Promise<void> {
  const o: Record<string, any> = {};
  if (patch.status !== undefined) o.status = patch.status;
  if (patch.razorpayOrderId !== undefined) o.razorpay_order_id = patch.razorpayOrderId;
  if (patch.razorpayPaymentId !== undefined) o.razorpay_payment_id = patch.razorpayPaymentId;
  if (patch.razorpaySignature !== undefined) o.razorpay_signature = patch.razorpaySignature;
  await db().from("payments").update(o).eq("id", id);
}

export async function listPaymentsByUser(userId: string): Promise<Payment[]> {
  const { data } = await db()
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []).map(paymentFromDb);
}

// ---------------- Generations ----------------
export async function createGeneration(
  g: Omit<Generation, "id" | "createdAt">
): Promise<Generation> {
  const { data } = await db()
    .from("generations")
    .insert(genToDb(g))
    .select("*")
    .single();
  return genFromDb(data);
}

export async function updateGeneration(
  id: string,
  patch: Partial<Generation>
): Promise<Generation | undefined> {
  const o = genToDb(patch);
  if (Object.keys(o).length === 0) return getGeneration(id);
  const { data } = await db()
    .from("generations")
    .update(o)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  return data ? genFromDb(data) : undefined;
}

export async function pushGenerationLog(id: string, msg: string): Promise<void> {
  const gen = await getGeneration(id);
  if (!gen) return;
  const logs = [...(gen.logs || []), { t: now(), msg }];
  await db().from("generations").update({ logs }).eq("id", id);
}

export async function getGeneration(id: string): Promise<Generation | undefined> {
  const { data } = await db().from("generations").select("*").eq("id", id).maybeSingle();
  return data ? genFromDb(data) : undefined;
}

export async function listGenerationsByUser(userId: string): Promise<Generation[]> {
  const { data } = await db()
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []).map(genFromDb);
}

// ---------------- Clips ----------------
export async function addClip(c: Omit<Clip, "id" | "createdAt">): Promise<Clip> {
  const { data } = await db()
    .from("clips")
    .insert({
      generation_id: c.generationId,
      user_id: c.userId,
      title: c.title,
      hook_type: c.hookType,
      viral_score: c.viralScore,
      start_seconds: c.start,
      end_seconds: c.end,
      duration: c.duration,
      reason: c.reason,
      transcript: c.transcript,
      video_url: c.videoUrl,
      thumbnail_url: c.thumbnailUrl,
      width: c.width,
      height: c.height,
    })
    .select("*")
    .single();
  return clipFromDb(data);
}

export async function listClipsByUser(userId: string): Promise<Clip[]> {
  const { data } = await db()
    .from("clips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []).map(clipFromDb);
}

export async function getClip(id: string): Promise<Clip | undefined> {
  const { data } = await db().from("clips").select("*").eq("id", id).maybeSingle();
  return data ? clipFromDb(data) : undefined;
}

export async function listClipsByGeneration(genId: string): Promise<Clip[]> {
  const { data } = await db()
    .from("clips")
    .select("*")
    .eq("generation_id", genId)
    .order("viral_score", { ascending: false });
  return (data || []).map(clipFromDb);
}

// ---------------- Usage tracking ----------------
export async function recordUsage(
  userId: string,
  generationId: string,
  type = "generation"
): Promise<void> {
  await db()
    .from("usage_tracking")
    .insert({ user_id: userId, generation_id: generationId, type });
}
