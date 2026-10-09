import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { ApiError } from "./errors";

/** Reads and validates the JSON body; throws a 400 with the first problem. */
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

/** Route context for handlers with one dynamic segment, e.g. `/api/bookings/[id]/accept`. */
export type Params<K extends string> = { params: Promise<Record<K, string>> };
