import "server-only";
import { adminAuth } from "@/server/firebase";
import { users } from "@/server/collections";
import type { Role } from "@/shared/types";
import { ApiError } from "./errors";

/** Who is calling: taken from a verified Firebase ID token plus their profile. */
export type Caller = {
  uid: string;
  phone: string | null;
  email: string | null;
  role: Role | null; // null = signed in but no profile yet
  /** How they signed in: "phone" (the app), "google.com" (the website), "password" (admins). */
  signInProvider: string;
};

/**
 * Service providers (suppliers) work only in the app, where they sign in with
 * their phone number. The website offers Google sign-in for customers, so a
 * supplier account can't be used from there.
 */
export function assertSupplierChannel(caller: Caller) {
  if (caller.signInProvider !== "phone") {
    throw new ApiError(403, "Service providers use the Tolely app. Sign in there with your phone number.");
  }
}

/** Verifies the Firebase ID token sent as `Authorization: Bearer <token>`. */
export async function getCaller(req: Request): Promise<Caller> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Missing auth token");

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    throw new ApiError(401, "Invalid auth token");
  }

  const user = await users().doc(decoded.uid).get();
  return {
    uid: decoded.uid,
    phone: decoded.phone_number ?? null,
    email: decoded.email ?? null,
    role: (user.get("role") as Role | undefined) ?? null,
    signInProvider: decoded.firebase?.sign_in_provider ?? "unknown",
  };
}

/** Like [getCaller], but only lets people with one of [roles] through. */
export async function requireRole(req: Request, ...roles: Role[]): Promise<Caller> {
  const caller = await getCaller(req);
  if (!caller.role || !roles.includes(caller.role)) throw new ApiError(403, "Not allowed");
  if (caller.role === "supplier") assertSupplierChannel(caller);
  return caller;
}
