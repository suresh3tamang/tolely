"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, clientAuth } from "@/client/firebase";
import { Login } from "./login";
import { MoneyPage } from "./money";
import { OverviewPage } from "./overview";
import { ServicesEditor } from "./services-editor";
import { AdminShell, SECTIONS, type Section } from "./shell";
import { BookingsTable, ComplaintsList, SuppliersTable } from "./tables";
import type { Booking, Complaint, Overview, Supplier } from "./types";
import { ActionDialog, Button, ToastProvider, useToast } from "./ui";

export default function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(clientAuth(), setUser), []);

  if (user === undefined) return <FullScreenLoader />;
  if (!user) return <Login />;
  return (
    <ToastProvider>
      <Dashboard user={user} />
    </ToastProvider>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <LoaderCircle className="size-6 animate-spin text-sky-700" />
    </div>
  );
}

type Dialog =
  | { kind: "cancel"; booking: Booking }
  | { kind: "verify"; supplier: Supplier; verified: boolean }
  | { kind: "resolve"; complaint: Complaint };

function Dashboard({ user }: { user: User }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const toast = useToast();

  // Remember the open section in the URL so refresh keeps it.
  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as Section;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL on load
    if (SECTIONS.includes(fromHash)) setSection(fromHash);
  }, []);
  const go = (s: Section) => {
    setSection(s);
    history.replaceState(null, "", `#${s}`);
  };

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await apiFetch<Overview>("/api/admin/overview"));
      setLoadedAt(Date.now());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, [load]);

  async function post(path: string, body: object | undefined, success: string) {
    try {
      await apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      toast("success", success);
      await load();
    } catch (e) {
      toast("error", (e as Error).message);
      throw e;
    }
  }

  if (error === "Not allowed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <Image src="/icon.svg" alt="" width={48} height={48} />
        <h1 className="text-xl font-semibold text-slate-900">This account is not an admin</h1>
        <p className="max-w-sm text-sm text-slate-500">{user.email} can&apos;t open the admin console. Sign in with an admin account.</p>
        <Button variant="secondary" onClick={() => signOut(clientAuth())}>Sign out</Button>
      </div>
    );
  }

  const counts = data && {
    suppliers: data.suppliers.filter((s) => !s.verified).length,
    complaints: data.complaints.filter((c) => c.status === "open").length,
    bookings: data.bookings.filter((b) => b.status === "pending").length,
    money: data.suppliers.filter((s) => (s.feeBalance ?? 0) > 0).length,
  };

  return (
    <AdminShell
      section={section}
      onSection={go}
      counts={counts ?? {}}
      email={user.email}
      onRefresh={load}
      refreshing={refreshing}
      onSignOut={() => signOut(clientAuth())}
    >
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!data ? (
        <div className="flex justify-center py-24"><LoaderCircle className="size-6 animate-spin text-sky-700" /></div>
      ) : section === "overview" ? (
        <OverviewPage data={data} now={loadedAt} go={go} />
      ) : section === "bookings" ? (
        <BookingsTable bookings={data.bookings} onCancel={(booking) => setDialog({ kind: "cancel", booking })} />
      ) : section === "suppliers" ? (
        <SuppliersTable suppliers={data.suppliers} onVerify={(supplier, verified) => setDialog({ kind: "verify", supplier, verified })} />
      ) : section === "money" ? (
        <MoneyPage data={data} onChanged={load} />
      ) : section === "services" ? (
        <ServicesEditor services={data.services} onSaved={load} />
      ) : (
        <ComplaintsList complaints={data.complaints} onResolve={(complaint) => setDialog({ kind: "resolve", complaint })} />
      )}

      {dialog?.kind === "cancel" && (
        <ActionDialog
          title="Cancel booking?"
          message={`${dialog.booking.serviceNameEn} for ${dialog.booking.customerName}. The customer${dialog.booking.supplierName ? " and supplier" : ""} will be notified.`}
          confirmLabel="Cancel booking"
          danger
          onConfirm={() => post(`/api/admin/bookings/${dialog.booking.id}/cancel`, undefined, "Booking cancelled")}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "verify" && (
        <ActionDialog
          title={dialog.verified ? `Verify ${dialog.supplier.name}?` : `Suspend ${dialog.supplier.name}?`}
          message={
            dialog.verified
              ? "Only verify after checking their citizenship card and, for tankers, the vehicle bluebook and water source. They will start getting jobs right away."
              : "They will stop getting new jobs until you verify them again."
          }
          confirmLabel={dialog.verified ? "Verify supplier" : "Suspend"}
          danger={!dialog.verified}
          onConfirm={() =>
            post(
              `/api/admin/suppliers/${dialog.supplier.uid}/verify`,
              { verified: dialog.verified },
              dialog.verified ? `${dialog.supplier.name} verified` : `${dialog.supplier.name} suspended`,
            )
          }
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "resolve" && (
        <ActionDialog
          title="Resolve problem report"
          message="Write what was done, for example “Called customer, supplier refunded Rs 500”."
          confirmLabel="Mark resolved"
          input={{ placeholder: "What was done?" }}
          onConfirm={(resolution) => post(`/api/admin/complaints/${dialog.complaint.id}/resolve`, { resolution }, "Report resolved")}
          onClose={() => setDialog(null)}
        />
      )}
    </AdminShell>
  );
}
