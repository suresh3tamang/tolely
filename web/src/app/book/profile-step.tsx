"use client";

import { useState } from "react";
import { apiFetch } from "@/client/firebase";
import { useI18n } from "@/client/i18n/provider";
import { Button, inputClass } from "@/components/ui";

/** Name and address, saved once and used to fill in every booking. */
export function ProfileStep({
  initialName,
  initialAddress = "",
  initialLandmark = "",
  onDone,
}: {
  initialName: string;
  initialAddress?: string;
  initialLandmark?: string;
  onDone: () => void;
}) {
  const { t, lang } = useI18n();
  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [landmark, setLandmark] = useState(initialLandmark);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = name.trim().length >= 2 && address.trim().length >= 3;

  async function save() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/me", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), address: address.trim(), landmark: landmark.trim(), language: lang }),
      });
      onDone();
    } catch (e) {
      setError((e as Error).message || t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form
        className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-sky-100"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save();
        }}
      >
        <h1 className="text-xl font-bold text-sky-900">{t("profileTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("profileText")}</p>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("nameLabel")}</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("addressLabel")}</span>
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("landmarkLabel")}</span>
            <input className={inputClass} value={landmark} onChange={(e) => setLandmark(e.target.value)} maxLength={200} />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" loading={busy} disabled={!valid}>
            {busy ? t("saving") : t("saveContinue")}
          </Button>
        </div>
      </form>
    </div>
  );
}
