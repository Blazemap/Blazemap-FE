import { useEffect } from "react";
import { Marker, type Map } from "maplibre-gl";
import type { WindArrow } from "@/lib/wind";

export default function WindMap({ map, wind }: { map: Map; wind: WindArrow }) {
  const { caseId, latitude, longitude } = wind;
  useEffect(() => { map.jumpTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 9), padding: { left: window.innerWidth >= 768 ? 424 : 0, right: 0, top: 100, bottom: 100 } }); }, [map, caseId, latitude, longitude]);
  useEffect(() => {
    if (Date.now() < Date.parse(wind.evaluatedAt) || Date.now() >= Date.parse(wind.usableUntil)) return;
    const element = document.createElement("div");
    element.style.cssText = "width:64px;height:64px;pointer-events:none;color:#075985;filter:drop-shadow(0 0 3px white)";
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", `${wind.title}: downwind attention toward ${wind.degrees} degrees, not predicted perimeter. Fixed screen arrow; no distance meaning.`);
    element.innerHTML = '<svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 57V7M18 21 32 7l14 14" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const marker = new Marker({ element, rotation: wind.degrees, rotationAlignment: "map", pitchAlignment: "viewport" }).setLngLat([wind.longitude, wind.latitude]).addTo(map);
    const timer = window.setTimeout(() => marker.remove(), Math.max(0, Date.parse(wind.usableUntil) - Date.now()));
    return () => { clearTimeout(timer); marker.remove(); };
  }, [map, wind]);
  return <p className="pointer-events-none absolute right-4 top-24 max-w-60 rounded border bg-white p-2 text-xs text-sky-900">{wind.title}: Downwind attention, not predicted perimeter. Fixed-size arrow, not distance.</p>;
}
