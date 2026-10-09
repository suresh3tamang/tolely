"use client";

import { FirebaseError } from "firebase/app";
import {
  linkWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { clientAuth } from "@/client/firebase";
import { useI18n } from "@/client/i18n/provider";
import type { Strings } from "@/client/i18n/strings";
import { Button, inputClass } from "@/components/ui";

function messageFor(error: unknown): keyof Strings {
  switch (error instanceof FirebaseError ? error.code : "") {
    case "auth/invalid-phone-number":
      return "invalidPhone";
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
    case "auth/provider-already-linked":
      return "numberInUse";
    case "auth/too-many-requests":
      return "tooManyTries";
    case "auth/invalid-verification-code":
    case "auth/code-expired":
      return "wrongCode";
    default:
      return "codeSendFailed";
  }
}

/**
 * Links a verified phone number to the Google account. The supplier calls this
 * number, and the same number then signs in to the app as the same account, so
 * bookings made on the website also show up in the app.
 */
export function PhoneStep({ user, onDone }: { user: User; onDone: () => void }) {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const holder = useRef<HTMLDivElement>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => () => verifier.current?.clear(), []);

  async function send() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) return setError(t("invalidPhone"));
    setBusy(true);
    setError("");
    try {
      // The invisible check that proves this is a person, not a script.
      verifier.current ??= new RecaptchaVerifier(clientAuth(), holder.current!, { size: "invisible" });
      setConfirmation(await linkWithPhoneNumber(user, `+977${digits}`, verifier.current));
      setSentTo(`+977 ${digits}`);
    } catch (e) {
      console.error("Phone link failed", e);
      setError(t(messageFor(e)));
      verifier.current?.clear();
      verifier.current = null;
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await confirmation!.confirm(code.trim());
      await user.getIdToken(true); // the new token now carries the phone number
      onDone();
    } catch (e) {
      console.error("Phone confirm failed", e);
      setError(t(messageFor(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-sky-100">
        <h1 className="text-xl font-bold text-sky-900">{t("phoneTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("phoneText")}</p>

        {!confirmation ? (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("phoneLabel")}</span>
              <div className="flex">
                <span className="flex items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                  🇳🇵 +977
                </span>
                <input
                  className={`${inputClass} rounded-l-none`}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="98XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </label>
            <Button type="submit" className="w-full" loading={busy}>
              {busy ? t("sendingCode") : t("sendCode")}
            </Button>
          </form>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <p className="text-sm font-medium text-emerald-700">{t("codeSentTo", { phone: sentTo })}</p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("codeLabel")}</span>
              <input
                className={`${inputClass} text-center text-lg tracking-[0.5em]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <Button type="submit" className="w-full" loading={busy} disabled={code.length !== 6}>
              {busy ? t("verifying") : t("verify")}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-slate-500 hover:text-slate-800"
              onClick={() => {
                setConfirmation(null);
                setCode("");
                setError("");
              }}
            >
              {t("changeNumber")}
            </button>
          </form>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div ref={holder} />
      </div>
    </div>
  );
}
