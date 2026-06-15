import Link from "next/link";

export function Logo({
  size = "md",
  href = "/",
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
}) {
  const box =
    size === "lg" ? "w-10 h-10 text-xl" : size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-lg";
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const inner = (
    <div className="flex items-center gap-2">
      <div
        className={`${box} bg-gradient-to-br from-violet-600 to-violet-400 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-violet-600/30`}
      >
        A
      </div>
      <span className={`font-bold ${text} tracking-tight text-slate-900`}>
        AutoClip<span className="text-violet-600"> AI</span>
      </span>
    </div>
  );
  if (href === null) return inner;
  return <Link href={href}>{inner}</Link>;
}
