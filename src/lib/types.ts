// ---- Core domain types for AutoClip AI ----

export type Plan = "free" | "starter" | "pro" | "max";
export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "past_due"
  | "cancelled";

export interface User {
  id: string; // Firebase Auth uid
  name: string;
  email: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  role: "user" | "admin";
  generationsUsed: number;
  generationsLimit: number;
  createdAt: string;
  cycleStart: string; // billing cycle anchor for usage reset
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  amount: number; // in paise
  razorpaySubscriptionId?: string;
  razorpayPaymentId?: string;
  startDate: string;
  renewalDate: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number; // paise
  currency: string;
  status: "created" | "paid" | "failed";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  description: string;
  createdAt: string;
}

export type JobStatus =
  | "queued"
  | "fetching"
  | "transcribing"
  | "analyzing"
  | "rendering"
  | "completed"
  | "failed";

export interface ClipCaptionStyle {
  preset: "bold-pop" | "minimal" | "karaoke";
  language: "english" | "hindi" | "hinglish";
}

export interface Clip {
  id: string;
  generationId: string;
  userId: string;
  title: string;
  hookType: string;
  viralScore: number; // 0-100
  start: number; // seconds in source
  end: number;
  duration: number;
  reason: string;
  transcript: string;
  videoUrl: string; // playable mp4 (9:16)
  thumbnailUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface Generation {
  id: string;
  userId: string;
  youtubeUrl: string;
  videoId: string;
  title: string;
  channel: string;
  description: string;
  durationSeconds: number;
  thumbnail: string;
  status: JobStatus;
  progress: number; // 0-100
  stageLabel: string;
  error?: string;
  clipCount: number;
  clipIds: string[];
  captionStyle: ClipCaptionStyle;
  engine: "real" | "simulated";
  logs: { t: string; msg: string }[];
  createdAt: string;
  completedAt?: string;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  source: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface DBShape {
  users: User[];
  subscriptions: Subscription[];
  payments: Payment[];
  generations: Generation[];
  clips: Clip[];
  waitlist: WaitlistEntry[];
  announcements: Announcement[];
}

export interface PlanDef {
  id: Plan;
  name: string;
  price: number; // rupees / month
  amountPaise: number;
  currency: string;
  generations: number;
  maxInputMinutes: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
  guarantee?: { badge: string; title: string; body: string };
}

export const CURRENCY = "INR";

export const PLANS: PlanDef[] = [
  {
    id: "starter",
    name: "Starter",
    price: 299,
    amountPaise: 29900,
    currency: CURRENCY,
    generations: 10,
    maxInputMinutes: 20,
    tagline: "Perfect for beginners",
    features: [
      "AI viral detection",
      "Auto captions",
      "Smart reframing",
      "HD export",
      "20-min videos",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 499,
    amountPaise: 49900,
    currency: CURRENCY,
    generations: 35,
    maxInputMinutes: 20,
    tagline: "For active creators",
    highlight: true,
    features: [
      "Everything in Starter",
      "Viral score",
      "AI titles",
      "Priority processing",
      "Multiple clip variations",
    ],
    guarantee: {
      badge: "100% Money-Back",
      title: "47-Day Growth Guarantee",
      body: "If we don't grow your channel in 47 days, you get a full refund — 100% money-back, no questions asked.",
    },
  },
  {
    id: "max",
    name: "Max",
    price: 999,
    amountPaise: 99900,
    currency: CURRENCY,
    generations: 100,
    maxInputMinutes: 20,
    tagline: "For power creators",
    features: [
      "Everything in Pro",
      "Fastest processing",
      "Premium templates",
      "Advanced analytics",
      "Priority support",
    ],
  },
];

export function planById(id: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}
