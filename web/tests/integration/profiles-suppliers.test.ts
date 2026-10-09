import { beforeEach, describe, expect, it, vi } from "vitest";
import { complaints } from "@/server/collections";
import { SupplierSchema } from "@/server/suppliers/schemas";
import { CustomerProfileSchema } from "@/server/profiles/schemas";
import {
  deleteAccount,
  getSession,
  saveCustomerProfile,
  saveLanguage,
  setDeviceToken,
} from "@/server/profiles/profiles.service";
import { registerSupplier, setOnline, setVerified } from "@/server/suppliers/suppliers.service";
import { caller, read, resetDb, seedBooking, seedSupplier, seedUser } from "../helpers/db";

// Deleting a login needs Firebase Auth, which the emulator here doesn't run.
const deleteUser = vi.fn();
vi.mock("@/server/firebase", async (original) => ({
  ...(await original<typeof import("@/server/firebase")>()),
  adminAuth: () => ({ deleteUser }),
}));

beforeEach(async () => {
  await resetDb();
  deleteUser.mockClear();
});

describe("customer profile", () => {
  it("a new person becomes a customer", async () => {
    const input = CustomerProfileSchema.parse({ name: "Suresh Tamang", address: "Balkot", language: "en" });
    await saveCustomerProfile(caller("u1", null, "+9779800000001"), input);

    expect(await read("users", "u1")).toMatchObject({
      role: "customer",
      name: "Suresh Tamang",
      address: "Balkot",
      language: "en",
      phone: "+9779800000001",
    });
  });

  it("updating the profile keeps the existing role", async () => {
    await seedUser("u1", "supplier");
    await saveCustomerProfile(caller("u1", "supplier"), CustomerProfileSchema.parse({ name: "Hari K", address: "Thimi" }));
    expect((await read("users", "u1"))?.role).toBe("supplier");
  });

  it("getSession returns the profile and supplier record, or nulls for a new account", async () => {
    expect(await getSession("nobody")).toEqual({ user: null, supplier: null });

    await seedSupplier("s1");
    const session = await getSession("s1");
    expect(session.user).toMatchObject({ uid: "s1", role: "supplier" });
    expect(session.supplier).toMatchObject({ verified: true, services: ["tanker"] });
  });
});

describe("language", () => {
  it("is saved for people who have a profile", async () => {
    await seedUser("u1", "customer", { language: "ne" });
    expect(await saveLanguage(caller("u1", "customer"), "en")).toBe(true);
    expect((await read("users", "u1"))?.language).toBe("en");
  });

  it("is ignored (not stored as a half-empty profile) before a profile exists", async () => {
    expect(await saveLanguage(caller("u2", null), "en")).toBe(false);
    expect(await read("users", "u2")).toBeUndefined();
  });
});

describe("push device tokens", () => {
  it("can be added twice without duplicates, and removed", async () => {
    await seedUser("u1", "customer");
    const person = caller("u1", "customer");
    await setDeviceToken(person, "token-aaaaaaaaaa", false);
    await setDeviceToken(person, "token-aaaaaaaaaa", false);
    await setDeviceToken(person, "token-bbbbbbbbbb", false);
    expect((await read("users", "u1"))?.fcmTokens).toEqual(["token-aaaaaaaaaa", "token-bbbbbbbbbb"]);

    await setDeviceToken(person, "token-aaaaaaaaaa", true);
    expect((await read("users", "u1"))?.fcmTokens).toEqual(["token-bbbbbbbbbb"]);
  });
});

describe("deleting an account", () => {
  it("removes the profile, the supplier record and the login", async () => {
    await seedSupplier("s1");
    await deleteAccount(caller("s1", "supplier"));

    expect(await read("users", "s1")).toBeUndefined();
    expect(await read("suppliers", "s1")).toBeUndefined();
    expect(deleteUser).toHaveBeenCalledWith("s1");
  });

  it("is blocked while a booking is still open (as customer or supplier)", async () => {
    await seedUser("c1", "customer");
    await seedBooking("b1", { customerId: "c1", status: "accepted", supplierId: "s1" });

    await expect(deleteAccount(caller("c1", "customer"))).rejects.toMatchObject({ status: 409 });
    await expect(deleteAccount(caller("s1", "supplier"))).rejects.toMatchObject({ status: 409 });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(await read("users", "c1")).toBeDefined();
  });

  it("is allowed once the bookings are finished, and keeps them for records", async () => {
    await seedUser("c1", "customer");
    await seedBooking("b1", { customerId: "c1", status: "completed", supplierId: "s1" });
    await deleteAccount(caller("c1", "customer"));
    expect(await read("bookings", "b1")).toBeDefined();
  });

  it("is not available to admins", async () => {
    await expect(deleteAccount(caller("a1", "admin"))).rejects.toMatchObject({ status: 400 });
  });
});

describe("registering as a supplier", () => {
  const plumber = SupplierSchema.parse({ name: "Hari", area: "Baneshwor", services: ["plumber"], language: "en" });

  it("creates an unverified account", async () => {
    await registerSupplier(caller("s1", null, "+9779800000002"), plumber);

    expect(await read("users", "s1")).toMatchObject({ role: "supplier", name: "Hari", language: "en" });
    expect(await read("suppliers", "s1")).toMatchObject({
      verified: false,
      services: ["plumber"],
      ratingCount: 0,
      completedJobs: 0,
      phone: "+9779800000002",
    });
    // The language is stored on the user, not copied into the supplier record.
    expect(await read("suppliers", "s1")).not.toHaveProperty("language");
  });

  it("tanker owners must give a vehicle number and water source", async () => {
    const tanker = SupplierSchema.parse({ name: "Bikash", area: "Koteshwor", services: ["tanker"] });
    await expect(registerSupplier(caller("s1", null), tanker)).rejects.toMatchObject({ status: 400 });
    await expect(
      registerSupplier(caller("s1", null), { ...tanker, vehicleNo: "Ba 2 Kha 1234", waterSource: "Well, Thimi" }),
    ).resolves.toBeDefined();
  });

  it("rejects a service that doesn't exist", async () => {
    const bad = SupplierSchema.parse({ name: "Hari", area: "Baneshwor", services: ["time-travel"] });
    await expect(registerSupplier(caller("s1", null), bad)).rejects.toMatchObject({ status: 400 });
  });

  it("editing details sends a verified supplier back to 'waiting', keeping their history", async () => {
    await seedSupplier("s1", { completedJobs: 7, ratingSum: 20, ratingCount: 4 });
    await registerSupplier(caller("s1", "supplier"), plumber);

    expect(await read("suppliers", "s1")).toMatchObject({
      verified: false,
      services: ["plumber"],
      completedJobs: 7,
      ratingSum: 20,
      ratingCount: 4,
    });
  });

  it("admins can't become suppliers", async () => {
    await expect(registerSupplier(caller("a1", "admin"), plumber)).rejects.toMatchObject({ status: 400 });
  });
});

describe("verification and availability", () => {
  it("an admin can verify and suspend a supplier", async () => {
    await seedSupplier("s1", { verified: false });
    await setVerified(caller("a1", "admin"), "s1", true);
    expect(await read("suppliers", "s1")).toMatchObject({ verified: true, verifiedBy: "a1" });

    await setVerified(caller("a1", "admin"), "s1", false);
    expect((await read("suppliers", "s1"))?.verified).toBe(false);
  });

  it("verifying someone who isn't a supplier is a 404", async () => {
    await expect(setVerified(caller("a1", "admin"), "ghost", true)).rejects.toMatchObject({ status: 404 });
  });

  it("a supplier can go offline and online", async () => {
    await seedSupplier("s1");
    await setOnline(caller("s1", "supplier"), false);
    expect((await read("suppliers", "s1"))?.online).toBe(false);
    await setOnline(caller("s1", "supplier"), true);
    expect((await read("suppliers", "s1"))?.online).toBe(true);
  });
});

describe("problem report list", () => {
  it("starts empty", async () => {
    expect((await complaints().get()).empty).toBe(true);
  });
});
