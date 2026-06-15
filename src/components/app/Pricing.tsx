"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, loadRazorpay } from "@/lib/client";
import { PLANS } from "@/lib/types";
import type { SafeUser } from "@/lib/auth";
import { TermsModal } from "./TermsModal";

export function Pricing({
  user,
  onSubscribed,
}: {
  user: SafeUser | null;
  onSubscribed?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const [paidTerms, setPaidTerms] = useState(false);

  async function choose(planId: string) {
    setErr("");
    if (!user) {
      router.push("/signup");
      return;
    }
    setBusy(planId);
    try {
      const order = await api<any>("/api/razorpay/order", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });

      if (!order.configured) {
        await new Promise((r) => setTimeout(r, 1000));
        await api("/api/razorpay/verify", {
          method: "POST",
          body: JSON.stringify({
            paymentId: order.paymentId,
            planId,
            simulated: true,
          }),
        });
        done();
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load Razorpay");
      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "AutoClip",
        description: `AutoClip ${planId} — Monthly`,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: "#7c3aed" },
        handler: async (resp: any) => {
          try {
            await api("/api/razorpay/verify", {
              method: "POST",
              body: JSON.stringify({
                paymentId: order.paymentId,
                planId,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            done();
          } catch (e: any) {
            setErr(e.message);
            setBusy(null);
          }
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.on("payment.failed", (r: any) => {
        setErr(r.error?.description || "Payment failed");
        setBusy(null);
      });
      rzp.open();
    } catch (e: any) {
      setErr(e.message);
      setBusy(null);
    }
  }

  function done() {
    setBusy(null);
    setPaidTerms(true); // show the guarantee T&C after successful payment
    onSubscribed?.();
    router.refresh();
  }

  const currentPlan =
    user && user.subscriptionStatus === "active" ? user.plan : null;

  return (
    <>
    <section id="pricing" className="bg-[#f7f5ff] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <span className="mb-5 inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-600">
            Pricing
          </span>
          <h2 className="font-serif text-4xl leading-tight text-slate-900 sm:text-5xl">
            Simple plans that scale with you
          </h2>
          <p className="mx-auto mt-4 max-w-md text-slate-500">
            Pick a plan, paste a link, get viral clips. Cancel anytime.
          </p>
        </div>

        {err && (
          <p className="mb-6 text-center text-sm text-rose-500">{err}</p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-all ${
                  plan.highlight
                    ? "border-violet-300 shadow-xl shadow-violet-600/10 md:-translate-y-3"
                    : "border-slate-200"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-serif text-2xl text-slate-900">{plan.name}</h3>
                <p className="mt-0.5 text-[13px] text-slate-500">{plan.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-serif text-4xl text-slate-900">
                    ₹{plan.price}
                  </span>
                  <span className="text-slate-400">/mo</span>
                </div>
                <div className="mt-1.5 text-[13px] font-semibold text-violet-600">
                  {plan.generations} generations / month
                </div>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-slate-600">
                      <svg className="h-4 w-4 flex-shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.guarantee && (
                  <div className="guarantee-card mt-4 rounded-xl p-3.5">
                    <div className="guarantee-shine" />
                    <div className="relative flex items-start gap-2.5">
                      <div className="guarantee-seal">
                        <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div className="min-w-0">
                        <span className="guarantee-pill">{plan.guarantee.badge}</span>
                        <div className="mt-1 text-[13px] font-extrabold leading-tight text-emerald-900">
                          {plan.guarantee.title}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-emerald-800/90">
                          {plan.guarantee.body}
                        </p>
                        <button
                          type="button"
                          onClick={() => setTermsOpen(true)}
                          className="mt-1.5 text-[11px] font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                        >
                          Terms &amp; conditions
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1" />
                <button
                  onClick={() => choose(plan.id)}
                  disabled={busy !== null || isCurrent}
                  className={`mt-6 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-60 ${
                    plan.highlight
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "border border-slate-200 text-slate-800 hover:border-violet-300 hover:text-violet-700"
                  }`}
                >
                  {isCurrent
                    ? "Current plan"
                    : busy === plan.id
                    ? "Processing…"
                    : user
                    ? `Choose ${plan.name}`
                    : "Get started"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    <TermsModal paid open={paidTerms} onClose={() => setPaidTerms(false)} />
    </>
  );
}
