"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/client";
import { appUrl } from "@/lib/appUrl";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const isSignup = mode === "signup";
  const next = params.get("next") || "/";

  const [googleLoading, setGoogleLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function google() {
    setErr("");
    setGoogleLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: appUrl(`/auth/callback?next=${encodeURIComponent(next)}`),
        },
      });
      if (error) throw error;
      // redirect happens automatically
    } catch (e: any) {
      setErr(e?.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  async function emailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const path = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const payload = isSignup ? { name, email, password } : { email, password };
      await api(path, { method: "POST", body: JSON.stringify(payload) });
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-24 w-96 h-96 bg-fuchsia-400/20 rounded-full blur-3xl" />
        <div className="relative">
          <Logo size="lg" href="/" />
        </div>
        <div className="relative">
          <h2 className="font-serif text-4xl leading-tight mb-4">
            Turn long videos into <br /> viral shorts on autopilot.
          </h2>
          <p className="text-violet-100 max-w-md">
            AI hook detection, animated captions, and 9:16 smart reframing — all
            in one premium creator workspace.
          </p>
          <div className="mt-8 flex items-center gap-6 text-sm">
            <Stat n="60" l="clips / month" />
            <Stat n="9:16" l="auto reframe" />
            <Stat n="3" l="caption languages" />
          </div>
        </div>
        <div className="relative text-violet-200 text-sm">© 2026 AutoClip AI</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[#f7f5ff]">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden mb-8">
            <Logo size="md" href="/" />
          </div>
          <h1 className="font-serif text-3xl text-slate-900 mb-2">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-slate-500 mb-8">
            {isSignup
              ? "Sign up in one tap and start making viral clips."
              : "Sign in to your AutoClip workspace."}
          </p>

          <button
            onClick={google}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm disabled:opacity-60"
          >
            {googleLoading ? <Spinner dark /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            or
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition-all hover:bg-slate-800"
            >
              {isSignup ? "Sign up with email" : "Sign in with email"}
            </button>
          ) : (
            <form onSubmit={emailSubmit} className="space-y-3">
              {isSignup && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Full name"
                  className="auth-in"
                />
              )}
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                placeholder="Email"
                className="auth-in"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                placeholder={isSignup ? "Password (min 6)" : "Password"}
                className="auth-in"
              />
              <button disabled={loading} className="w-full btn-primary py-3.5">
                {loading ? "…" : isSignup ? "Create account" : "Sign in"}
              </button>
            </form>
          )}

          {err && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
              {err}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            {isSignup ? "Already have an account? " : "New to AutoClip? "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="font-semibold text-violet-600 hover:text-violet-700"
            >
              {isSignup ? "Sign in" : "Create one free"}
            </Link>
          </p>
        </div>
      </div>

      <style jsx global>{`
        .auth-in {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: #fff;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }
        .auth-in:focus {
          border-color: rgb(139 92 246);
          box-shadow: 0 0 0 3px rgb(221 214 254);
        }
      `}</style>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="text-2xl font-bold">{n}</div>
      <div className="text-violet-200 text-xs uppercase tracking-wide">{l}</div>
    </div>
  );
}
function Spinner({ dark }: { dark?: boolean }) {
  return (
    <svg className={`h-5 w-5 animate-spin ${dark ? "text-slate-500" : "text-white"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
