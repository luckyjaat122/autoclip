# AutoClip AI 🎬

Turn long YouTube videos into viral 9:16 shorts — automatically. Paste a link →
AI finds the best moments → cuts vertical clips with burned word-by-word captions
→ download. A clean single-page SaaS.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Firebase Auth ·
Firestore · ffmpeg · yt-dlp · whisper.cpp · Razorpay**.

---

## ✨ What's inside

- **Single-page app** — hero with a YouTube link input, animated processing
  overlay, dark results grid of clip cards (viral scores) and HD downloads.
- **Real AI pipeline** — `yt-dlp` downloads the source once at ≤480p,
  `whisper.cpp` transcribes, a viral-scoring engine ranks moments, and `ffmpeg`
  (libass) cuts each clip to **1080×1920** with burned word-by-word captions.
- **Firebase Authentication** — email/password, server-side via the Identity
  Toolkit REST API + Admin **session cookies** (`createSessionCookie` /
  `verifySessionCookie`). Users live in Firebase Auth.
- **Firestore** — all app data (user profiles, subscriptions, payments,
  generations, clips) in `src/lib/repo.ts`.
- **Pluggable file storage** — `STORAGE_PROVIDER = local | firebase | r2`.
  Default **local**, so development never needs Firebase Storage. Swap to
  Firebase Storage or Cloudflare R2 with one env change.
- **3-tier pricing** — Starter ₹299/10 · Pro ₹499/35 · Max ₹999/100, with a
  green **47-Day Growth Guarantee** card and a Terms screen shown after payment.
- **Razorpay** — real order creation, checkout, signature verification, webhook.

---

## 🚀 Run it

```bash
npm install
npm run dev      # opens the local URL it prints
```

### Required system tools (already installed on this machine)
| Tool | Used for | Install |
|------|----------|---------|
| `ffmpeg-full` (libass) | cutting + caption burn | `brew install ffmpeg-full` |
| `yt-dlp` | fetching source video | `brew install yt-dlp` |
| `whisper-cli` | transcription | `brew install whisper-cpp` |
| Whisper model | `models/ggml-base.bin` | already downloaded |

The pipeline auto-detects the libass ffmpeg at
`/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` (override with `FFMPEG_PATH`).

---

## 🔑 Configuration (`.env.local`)

Firebase (Auth + Firestore) and Razorpay are already wired. Key vars:

```env
# Firebase Admin (service account)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# Firebase web (server-side REST sign-in)
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# File storage: local (default) | firebase | r2
STORAGE_PROVIDER=local
# firebase: set FIREBASE_STORAGE_BUCKET and enable Storage in the console
# r2: set R2_* vars and `npm i @aws-sdk/client-s3`
```

The **first account** that signs up (or any email in `ADMIN_EMAILS`) is flagged
as admin.

---

## 🗂️ Architecture

```
src/
  app/
    page.tsx              single-page app (server → AppExperience)
    login, signup         auth pages
    api/                  auth, generations, clips, billing, razorpay, profile
  components/
    app/                  AppExperience, Pricing, TermsModal
    auth/AuthForm, Logo
  lib/
    firebase.ts           Admin app: Auth + Firestore + Storage
    auth.ts               Firebase session cookies + REST sign-in
    repo.ts               Firestore data layer
    storage.ts            local | firebase | r2 provider
    razorpay.ts           checkout + signature verification
    terms.ts              47-Day Growth Guarantee terms
    pipeline/             youtube, ffmpeg, whisper, viral, ass, orchestrator
```

## 🚢 Deploy note
The pipeline needs a real server with `ffmpeg`/`yt-dlp` — it won't run on
serverless (Vercel functions). Use a VPS/container (Railway, Render, Fly, a VM).
Set `STORAGE_PROVIDER=firebase` (or `r2`) in production so clips serve from a CDN
instead of local disk.

© 2026 AutoClip AI.
