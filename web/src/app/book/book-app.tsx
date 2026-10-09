"use client";

import { signOut, type User } from "firebase/auth";
import { LoaderCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, clientAuth } from "@/client/firebase";
import { useI18n } from "@/client/i18n/provider";
import { useAuthUser } from "@/client/use-auth-user";
import { Button, Card, ToastProvider } from "@/components/ui";
import { LanguageToggle } from "./language-toggle";
import { MyBookings } from "./my-bookings";
import { NotificationBell } from "./notification-bell";
import { NewBooking } from "./new-booking";
import { PhoneStep } from "./phone-step";
import { ProfileStep } from "./profile-step";
import { SignInCard } from "./sign-in-card";

type Session = {
  user: { role?: string; name?: string; address?: string; landmark?: string } | null;
  supplier: unknown;
};

/** The customer's page on the website: sign in with Google, then book and follow bookings. */
export function BookApp() {
  const user = useAuthUser();
  return (
    <ToastProvider>
      {user === undefined ? <Spinner /> : user === null ? <SignInCard /> : <SignedIn key={user.uid} user={user} />}
    </ToastProvider>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-24">
      <LoaderCircle className="size-7 animate-spin text-sky-700" />
    </div>
  );
}

function SignedIn({ user }: { user: User }) {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [hasPhone, setHasPhone] = useState(!!user.phoneNumber);
  const [tab, setTab] = useState<"book" | "bookings">("book");

  const load = useCallback(async () => {
    try {
      setSession(await apiFetch<Session>("/api/me"));
      setError("");
    } catch (e) {
      setError((e as Error).message || t("somethingWrong"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on request, not on every language change
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void load();
  }, [load]);

  const leave = (
    <Button variant="ghost" size="sm" icon={LogOut} onClick={() => signOut(clientAuth())}>
      {t("signOut")}
    </Button>
  );

  if (error) {
    return (
      <Centered>
        <p className="text-slate-700">{error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={load}>{t("tryAgain")}</Button>
          {leave}
        </div>
      </Centered>
    );
  }
  if (!session) return <Spinner />;

  const role = session.user?.role;
  if (role === "supplier") {
    return (
      <Centered>
        <h1 className="text-xl font-bold text-sky-900">{t("providerTitle")}</h1>
        <p className="mt-3 text-slate-600">{t("providerText")}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/partners" className="inline-flex h-10 items-center rounded-lg bg-sky-700 px-4 text-sm font-medium text-white hover:bg-sky-800">
            Tolely app
          </Link>
          {leave}
        </div>
      </Centered>
    );
  }
  if (role === "admin") {
    return (
      <Centered>
        <h1 className="text-xl font-bold text-sky-900">{t("adminTitle")}</h1>
        <p className="mt-3 text-slate-600">{t("adminText")}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/admin" className="inline-flex h-10 items-center rounded-lg bg-sky-700 px-4 text-sm font-medium text-white hover:bg-sky-800">
            {t("openAdmin")}
          </Link>
          {leave}
        </div>
      </Centered>
    );
  }

  // The supplier phones the customer, so a verified number comes first.
  if (!hasPhone) return <PhoneStep user={user} onDone={() => setHasPhone(true)} />;

  const profile = session.user;
  if (!profile?.name || !profile.address) {
    return (
      <ProfileStep
        initialName={profile?.name || user.displayName || ""}
        initialAddress={profile?.address}
        initialLandmark={profile?.landmark}
        onDone={load}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-sky-900">{t("hello", { name: profile.name.split(" ")[0] })}</h1>
        <div className="flex items-center gap-2">
          <NotificationBell uid={user.uid} onOpenBooking={() => setTab("bookings")} />
          <LanguageToggle />
          {leave}
        </div>
      </header>

      <nav className="mb-6 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:inline-flex">
        {(["book", "bookings"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-5 py-2 text-sm font-medium sm:flex-none ${
              tab === id ? "bg-sky-700 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t(id === "book" ? "tabBook" : "tabBookings")}
          </button>
        ))}
      </nav>

      {tab === "book" ? (
        <NewBooking
          defaultAddress={profile.address}
          defaultLandmark={profile.landmark ?? ""}
          defaultName={profile.name}
          defaultPhone={user.phoneNumber ?? ""}
          onBooked={() => setTab("bookings")}
        />
      ) : (
        <MyBookings uid={user.uid} onBookFirst={() => setTab("book")} />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8 text-center">{children}</Card>
    </div>
  );
}
