"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { LatLng } from "@/shared/geo";

const HOME = L.divIcon({
  className: "",
  iconSize: [32, 40],
  iconAnchor: [16, 38],
  html: `<svg width="32" height="40" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 46C20 46 4 30 4 18a16 16 0 1 1 32 0c0 12-16 28-16 28z" fill="#0369a1" stroke="#fff" stroke-width="3"/>
    <circle cx="20" cy="18" r="6" fill="#fff"/></svg>`,
});

const SUPPLIER = L.divIcon({
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  html: `<div style="width:40px;height:40px;border-radius:9999px;background:#f59e0b;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
    <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`,
});

/** Small map: the customer's place and, while on the way, the supplier moving towards it. */
export function TrackingMap({ home, supplier }: { home: LatLng | null; supplier: LatLng | null }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const homeMarker = useRef<L.Marker | null>(null);
  const supplierMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    const m = L.map(box.current!, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      homeMarker.current = null;
      supplierMarker.current = null;
    };
  }, []);

  // Move the markers as the supplier's position comes in, and keep both in view.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const place = (ref: typeof homeMarker, point: LatLng | null, icon: L.DivIcon) => {
      if (!point) return ref.current?.remove(), (ref.current = null);
      if (ref.current) ref.current.setLatLng([point.lat, point.lng]);
      else ref.current = L.marker([point.lat, point.lng], { icon }).addTo(m);
    };
    place(homeMarker, home, HOME);
    place(supplierMarker, supplier, SUPPLIER);
    const points = [home, supplier].filter(Boolean) as LatLng[];
    if (points.length === 2) m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 17 });
    else if (points.length === 1) m.setView([points[0].lat, points[0].lng], 16);
  }, [home?.lat, home?.lng, supplier?.lat, supplier?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className="z-0 h-56 w-full rounded-xl ring-1 ring-slate-200" />;
}
