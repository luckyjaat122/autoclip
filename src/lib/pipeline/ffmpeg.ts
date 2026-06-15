import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { exec, FFMPEG_BIN, hasTool } from "./util";

let _subFilter: boolean | null = null;
/** Whether this ffmpeg build can burn .ass captions (libass). Cached. */
export async function hasSubtitlesFilter(): Promise<boolean> {
  if (_subFilter !== null) return _subFilter;
  const res = await exec(FFMPEG_BIN, ["-hide_banner", "-filters"]);
  _subFilter = /(^|\s)subtitles(\s|$)/m.test(res.stdout);
  return _subFilter;
}

function captionFilter(assFilename: string): string {
  return `subtitles=${assFilename}:fontsdir=/System/Library/Fonts`;
}

/**
 * Download the source video ONCE at <=480p. All clips are then cut locally
 * with ffmpeg — far faster and more reliable than per-clip network calls.
 * Returns the file path or null if unavailable.
 */
export async function downloadSource(
  url: string,
  workdir: string
): Promise<string | null> {
  if (!(await hasTool("yt-dlp"))) return null;
  const out = path.join(workdir, "source.mp4");
  const res = await exec(
    "yt-dlp",
    [
      "-f", "bv*[height<=480]+ba/b[height<=480]/best",
      "--merge-output-format", "mp4",
      "--no-warnings", "--no-playlist", "--no-part",
      "--ffmpeg-location", FFMPEG_BIN,
      "-o", out,
      url,
    ],
    { timeoutMs: 1000 * 60 * 6 }
  );
  try {
    await fs.access(out);
    return out;
  } catch {
    void res;
    return null;
  }
}

/** Extract a 16k mono wav from a local file for Whisper. */
export async function extractWav(
  srcPath: string,
  workdir: string
): Promise<string | null> {
  const out = path.join(workdir, "audio.wav");
  const res = await exec(
    FFMPEG_BIN,
    [
      "-y", "-i", path.basename(srcPath),
      "-vn", "-ac", "1", "-ar", "16000",
      path.basename(out),
    ],
    { cwd: workdir, timeoutMs: 1000 * 60 * 3 }
  );
  try {
    await fs.access(out);
    return out;
  } catch {
    void res;
    return null;
  }
}

/**
 * Cut a clip from the already-downloaded source, reframe to 9:16 (1080×1920)
 * with a center-weighted face-safe crop, and burn the animated captions.
 */
export async function renderClipFromSource(
  srcPath: string,
  start: number,
  duration: number,
  assFilename: string,
  outPath: string,
  workdir: string
): Promise<boolean> {
  const captions = (await hasSubtitlesFilter()) ? captionFilter(assFilename) : null;
  const vf = [
    "crop=ih*9/16:ih:(iw-ih*9/16)/2:0",
    "scale=1080:1920:flags=lanczos",
    "setsar=1",
    captions,
  ]
    .filter(Boolean)
    .join(",");

  const res = await exec(
    FFMPEG_BIN,
    [
      "-y",
      "-ss", String(Math.max(0, start)),
      "-i", path.basename(srcPath),
      "-t", String(Math.max(3, duration)),
      "-vf", vf,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      path.basename(outPath),
    ],
    { cwd: workdir, timeoutMs: 1000 * 60 * 4 }
  );
  try {
    await fs.access(outPath);
    return true;
  } catch {
    void res;
    return false;
  }
}

/**
 * Fallback renderer: builds a real 9:16 mp4 from the video thumbnail with a
 * Ken-Burns push-in + burned captions + silent audio. Always works as long as
 * ffmpeg is present, so the UX never dead-ends.
 */
export async function renderFromThumbnail(
  thumbUrl: string,
  assFilename: string,
  outPath: string,
  workdir: string,
  duration: number
): Promise<boolean> {
  const imgPath = path.join(workdir, path.basename(outPath) + ".bg.jpg");
  try {
    const r = await fetch(thumbUrl, { cache: "no-store" });
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    await fs.writeFile(imgPath, buf);
  } catch {
    return false;
  }

  const dur = Math.max(6, Math.min(60, duration));
  const fps = 30;
  const frames = Math.round(dur * fps);
  const captions = (await hasSubtitlesFilter()) ? captionFilter(assFilename) : null;
  const vf = [
    "scale=2160:-1",
    "crop=1080:1920",
    `zoompan=z='min(zoom+0.0007,1.18)':d=${frames}:s=1080x1920:fps=${fps}`,
    "eq=brightness=-0.04:saturation=1.15",
    captions,
  ]
    .filter(Boolean)
    .join(",");

  const res = await exec(
    FFMPEG_BIN,
    [
      "-y",
      "-loop", "1",
      "-i", path.basename(imgPath),
      "-f", "lavfi",
      "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-t", String(dur),
      "-vf", vf,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k", "-shortest",
      "-movflags", "+faststart",
      path.basename(outPath),
    ],
    { cwd: workdir, timeoutMs: 1000 * 60 * 3 }
  );
  try {
    await fs.access(outPath);
    return true;
  } catch {
    void res;
    return false;
  }
}

/** Grab a poster frame from a clip. */
export async function thumbnailFromClip(
  clipPath: string,
  outPath: string,
  workdir: string,
  atSecond = 1
): Promise<boolean> {
  const res = await exec(
    FFMPEG_BIN,
    [
      "-y",
      "-ss", String(atSecond),
      "-i", path.basename(clipPath),
      "-frames:v", "1",
      "-q:v", "3",
      path.basename(outPath),
    ],
    { cwd: workdir, timeoutMs: 60000 }
  );
  try {
    await fs.access(outPath);
    return true;
  } catch {
    void res;
    return false;
  }
}
