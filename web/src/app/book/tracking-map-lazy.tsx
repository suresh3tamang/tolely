"use client";

import dynamic from "next/dynamic";

/** The map only works in the browser, so it is loaded there and not on the server. */
export const TrackingMap = dynamic(() => import("./tracking-map").then((m) => m.TrackingMap), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-xl bg-slate-200" />,
});
