"use client";
import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function clientAuth() {
  const fresh = !getApps().length;
  const app = fresh ? initializeApp(config) : getApps()[0];
  const auth = getAuth(app);
  if (fresh && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return auth;
}

/** Calls our API with the signed-in user's ID token. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await clientAuth().currentUser?.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...init.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}
