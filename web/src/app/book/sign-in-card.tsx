"use client";

import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { clientAuth } from "@/client/firebase";
import { useI18n } from "@/client/i18n/provider";
import { Button } from "@/components/ui";
import { LanguageToggle } from "./language-toggle";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
    </svg>
  );
}

/** First screen for customers on the website: one button, Google sign-in. */
export function SignInCard() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(clientAuth(), provider);
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // They changed their mind: nothing to show.
      } else if (code === "auth/popup-blocked") {
        setError(t("popupBlocked"));
      } else if (code === "auth/operation-not-allowed") {
        setError(t("googleNotReady")); // Google isn't switched on in the Firebase console yet
      } else {
        console.error("Google sign-in failed", e);
        setError(t("signInFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-4 flex justify-end">
        <LanguageToggle />
      </div>
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-sky-100">
        <h1 className="text-2xl font-bold text-sky-900">{t("signInTitle")}</h1>
        <p className="mt-3 text-slate-600">{t("signInText")}</p>
        <Button
          variant="secondary"
          className="mt-8 h-12 w-full gap-3 text-base"
          loading={busy}
          onClick={signIn}
        >
          {!busy && <GoogleLogo />}
          {busy ? t("signingIn") : t("continueWithGoogle")}
        </Button>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        {t("providerNote")}{" "}
        <Link href="/partners" className="font-medium text-sky-700 underline">
          Tolely app
        </Link>
      </p>
    </div>
  );
}
