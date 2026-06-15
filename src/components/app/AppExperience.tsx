"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Clip, Generation } from "@/lib/types";
import { clipLength, initials } from "@/lib/format";
import type { SafeUser } from "@/lib/auth";
import { Pricing } from "./Pricing";

const LANGS = [
  { id: "english", label: "English" },
  { id: "hindi", label: "Hindi" },
  { id: "hinglish", label: "Hinglish" },
];

const STEPS = [
  "Fetching video from YouTube…",
  "Analysing audio & speech patterns…",
  "Detecting viral hook moments…",
  "Generating auto-captions…",
  "Cropping to 9:16 & rendering clips…",
];

function stepForProgress(p: number): number {
  if (p < 18) return 0;
  if (p < 40) return 1;
  if (p < 55) return 2;
  if (p < 75) return 3;
  return 4;
}

export function AppExperience({ user }: { user: SafeUser | null }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("english");
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [gen, setGen] = useState<Generation | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [err, setErr] = useState("");
  const [active, setActiveClip] = useState<Clip | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isAdmin = !!user && user.role === "admin";
  const isSubscribed = isAdmin || (!!user && user.subscriptionStatus === "active");
  const credits = user ? user.generationsLimit - user.generationsUsed : 0;
  const noCredits = !isAdmin && isSubscribed && credits <= 0;

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ac_lang") : null;
    if (saved) setLanguage(saved);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function pickLang(id: string) {
    setLanguage(id);
    localStorage.setItem("ac_lang", id);
  }

  function scrollToPricing() {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  }

  async function generate() {
    setErr("");
    if (!url.trim()) return;
    if (!user) {
      router.push("/signup");
      return;
    }
    if (!isSubscribed) {
      setErr("Choose a plan below to start generating clips.");
      scrollToPricing();
      return;
    }
    if (noCredits) {
      setErr("You've used all generations this cycle. Upgrade for more.");
      scrollToPricing();
      return;
    }
    setPhase("loading");
    setClips([]);
    try {
      const res = await api<{ generation: Generation }>("/api/generations", {
        method: "POST",
        body: JSON.stringify({ youtubeUrl: url, language, preset: "bold-pop" }),
      });
      setGen(res.generation);
      poll(res.generation.id);
    } catch (e: any) {
      setErr(e.message);
      setPhase("idle");
    }
  }

  function poll(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api<{ generation: Generation; clips: Clip[] }>(
          `/api/generations/${id}`
        );
        setGen(res.generation);
        if (res.generation.status === "completed") {
          stop();
          setClips(res.clips);
          setPhase("done");
          router.refresh();
          setTimeout(
            () => resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
            120
          );
        } else if (res.generation.status === "failed") {
          stop();
          setErr(res.generation.error || "Generation failed");
          setPhase("failed");
        }
      } catch {
        /* keep polling */
      }
    }, 1500);
  }
  function stop() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const activeStep = gen ? stepForProgress(gen.progress) : 0;

  return (
    <div className="relative">
      {/* Banner */}
      <div className="flex items-center justify-center gap-2 bg-violet-600 px-12 py-2.5 text-center text-[13px] font-medium text-white">
        🔥 Founder pricing live — plans from ₹299/mo
      </div>

      {/* NAV */}
      <nav className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-violet-100/70 bg-white/90 px-5 backdrop-blur-md sm:px-10">
        <a href="#hero" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-white"><path d="M3 2l10 6-10 6V2z" /></svg>
          </span>
          <span className="font-serif text-[22px] text-slate-900">AutoClip</span>
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how" className="text-sm font-medium text-slate-500 hover:text-slate-900">How it works</a>
          <a href="#features" className="text-sm font-medium text-slate-500 hover:text-slate-900">Features</a>
          <a href="#pricing" className="text-sm font-medium text-slate-500 hover:text-slate-900">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {isSubscribed && (
                <span className="hidden rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 sm:inline">
                  {isAdmin ? "Admin · Unlimited" : `${credits} / ${user.generationsLimit} left`}
                </span>
              )}
              <button
                onClick={() => setSettingsOpen(true)}
                className="hidden items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-violet-50 sm:flex"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="10" cy="10" r="3" /><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4" /></svg>
                Settings
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 py-1.5 pl-1.5 pr-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-pink-500 text-xs font-bold text-white">
                    {initials(user.name)}
                  </span>
                  <span className="text-[13px] font-semibold text-slate-800">{user.name.split(" ")[0]}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                      <p className="mt-1 text-xs font-medium text-violet-600">
                        {isAdmin ? "Admin · unlimited" : isSubscribed ? `${user.plan} · ${credits} credits` : "No active plan"}
                      </p>
                    </div>
                    <button onClick={() => { setSettingsOpen(true); setMenuOpen(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-violet-50">Settings</button>
                    <button onClick={logout} className="block w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50">Log out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
              <Link href="/signup" className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700">Get started</Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section
        id="hero"
        className="relative flex flex-col items-center overflow-hidden px-6 pb-24 pt-20 text-center"
        style={{ background: "linear-gradient(160deg,#ffffff 0%,#f3f0ff 55%,#ede8ff 100%)" }}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(circle,rgba(139,92,246,0.10),transparent 70%)" }} />
        <span className="mb-7 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-600">
          Powered by AI · YouTube → Viral Shorts
        </span>
        <h1 className="max-w-3xl font-serif text-[clamp(40px,6vw,76px)] leading-[1.08] text-slate-900">
          Paste a link.
          <br />
          Get clips that go <em className="italic text-violet-600">insanely viral.</em>
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate-500">
          AutoClip finds the best moments in any YouTube video and turns them into
          scroll-stopping short clips — captions, cuts, and all.
        </p>

        {/* Input bar */}
        <div className="mt-10 flex w-full max-w-xl items-center gap-3 rounded-2xl border-[1.5px] border-violet-300 bg-white p-2.5 pl-5 shadow-[0_4px_32px_rgba(139,92,246,0.12)] focus-within:border-violet-500">
          <svg viewBox="0 0 26 26" className="h-6 w-6 flex-shrink-0"><rect width="26" height="26" rx="5" fill="#FF0000" /><path d="M11 9l7 4-7 4V9z" fill="white" /></svg>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="Paste a YouTube link and get your clips…"
            className="flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={generate}
            disabled={phase === "loading"}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-violet-700 disabled:opacity-60"
          >
            Generate clips
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-white"><path d="M3 2l10 6-10 6V2z" /></svg>
          </button>
        </div>

        {/* Caption language */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-slate-400">Captions:</span>
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => pickLang(l.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                language === l.id
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-violet-200 text-slate-500 hover:border-violet-400"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {err && <p className="mt-4 text-sm font-medium text-rose-500">{err}</p>}

        {/* hint */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <i className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            {isAdmin ? "Unlimited generations" : isSubscribed ? `${credits} credits remaining` : "Subscribe to generate"}
          </span>
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-violet-400" />No download needed</span>
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-violet-400" />Ready in seconds</span>
        </div>

        {/* stats */}
        <div className="mt-16 grid w-full max-w-lg grid-cols-3 overflow-hidden rounded-2xl border border-violet-100 bg-white">
          {[["2M+", "Clips generated"], ["98K", "Creators trust us"], ["4.9★", "Average rating"]].map(([n, l], i) => (
            <div key={l} className={`px-4 py-5 ${i ? "border-l border-violet-100" : ""}`}>
              <div className="font-serif text-[28px] text-slate-900">{n}</div>
              <div className="mt-0.5 text-xs text-slate-400">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RESULTS */}
      {(phase === "done" || phase === "failed") && (
        <section ref={resultsRef} className="bg-[#0f0a1e] px-6 py-24">
          <div className="mx-auto max-w-5xl">
            {phase === "failed" ? (
              <div className="text-center">
                <div className="mb-3 text-4xl">😕</div>
                <h2 className="font-serif text-3xl text-white">Generation failed</h2>
                <p className="mx-auto mt-2 max-w-md text-white/50">{err}</p>
                <button onClick={() => setPhase("idle")} className="mt-6 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700">Try another video</button>
              </div>
            ) : (
              <>
                <span className="mb-5 inline-block rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                  Clips generated
                </span>
                <h2 className="font-serif text-[clamp(28px,3.5vw,44px)] leading-tight text-white">
                  {clips.length} viral {clips.length === 1 ? "clip" : "clips"} ready
                </h2>
                <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/45">
                  Tap a clip to preview it, then download in 1080×1920 HD.
                </p>
                {gen && (
                  <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2">
                    <svg viewBox="0 0 24 24" className="h-4 w-4"><rect width="24" height="24" rx="4" fill="#FF0000" /><path d="M10 8l6 4-6 4V8z" fill="white" /></svg>
                    <span className="text-[13px] text-white/60">Source: <strong className="font-medium text-white">{gen.title}</strong></span>
                  </div>
                )}
                <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {clips.map((c, i) => (
                    <ClipResult key={c.id} clip={c} index={i} onPlay={() => setActiveClip(c)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* HOW */}
      <section id="how" className="bg-[#f7f5ff] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <span className="mb-5 inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-600">How it works</span>
          <h2 className="font-serif text-[clamp(30px,4vw,48px)] leading-tight text-slate-900">Three steps to your next viral clip</h2>
          <p className="mt-3 max-w-md text-slate-500">No timeline editing, no guesswork. AutoClip does the heavy lifting.</p>
          <div className="mt-12 grid gap-0.5 overflow-hidden rounded-2xl md:grid-cols-3">
            {[
              ["01", "Paste any YouTube link", "Drop in the URL of any video — interviews, podcasts, long-form. Any length works."],
              ["02", "AI picks the best moments", "AutoClip scans the video, finds hook-worthy moments, and cuts 30–80s clips automatically."],
              ["03", "Download your clips", "Preview each clip, check its viral score, and download in vertical 1080×1920 HD."],
            ].map(([n, t, d]) => (
              <div key={n} className="bg-white p-9">
                <span className="font-serif text-5xl text-violet-100">{n}</span>
                <h3 className="mt-4 text-[17px] font-semibold text-slate-900">{t}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <span className="mb-5 inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-600">Features</span>
          <h2 className="font-serif text-[clamp(30px,4vw,48px)] leading-tight text-slate-900">Everything a viral clip needs</h2>
          <p className="mt-3 max-w-md text-slate-500">AutoClip handles the parts that used to take hours — automatically.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ["AI moment detection", "Finds the highest-engagement moments using speech analysis, pacing, and viral pattern recognition."],
              ["Auto captions", "Word-by-word animated captions in English, Hindi & Hinglish — burned in, no timeline needed."],
              ["9:16 smart crop", "Face-safe reframe converts widescreen to vertical. Your subject stays perfectly centered."],
              ["Real transcription", "Whisper transcribes the actual audio so clip titles and captions match what's said."],
              ["Viral scoring", "Every clip gets a 🔥 viral score so you post the moments most likely to blow up."],
              ["HD downloads", "Export each clip as 1080×1920 MP4, optimised for Reels, Shorts & TikTok."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-violet-100 p-7 transition-all hover:border-violet-200 hover:shadow-lg hover:shadow-violet-600/5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900">{t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <Pricing user={user} onSubscribed={() => router.refresh()} />

      {/* CTA */}
      <section className="bg-violet-600 px-6 py-24 text-center">
        <h2 className="font-serif text-[clamp(34px,5vw,60px)] leading-tight text-white">
          Your next viral clip is
          <br />
          <em className="italic text-violet-200">one paste away.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-white/75">
          Join creators who stopped spending hours editing and started posting more.
        </p>
        <button
          onClick={() => { document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" }); }}
          className="mt-9 inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-3.5 text-[15px] font-bold text-violet-700 transition-all hover:-translate-y-0.5"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-violet-600"><path d="M3 2l10 6-10 6V2z" /></svg>
          Generate your next clip
        </button>
      </section>

      {/* FOOTER */}
      <footer className="flex flex-col items-center justify-between gap-5 bg-[#0f0a1e] px-10 py-10 sm:flex-row">
        <a href="#hero" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600"><svg viewBox="0 0 16 16" className="h-3 w-3 fill-white"><path d="M3 2l10 6-10 6V2z" /></svg></span>
          <span className="font-serif text-xl text-white">AutoClip</span>
        </a>
        <div className="flex gap-7 text-[13px] text-white/35">
          <a href="#" className="hover:text-white/70">Privacy</a>
          <a href="#" className="hover:text-white/70">Terms</a>
          <a href="#" className="hover:text-white/70">Contact</a>
        </div>
        <div className="text-xs text-white/20">© 2026 AutoClip. All rights reserved.</div>
      </footer>

      {/* LOADING OVERLAY */}
      {phase === "loading" && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center gap-7 bg-[#0f0a1e]/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5 font-serif text-[28px] text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-violet-600"><svg viewBox="0 0 16 16" className="h-4 w-4 fill-white"><path d="M3 2l10 6-10 6V2z" /></svg></span>
            AutoClip
          </div>
          <div className="h-1.5 w-80 max-w-[80vw] overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-500" style={{ width: `${gen?.progress ?? 4}%` }} />
          </div>
          <div className="text-[13px] text-white/40">{gen?.progress ?? 0}%</div>
          <div className="flex flex-col gap-2.5">
            {STEPS.map((s, i) => {
              const done = activeStep > i;
              const cur = activeStep === i;
              return (
                <div key={s} className={`flex items-center gap-2.5 text-sm transition-colors ${done ? "text-white/90" : cur ? "text-white" : "text-white/40"}`}>
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${done ? "bg-violet-400" : cur ? "animate-pulse bg-violet-500" : "bg-white/20"}`} />
                  {s}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CLIP PREVIEW MODAL */}
      {active && (
        <div className="fixed inset-0 z-[550] flex items-center justify-center p-4" onClick={() => setActiveClip(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#1a1030] md:flex-row" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center bg-black p-3 md:w-1/2">
              <video src={active.videoUrl} controls autoPlay playsInline className="max-h-[50vh] w-auto rounded-xl md:max-h-[80vh]" />
            </div>
            <div className="overflow-y-auto p-6 md:w-1/2">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-lg bg-amber-400/15 px-2.5 py-1 text-sm font-bold text-amber-400">🔥 {active.viralScore}</span>
                <button onClick={() => setActiveClip(null)} className="text-white/40 hover:text-white"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">{active.hookType}</span>
              <h3 className="mt-1.5 font-serif text-2xl text-white">{active.title}</h3>
              <div className="mt-3 flex gap-4 text-sm text-white/45"><span>⏱ {clipLength(active.duration)}</span><span>📐 {active.width}×{active.height}</span></div>
              {active.transcript && (
                <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm italic text-white/60">“{active.transcript}”</p>
              )}
              <a href={active.videoUrl} download={`autoclip-${active.id}.mp4`} className="mt-5 block rounded-xl bg-violet-600 py-3.5 text-center text-sm font-semibold text-white hover:bg-violet-700">⬇ Download MP4 (1080×1920)</a>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS DRAWER */}
      {user && (
        <>
          <div className={`fixed inset-0 z-[900] bg-[#0f0a1e]/60 backdrop-blur-sm transition-opacity ${settingsOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setSettingsOpen(false)} />
          <div className={`fixed right-0 top-0 z-[901] flex h-full w-[440px] max-w-[95vw] flex-col bg-white transition-transform duration-300 ${settingsOpen ? "translate-x-0" : "translate-x-full"}`}>
            <div className="flex items-center justify-between border-b border-violet-100 px-7 py-5">
              <span className="font-serif text-[22px] text-slate-900">Settings</span>
              <button onClick={() => setSettingsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-100 text-slate-500 hover:bg-violet-50">✕</button>
            </div>
            <div className="flex-1 space-y-7 overflow-y-auto p-7">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Default caption language</p>
                <div className="flex gap-2">
                  {LANGS.map((l) => (
                    <button key={l.id} onClick={() => pickLang(l.id)} className={`rounded-full border px-4 py-1.5 text-xs font-medium ${language === l.id ? "border-violet-500 bg-violet-600 text-white" : "border-violet-200 text-slate-500"}`}>{l.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account</p>
                <div className="space-y-2 rounded-xl bg-violet-50 p-4 text-sm">
                  <Row k="Name" v={user.name} />
                  <Row k="Email" v={user.email} />
                  <Row k="Plan" v={isAdmin ? "Admin (unlimited)" : isSubscribed ? user.plan : "Free"} />
                  {isSubscribed && <Row k="Generations" v={`${credits} / ${user.generationsLimit} left`} />}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Plan</p>
                <button onClick={() => { setSettingsOpen(false); scrollToPricing(); }} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700">
                  {isSubscribed ? "Change plan" : "Choose a plan"}
                </button>
              </div>
            </div>
            <div className="border-t border-violet-100 p-7">
              <button onClick={logout} className="text-sm font-semibold text-rose-600 hover:text-rose-700">Sign out</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{k}</span>
      <span className="truncate font-medium capitalize text-slate-800">{v}</span>
    </div>
  );
}

function ClipResult({ clip, index, onPlay }: { clip: Clip; index: number; onPlay: () => void }) {
  return (
    <button onClick={onPlay} className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-[#1a1030] text-left transition-all hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={clip.thumbnailUrl} alt={clip.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute left-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-[11px] font-semibold text-white/70">{index + 1}</div>
      <div className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
        <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-white"><path d="M5 3l14 9-14 9V3z" /></svg>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3.5 pt-12">
        <p className="mb-2 line-clamp-2 text-xs font-semibold leading-snug text-white">{clip.title}</p>
        <div className="flex items-center justify-between">
          <span className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white/60">{clipLength(clip.duration)}</span>
          <span className="text-[10px] font-bold text-amber-400">🔥 {clip.viralScore}</span>
        </div>
      </div>
    </button>
  );
}
