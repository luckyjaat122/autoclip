import "server-only";
import { Word } from "./whisper";

function assTime(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const cs = Math.floor((s - Math.floor(s)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(
    cs
  ).padStart(2, "0")}`;
}

interface PresetStyle {
  fontSize: number;
  primary: string; // &HBBGGRR
  outline: string;
  outlineW: number;
  shadow: number;
  bold: number;
  upper: boolean;
  active: string; // highlight color
}

// ASS colors are &HAABBGGRR (alpha,blue,green,red)
const PRESETS: Record<string, PresetStyle> = {
  "bold-pop": {
    fontSize: 92,
    primary: "&H00FFFFFF",
    outline: "&H00ED3A7C", // violet-ish (BGR of 7c3aed-> ad3a7c)
    outlineW: 5,
    shadow: 3,
    bold: 1,
    upper: true,
    active: "&H004BE1FF", // BGR for RGB(255,225,75) — punchy yellow
  },
  minimal: {
    fontSize: 76,
    primary: "&H00FFFFFF",
    outline: "&H00202020",
    outlineW: 3,
    shadow: 1,
    bold: 1,
    upper: false,
    active: "&H00FFFFFF",
  },
  karaoke: {
    fontSize: 88,
    primary: "&H00FFFFFF",
    outline: "&H00301B4C",
    outlineW: 4,
    shadow: 2,
    bold: 1,
    upper: true,
    active: "&H0024C3A7", // teal-ish
  },
};

/**
 * Build an .ass subtitle file for a 1080×1920 clip with word-by-word captions.
 * `words` timings must be relative to the clip start (0-based).
 */
export function buildAss(
  words: Word[],
  presetKey: string,
  opts: { title?: string; durationSec?: number } = {}
): string {
  const p = PRESETS[presetKey] || PRESETS["bold-pop"];
  // Banner box uses BorderStyle 3 (opaque box). Violet box, white text.
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Arial,${p.fontSize},${p.primary},${p.active},${p.outline},&H64000000,${p.bold},0,0,0,100,100,0,0,1,${p.outlineW},${p.shadow},2,80,80,560,1
Style: Banner,Arial,58,&H00FFFFFF,&H00FFFFFF,&H00ED3A7C,&H00ED3A7C,1,0,0,0,100,100,0,0,3,16,0,8,70,70,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines: string[] = [];

  // Headline banner across the top, persistent for the whole clip.
  if (opts.title) {
    const end = assTime(opts.durationSec || 600);
    const title = opts.title.replace(/[{}\n]/g, "").toUpperCase();
    lines.push(
      `Dialogue: 0,${assTime(0)},${end},Banner,,0,0,0,,{\\fad(180,0)}${title}`
    );
  }

  // Group words into short phrases (max 3) so context shows, active word pops.
  const GROUP = 3;
  for (let i = 0; i < words.length; i += GROUP) {
    const group = words.slice(i, i + GROUP);
    const gStart = group[0].start;
    const gEnd = group[group.length - 1].end;
    // One event per active word: render the whole group, highlight the active.
    for (let k = 0; k < group.length; k++) {
      const w = group[k];
      const text = group
        .map((g, idx) => {
          let t = p.upper ? g.text.toUpperCase() : g.text;
          t = t.replace(/[{}]/g, "");
          if (idx === k) {
            return `{\\c${p.active}\\fscx118\\fscy118}${t}{\\c${p.primary}\\fscx100\\fscy100}`;
          }
          return t;
        })
        .join(" ");
      const fade = "{\\fad(40,40)}";
      const pop =
        k === 0
          ? "{\\t(0,120,\\fscx112\\fscy112)\\t(120,200,\\fscx100\\fscy100)}"
          : "";
      lines.push(
        `Dialogue: 0,${assTime(w.start)},${assTime(w.end)},Cap,,0,0,0,,${fade}${pop}${text}`
      );
    }
    void gStart;
    void gEnd;
  }

  return header + lines.join("\n") + "\n";
}
