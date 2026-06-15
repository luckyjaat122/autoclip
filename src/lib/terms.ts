// ============================================================================
// Legal terms shown in-app. Plain-language but protective. Not legal advice —
// have a lawyer review before relying on these commercially.
// ============================================================================

export interface TermsSection {
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------
// GENERAL TERMS & CONDITIONS  (shown when choosing any plan)
// ---------------------------------------------------------------------------
export const GENERAL_TERMS_INTRO =
  "Please read these Terms & Conditions carefully before subscribing to or using AutoClip AI (\"AutoClip\", \"we\", \"us\"). By creating an account, subscribing to any plan, or using the service, you agree to all of the terms below.";

// The single most important point — rendered big, in the middle of the modal.
export const GENERAL_TERMS_HIGHLIGHT = {
  title: "You are solely responsible for your content & copyright",
  body: "AutoClip is only an editing tool. You are fully and solely responsible for the videos you process and the clips you publish. You must own or have the rights to all source content. AutoClip is NOT responsible for any copyright claim, copyright strike, content-ID match, takedown, demonetization, channel ban, or legal action you may receive on YouTube or any other platform. Any copyright issue on your videos is your responsibility, not ours.",
};

export const GENERAL_TERMS: TermsSection[] = [
  {
    title: "1. The service",
    body: "AutoClip lets you turn long videos into short vertical clips with AI-assisted moment detection, captions and reframing. Results are generated automatically and may vary in quality. We do not guarantee that any clip will go viral or achieve any specific result.",
  },
  {
    title: "2. Your account",
    body: "You are responsible for your account, your login, and all activity under it. You must provide accurate information and be at least 18 years old (or have the consent of a parent/guardian).",
  },
  {
    title: "3. Content & copyright (important)",
    body: "You represent that you own or are licensed to use every video you upload, paste, or process through AutoClip. You must not process content you do not have the rights to. AutoClip does not review, clear, or own your content and accepts no liability for copyright claims, strikes, takedowns, demonetization, or any platform action that results from content you create, generate or publish. This responsibility is entirely yours.",
  },
  {
    title: "4. Acceptable use",
    body: "You will not use AutoClip for unlawful, infringing, hateful, sexual, deceptive, or harmful content, to violate any platform's policies, or to process third-party content without permission. We may suspend or terminate accounts that break these rules, without refund.",
  },
  {
    title: "5. Plans, credits & billing",
    body: "Plans are billed monthly in INR via Razorpay and renew automatically until cancelled. Each plan includes a fixed number of generations per month. Credits reset at the start of each billing cycle and unused credits do NOT carry forward. Common limits apply to every plan: maximum video length 15 minutes, and one generation at a time.",
  },
  {
    title: "6. Refunds",
    body: "Except where required by law, payments are non-refundable. The only exception is the 47-Day Growth Guarantee on the Creator plan, which applies strictly under its own separate terms.",
  },
  {
    title: "7. Third-party services",
    body: "AutoClip relies on third-party services (e.g. YouTube, AI/transcription providers, payment processors, cloud hosting). We are not responsible for their availability, changes, pricing, or actions, including any action a platform takes against your account or content.",
  },
  {
    title: "8. \"As is\" — no warranty",
    body: "The service is provided \"as is\" and \"as available\" without warranties of any kind. AI output can be inaccurate or incomplete. We do not guarantee uninterrupted, error-free, or secure operation.",
  },
  {
    title: "9. Limitation of liability",
    body: "To the maximum extent permitted by law, AutoClip and its team are not liable for any indirect, incidental, or consequential damages, lost revenue, lost views, lost followers, or platform penalties. Our total liability for any claim is limited to the amount you paid us in the previous month.",
  },
  {
    title: "10. Changes & termination",
    body: "We may update the service, plans, pricing, or these terms at any time. Continued use after changes means you accept them. You may cancel anytime; cancellation stops future renewals but does not refund the current cycle.",
  },
  {
    title: "11. Governing law",
    body: "These terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts located in India.",
  },
];

// ---------------------------------------------------------------------------
// 47-DAY GROWTH GUARANTEE  (shown after a successful Creator/₹499 payment)
// ---------------------------------------------------------------------------
export const GUARANTEE_TERMS_INTRO =
  "The 47-Day Growth Guarantee is an optional bonus included with the Creator (₹499/month) plan. It is a results promise with strict conditions. Please read every condition — missing any one of them voids the guarantee.";

// The core promise + the make-or-break condition — rendered big, in the middle.
export const GUARANTEE_TERMS_HIGHLIGHT = {
  title: "Post 1 AutoClip every single day for 47 days — or the guarantee is void",
  body: "You must upload at least one (1) video made with AutoClip-generated clips EVERY day for 47 consecutive days. Uploading more than one per day is allowed and encouraged. If you miss even a single day, the offer is permanently removed and no refund applies. If you complete all 47 days and your channel still does not grow, we refund 100% of your Creator payment.",
};

export const GUARANTEE_TERMS: TermsSection[] = [
  {
    title: "1. Eligibility",
    body: "Available only to active Creator (₹499/month) subscribers. The 47-day period starts on the date of your successful Creator payment.",
  },
  {
    title: "2. Daily posting requirement",
    body: "You must publicly upload at least one video per day, every day, for 47 consecutive days, where each video is built using clips generated by AutoClip. More than one upload per day is allowed but does not shorten the 47-day period.",
  },
  {
    title: "3. Miss one day = guarantee void",
    body: "Consistency is the core of this offer. If you skip, delay, delete, privatise, or unlist your daily upload on any single day during the 47 days, the guarantee is immediately and permanently void with no refund.",
  },
  {
    title: "4. How \"growth\" is measured",
    body: "\"Growth\" means a measurable increase in BOTH total views and total subscribers on your channel over the 47-day period, compared with the previous 47 days, verified from your public channel analytics. If both views and subscribers increased, the guarantee is considered fulfilled and no refund is due.",
  },
  {
    title: "5. Claiming a refund",
    body: "If you completed all 47 days without missing a day and saw no growth, you must submit a claim within 7 days of the 47-day period ending, including dated links to all 47+ uploads and your analytics. We may request additional proof.",
  },
  {
    title: "6. Refund amount",
    body: "A valid, verified claim is refunded at 100% of the Creator plan amount paid for that cycle. The guarantee can be claimed once per account and once per channel.",
  },
  {
    title: "7. Exclusions",
    body: "Reused or duplicate content, AI/bot or purchased views and subscribers, content that violates platform policies, private/unlisted/deleted videos, brand-new channels created only for the claim, and the use of multiple accounts are all excluded and void the guarantee.",
  },
  {
    title: "8. Honesty & final decision",
    body: "Claims are reviewed in good faith. We reserve the right to deny claims that appear manipulated or that do not meet every condition above. This guarantee does not affect your statutory rights.",
  },
];
