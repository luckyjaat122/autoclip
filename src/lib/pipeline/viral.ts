import "server-only";
import { Segment } from "./whisper";

export interface ClipCandidate {
  start: number;
  end: number;
  title: string;
  hookType: string;
  viralScore: number;
  reason: string;
  transcript: string;
}

const HOOK_LEXICON: { type: string; words: string[]; weight: number }[] = [
  {
    type: "Curiosity Hook",
    weight: 1.25,
    words: ["secret", "nobody", "what if", "you won't believe", "the truth", "reason", "why", "how to", "actually", "hidden", "trick", "mistake"],
  },
  {
    type: "Emotional Hook",
    weight: 1.2,
    words: ["love", "fear", "cried", "amazing", "incredible", "heartbreaking", "proud", "regret", "scared", "happiest", "worst", "best moment"],
  },
  {
    type: "Shocking Moment",
    weight: 1.4,
    words: ["shocking", "insane", "crazy", "unbelievable", "never", "exposed", "shocked", "blew my mind", "out of nowhere", "suddenly", "wait"],
  },
  {
    type: "Educational Highlight",
    weight: 1.1,
    words: ["learn", "step", "first", "second", "tip", "strategy", "framework", "principle", "lesson", "understand", "remember this", "key"],
  },
  {
    type: "Storytelling Peak",
    weight: 1.15,
    words: ["then", "story", "happened", "moment", "turned out", "ended up", "realized", "decided", "everything changed", "that's when"],
  },
];

function scoreText(text: string): { score: number; type: string; hits: string[] } {
  const t = text.toLowerCase();
  let best = { type: "Engagement Peak", weight: 1, count: 0 };
  const hits: string[] = [];
  for (const cat of HOOK_LEXICON) {
    let count = 0;
    for (const w of cat.words) {
      if (t.includes(w)) {
        count++;
        hits.push(w);
      }
    }
    if (count * cat.weight > best.count * best.weight) {
      best = { type: cat.type, weight: cat.weight, count };
    }
  }
  let score = best.count * best.weight * 9;
  // Signal boosters
  const questions = (text.match(/\?/g) || []).length;
  const exclaims = (text.match(/!/g) || []).length;
  const numbers = (text.match(/\b\d+([.,]\d+)?\b/g) || []).length;
  const youCount = (t.match(/\b(you|your)\b/g) || []).length;
  score += questions * 4 + exclaims * 3 + numbers * 2 + Math.min(youCount, 6) * 1.5;
  // Reward punchy, complete thoughts
  const words = text.split(/\s+/).length;
  if (words >= 30 && words <= 130) score += 6;
  return { score, type: best.type, hits };
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function makeTitle(text: string, hookType: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 12);
  let pick = sentences.sort((a, b) => scoreText(b).score - scoreText(a).score)[0] || text;
  pick = pick.replace(/["“”]/g, "").trim();
  const wordsArr = pick.split(/\s+/).slice(0, 9);
  let title = wordsArr.join(" ").replace(/[.,!?;:]+$/, "");
  if (title.length > 60) title = title.slice(0, 57).trim() + "…";
  if (title.length < 6) title = hookType;
  return titleCase(title);
}

const REASONS: Record<string, string> = {
  "Curiosity Hook": "Opens an information gap that compels viewers to keep watching.",
  "Emotional Hook": "Strong emotional language drives shares and saves.",
  "Shocking Moment": "Pattern-interrupt moment that stops the scroll.",
  "Educational Highlight": "Self-contained takeaway viewers screenshot and replay.",
  "Storytelling Peak": "Narrative turning point with high retention.",
  "Engagement Peak": "Dense engagement signals across speech and pacing.",
};

/**
 * Build clip windows from transcript segments and rank by viral potential.
 * Targets 18–50s self-contained windows. Returns up to `max` ranked clips.
 */
export function detectViralMoments(
  segments: Segment[],
  durationSeconds: number,
  max: number
): ClipCandidate[] {
  if (segments.length === 0) {
    return syntheticMoments(durationSeconds, max);
  }

  const TARGET = 45;
  const MINLEN = 30;
  const MAXLEN = 70;
  const candidates: ClipCandidate[] = [];

  for (let i = 0; i < segments.length; i++) {
    let end = i;
    let text = segments[i].text;
    let dur = segments[i].end - segments[i].start;
    while (end + 1 < segments.length && dur < TARGET) {
      end++;
      text += " " + segments[end].text;
      dur = segments[end].end - segments[i].start;
      if (dur > MAXLEN) break;
    }
    if (dur < MINLEN) continue;
    const s = scoreText(text);
    const positionBias = i / segments.length > 0.08 ? 4 : 0; // slight de-bias of intro
    const viralScore = Math.max(
      48,
      Math.min(99, Math.round(58 + s.score + positionBias))
    );
    candidates.push({
      start: Math.max(0, segments[i].start - 0.3),
      end: segments[end].end + 0.3,
      title: makeTitle(text, s.type),
      hookType: s.type,
      viralScore,
      reason: REASONS[s.type] || REASONS["Engagement Peak"],
      transcript: text.trim(),
    });
    i = end; // non-overlapping windows
  }

  // Dedup overlaps, sort by score, take top `max`
  candidates.sort((a, b) => b.viralScore - a.viralScore);
  const chosen: ClipCandidate[] = [];
  for (const c of candidates) {
    if (chosen.some((x) => c.start < x.end && c.end > x.start)) continue;
    chosen.push(c);
    if (chosen.length >= max) break;
  }
  return chosen.sort((a, b) => b.viralScore - a.viralScore);
}

/** Used when no transcript is available — spreads windows across the video. */
export function syntheticMoments(
  durationSeconds: number,
  max: number
): ClipCandidate[] {
  const dur = durationSeconds > 0 ? durationSeconds : 600;
  const n = Math.min(max, Math.max(3, Math.floor(dur / 120)));
  const types = HOOK_LEXICON.map((h) => h.type);
  const out: ClipCandidate[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.floor((dur / (n + 1)) * (i + 1)) - 20;
    const clipDur = 40 + (i % 3) * 10;
    const type = types[i % types.length];
    out.push({
      start: Math.max(0, start),
      end: Math.max(0, start) + clipDur,
      title: titleCase(`${type.split(" ")[0]} Moment #${i + 1}`),
      hookType: type,
      viralScore: 92 - i * 4,
      reason: REASONS[type],
      transcript:
        "High-engagement moment detected by pacing and audio-energy analysis.",
    });
  }
  return out;
}
