import { useEffect, useRef, useState } from "react";
import { AttributionControl, Map, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui";
import { mapStyleUrl } from "@/config/map";
import { effectiveReportPriority, triageAppearance } from "@/lib/report-triage";
import type { GovernmentReport } from "@/types/government";

type GroupReportsMapProps = { reports: GovernmentReport[]; selectedIds: Set<string>; onToggle: (id: string) => void };

export default function GroupReportsMap({ reports, selectedIds, onToggle }: GroupReportsMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!container.current) return;
    let instance: Map | undefined;
    let disposed = false;
    const timer = window.setTimeout(() => { if (!disposed) setFailed(true); }, 20000);
    try {
      instance = new Map({ container: container.current, style: mapStyleUrl(), center: [114, -1], zoom: 5, attributionControl: false });
      map.current = instance;
      instance.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
      instance.addControl(new AttributionControl({ compact: true }), "bottom-right");
      instance.on("load", () => { clearTimeout(timer); if (!disposed) { setReady(true); setFailed(false); } });
      instance.on("error", () => { if (!disposed) setFailed(true); });
    } catch { queueMicrotask(() => { if (!disposed) setFailed(true); }); }
    const observer = new ResizeObserver(() => instance?.resize());
    observer.observe(container.current);
    return () => { disposed = true; clearTimeout(timer); observer.disconnect(); instance?.remove(); map.current = null; };
  }, [attempt]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    const markers = reports.map(report => {
      const appearance = triageAppearance[effectiveReportPriority(report)];
      const selected = selectedIds.has(report.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `grid size-11 place-items-center rounded-full border-2 text-base font-extrabold text-white shadow-lg ${selected ? "border-forest ring-4 ring-white/90" : "border-white"}`;
      button.style.backgroundColor = appearance.color;
      button.innerHTML = '<img src="/icons8-document.png" width="28" height="28" alt="" aria-hidden="true" />';
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", `${selected ? "Remove" : "Select"} ${report.number}. ${appearance.label} review priority. Estimated incident location.`);
      button.title = `${report.number} · ${appearance.label} priority`;
      button.addEventListener("click", event => { event.stopPropagation(); onToggle(report.id); });
      return new Marker({ element: button }).setLngLat([report.longitude!, report.latitude!]).addTo(instance);
    });
    return () => markers.forEach(marker => marker.remove());
  }, [reports, selectedIds, onToggle, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready || !reports.length) return;
    const longitudes = reports.map(report => report.longitude!);
    const latitudes = reports.map(report => report.latitude!);
    const bounds: [[number, number], [number, number]] = [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]];
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
    if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]) instance.jumpTo({ center: bounds[0], zoom: 11 });
    else instance.fitBounds(bounds, { padding: 72, maxZoom: 12, duration });
  }, [reports, ready]);

  return <div className="relative h-full min-h-[420px] overflow-hidden rounded-xl bg-secondary">
    <div ref={container} className="h-full w-full [&_.maplibregl-ctrl-attrib]:text-xs [&_.maplibregl-ctrl-group_button]:h-11 [&_.maplibregl-ctrl-group_button]:w-11" aria-label="Map of currently unlinked incident-estimate reports. Selectable markers match the report list. No hotspot data is shown or associated." />
    {failed && <div role="alert" className="absolute left-4 right-16 top-4 max-w-sm rounded-xl border bg-white p-4 text-sm shadow-lg"><p className="font-bold">Map unavailable</p><p className="mt-1 text-muted-foreground">Use the report list to continue selecting reports.</p><Button type="button" variant="outline" className="mt-3" onClick={() => { setFailed(false); setReady(false); setAttempt(value => value + 1); }}>Retry map</Button></div>}
  </div>;
}
