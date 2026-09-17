import { useEffect, useRef, useState } from "react";
import { Map, NavigationControl, AttributionControl, GeolocateControl, Marker, type GeoJSONSource } from "maplibre-gl";
import { mapStyleUrl } from "@/config/map";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui";
import { MapSkeleton } from "@/pages/dashboard/components/DashboardSkeletons";
import { hasPoint, toGeoJSON } from "@/pages/dashboard/utils";
import { flameImage } from "@/pages/dashboard/utils/flame";
import type { MapItem } from "@/types";
import { PerimeterDrawing, PublicPerimeters } from "./PerimeterMap";
import type { PerimeterEditorProps } from "./CasePerimeter";
import type { WindArrow } from "@/lib/wind";
import WindMap from "./WindMap";

export default function SituationMap({ items, selected, draftLocation, onSelect, onPick, perimeterDraft = null, onPerimeterDraft, wind = null }: { wind?: WindArrow | null; perimeterDraft?: PerimeterEditorProps["draft"]; onPerimeterDraft?: PerimeterEditorProps["setDraft"]; items: MapItem[]; selected: MapItem | null; draftLocation?: { latitude: string; longitude: string } | null; onSelect: (id: string) => void; onPick?: (latitude: string, longitude: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const latest = useRef({ items, onSelect, selected, onPick, draftLocation, perimeterDraft });
  const pickMarker = useRef<Marker | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [readyMap, setReadyMap] = useState<Map | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => { latest.current = { items, onSelect, selected, onPick, draftLocation, perimeterDraft }; });
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
      map.on("load", () => {
        if (disposed) return;
        clearTimeout(timeout);
        map.addSource("observations", { type: "geojson", data: toGeoJSON(latest.current.items), cluster: true, clusterRadius: 48, clusterMaxZoom: 13, clusterProperties: { hotspotCount: ["+", ["case", ["==", ["get", "kind"], "hotspot"], 1, 0]] } });
        map.addLayer({ id: "clusters", type: "circle", source: "observations", filter: ["all", ["has", "point_count"], ["!=", ["get", "hotspotCount"], ["get", "point_count"]]], paint: { "circle-color": "#294d36", "circle-radius": 21, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
        map.addLayer({ id: "counts", type: "symbol", source: "observations", filter: ["all", ["has", "point_count"], ["!=", ["get", "hotspotCount"], ["get", "point_count"]]], layout: { "text-field": "{point_count_abbreviated}", "text-font": ["Noto Sans Regular"], "text-size": 12, "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": "#ffffff" } });
        map.addLayer({ id: "points", type: "circle", source: "observations", filter: ["all", ["!", ["has", "point_count"]], ["!=", ["get", "kind"], "hotspot"]], paint: { "circle-color": "#294d36", "circle-radius": 8, "circle-opacity": ["match", ["get", "kind"], "hotspot", 0, 1], "circle-stroke-opacity": ["match", ["get", "kind"], "hotspot", 0, 1], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        map.addImage("hotspot-flame", flameImage(() => map.triggerRepaint()), { pixelRatio: 2 });
        map.addLayer({ id: "hotspot-clusters", type: "symbol", source: "observations", filter: ["all", ["has", "point_count"], ["==", ["get", "hotspotCount"], ["get", "point_count"]]], layout: { "icon-image": "hotspot-flame", "icon-size": ["interpolate", ["linear"], ["get", "point_count"], 2, 1.4, 10, 1.8, 50, 2.3, 200, 2.8], "icon-allow-overlap": true, "icon-ignore-placement": true, "text-field": "{point_count_abbreviated}", "text-font": ["Noto Sans Regular"], "text-size": 14, "text-anchor": "top", "text-offset": ["interpolate", ["linear"], ["get", "point_count"], 2, ["literal", [0, 1.8]], 10, ["literal", [0, 2.3]], 50, ["literal", [0, 2.9]], 200, ["literal", [0, 3.5]]], "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": "#173b2b", "text-halo-color": "#ffffff", "text-halo-width": 2 } });
        map.addLayer({ id: "hotspots", type: "symbol", source: "observations", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "kind"], "hotspot"]], layout: { "icon-image": "hotspot-flame", "icon-size": ["get", "flameSize"], "icon-allow-overlap": true, "icon-ignore-placement": true } });
        map.addSource("selection", { type: "geojson", data: toGeoJSON(latest.current.selected ? [latest.current.selected] : []) });
        map.addLayer({ id: "selected-point", type: "circle", source: "selection", paint: { "circle-radius": 14, "circle-color": "#ffffff", "circle-opacity": 0, "circle-stroke-width": 3, "circle-stroke-color": "#173b2b" } });
        map.on("click", ["points", "hotspots"], (event) => {
          if (latest.current.onPick || latest.current.perimeterDraft) return;
          const id: unknown = event.features?.[0]?.properties.id;
          if (typeof id === "string") latest.current.onSelect(id);
        });
        map.on("click", ["clusters", "counts", "hotspot-clusters"], (event) => {
          if (latest.current.onPick || latest.current.perimeterDraft) return;
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
    (map?.getSource("observations") as GeoJSONSource | undefined)?.setData(toGeoJSON(items));
  }, [items, state]);
  useEffect(() => {
    const map = mapRef.current;
    const latitude = Number(draftLocation?.latitude), longitude = Number(draftLocation?.longitude);
    const hasDraftLocation = !!draftLocation?.latitude.trim() && !!draftLocation.longitude.trim() && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
    if (!map || state !== "ready" || !hasDraftLocation || perimeterDraft) { pickMarker.current?.remove(); pickMarker.current = null; return; }
    if (!pickMarker.current) {
      const marker = new Marker({ color: "#173b2b", draggable: !!onPick, scale: 1.15 });
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
      const visible = new Set(map.queryRenderedFeatures({ layers: ["points"] }).map(feature => feature.properties.id));
      for (const item of items) {
        if (item.kind !== "publication" || item.verification !== "CONFIRMED_FIRE" || item.handling === "CLOSED" || !hasPoint(item) || !visible.has(item.id)) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "grid size-11 place-items-center rounded-full border-2 border-white bg-orange-700 text-white shadow-lg motion-safe:animate-pulse";
        button.setAttribute("aria-label", `Confirmed fire: ${item.title}. Published ${item.time}. Approved point, not a perimeter.`);
        button.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 5-4 6-4 10 0 1 .4 2 1 2-1-4 4-4 4-8 4 4 7 7 7 11a8 8 0 0 1-16 0c0-5 5-8 8-15Z"/></svg>';
        button.addEventListener("click", event => { event.stopPropagation(); if (latest.current.perimeterDraft) return; if (latest.current.onPick) latest.current.onPick(String(item.latitude), String(item.longitude)); else latest.current.onSelect(item.id); });
        markers.push(new Marker({ element: button }).setLngLat([item.longitude, item.latitude]).addTo(map));
      }
    };
    map.on("idle", render);
    render();
    return () => { map.off("idle", render); markers.forEach(marker => marker.remove()); };
  }, [items, state]);
  useEffect(() => {
    const map = mapRef.current;
    (map?.getSource("selection") as GeoJSONSource | undefined)?.setData(toGeoJSON(selected ? [selected] : []));
    if (map && selected && !latest.current.perimeterDraft && hasPoint(selected)) map.jumpTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(map.getZoom(), 9), padding: { left: window.innerWidth >= 768 ? 424 : 0, right: 0, top: 100, bottom: 100 } });
  }, [selected, state]);
  return <div className="relative h-full min-h-0 bg-secondary">
    <div ref={container} aria-label="Situation map. All observations are also available in the results list. Flame counts are grouped satellite detections, not unique fires. Green counts are grouped observations." className="h-full w-full [&_.maplibregl-ctrl-attrib]:text-xs [&_.maplibregl-ctrl-group_button]:h-11 [&_.maplibregl-ctrl-group_button]:w-11" />
    {state === "ready" && <details className="absolute bottom-24 left-4 z-10 max-w-[min(20rem,calc(100vw-6rem))] rounded-sm border border-primary/10 bg-white text-xs leading-5 text-forest shadow-sm"><summary className="min-h-11 cursor-pointer px-3 py-3 font-bold focus-visible:outline-2 focus-visible:outline-primary">Map info</summary><div className="space-y-2 border-t border-primary/10 px-3 py-3"><p>Flame counts show grouped satellite detections, not unique fires.</p><p>Green counts group published updates or a mix of updates and satellite detections.</p><p>Individual flame size reflects radiative power (MW), not the size of a burned area. Satellite detections are not confirmed fires.</p></div></details>}
    {state === "ready" && readyMap && wind && !onPick && <WindMap map={readyMap} wind={wind} />}
    {state === "ready" && readyMap && <PublicPerimeters map={readyMap} items={items} selected={selected} blocked={!!onPick || !!perimeterDraft} onSelect={onSelect} />}
    {state === "ready" && readyMap && perimeterDraft && onPerimeterDraft && !onPick && <PerimeterDrawing map={readyMap} draft={perimeterDraft} setDraft={onPerimeterDraft} />}
    {state === "loading" && <div className="absolute inset-0 z-10"><MapSkeleton /></div>}
    {state === "error" && <div role="alert" className="absolute bottom-24 left-4 right-20 z-10 max-w-sm rounded-xl border bg-white p-4 text-sm shadow-sm"><p className="font-bold">Map unavailable</p><p className="mt-1 text-muted-foreground">Tiles or map rendering could not load. The results list is still available.</p><Button variant="outline" className="mt-3" onClick={() => { setState("loading"); setAttempt((v) => v + 1); }}>Retry map</Button></div>}
  </div>;
}
