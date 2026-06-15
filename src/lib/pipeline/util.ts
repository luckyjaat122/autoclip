import "server-only";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Run a command, capturing output. Never throws on non-zero exit. */
export function exec(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {}
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: opts.cwd });
    let stdout = "";
    let stderr = "";
    let done = false;
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          if (!done) {
            child.kill("SIGKILL");
          }
        }, opts.timeoutMs)
      : null;
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      done = true;
      if (timer) clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + "\n" + err.message });
    });
    child.on("close", (code) => {
      done = true;
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

let toolCache: Record<string, boolean> = {};
export async function hasTool(name: string): Promise<boolean> {
  if (name in toolCache) return toolCache[name];
  const res = await exec("which", [name]);
  const ok = res.code === 0 && res.stdout.trim().length > 0;
  toolCache[name] = ok;
  return ok;
}

export async function makeWorkdir(genId: string): Promise<string> {
  const base = path.join(os.tmpdir(), "autoclip", genId);
  await fs.mkdir(base, { recursive: true });
  return base;
}

export async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export function fmtTimestamp(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    sec
  ).padStart(2, "0")}`;
}

export const WHISPER_BIN = "whisper-cli";
export const WHISPER_MODEL =
  process.env.WHISPER_MODEL || path.join(process.cwd(), "models", "ggml-base.bin");

// Prefer an ffmpeg build with libass/drawtext (ffmpeg-full) for burned captions.
function resolveFfmpeg(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const candidates = [
    "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
    "/usr/local/opt/ffmpeg-full/bin/ffmpeg",
  ];
  for (const c of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("fs").accessSync(c);
      return c;
    } catch {
      /* try next */
    }
  }
  return "ffmpeg";
}
export const FFMPEG_BIN = resolveFfmpeg();
