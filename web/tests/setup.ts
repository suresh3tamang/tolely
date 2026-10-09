import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { clearAfter, queueAfter } from "./helpers/after";

// Next.js request features that don't exist outside a request.
vi.mock("next/server", () => ({ after: queueAfter }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

// Never send real push notifications from tests; record the calls instead.
vi.mock("@/server/notifications/notify", () => ({ notifyUser: vi.fn(), notifySuppliers: vi.fn() }));

process.env.FIREBASE_PROJECT_ID ??= "demo-tolely";

beforeEach(() => clearAfter());

// Page tests (tests/ui) leave components mounted; unmount them after each test.
afterEach(() => cleanup());
