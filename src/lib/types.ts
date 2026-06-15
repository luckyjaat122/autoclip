// ---- Core domain types for AutoClip AI ----

export type Plan = "free" | "starter" | "creator" | "pro";
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

// Limits shared by every plan.
export const MAX_INPUT_MINUTES = 15;
export const COMMON_LIMITS: string[] = [
  "Max video length: 15 minutes",
  "1 generation at a time",
  "Credits reset every month",
  "Unused credits don't carry forward",
];

export const PLANS: PlanDef[] = [
  {
    id: "starter",
    name: "Starter",
    price: 299,
    amountPaise: 29900,
    currency: CURRENCY,
    generations: 10,
    maxInputMinutes: MAX_INPUT_MINUTES,
    tagline: "Perfect for getting started",
    features: [
      "10 viral clip generations / month",
      "AI auto-captions",
      "3 languages — English / Hindi / Hinglish",
      "HD 1080×1920 export",
      "Up to 15-min videos",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    price: 499,
    amountPaise: 49900,
    currency: CURRENCY,
    generations: 25,
    maxInputMinutes: MAX_INPUT_MINUTES,
    tagline: "For growing creators",
    highlight: true,
    features: [
      "25 viral clip generations / month",
      "Faster processing",
      "Priority queue",
      "Custom caption styles",
      "Everything in Starter",
    ],
    guarantee: {
      badge: "100% Money-Back",
      title: "47-Day Growth Guarantee",
      body: "Post daily using AutoClip clips for 47 days — if your channel doesn't grow, get a full refund.",
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 999,
    amountPaise: 99900,
    currency: CURRENCY,
    generations: 60,
    maxInputMinutes: MAX_INPUT_MINUTES,
    tagline: "For power creators",
    features: [
      "60 viral clip generations / month",
      "Fastest processing",
      "Highest priority queue",
      "Early access to new features",
      "Everything in Creator",
    ],
  },
];

export function planById(id: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}
