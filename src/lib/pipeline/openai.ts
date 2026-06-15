import "server-only";
import { Segment } from "./whisper";
import { ClipCandidate } from "./viral";

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
export const OPENAI_ENABLED = Boolean(KEY);

/**
 * Ask OpenAI to pick the most viral moments from a timestamped transcript and
 * write catchy titles. Returns null on any failure so callers fall back to the
 * heuristic engine in viral.ts.
 */
export async function openaiDetectMoments(
  segments: Segment[],
  durationSeconds: number,
  max: number
): Promise<ClipCandidate[] | null> {
  if (!KEY || segments.length === 0) return null;

  const transcript = segments
    .map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
    .join("\n")
    .slice(0, 14000);

  const sys =
    "You are an expert short-form video editor who finds viral moments in long videos for Reels, Shorts and TikTok.";
  const user = `From this timestamped transcript, pick the ${max} BEST, most viral, self-contained moments.
Each clip MUST be between 30 and 70 seconds long (end - start >= 30 and <= 70).
Return JSON: {"clips":[{"start":<sec>,"end":<sec>,"title":"<punchy <=60 char title>","hookType":"<Curiosity Hook|Emotional Hook|Shocking Moment|Educational Highlight|Storytelling Peak>","viralScore":<50-99>,"reason":"<one short sentence>"}]}.
Rules: start/end are seconds within 0-${Math.round(durationSeconds)}; end-start between 30 and 70; non-overlapping; order by viralScore desc. Only return genuinely strong moments — fewer great clips is better than padding.

TRANSCRIPT:
${transcript}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const content = j?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    const clips = Array.isArray(parsed) ? parsed : parsed.clips;
    if (!Array.isArray(clips) || clips.length === 0) return null;

    const out: ClipCandidate[] = [];
    for (const c of clips) {
      let start = Number(c.start);
      let end = Number(c.end);
      if (!isFinite(start) || !isFinite(end)) continue;
      start = Math.max(0, start);
      end = Math.min(durationSeconds || end, end);
      // Enforce 30–70s windows.
      let len = end - start;
      if (len < 30) len = 45;
      if (len > 70) len = 70;
      end = start + len;
      if (durationSeconds && end > durationSeconds) {
        end = durationSeconds;
        start = Math.max(0, end - len);
      }
      const text = segments
        .filter((s) => s.end > start && s.start < end)
        .map((s) => s.text)
        .join(" ")
        .trim();
      out.push({
        start,
        end,
        title: String(c.title || "Viral Moment").slice(0, 70),
        hookType: String(c.hookType || "Engagement Peak"),
        viralScore: Math.max(50, Math.min(99, Math.round(Number(c.viralScore) || 80))),
        reason: String(c.reason || "High engagement potential."),
        transcript: text,
      });
    }
    return out.length ? out.slice(0, max) : null;
  } catch {
    return null;
  }
}
