import { useEffect, useRef, useState } from "react";
import { Map, NavigationControl, AttributionControl, GeolocateControl, Marker, type GeoJSONSource } from "maplibre-gl";
import { mapStyleUrl } from "@/config/map";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui";
import { hasPoint, toGeoJSON } from "@/pages/dashboard/utils";
import type { MapItem } from "@/types";


export default function SituationMap({ items, selected, pick, onSelect, onPick }: { items: MapItem[]; selected: MapItem | null; pick?: { latitude: string; longitude: string } | null; onSelect: (id: string) => void; onPick?: (latitude: string, longitude: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const latest = useRef({ items, onSelect, selected, onPick, pick });
  const pickMarker = useRef<Marker | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => { latest.current = { items, onSelect, selected, onPick, pick }; });
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
      map.on("click", event => latest.current.onPick?.(event.lngLat.lat.toFixed(6), event.lngLat.wrap().lng.toFixed(6)));
      map.on("error", () => { if (!disposed) setState("error"); });
      map.on("load", () => {
        if (disposed) return;
        clearTimeout(timeout);
        map.addSource("observations", { type: "geojson", data: toGeoJSON(latest.current.items), cluster: true, clusterRadius: 48, clusterMaxZoom: 13 });
        map.addLayer({ id: "clusters", type: "circle", source: "observations", filter: ["has", "point_count"], paint: { "circle-color": "#294d36", "circle-radius": 21, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
        map.addLayer({ id: "counts", type: "symbol", source: "observations", filter: ["has", "point_count"], layout: { "text-field": "{point_count_abbreviated}", "text-font": ["Noto Sans Regular"], "text-size": 12 }, paint: { "text-color": "#ffffff" } });
        map.addLayer({ id: "points", type: "circle", source: "observations", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["match", ["get", "kind"], "hotspot", "#a85b15", "#294d36"], "circle-radius": 8, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        map.addSource("selection", { type: "geojson", data: toGeoJSON(latest.current.selected ? [latest.current.selected] : []) });
        map.addLayer({ id: "selected-point", type: "circle", source: "selection", paint: { "circle-radius": 14, "circle-color": "#ffffff", "circle-opacity": 0, "circle-stroke-width": 3, "circle-stroke-color": "#173b2b" } });
        map.on("click", "points", (event) => {
          if (latest.current.onPick) return;
          const id: unknown = event.features?.[0]?.properties.id;
          if (typeof id === "string") latest.current.onSelect(id);
        });
        map.on("click", "clusters", (event) => {
          if (latest.current.onPick) return;
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const coordinates = feature.geometry.coordinates;
          const source = map.getSource("observations") as GeoJSONSource;
          void source.getClusterExpansionZoom(Number(feature.properties.cluster_id)).then((zoom) => {
            if (!disposed) map.jumpTo({ center: [coordinates[0], coordinates[1]], zoom });
          }).catch(() => { if (!disposed) setState("error"); });
        });
        for (const layer of ["points", "clusters"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }
        hasLoaded = true;
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
    const latitude = Number(pick?.latitude), longitude = Number(pick?.longitude);
    const hasPick = !!pick?.latitude.trim() && !!pick.longitude.trim() && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
    if (!map || state !== "ready" || !onPick || !hasPick) { pickMarker.current?.remove(); pickMarker.current = null; return; }
    if (!pickMarker.current) {
      const marker = new Marker({ color: "#173b2b", draggable: true, scale: 1.15 });
      const element = marker.getElement();
      element.setAttribute("aria-label", "Selected report location. Drag it or use arrow keys to adjust.");
      element.setAttribute("title", "Drag or use arrow keys to adjust report location");
      element.tabIndex = 0;
      element.addEventListener("click", event => event.stopPropagation());
      element.addEventListener("keydown", event => {
        const step = event.shiftKey ? 0.01 : 0.001;
        const delta = { ArrowUp: [0, step], ArrowDown: [0, -step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[event.key];
        if (!delta) return;
        event.preventDefault();
        const point = marker.getLngLat();
        latest.current.onPick?.((point.lat + delta[1]).toFixed(6), (point.lng + delta[0]).toFixed(6));
      });
      element.style.minWidth = "44px";
      element.style.minHeight = "44px";
      marker.on("dragend", () => { const point = marker.getLngLat(); latest.current.onPick?.(point.lat.toFixed(6), point.wrap().lng.toFixed(6)); });
      pickMarker.current = marker;
    }
    pickMarker.current.setLngLat([longitude, latitude]).addTo(map);
    return () => { pickMarker.current?.remove(); pickMarker.current = null; };
  }, [onPick, pick, state]);
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
        button.addEventListener("click", event => { event.stopPropagation(); if (latest.current.onPick) latest.current.onPick(String(item.latitude), String(item.longitude)); else latest.current.onSelect(item.id); });
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
    if (map && selected && hasPoint(selected)) map.jumpTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(map.getZoom(), 9), padding: { left: window.innerWidth >= 768 ? 424 : 0, right: 0, top: 100, bottom: 100 } });
  }, [selected, state]);
  return <div className="relative h-full min-h-0 bg-secondary">
    <div ref={container} aria-label="Situation map. All observations are also available in the results list." className="h-full w-full [&_.maplibregl-ctrl-attrib]:text-xs [&_.maplibregl-ctrl-group_button]:h-11 [&_.maplibregl-ctrl-group_button]:w-11" />
    {state !== "ready" && <div role="status" className="absolute bottom-24 left-4 right-20 z-10 max-w-sm rounded-xl border bg-white p-4 text-sm shadow-sm">
      <p className="font-bold">{state === "loading" ? "Loading map…" : "Map unavailable"}</p>
      {state === "error" && <><p className="mt-1 text-muted-foreground">Tiles or map rendering could not load. The results list is still available.</p><Button variant="outline" className="mt-3" onClick={() => { setState("loading"); setAttempt((v) => v + 1); }}>Retry map</Button></>}
    </div>}
  </div>;
}
