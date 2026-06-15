"use client";
import { useEffect } from "react";
import { GUARANTEE_TERMS, GUARANTEE_TERMS_INTRO } from "@/lib/terms";

export function TermsModal({
  open,
  paid,
  onClose,
}: {
  open: boolean;
  paid?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in">
        {/* Header */}
        {paid ? (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 px-6 py-7 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="font-serif text-2xl text-slate-900">Payment successful 🎉</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your plan is active. Here are your 47-Day Growth Guarantee terms.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
              <h2 className="font-serif text-xl text-slate-900">47-Day Growth Guarantee</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-5 text-sm leading-relaxed text-slate-600">{GUARANTEE_TERMS_INTRO}</p>
          <ol className="space-y-4">
            {GUARANTEE_TERMS.map((t, i) => (
              <li key={t.title} className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t.title}</h3>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{t.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700">
            {paid ? "Start creating clips →" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
