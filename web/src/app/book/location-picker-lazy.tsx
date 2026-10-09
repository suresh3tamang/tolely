"use client";

import dynamic from "next/dynamic";

/** The map only works in the browser, so it is loaded there and not on the server. */
export const LocationPicker = dynamic(() => import("./location-picker").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-slate-200 sm:h-80" />,
});
