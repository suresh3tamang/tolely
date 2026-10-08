import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { adminAuth, db } from "./firebase-admin";
import type { Role } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Caller = {
  uid: string;
  phone: string | null;
  email: string | null;
  role: Role | null; // null = signed in but no profile yet
};

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

  const user = await db().collection("users").doc(decoded.uid).get();
  return {
    uid: decoded.uid,
    phone: decoded.phone_number ?? null,
    email: decoded.email ?? null,
    role: (user.get("role") as Role | undefined) ?? null,
  };
}

export async function requireRole(req: Request, ...roles: Role[]): Promise<Caller> {
  const caller = await getCaller(req);
  if (!caller.role || !roles.includes(caller.role)) throw new ApiError(403, "Not allowed");
  return caller;
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  const json = await req.json().catch(() => null);
  const result = schema.safeParse(json);
  if (!result.success) throw new ApiError(400, result.error.issues[0]?.message ?? "Invalid request");
  return result.data;
}

/** Wraps a route handler so thrown ApiErrors become JSON error responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      unstable_rethrow(err); // let Next.js handle its own control-flow errors
      if (err instanceof ApiError) return Response.json({ error: err.message }, { status: err.status });
      console.error(err);
      return Response.json({ error: "Server error" }, { status: 500 });
    }
  };
}
