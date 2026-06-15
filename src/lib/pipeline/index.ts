import "server-only";
import path from "path";
import {
  addClip,
  getGeneration,
  pushGenerationLog,
  updateGeneration,
  updateUser,
  findUserById,
  recordUsage,
} from "../repo";
import { persistFile } from "../storage";
import { buildAss } from "./ass";
import {
  downloadSource,
  extractWav,
  renderClipFromSource,
  renderFromThumbnail,
  thumbnailFromClip,
} from "./ffmpeg";
import { cleanup, makeWorkdir } from "./util";
import { ClipCandidate, detectViralMoments } from "./viral";
import { Segment, transcribe, Word, wordsFromSegment } from "./whisper";
import { deepgramTranscribe } from "./deepgram";
import { openaiDetectMoments } from "./openai";

const MAX_CLIPS = parseInt(process.env.MAX_CLIPS_PER_RUN || "6", 10);

async function setStage(
  id: string,
  status: any,
  progress: number,
  stageLabel: string
) {
  await updateGeneration(id, { status, progress, stageLabel });
}

/** Non-speech tokens like [Music], (applause), <laugh> aren't useful captions. */
function isSpeechWord(t: string): boolean {
  const s = (t || "").trim();
  if (!s) return false;
  if (/^[\[\(<].*[\]\)>]$/.test(s)) return false; // [Music], (Applause), <laugh>
  if (/^[^A-Za-z0-9ऀ-ॿ]+$/.test(s)) return false; // pure punctuation
  return true;
}

/** Build 0-based caption words for a clip window (non-speech filtered out). */
function captionWordsForWindow(
  segments: Segment[],
  cand: ClipCandidate,
  realWords: Word[]
): Word[] {
  let words: Word[] = [];

  // Prefer real word-level timings (Deepgram) when available.
  const wordsInWindow = realWords.filter(
    (w) => w.end > cand.start && w.start < cand.end && isSpeechWord(w.text)
  );
  if (wordsInWindow.length > 0) {
    return wordsInWindow
      .map((w) => ({
        text: w.text,
        start: Math.max(0, w.start - cand.start),
        end: w.end - cand.start,
      }))
      .filter((w) => w.end > 0);
  }

  const inWindow = segments.filter(
    (s) => s.end > cand.start && s.start < cand.end
  );
  if (inWindow.length > 0) {
    for (const seg of inWindow) words = words.concat(wordsFromSegment(seg));
    words = words
      .filter((w) => isSpeechWord(w.text))
      .map((w) => ({
        text: w.text,
        start: w.start - cand.start,
        end: w.end - cand.start,
      }))
      .filter((w) => w.end > 0)
      .map((w) => ({ ...w, start: Math.max(0, w.start) }));
  } else {
    // synthesize from transcript text across the duration
    const dur = cand.end - cand.start;
    const tokens = cand.transcript
      .split(/\s+/)
      .filter((t) => isSpeechWord(t))
      .slice(0, 60);
    if (tokens.length === 0) return [];
    const per = dur / Math.max(1, tokens.length);
    words = tokens.map((t, i) => ({
      text: t,
      start: i * per,
      end: (i + 1) * per,
    }));
  }
  return words;
}

/**
 * Main job runner. Mutates the generation record as it progresses so the
 * dashboard can poll live status. Designed to never hard-fail: if the real
 * download path is unavailable it renders presentable fallback clips.
 */
export async function runGeneration(genId: string): Promise<void> {
  const gen = await getGeneration(genId);
  if (!gen) return;
  const workdir = await makeWorkdir(genId);
  let engine: "real" | "simulated" = "real";

  try {
    await setStage(genId, "fetching", 8, "Downloading source from YouTube…");
    await pushGenerationLog(genId, `Source: ${gen.title}`);

    // 1) Download source once, then transcribe its audio.
    let segments: Segment[] = [];
    let realWords: Word[] = [];
    let sourcePath: string | null = await downloadSource(gen.youtubeUrl, workdir);
    if (sourcePath) {
      await pushGenerationLog(genId, "Source downloaded (≤480p).");
      await setStage(genId, "transcribing", 28, "Transcribing speech…");
      const wav = await extractWav(sourcePath, workdir);
      if (wav) {
        // Prefer Deepgram (real word-level timings); fall back to whisper.cpp.
        const dg = await deepgramTranscribe(wav, gen.captionStyle.language);
        if (dg && dg.segments.length) {
          segments = dg.segments;
          realWords = dg.words;
          await pushGenerationLog(
            genId,
            `Transcribed with Deepgram — ${segments.length} segments, ${realWords.length} words.`
          );
        } else {
          segments = await transcribe(wav, gen.captionStyle.language, workdir);
          await pushGenerationLog(
            genId,
            `Transcribed with Whisper — ${segments.length} segments.`
          );
        }
      }
    } else {
      engine = "simulated";
      await pushGenerationLog(
        genId,
        "Direct download unavailable — using metadata-driven analysis & thumbnail render."
      );
    }

    // 2) Viral detection — OpenAI first, heuristic fallback.
    await setStage(genId, "analyzing", 46, "Detecting viral moments with AI…");
    const maxClips = Math.min(
      MAX_CLIPS,
      parseInt(process.env.MAX_CLIPS_PER_RUN || "6", 10)
    );
    let candidates: ClipCandidate[] | null = null;
    if (segments.length > 0) {
      candidates = await openaiDetectMoments(segments, gen.durationSeconds, maxClips);
      if (candidates && candidates.length) {
        await pushGenerationLog(
          genId,
          `OpenAI selected ${candidates.length} viral moments.`
        );
      }
    }
    if (!candidates || candidates.length === 0) {
      candidates = detectViralMoments(segments, gen.durationSeconds, maxClips);
      await pushGenerationLog(
        genId,
        `${candidates.length} high-potential moments selected.`
      );
    }

    // 3) Render each clip
    const clipIds: string[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      const prog = 50 + Math.round(((i + 1) / candidates.length) * 45);
      await setStage(
        genId,
        "rendering",
        prog,
        `Rendering clip ${i + 1} of ${candidates.length} (9:16 + captions)…`
      );

      // Enforce 30–70s clips, clamped to the source bounds.
      let dur = Math.round(cand.end - cand.start);
      dur = Math.max(30, Math.min(70, isFinite(dur) && dur > 0 ? dur : 45));
      let startSec = Math.max(0, Math.round(cand.start));
      if (gen.durationSeconds && startSec + dur > gen.durationSeconds) {
        startSec = Math.max(0, gen.durationSeconds - dur);
        if (gen.durationSeconds < dur) dur = Math.max(8, gen.durationSeconds);
      }
      const win = { ...cand, start: startSec, end: startSec + dur };
      const words = captionWordsForWindow(segments, win, realWords);
      const assName = `cap_${i}.ass`;
      const fsPromises = await import("fs");
      await fsPromises.promises.writeFile(
        path.join(workdir, assName),
        buildAss(words, gen.captionStyle.preset, { title: cand.title, durationSec: dur })
      );

      const outName = `clip_${i}.mp4`;
      const outPath = path.join(workdir, outName);
      let rendered = false;

      // Cut + reframe from the locally downloaded source.
      if (sourcePath) {
        rendered = await renderClipFromSource(
          sourcePath,
          startSec,
          dur,
          assName,
          outPath,
          workdir
        );
      }
      // Fallback: thumbnail-based vertical clip (always renders)
      if (!rendered) {
        if (engine === "real") engine = "simulated";
        rendered = await renderFromThumbnail(
          gen.thumbnail,
          assName,
          outPath,
          workdir,
          dur
        );
      }
      if (!rendered) {
        await pushGenerationLog(genId, `Clip ${i + 1} failed to render, skipping.`);
        continue;
      }

      // Thumbnail
      const thumbName = `thumb_${i}.jpg`;
      const thumbPath = path.join(workdir, thumbName);
      await thumbnailFromClip(outPath, thumbPath, workdir, Math.min(2, dur / 2));

      // Persist to storage (local or Supabase)
      const keyBase = `${gen.userId}/${genId}`;
      const videoUrl = await persistFile(`${keyBase}/${outName}`, outPath);
      let thumbnailUrl = gen.thumbnail;
      try {
        thumbnailUrl = await persistFile(`${keyBase}/${thumbName}`, thumbPath);
      } catch {
        /* keep yt thumb */
      }

      const clip = await addClip({
        generationId: genId,
        userId: gen.userId,
        title: cand.title,
        hookType: cand.hookType,
        viralScore: cand.viralScore,
        start: startSec,
        end: startSec + dur,
        duration: Math.round(dur),
        reason: cand.reason,
        transcript: cand.transcript.slice(0, 600),
        videoUrl,
        thumbnailUrl,
        width: 1080,
        height: 1920,
      });
      clipIds.push(clip.id);
      await updateGeneration(genId, { clipIds, clipCount: clipIds.length });
      await pushGenerationLog(
        genId,
        `✓ Clip ${i + 1}: "${cand.title}" (score ${cand.viralScore})`
      );
    }

    if (clipIds.length === 0) {
      throw new Error("No clips could be produced from this video.");
    }

    await updateGeneration(genId, {
      status: "completed",
      progress: 100,
      stageLabel: "Completed",
      engine,
      completedAt: new Date().toISOString(),
    });
    await pushGenerationLog(genId, `Done — ${clipIds.length} clips ready.`);

    // Count usage against the plan (only on success) + log to usage_tracking.
    const user = await findUserById(gen.userId);
    if (user) {
      await updateUser(user.id, {
        generationsUsed: Math.min(
          user.generationsLimit,
          user.generationsUsed + 1
        ),
      });
      await recordUsage(user.id, genId, "generation");
    }
  } catch (err: any) {
    await updateGeneration(genId, {
      status: "failed",
      stageLabel: "Failed",
      error: err?.message || "Unknown error",
    });
    await pushGenerationLog(genId, `Error: ${err?.message || err}`);
  } finally {
    await cleanup(workdir);
  }
}

// ---- Tiny in-process queue so concurrent runs don't thrash CPU ----
let active = 0;
const MAX_ACTIVE = 2;
const queue: string[] = [];

export function enqueueGeneration(genId: string): void {
  queue.push(genId);
  pump();
}

function pump() {
  while (active < MAX_ACTIVE && queue.length > 0) {
    const id = queue.shift()!;
    active++;
    runGeneration(id)
      .catch(() => {})
      .finally(() => {
        active--;
        pump();
      });
  }
}
