import { useEffect, useRef, useState } from "react";
import { Map, Marker, NavigationControl } from "maplibre-gl";
import { mapStyleUrl } from "@/config/map";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui";

export function LocationMap({ latitude, longitude, disabled, onPick }: { latitude: string; longitude: string; disabled: boolean; onPick: (latitude: string, longitude: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const marker = useRef<Marker | null>(null);
  const latest = useRef({ disabled, onPick });
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { latest.current = { disabled, onPick }; });
  useEffect(() => {
    if (!container.current) return;
    let instance: Map | undefined;
    let disposed = false;
    const timer = window.setTimeout(() => { if (!disposed) setFailed(true); }, 20000);
    try {
      instance = new Map({ container: container.current, style: mapStyleUrl(), center: [114, -1], zoom: 5, attributionControl: { compact: true } });
      map.current = instance;
      instance.addControl(new NavigationControl({ showCompass: false }));
      instance.on("load", () => { clearTimeout(timer); if (!disposed) setFailed(false); });
      instance.on("error", () => { if (!disposed) setFailed(true); });
      instance.on("click", event => { if (!latest.current.disabled) latest.current.onPick(event.lngLat.lat.toFixed(6), event.lngLat.wrap().lng.toFixed(6)); });
    } catch { queueMicrotask(() => { if (!disposed) setFailed(true); }); }
    const observer = new ResizeObserver(() => instance?.resize());
    observer.observe(container.current);
    return () => { disposed = true; clearTimeout(timer); observer.disconnect(); marker.current?.remove(); marker.current = null; instance?.remove(); map.current = null; };
  }, [attempt]);
  useEffect(() => {
    if (!map.current) return;
    const lat = Number(latitude), lng = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { marker.current?.remove(); marker.current = null; return; }
    marker.current ??= new Marker({ color: getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() });
    marker.current.setLngLat([lng, lat]).addTo(map.current);
    map.current.jumpTo({ center: [lng, lat] });
  }, [latitude, longitude, attempt]);
  return <div className="relative h-64 overflow-hidden rounded-xl bg-secondary lg:h-80"><div ref={container} className="h-full w-full" aria-label="Choose an observation location. Coordinate and region inputs below provide a keyboard alternative." />{failed && <div role="status" className="absolute left-3 right-14 top-3 rounded-lg bg-white/95 p-3 text-sm shadow"><p>Map unavailable. Enter coordinates or choose a region below.</p><Button type="button" variant="ghost" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Retry map</Button></div>}</div>;
}
