import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, requireApiUser } from "@/lib/api";
import { createGeneration, listGenerationsByUser } from "@/lib/repo";
import { enqueueGeneration } from "@/lib/pipeline";
import { extractVideoId, fetchMetadata } from "@/lib/pipeline/youtube";

const schema = z.object({
  youtubeUrl: z.string().min(5),
  preset: z.enum(["bold-pop", "minimal", "karaoke"]).default("bold-pop"),
  language: z.enum(["english", "hindi", "hinglish"]).default("english"),
});

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const generations = await listGenerationsByUser(auth.user.id);
  return ok({ generations });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;
  const isAdmin = user.role === "admin";

  // Admins get free, unlimited access (no paywall / no credit limit).
  if (!isAdmin) {
    // Subscription gate — any active plan (Starter/Pro/Max)
    if (user.plan === "free" || user.subscriptionStatus !== "active") {
      return fail("Choose a plan to start generating clips", 402);
    }
    // Plan enforcement — block when the monthly credit limit is exhausted.
    if (user.generationsUsed >= user.generationsLimit) {
      return fail(
        `You've used all ${user.generationsLimit} generations for this cycle. Upgrade for more.`,
        402
      );
    }
    // Common limit — only ONE generation at a time.
    const mine = await listGenerationsByUser(user.id);
    const active = mine.find(
      (g) => !["completed", "failed"].includes(g.status)
    );
    if (active) {
      return fail(
        "You already have a generation in progress. Please wait for it to finish.",
        409
      );
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid input");

  const videoId = extractVideoId(parsed.data.youtubeUrl);
  if (!videoId) return fail("That doesn't look like a valid YouTube URL");

  const maxSrc = parseInt(process.env.MAX_SOURCE_SECONDS || "900", 10);
  let meta;
  try {
    meta = await fetchMetadata(parsed.data.youtubeUrl);
  } catch (e: any) {
    return fail(e?.message || "Could not read that video");
  }
  if (meta.durationSeconds && meta.durationSeconds > maxSrc) {
    return fail(
      `Video is too long (${Math.round(meta.durationSeconds / 60)} min). Max ${Math.round(
        maxSrc / 60
      )} min.`
    );
  }

  const gen = await createGeneration({
    userId: user.id,
    youtubeUrl: parsed.data.youtubeUrl,
    videoId,
    title: meta.title,
    channel: meta.channel,
    description: meta.description,
    durationSeconds: meta.durationSeconds,
    thumbnail: meta.thumbnail,
    status: "queued",
    progress: 2,
    stageLabel: "Queued…",
    clipCount: 0,
    clipIds: [],
    captionStyle: { preset: parsed.data.preset, language: parsed.data.language },
    engine: "real",
    logs: [{ t: new Date().toISOString(), msg: "Job created" }],
  });

  enqueueGeneration(gen.id);
  return ok({ generation: gen });
}
