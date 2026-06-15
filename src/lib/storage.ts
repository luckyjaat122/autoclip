import "server-only";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  FIREBASE_ADMIN_ENABLED,
  FIREBASE_STORAGE_BUCKET,
  firebaseBucket,
} from "./firebase";
import { SUPABASE_BUCKET, supabaseConfigured, supabaseAdmin } from "./supabase";

/**
 * Pluggable file storage. Selected by STORAGE_PROVIDER = local | firebase | r2.
 * Default is "local" so development never requires Firebase Storage or R2.
 * Swap providers later with a single env change — the app only depends on
 * persistFile/persistBuffer returning a public URL.
 */
const PROVIDER = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
const PUBLIC_DIR = path.join(process.cwd(), "public", "storage");

function contentType(key: string): string {
  if (key.endsWith(".mp4")) return "video/mp4";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".vtt")) return "text/vtt";
  return "application/octet-stream";
}

interface StorageProvider {
  put(key: string, buf: Buffer): Promise<string>;
}

// ---- local ----
const localProvider: StorageProvider = {
  async put(key, buf) {
    const dest = path.join(PUBLIC_DIR, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf);
    return "/storage/" + key.split(path.sep).join("/");
  },
};

// ---- firebase storage ----
const firebaseProvider: StorageProvider = {
  async put(key, buf) {
    const token = crypto.randomUUID();
    await firebaseBucket()
      .file(key)
      .save(buf, {
        resumable: false,
        contentType: contentType(key),
        metadata: {
          contentType: contentType(key),
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
    return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(
      key
    )}?alt=media&token=${token}`;
  },
};

// ---- Cloudflare R2 (S3-compatible, lazy-loaded) ----
const r2Provider: StorageProvider = {
  async put(key, buf) {
    // Optional dependency — install only when STORAGE_PROVIDER=r2:
    //   npm i @aws-sdk/client-s3
    // Loaded via an indirection so it's not resolved at build time.
    const load: (m: string) => Promise<any> = (m) => import(m);
    const { S3Client, PutObjectCommand } = await load("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: buf,
        ContentType: contentType(key),
      })
    );
    const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    return `${base}/${key}`;
  },
};

// ---- Supabase Storage ----
const supabaseProvider: StorageProvider = {
  async put(key, buf) {
    const admin = supabaseAdmin();
    const { error } = await admin.storage
      .from(SUPABASE_BUCKET)
      .upload(key, buf, { contentType: contentType(key), upsert: true });
    if (error) throw new Error(error.message);
    const { data } = admin.storage.from(SUPABASE_BUCKET).getPublicUrl(key);
    return data.publicUrl;
  },
};

function activeProvider(): StorageProvider {
  if (PROVIDER === "supabase" && supabaseConfigured()) return supabaseProvider;
  if (PROVIDER === "firebase" && FIREBASE_ADMIN_ENABLED) return firebaseProvider;
  if (PROVIDER === "r2") return r2Provider;
  return localProvider;
}

/** Persist a Buffer and return a public URL (falls back to local on error). */
export async function persistBuffer(key: string, buf: Buffer): Promise<string> {
  const provider = activeProvider();
  if (provider === localProvider) return localProvider.put(key, buf);
  try {
    return await provider.put(key, buf);
  } catch (e: any) {
    console.warn(
      `[storage] ${PROVIDER} upload failed, falling back to local:`,
      e?.message || e
    );
    return localProvider.put(key, buf);
  }
}

/** Persist a file from an absolute path and return a public URL. */
export async function persistFile(
  key: string,
  srcAbsolutePath: string
): Promise<string> {
  if (activeProvider() === localProvider) {
    const dest = path.join(PUBLIC_DIR, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(srcAbsolutePath, dest);
    return "/storage/" + key.split(path.sep).join("/");
  }
  const buf = await fs.readFile(srcAbsolutePath);
  return persistBuffer(key, buf);
}
