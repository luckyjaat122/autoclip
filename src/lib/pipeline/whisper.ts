import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { exec, hasTool, WHISPER_BIN, WHISPER_MODEL } from "./util";

export interface Segment {
  start: number; // seconds
  end: number;
  text: string;
}

export interface Word {
  start: number;
  end: number;
  text: string;
}

const langCode: Record<string, string> = {
  english: "en",
  hindi: "hi",
  hinglish: "hi",
};

/**
 * Transcribe a wav (16k mono) with whisper.cpp → segments.
 * Returns [] if whisper is unavailable so callers can fall back.
 */
export async function transcribe(
  wavPath: string,
  language: string,
  workdir: string
): Promise<Segment[]> {
  if (!(await hasTool(WHISPER_BIN))) return [];
  try {
    await fs.access(WHISPER_MODEL);
  } catch {
    return [];
  }

  const outBase = path.join(workdir, "transcript");
  const args = [
    "-m", WHISPER_MODEL,
    "-f", wavPath,
    "-oj",
    "-of", outBase,
    "-l", langCode[language] || "auto",
    "-t", String(Math.max(2, Math.min(8, require("os").cpus().length))),
    "-ml", "0",
    "--no-prints",
  ];
  const res = await exec(WHISPER_BIN, args, { timeoutMs: 1000 * 60 * 12 });
  if (res.code !== 0) return [];

  try {
    const raw = await fs.readFile(outBase + ".json", "utf-8");
    const j = JSON.parse(raw);
    const items: any[] = j.transcription || [];
    return items
      .map((it) => ({
        start: (it.offsets?.from ?? 0) / 1000,
        end: (it.offsets?.to ?? 0) / 1000,
        text: (it.text || "").trim(),
      }))
      .filter((s) => s.text.length > 0);
  } catch {
    return [];
  }
}

/** Split a segment's text evenly across its duration into word timings. */
export function wordsFromSegment(seg: Segment): Word[] {
  const tokens = seg.text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const dur = Math.max(0.4, seg.end - seg.start);
  const per = dur / tokens.length;
  return tokens.map((t, i) => ({
    text: t,
    start: seg.start + i * per,
    end: seg.start + (i + 1) * per,
  }));
}
