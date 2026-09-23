import { useEffect, useRef, useState } from "react";
import { Map, NavigationControl, AttributionControl, GeolocateControl, Marker, type GeoJSONSource } from "maplibre-gl";
import { mapStyleUrl } from "@/config/map";
import "maplibre-gl/dist/maplibre-gl.css";
import { Popover } from "radix-ui";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui";
import { MapSkeleton } from "@/pages/dashboard/components/DashboardSkeletons";
import { hasPoint, toGeoJSON } from "@/pages/dashboard/utils";
import { flameImage } from "@/pages/dashboard/utils/flame";
import type { CaseItem, MapItem, OperationalMapFeature, OwnReport } from "@/types";
import { effectiveReportPriority, triageAppearance } from "@/lib/report-triage";
import { reportStatusLabel } from "@/lib/report-status";
import { OwnPerimeters, PerimeterDrawing, PrivatePerimeters, PublicPerimeters } from "./PerimeterMap";
import type { PerimeterEditorProps } from "./CasePerimeter";
import type { WindArrow } from "@/lib/wind";
import WindMap from "./WindMap";
import type { GovernmentReport } from "@/types/government";
import { mapPanelPadding } from "@/lib/dashboard";

export default function SituationMap({ place = null, focusPoint = null, items, selected, draftLocation, onSelect, onPick, selectingReport = false, selectedReportIds, perimeterDraft = null, onPerimeterDraft, wind = null, privateReports = [], selectedReport = null, onSelectReport, privateCases = [], selectedCaseId = null, onSelectCase, ownReports = [], selectedOwnReport = null, onSelectOwnReport, operationalFeatures = [] }: { operationalFeatures?: OperationalMapFeature[]; place?: import("@/lib/places").Place | null; focusPoint?: { latitude: number; longitude: number } | null; privateReports?: GovernmentReport[]; selectingReport?: boolean; selectedReportIds?: ReadonlySet<string>; selectedReport?: GovernmentReport | null; onSelectReport?: (report: GovernmentReport) => void; privateCases?: CaseItem[]; selectedCaseId?: string | null; onSelectCase?: (id: string) => void; ownReports?: OwnReport[]; selectedOwnReport?: OwnReport | null; onSelectOwnReport?: (id: string) => void; wind?: WindArrow | null; perimeterDraft?: PerimeterEditorProps["draft"]; onPerimeterDraft?: PerimeterEditorProps["setDraft"]; items: MapItem[]; selected: MapItem | null; draftLocation?: { latitude: string; longitude: string } | null; onSelect: (id: string) => void; onPick?: (latitude: string, longitude: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const latest = useRef({ items, onSelect, selected, onPick, draftLocation, perimeterDraft, selectingReport });
  const pickMarker = useRef<Marker | null>(null);
  const selectionMode = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [readyMap, setReadyMap] = useState<Map | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => { latest.current = { items, onSelect, selected, onPick, draftLocation, perimeterDraft, selectingReport }; });
  useEffect(() => {
    const map = mapRef.current;
    if (!map || state !== "ready" || selectionMode.current === selectingReport) return;
    selectionMode.current = selectingReport;
    for (const layer of ["clusters", "counts", "points", "hotspot-clusters", "hotspots", "selected-point"]) if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", selectingReport ? "none" : "visible");
  }, [selectingReport, readyMap, state]);
  useEffect(() => {
    if (!container.current) return;
    let map: Map;
    let disposed = false;
    let hasLoaded = false;
    const timeout = window.setTimeout(() => { if (!disposed && !hasLoaded) setState("error"); }, 20000);
    try {
      map = new Map({ container: container.current, style: mapStyleUrl(), center: [114, -1], zoom: 5, attributionControl: false });
      mapRef.current = map;
      map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
      map.addControl(new GeolocateControl({ trackUserLocation: false, showAccuracyCircle: true }), "bottom-right");
      map.addControl(new AttributionControl({ compact: true }), "bottom-right");
      map.on("click", event => { if (!latest.current.perimeterDraft) latest.current.onPick?.(event.lngLat.lat.toFixed(6), event.lngLat.wrap().lng.toFixed(6)); });
      map.on("error", () => { if (!disposed) setState("error"); });
      map.on("style.load", () => {
        if (disposed) return;
        clearTimeout(timeout);
        map.addSource("observations", { type: "geojson", data: toGeoJSON(latest.current.items), cluster: true, clusterRadius: 48, clusterMaxZoom: 13, clusterProperties: { hotspotCount: ["+", ["case", ["==", ["get", "kind"], "hotspot"], 1, 0]] } });
        map.addLayer({ id: "clusters", type: "circle", source: "observations", filter: ["all", ["has", "point_count"], ["!=", ["get", "hotspotCount"], ["get", "point_count"]]], paint: { "circle-color": getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(), "circle-radius": 21, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
        map.addLayer({ id: "counts", type: "symbol", source: "observations", filter: ["all", ["has", "point_count"], ["!=", ["get", "hotspotCount"], ["get", "point_count"]]], layout: { "text-field": "{point_count_abbreviated}", "text-font": ["Noto Sans Regular"], "text-size": 12, "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": "#ffffff" } });
        map.addLayer({ id: "points", type: "circle", source: "observations", filter: ["all", ["!", ["has", "point_count"]], ["!=", ["get", "kind"], "hotspot"]], paint: { "circle-color": getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(), "circle-radius": 8, "circle-opacity": ["match", ["get", "kind"], "hotspot", 0, 1], "circle-stroke-opacity": ["match", ["get", "kind"], "hotspot", 0, 1], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        map.addImage("hotspot-flame", flameImage(() => map.triggerRepaint()), { pixelRatio: 2 });
        map.addLayer({ id: "hotspot-clusters", type: "symbol", source: "observations", filter: ["all", ["has", "point_count"], ["==", ["get", "hotspotCount"], ["get", "point_count"]]], layout: { "icon-image": "hotspot-flame", "icon-size": ["interpolate", ["linear"], ["get", "point_count"], 2, 1.4, 10, 1.8, 50, 2.3, 200, 2.8], "icon-allow-overlap": true, "icon-ignore-placement": true, "text-field": "{point_count_abbreviated}", "text-font": ["Noto Sans Regular"], "text-size": 14, "text-anchor": "top", "text-offset": ["interpolate", ["linear"], ["get", "point_count"], 2, ["literal", [0, 1.8]], 10, ["literal", [0, 2.3]], 50, ["literal", [0, 2.9]], 200, ["literal", [0, 3.5]]], "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": getComputedStyle(document.documentElement).getPropertyValue("--color-deepred").trim(), "text-halo-color": "#ffffff", "text-halo-width": 2 } });
        map.addLayer({ id: "hotspots", type: "symbol", source: "observations", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "kind"], "hotspot"]], layout: { "icon-image": "hotspot-flame", "icon-size": ["get", "flameSize"], "icon-allow-overlap": true, "icon-ignore-placement": true } });
        map.addSource("selection", { type: "geojson", data: toGeoJSON(latest.current.selected ? [latest.current.selected] : []) });
        map.addLayer({ id: "selected-point", type: "circle", source: "selection", paint: { "circle-radius": 14, "circle-color": "#ffffff", "circle-opacity": 0, "circle-stroke-width": 3, "circle-stroke-color": getComputedStyle(document.documentElement).getPropertyValue("--color-deepred").trim() } });
        map.on("click", ["points", "hotspots"], (event) => {
          if (latest.current.onPick || latest.current.perimeterDraft || latest.current.selectingReport) return;
          const id: unknown = event.features?.[0]?.properties.id;
          if (typeof id === "string") latest.current.onSelect(id);
        });
        map.on("click", ["clusters", "counts", "hotspot-clusters"], (event) => {
          if (latest.current.onPick || latest.current.perimeterDraft || latest.current.selectingReport) return;
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const coordinates = feature.geometry.coordinates;
          const source = map.getSource("observations") as GeoJSONSource;
          void source.getClusterExpansionZoom(Number(feature.properties.cluster_id)).then((zoom) => {
            if (!disposed) map.jumpTo({ center: [coordinates[0], coordinates[1]], zoom });
          }).catch(() => { if (!disposed) setState("error"); });
        });
        for (const layer of ["points", "hotspots", "clusters", "counts", "hotspot-clusters"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }
        hasLoaded = true;
        selectionMode.current = false;
        setReadyMap(map);
        setState("ready");
      });
    } catch {
      clearTimeout(timeout);
      queueMicrotask(() => { if (!disposed) setState("error"); });
      return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; };
    }
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    return () => { disposed = true; clearTimeout(timeout); observer.disconnect(); map.remove(); mapRef.current = null; };
  }, [attempt]);
  useEffect(() => {
    const map = mapRef.current;
    let disposed = false;
    const source = map?.getSource("observations") as GeoJSONSource | undefined;
    void source?.setData(toGeoJSON(items)).then(() => { if (!disposed) map?.triggerRepaint(); }).catch(() => { if (!disposed) setState("error"); });
    return () => { disposed = true; };
  }, [items, state, readyMap]);
  useEffect(() => {
    const map = mapRef.current;
    const latitude = Number(draftLocation?.latitude), longitude = Number(draftLocation?.longitude);
    const hasDraftLocation = !!draftLocation?.latitude.trim() && !!draftLocation.longitude.trim() && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
    if (!map || state !== "ready" || !hasDraftLocation || perimeterDraft) { pickMarker.current?.remove(); pickMarker.current = null; return; }
    if (!pickMarker.current) {
      const marker = new Marker({ color: getComputedStyle(document.documentElement).getPropertyValue("--color-deepred").trim(), draggable: !!onPick, scale: 1.15 });
      const element = marker.getElement();
      element.addEventListener("click", event => event.stopPropagation());
      element.addEventListener("keydown", event => {
        if (!latest.current.onPick) return;
        const step = event.shiftKey ? 0.01 : 0.001;
        const delta = { ArrowUp: [0, step], ArrowDown: [0, -step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[event.key];
        if (!delta) return;
        event.preventDefault();
        event.stopPropagation();
        const point = marker.getLngLat();
        const longitude = point.lng + delta[0];
        latest.current.onPick(Math.max(-90, Math.min(90, point.lat + delta[1])).toFixed(6), (Math.abs(longitude) <= 180 ? longitude : ((longitude + 180) % 360 + 360) % 360 - 180).toFixed(6));
      });
      element.style.minWidth = "44px";
      element.style.minHeight = "44px";
      marker.on("dragend", () => { const point = marker.getLngLat(); latest.current.onPick?.(point.lat.toFixed(6), point.wrap().lng.toFixed(6)); });
      pickMarker.current = marker;
    }
    const marker = pickMarker.current;
    marker.setDraggable(!!onPick);
    const element = marker.getElement();
    element.setAttribute("aria-label", onPick ? "Selected report location. Drag it or use arrow keys to adjust." : "Selected report location.");
    element.setAttribute("title", onPick ? "Drag or use arrow keys to adjust report location" : "Selected report location");
    element.tabIndex = onPick ? 0 : -1;
    element.style.filter = onPick ? "drop-shadow(0 0 8px rgba(232,117,66,0.7))" : "";
    marker.setLngLat([longitude, latitude]).addTo(map);
  }, [draftLocation, onPick, state, perimeterDraft]);
  useEffect(() => () => { pickMarker.current?.remove(); pickMarker.current = null; }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || state !== "ready") return;
    let markers: Marker[] = [];
    const render = () => {
      markers.forEach(marker => marker.remove());
      markers = [];
      if (latest.current.perimeterDraft) return;
      const visible = new Set(map.queryRenderedFeatures({ layers: ["points"] }).map(feature => feature.properties.id));
      for (const item of items) {
        if (item.kind !== "publication" || !hasPoint(item) || !visible.has(item.id)) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "grid size-11 place-items-center rounded-full border-2 border-white bg-primary text-white shadow-lg";
        button.setAttribute("aria-label", `Published report: ${item.title}. Published ${item.time}. Approved point, not a perimeter.`);
        button.innerHTML = '<img src="/icons8-document.png" width="30" height="30" alt="" aria-hidden="true" />';
        button.addEventListener("click", event => { event.stopPropagation(); if (latest.current.perimeterDraft || latest.current.selectingReport) return; if (latest.current.onPick) latest.current.onPick(String(item.latitude), String(item.longitude)); else latest.current.onSelect(item.id); });
        markers.push(new Marker({ element: button }).setLngLat([item.longitude, item.latitude]).addTo(map));
      }
    };
    map.on("moveend", render);
    map.on("sourcedata", render);
    render();
    return () => { map.off("moveend", render); map.off("sourcedata", render); markers.forEach(marker => marker.remove()); };
  }, [items, state, perimeterDraft]);
  useEffect(() => {
    const map = mapRef.current;
    (map?.getSource("selection") as GeoJSONSource | undefined)?.setData(toGeoJSON(selected ? [selected] : []));
    if (map && selected && !latest.current.perimeterDraft && hasPoint(selected)) map.jumpTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(map.getZoom(), 9), padding: mapPanelPadding() });
  }, [selected, state]);
  useEffect(() => {
    if (!readyMap || state !== "ready" || onPick) return;
    const casesWithPerimeters = new Set(privateCases.filter(item => item.perimeter).map(item => item.id));
    const markers = privateReports.filter(hasPoint).filter(report => {
      const selectedMarker = selectedReport?.id === report.id;
      return selectingReport || selectedMarker || !report.case?.id || !casesWithPerimeters.has(report.case.id);
    }).map(report => {
      const button = document.createElement("button");
      button.type = "button";
      const appearance = triageAppearance[effectiveReportPriority(report)];
      const selectedMarker = selectedReportIds?.has(report.id) || selectedReport?.id === report.id;
      button.className = `grid size-11 place-items-center rounded-full border-2 text-lg font-extrabold text-white shadow-lg ${selectedMarker ? "border-forest ring-4 ring-white/90" : "border-white"}`;
      if (selectedReportIds) button.setAttribute("aria-pressed", String(selectedReportIds.has(report.id)));
      button.style.backgroundColor = appearance.color;
      button.disabled = !!perimeterDraft;
      const meaning = report.locationMode === "OBSERVER_POSITION" ? "Observer position, not incident location" : "Estimated incident location";
      button.setAttribute("aria-label", `${report.number}. Review priority: ${appearance.label}. ${meaning}. ${perimeterDraft ? "Selected report location under boundary editor" : selectedReportIds ? selectedReportIds.has(report.id) ? "Remove from related report selection" : "Add to related report selection" : selectingReport ? "Select this report as related" : "Open private report review"}`);
      button.title = `${report.number}: ${appearance.label} priority. ${meaning}`;
      button.innerHTML = '<img src="/icons8-document.png" width="28" height="28" alt="" aria-hidden="true" />';
      button.addEventListener("click", event => { event.stopPropagation(); if (!perimeterDraft) onSelectReport?.(report); });
      return new Marker({ element: button }).setLngLat([report.longitude, report.latitude]).addTo(readyMap);
    });
    return () => markers.forEach(marker => marker.remove());
  }, [readyMap, state, privateReports, selectedReport, selectedReportIds, privateCases, onSelectReport, perimeterDraft, onPick, selectingReport]);
  useEffect(() => {
    if (!readyMap || state !== "ready" || perimeterDraft || onPick) return;
    const publishedCaseNumbers = new Set(items.flatMap(item => item.publicPerimeter && item.caseNumber ? [item.caseNumber] : []));
    const markers = ownReports.filter(hasPoint).filter(report => report.case?.handlingStatus !== "CLOSED" && !report.case?.perimeter && (!report.case || !publishedCaseNumbers.has(report.case.number))).map(report => {
      const button = document.createElement("button");
      button.type = "button";
      const selectedMarker = selectedOwnReport?.id === report.id;
      button.className = `grid size-11 place-items-center rounded-full border-2 bg-orange-600 text-white shadow-lg ${selectedMarker ? "border-forest ring-4 ring-white/90" : "border-white"}`;
      const meaning = report.locationMode === "OBSERVER_POSITION" ? "Observer position, not incident location" : "Estimated incident location";
      button.setAttribute("aria-label", `Your report. ${reportStatusLabel(report)}. ${meaning}. Open report details`);
      button.title = `Your report · ${reportStatusLabel(report)} · ${meaning}`;
      button.innerHTML = '<img src="/icons8-document.png" width="28" height="28" alt="" aria-hidden="true" />';
      button.addEventListener("click", event => { event.stopPropagation(); onSelectOwnReport?.(report.id); });
      return new Marker({ element: button }).setLngLat([report.longitude, report.latitude]).addTo(readyMap);
    });
    return () => markers.forEach(marker => marker.remove());
  }, [readyMap, state, ownReports, selectedOwnReport, onSelectOwnReport, items, perimeterDraft, onPick]);
  useEffect(() => {
    if (!readyMap || state !== "ready" || perimeterDraft || onPick) return;
    const markers = operationalFeatures.map(feature => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `grid size-11 place-items-center rounded-full border-2 bg-white shadow-lg ${feature.kind === "WATER_SOURCE" ? "border-sky-600" : "border-emerald-600"}`;
      element.innerHTML = `<img src="${feature.kind === "WATER_SOURCE" ? "/icons8-water.png" : "/icons8-road.png"}" width="30" height="30" alt="" aria-hidden="true" />`;
      element.setAttribute("aria-label", `${feature.kind === "WATER_SOURCE" ? "Water source" : "Access point"}: ${feature.name}. ${feature.condition ?? "Condition unknown"}`);
      element.title = `${feature.name} · ${feature.condition ?? "Unknown"}`;
      return new Marker({ element }).setLngLat([feature.longitude, feature.latitude]).addTo(readyMap);
    });
    return () => markers.forEach(marker => marker.remove());
  }, [readyMap, state, operationalFeatures, perimeterDraft, onPick]);
  useEffect(() => {
    if (readyMap && selectedReport && hasPoint(selectedReport) && !perimeterDraft) readyMap.jumpTo({ center: [selectedReport.longitude, selectedReport.latitude], zoom: Math.max(readyMap.getZoom(), 9), padding: mapPanelPadding() });
  }, [readyMap, selectedReport, perimeterDraft]);
  useEffect(() => {
    if (readyMap && selectedOwnReport && !selectedOwnReport.case?.perimeter && selectedOwnReport.case?.handlingStatus !== "CLOSED" && hasPoint(selectedOwnReport) && !perimeterDraft) readyMap.jumpTo({ center: [selectedOwnReport.longitude, selectedOwnReport.latitude], zoom: Math.max(readyMap.getZoom(), 11), padding: mapPanelPadding() });
  }, [readyMap, selectedOwnReport, perimeterDraft]);
  useEffect(() => {
    if (readyMap && focusPoint && !perimeterDraft) readyMap.jumpTo({ center: [focusPoint.longitude, focusPoint.latitude], zoom: Math.max(readyMap.getZoom(), 12), padding: mapPanelPadding() });
  }, [readyMap, focusPoint, perimeterDraft]);
  useEffect(() => {
    if (!readyMap || !place || perimeterDraft || onPick) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 800;
    if (place.bbox) readyMap.fitBounds([[place.bbox[0], place.bbox[1]], [place.bbox[2], place.bbox[3]]], { padding: mapPanelPadding(), maxZoom: 14, duration });
    else readyMap.flyTo({ center: [place.longitude, place.latitude], zoom: 11, padding: mapPanelPadding(), duration });
  }, [readyMap, place, perimeterDraft, onPick]);
  return <div className="relative h-full min-h-0 bg-secondary">
    <div ref={container} aria-label="Situation map. All observations are also available in the results list. Flame counts are grouped satellite detections, not unique fires. Crimson circles with counts are grouped observations, not severity indicators." className="h-full w-full [&_.maplibregl-ctrl-attrib]:text-xs [&_.maplibregl-ctrl-group_button]:h-11 [&_.maplibregl-ctrl-group_button]:w-11" />
    {state === "ready" && <div className="absolute bottom-24 left-4 z-10"><Popover.Root><Popover.Trigger asChild><button type="button" className="flex min-h-11 items-center gap-2 rounded-sm border border-primary/10 bg-white px-3 py-2 text-xs font-bold text-forest shadow-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"><Info size={16} aria-hidden="true" />Map info</button></Popover.Trigger><Popover.Portal><Popover.Content side="top" align="start" sideOffset={8} collisionPadding={16} className="z-[80] max-h-[min(30rem,calc(100dvh-8rem))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-sm border border-primary/10 bg-white p-4 text-xs leading-5 text-forest shadow-2xl"><div className="flex items-center justify-between gap-3"><h2 className="font-extrabold">Map info</h2><Popover.Close asChild><button type="button" aria-label="Close map info" className="grid size-10 place-items-center rounded-full hover:bg-secondary"><X size={16} aria-hidden="true" /></button></Popover.Close></div><div className="mt-2 space-y-2 border-t border-primary/10 pt-3"><ul className="space-y-3"><li className="flex items-start gap-3"><img src="/icons8-document.png" alt="" width={28} height={28} className="size-7 shrink-0" /><span><strong>Document pin</strong><br />A citizen report or privacy-reviewed published update. Its border and accessible label identify the exact type.</span></li><li className="flex items-start gap-3"><img src="/icons8-flame.png" alt="" width={28} height={28} className="size-7 shrink-0" /><span><strong>Flame</strong><br />NASA FIRMS thermal anomaly. It is a satellite indicator, not a confirmed fire and not case evidence.</span></li>{operationalFeatures.length > 0 && <><li className="flex items-start gap-3"><img src="/icons8-road.png" alt="" width={28} height={28} className="size-7 shrink-0" /><span><strong>Road icon</strong><br />A reviewed operational access point with its latest recorded condition.</span></li><li className="flex items-start gap-3"><img src="/icons8-water.png" alt="" width={28} height={28} className="size-7 shrink-0" /><span><strong>Water icon</strong><br />A reviewed water source with its latest recorded availability.</span></li></>}</ul><p><strong>Boundaries:</strong> orange is an approved published perimeter; blue is the current private operational case perimeter.</p>{onSelectOwnReport && <p><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-full bg-orange-600 align-[-1px]" />Orange location pins are your reports. Their labels distinguish observer positions from incident estimates.</p>}{onSelectReport && <section aria-label="Private report priority legend"><p>Private report priority, not fire confirmation. Marker labels distinguish observer positions from incident estimates.</p><ul className="mt-2 space-y-1">{Object.entries(triageAppearance).map(([level, appearance]) => <li key={level} className="flex items-center gap-2"><span aria-hidden="true" className="grid size-7 place-items-center rounded-full border-2 bg-white" style={{ borderColor: appearance.color }}><img src="/icons8-document.png" alt="" width={18} height={18} /></span>{appearance.label} review priority</li>)}</ul></section>}<p>Flame counts show grouped satellite detections, not unique fires.</p><p>Crimson circle counts group published updates or a mix of updates and satellite detections.</p><p>Individual flame size reflects radiative power (MW), not the size of a burned area.</p></div></Popover.Content></Popover.Portal></Popover.Root></div>}
    {state === "ready" && readyMap && wind && !onPick && <WindMap map={readyMap} wind={wind} />}
    {state === "ready" && readyMap && <PublicPerimeters map={readyMap} items={items} selected={selected} blocked={!!onPick || !!perimeterDraft || selectingReport} onSelect={onSelect} />}
    {state === "ready" && readyMap && onSelectOwnReport && <OwnPerimeters map={readyMap} reports={ownReports} selected={selectedOwnReport} blocked={!!onPick || !!perimeterDraft || selectingReport} onSelect={onSelectOwnReport} />}
    {state === "ready" && readyMap && onSelectCase && <PrivatePerimeters map={readyMap} cases={privateCases} selectedCaseId={selectedCaseId} blocked={!!onPick || !!perimeterDraft || selectingReport} onSelect={onSelectCase} />}
    {state === "ready" && readyMap && perimeterDraft && onPerimeterDraft && !onPick && <PerimeterDrawing map={readyMap} draft={perimeterDraft} setDraft={onPerimeterDraft} />}
    {state === "loading" && <div className="absolute inset-0 z-10"><MapSkeleton /></div>}
    {state === "error" && <div role="alert" className="absolute bottom-24 left-4 right-20 z-10 max-w-sm rounded-xl border bg-white p-4 text-sm shadow-sm"><p className="font-bold">Map unavailable</p><p className="mt-1 text-muted-foreground">Tiles or map rendering could not load. The results list is still available.</p><Button variant="outline" className="mt-3" onClick={() => { setState("loading"); setAttempt((v) => v + 1); }}>Retry map</Button></div>}
  </div>;
}
