import "server-only";
import { exec, hasTool } from "./util";

export interface YtMeta {
  videoId: string;
  title: string;
  channel: string;
  description: string;
  durationSeconds: number;
  thumbnail: string;
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.trim().match(p);
    if (m) return m[1];
  }
  return null;
}

export function thumbFor(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Best-effort metadata: yt-dlp for the rich fields, oEmbed as a fast fallback. */
export async function fetchMetadata(url: string): Promise<YtMeta> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  let meta: YtMeta = {
    videoId,
    title: "YouTube Video",
    channel: "Unknown Channel",
    description: "",
    durationSeconds: 0,
    thumbnail: thumbFor(videoId),
  };

  // oEmbed (no key, fast) — title + author
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const j = (await res.json()) as { title?: string; author_name?: string };
      if (j.title) meta.title = j.title;
      if (j.author_name) meta.channel = j.author_name;
    }
  } catch {
    /* ignore */
  }

  // yt-dlp -j for duration + description + best thumbnail
  if (await hasTool("yt-dlp")) {
    const res = await exec(
      "yt-dlp",
      ["-j", "--no-warnings", "--skip-download", url],
      { timeoutMs: 45000 }
    );
    if (res.code === 0 && res.stdout.trim()) {
      try {
        const j = JSON.parse(res.stdout.trim());
        meta.title = j.title || meta.title;
        meta.channel = j.uploader || j.channel || meta.channel;
        meta.description = (j.description || "").slice(0, 2000);
        meta.durationSeconds = Math.round(j.duration || 0);
        if (j.thumbnail) meta.thumbnail = j.thumbnail;
      } catch {
        /* ignore parse */
      }
    }
  }

  return meta;
}
