import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Initialized lazily so `next build` works without credentials.
function app(): App {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // With emulators running, only the project id is needed.
  if (process.env.FIRESTORE_EMULATOR_HOST || !clientEmail || !privateKey) {
    return initializeApp({ projectId });
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export const adminAuth = () => getAuth(app());
export const db = () => getFirestore(app());
export const messaging = () => getMessaging(app());
