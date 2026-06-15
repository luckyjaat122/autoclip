import "server-only";
import { promises as fs } from "fs";
import { Segment, Word } from "./whisper";

const KEY = process.env.DEEPGRAM_API_KEY;
export const DEEPGRAM_ENABLED = Boolean(KEY);

const LANG: Record<string, string> = {
  english: "en",
  hindi: "hi",
  hinglish: "hi",
};

export interface Transcription {
  segments: Segment[];
  words: Word[];
}

/**
 * Transcribe a wav with Deepgram (nova-2) → segments + real word-level timings.
 * Returns null on any failure so the caller can fall back to whisper.cpp.
 */
export async function deepgramTranscribe(
  wavPath: string,
  language: string
): Promise<Transcription | null> {
  if (!KEY) return null;
  let audio: Buffer;
  try {
    audio = await fs.readFile(wavPath);
  } catch {
    return null;
  }

  const params = new URLSearchParams({
    model: "nova-2",
    smart_format: "true",
    punctuate: "true",
    utterances: "true",
    language: LANG[language] || "en",
  });

  try {
    const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: "POST",
      headers: { Authorization: "Token " + KEY, "Content-Type": "audio/wav" },
      body: new Uint8Array(audio),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const alt = j?.results?.channels?.[0]?.alternatives?.[0];
    if (!alt) return null;

    const words: Word[] = (alt.words || []).map((w: any) => ({
      text: w.punctuated_word || w.word,
      start: w.start,
      end: w.end,
    }));
    if (words.length === 0) return null;

    let segments: Segment[];
    if (Array.isArray(j.results?.utterances) && j.results.utterances.length) {
      segments = j.results.utterances.map((u: any) => ({
        start: u.start,
        end: u.end,
        text: (u.transcript || "").trim(),
      }));
    } else {
      // Fall back to chunking words into ~8s segments.
      segments = [];
      let cur: Word[] = [];
      for (const w of words) {
        cur.push(w);
        if (w.end - cur[0].start >= 8) {
          segments.push({
            start: cur[0].start,
            end: w.end,
            text: cur.map((x) => x.text).join(" "),
          });
          cur = [];
        }
      }
      if (cur.length)
        segments.push({
          start: cur[0].start,
          end: cur[cur.length - 1].end,
          text: cur.map((x) => x.text).join(" "),
        });
    }
    return { segments: segments.filter((s) => s.text), words };
  } catch {
    return null;
  }
}
