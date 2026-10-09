"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/client/i18n/provider";
import { Button } from "@/components/ui";
import { KATHMANDU, type LatLng } from "@/shared/geo";
import { PlaceSearch } from "./place-search";

// A brand-coloured pin drawn in code, so no image files are needed.
const PIN = L.divIcon({
  className: "",
  iconSize: [40, 48],
  iconAnchor: [20, 46],
  html: `<svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 46C20 46 4 30 4 18a16 16 0 1 1 32 0c0 12-16 28-16 28z" fill="#0369a1" stroke="#fff" stroke-width="3"/>
    <circle cx="20" cy="18" r="6" fill="#fff"/></svg>`,
});

type Status = "finding" | "found" | "unavailable";

/**
 * Map for choosing where the service is needed.
 *
 * On opening it asks the browser for the person's current location and zooms in.
 * They can then drag the pin, or tap anywhere else on the map, to choose another place.
 */
export function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (point: LatLng) => void }) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState<Status>("finding");

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Put the pin down (or move it) and keep it dragged-able.
  const place = useCallback((point: LatLng) => {
    const m = map.current;
    if (!m) return;
    if (!marker.current) {
      marker.current = L.marker([point.lat, point.lng], { icon: PIN, draggable: true }).addTo(m);
      marker.current.on("dragend", () => {
        const at = marker.current!.getLatLng();
        onChangeRef.current({ lat: at.lat, lng: at.lng });
      });
    } else {
      marker.current.setLatLng([point.lat, point.lng]);
    }
  }, []);

  // Ask the browser where the person is, zoom in there and pin it.
  const locate = useCallback(() => {
    setStatus("finding");
    if (!navigator.geolocation) return setStatus("unavailable");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here = { lat: position.coords.latitude, lng: position.coords.longitude };
        map.current?.flyTo([here.lat, here.lng], 17);
        place(here);
        onChangeRef.current(here);
        setStatus("found");
      },
      () => setStatus("unavailable"), // refused, or no signal: they can tap the map instead
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [place]);

  // A searched place: move the map there, zoom in and pin it. The person then drags the pin to the exact house.
  const goTo = useCallback(
    (point: LatLng) => {
      map.current?.flyTo([point.lat, point.lng], 17);
      place(point);
      onChangeRef.current({ lat: point.lat, lng: point.lng });
      setStatus("found");
    },
    [place],
  );

  // Create the map once.
  useEffect(() => {
    const start = value ?? KATHMANDU;
    const m = L.map(box.current!, { center: [start.lat, start.lng], zoom: value ? 17 : 13, scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => {
      const point = { lat: e.latlng.lat, lng: e.latlng.lng };
      place(point);
      onChangeRef.current(point);
      setStatus("found");
    });
    map.current = m;
    if (value) place(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start finding the person's location when the map opens
    else locate();
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; later changes go through `place`
  }, []);

  // Keep the pin in step if the parent changes the location.
  useEffect(() => {
    if (value) place(value);
  }, [value, place]);

  return (
    <div>
      <PlaceSearch onPick={goTo} onHere={locate} />
      <div className="relative overflow-hidden rounded-lg ring-1 ring-slate-200">
        <div ref={box} className="z-0 h-64 w-full sm:h-80 lg:h-[min(55vh,480px)]" />
        {status === "finding" && (
          <p className="absolute top-3 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow">
            {t("locationFinding")}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
        <p className={`text-sm ${status === "unavailable" && !value ? "text-amber-700" : "text-slate-600"}`}>
          {status === "unavailable" && !value ? t("locationUnavailable") : value ? t("locationHelp") : t("locationFinding")}
        </p>
        <Button type="button" variant="secondary" size="sm" icon={LocateFixed} onClick={locate}>
          {t("useMyLocation")}
        </Button>
      </div>
    </div>
  );
}
