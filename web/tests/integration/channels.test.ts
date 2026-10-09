import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBooking } from "@/server/bookings/bookings.service";
import { CreateBookingSchema } from "@/server/bookings/schemas";
import { getCaller, requireRole } from "@/server/http";
import { CustomerProfileSchema } from "@/server/profiles/schemas";
import { saveCustomerProfile } from "@/server/profiles/profiles.service";
import { SupplierSchema } from "@/server/suppliers/schemas";
import { registerSupplier } from "@/server/suppliers/suppliers.service";
import { caller, read, resetDb, seedSupplier, seedUser } from "../helpers/db";

// Pretend Firebase has verified a token and tell us how this person signed in.
const verifyIdToken = vi.fn();
vi.mock("@/server/firebase", async (original) => ({
  ...(await original<typeof import("@/server/firebase")>()),
  adminAuth: () => ({ verifyIdToken }),
}));

const signedInAs = (uid: string, provider: string, extra: Record<string, unknown> = {}) =>
  verifyIdToken.mockResolvedValue({ uid, firebase: { sign_in_provider: provider }, ...extra });

const request = () => new Request("http://x/api", { headers: { authorization: "Bearer token" } });

const booking = () =>
  CreateBookingSchema.parse({
    serviceKey: "tanker",
    optionId: "8000L",
    address: "Balkot, Bhaktapur",
    scheduledFor: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  });

beforeEach(async () => {
  await resetDb();
  verifyIdToken.mockReset();
});

describe("who is calling", () => {
  it("reads how the person signed in", async () => {
    await seedUser("u1", "customer");
    signedInAs("u1", "google.com", { email: "suresh@gmail.com", phone_number: "+9779800000001" });

    expect(await getCaller(request())).toMatchObject({
      uid: "u1",
      role: "customer",
      signInProvider: "google.com",
      email: "suresh@gmail.com",
      phone: "+9779800000001",
    });
  });

  it("rejects a missing or invalid token", async () => {
    await expect(getCaller(new Request("http://x/api"))).rejects.toMatchObject({ status: 401 });
    verifyIdToken.mockRejectedValue(new Error("expired"));
    await expect(getCaller(request())).rejects.toMatchObject({ status: 401 });
  });
});

describe("service providers work only in the app", () => {
  beforeEach(() => seedSupplier("s1"));

  it("a supplier signed in with their phone (the app) is allowed", async () => {
    signedInAs("s1", "phone");
    await expect(requireRole(request(), "supplier")).resolves.toMatchObject({ uid: "s1", role: "supplier" });
  });

  it("the same supplier signed in with Google (the website) is turned away", async () => {
    signedInAs("s1", "google.com");
    await expect(requireRole(request(), "supplier")).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining("Tolely app"),
    });
  });

  it("customers and admins are not affected by the app-only rule", async () => {
    await seedUser("c1", "customer");
    await seedUser("a1", "admin");

    signedInAs("c1", "google.com");
    await expect(requireRole(request(), "customer")).resolves.toMatchObject({ uid: "c1" });
    signedInAs("c1", "phone");
    await expect(requireRole(request(), "customer")).resolves.toMatchObject({ uid: "c1" });
    signedInAs("a1", "password");
    await expect(requireRole(request(), "admin")).resolves.toMatchObject({ uid: "a1" });
  });

  it("a customer can't reach supplier-only actions in either channel", async () => {
    await seedUser("c1", "customer");
    signedInAs("c1", "phone");
    await expect(requireRole(request(), "supplier")).rejects.toMatchObject({ status: 403 });
  });

  it("signing up as a supplier works only with a phone login", async () => {
    const input = SupplierSchema.parse({ name: "Hari", area: "Baneshwor", services: ["plumber"] });

    await expect(registerSupplier(caller("g1", null, null, "google.com"), input)).rejects.toMatchObject({ status: 403 });
    expect(await read("suppliers", "g1")).toBeUndefined();
    expect(await read("users", "g1")).toBeUndefined();

    await expect(registerSupplier(caller("p1", null, "+9779800000009", "phone"), input)).resolves.toBeDefined();
    expect(await read("suppliers", "p1")).toMatchObject({ verified: false });
  });
});

describe("customers who book from the website", () => {
  it("must have a verified phone number so the supplier can call them", async () => {
    await seedUser("g1", "customer");
    const noPhone = caller("g1", "customer", null, "google.com");
    await expect(createBooking(noPhone, booking())).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining("verify your phone"),
    });

    const withPhone = caller("g1", "customer", "+9779800000005", "google.com");
    const { id } = await createBooking(withPhone, booking());
    expect(await read("bookings", id)).toMatchObject({ customerId: "g1", customerPhone: "+9779800000005" });
  });

  it("their Google email is kept on the profile for support", async () => {
    const google = { ...caller("g1", null, "+9779800000005", "google.com"), email: "suresh@gmail.com" };
    await saveCustomerProfile(google, CustomerProfileSchema.parse({ name: "Suresh Tamang", address: "Balkot" }));

    expect(await read("users", "g1")).toMatchObject({
      role: "customer",
      email: "suresh@gmail.com",
      phone: "+9779800000005",
    });
  });

  it("an app customer's profile has no email, and that is fine", async () => {
    await saveCustomerProfile(caller("p1", null), CustomerProfileSchema.parse({ name: "Suresh Tamang", address: "Balkot" }));
    expect(await read("users", "p1")).not.toHaveProperty("email");
  });
});
