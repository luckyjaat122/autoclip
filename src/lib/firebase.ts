import "server-only";
import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

/** Admin SDK (Auth + Firestore) is available when service-account creds are set. */
export const FIREBASE_ADMIN_ENABLED = Boolean(
  projectId && clientEmail && privateKey
);

/** Web API key for server-side REST sign-in (Identity Toolkit). */
export const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "";
export const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "";

let _app: App | null = null;
function getAdminApp(): App {
  if (_app) return _app;
  _app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        storageBucket: FIREBASE_STORAGE_BUCKET || undefined,
      });
  return _app;
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

let _db: Firestore | null = null;
export function adminDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getAdminApp());
    try {
      _db.settings({ ignoreUndefinedProperties: true });
    } catch {
      /* settings can only be set once */
    }
  }
  return _db;
}

export function firebaseBucket() {
  return getStorage(getAdminApp()).bucket();
}
