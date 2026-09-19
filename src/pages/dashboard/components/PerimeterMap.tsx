import { useEffect, useRef, useState } from "react";
import { LngLatBounds, Marker, type GeoJSONSource, type Map, type MapMouseEvent } from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import type { CaseItem, MapItem } from "@/types";
import { editDraft, type PerimeterDraft } from "@/lib/perimeter";
import type { PerimeterEditorProps } from "./CasePerimeter";

import { mapPanelPadding } from "@/lib/dashboard";
import { publicPerimeterFeatures } from "@/pages/dashboard/utils/map";

function fit(map: Map, points: [number, number][]) {
  if (!points.length) return;
  const bounds = new LngLatBounds(points[0], points[0]);
  for (const point of points) bounds.extend(point);
  map.fitBounds(bounds, { padding: mapPanelPadding(), maxZoom: 15, duration: 0 });
}
export function PublicPerimeters({ map, items, selected, blocked, onSelect }: { map: Map; items: MapItem[]; selected: MapItem | null; blocked: boolean; onSelect: (id: string) => void }) {
  const latest = useRef({ blocked, onSelect });
  const [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = { blocked, onSelect }; });
  useEffect(() => {
    map.addSource("public-perimeters", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "public-perimeter-fill", type: "fill", source: "public-perimeters", paint: { "fill-color": "#c2410c", "fill-opacity": 0.22 } });
    map.addLayer({ id: "public-perimeter-outline", type: "line", source: "public-perimeters", paint: { "line-color": "#9a3412", "line-width": 3 } });
    const click = (event: MapMouseEvent) => {
      if (latest.current.blocked) return;
      const feature = map.queryRenderedFeatures(event.point, { layers: ["public-perimeter-fill", "public-perimeter-outline"] })[0];
      if (typeof feature?.properties.id === "string") latest.current.onSelect(feature.properties.id);
    };
    map.on("click", ["public-perimeter-fill", "public-perimeter-outline"], click);
    return () => {
      map.off("click", ["public-perimeter-fill", "public-perimeter-outline"], click);
      if (map.getLayer("public-perimeter-outline")) map.removeLayer("public-perimeter-outline");
      if (map.getLayer("public-perimeter-fill")) map.removeLayer("public-perimeter-fill");
      if (map.getSource("public-perimeters")) map.removeSource("public-perimeters");
    };
  }, [map]);
  useEffect(() => {
    let disposed = false;
    const source = map.getSource("public-perimeters") as GeoJSONSource | undefined;
    void source?.setData(publicPerimeterFeatures(items)).then(() => { if (!disposed) setFailed(false); }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; };
  }, [map, items]);
  useEffect(() => {
    map.setPaintProperty("public-perimeter-outline", "line-width", ["case", ["==", ["get", "id"], selected?.id ?? ""], 5, 3]);
    if (!blocked && selected?.publicPerimeter) fit(map, selected.publicPerimeter.geometry.coordinates.flat());
  }, [map, selected, blocked]);
  return failed ? <p role="alert" className="absolute right-4 top-32 z-10 rounded-lg bg-white p-3 text-xs">Published perimeter rendering failed. Use the observation list.</p> : null;
}
export function PrivatePerimeters({ map, cases, selectedCaseId, blocked, onSelect }: { map: Map; cases: CaseItem[]; selectedCaseId: string | null; blocked: boolean; onSelect: (id: string) => void }) {
  const latest = useRef({ blocked, onSelect });
  const [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = { blocked, onSelect }; });
  useEffect(() => {
    map.addSource("private-case-perimeters", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "private-case-perimeter-fill", type: "fill", source: "private-case-perimeters", paint: { "fill-color": "#1d4ed8", "fill-opacity": 0.18 } });
    map.addLayer({ id: "private-case-perimeter-outline", type: "line", source: "private-case-perimeters", paint: { "line-color": "#1e3a8a", "line-width": 3 } });
    const click = (event: MapMouseEvent) => {
      if (latest.current.blocked) return;
      const feature = map.queryRenderedFeatures(event.point, { layers: ["private-case-perimeter-fill", "private-case-perimeter-outline"] })[0];
      if (typeof feature?.properties.id === "string") latest.current.onSelect(feature.properties.id);
    };
    map.on("click", ["private-case-perimeter-fill", "private-case-perimeter-outline"], click);
    return () => {
      map.off("click", ["private-case-perimeter-fill", "private-case-perimeter-outline"], click);
      if (map.getLayer("private-case-perimeter-outline")) map.removeLayer("private-case-perimeter-outline");
      if (map.getLayer("private-case-perimeter-fill")) map.removeLayer("private-case-perimeter-fill");
      if (map.getSource("private-case-perimeters")) map.removeSource("private-case-perimeters");
    };
  }, [map]);
  useEffect(() => {
    const data: FeatureCollection = { type: "FeatureCollection", features: cases.flatMap(item => item.verification === "CONFIRMED_FIRE" && item.perimeter ? [{ type: "Feature" as const, id: item.id, geometry: item.perimeter, properties: { id: item.id, revision: item.perimeterRevision } }] : []) };
    let disposed = false;
    void (map.getSource("private-case-perimeters") as GeoJSONSource | undefined)?.setData(data).then(() => { if (!disposed) setFailed(false); }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; };
  }, [map, cases]);
  useEffect(() => {
    map.setPaintProperty("private-case-perimeter-outline", "line-width", ["case", ["==", ["get", "id"], selectedCaseId ?? ""], 5, 3]);
    const selected = cases.find(item => item.id === selectedCaseId && item.perimeter);
    if (!blocked && selected?.perimeter) fit(map, selected.perimeter.coordinates.flat());
  }, [map, cases, selectedCaseId, blocked]);
  return failed ? <p role="alert" className="absolute right-4 top-32 z-10 rounded-lg bg-white p-3 text-xs">Private perimeter rendering failed. Use the worklist.</p> : null;
}
export function PerimeterDrawing({ map, draft, setDraft }: { map: Map; draft: PerimeterDraft; setDraft: PerimeterEditorProps["setDraft"] }) {
  const latest = useRef(draft);
  const [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = draft; });
  useEffect(() => {
    const doubleClickEnabled = map.doubleClickZoom.isEnabled();
    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = "crosshair";
    map.addSource("private-drawing", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "private-drawing-fill", type: "fill", source: "private-drawing", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#1d4ed8", "fill-opacity": 0.15 } });
    map.addLayer({ id: "private-drawing-line", type: "line", source: "private-drawing", paint: { "line-color": "#1d4ed8", "line-width": 3, "line-dasharray": [2, 1] } });
    const click = (event: MapMouseEvent) => {
      if (latest.current.pending || latest.current.drawing.closed[latest.current.drawing.active]) return;
      const p = event.lngLat.wrap();
      setDraft(current => current ? editDraft(current, { type: "add", point: [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))] }) : current);
    };
    map.on("click", click);
    return () => {
      map.off("click", click);
      if (doubleClickEnabled) map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = "";
      if (map.getLayer("private-drawing-line")) map.removeLayer("private-drawing-line");
      if (map.getLayer("private-drawing-fill")) map.removeLayer("private-drawing-fill");
      if (map.getSource("private-drawing")) map.removeSource("private-drawing");
    };
  }, [map, setDraft]);
  useEffect(() => {
    const { rings, closed, active } = draft.drawing;
    const geometries: Geometry[] = rings.flatMap((ring, i) => ring.length >= 2 ? [{ type: "LineString" as const, coordinates: closed[i] ? [...ring, ring[0]] : ring }] : []);
    if (closed.every(Boolean)) geometries.push({ type: "Polygon", coordinates: rings.map(ring => [...ring, ring[0]]) });
    const data: FeatureCollection = { type: "FeatureCollection", features: geometries.map(geometry => ({ type: "Feature", geometry, properties: {} })) };
    let disposed = false;
    void (map.getSource("private-drawing") as GeoJSONSource | undefined)?.setData(data).then(() => { if (!disposed) setFailed(false); }).catch(() => { if (!disposed) setFailed(true); });
    const markers = rings[active].map((point, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "grid size-11 place-items-center rounded-full border-2 border-white bg-blue-800 text-xs font-bold text-white shadow-lg";
      button.textContent = String(index + 1);
      button.disabled = draft.pending || !!draft.attempted;
      button.setAttribute("aria-label", index === 0 ? "First vertex. Activate to close the ring. Use coordinate inputs to edit." : `Vertex ${index + 1}. Drag to move or use coordinate inputs.`);
      button.addEventListener("click", event => {
        event.stopPropagation();
        if (index === 0 && latest.current.drawing.rings[latest.current.drawing.active].length >= 3) setDraft(current => current ? editDraft(current, { type: "close" }) : current);
      });
      const marker = new Marker({ element: button, draggable: !draft.pending && !draft.attempted }).setLngLat(point).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLngLat().wrap();
        setDraft(current => current ? editDraft(current, { type: "move", index, point: [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))] }) : current);
      });
      return marker;
    });
    return () => { disposed = true; markers.forEach(marker => marker.remove()); };
  }, [map, draft.drawing, draft.pending, draft.attempted, setDraft]);
  useEffect(() => { fit(map, latest.current.drawing.rings.flat()); }, [map, draft.caseId, draft.fit]);
  return <p role={failed ? "alert" : "status"} className="pointer-events-none absolute left-4 top-24 z-10 max-w-64 rounded-lg border bg-white p-3 text-xs">{failed ? "Drawing rendering failed. Coordinate inputs remain available." : draft.drawing.closed[draft.drawing.active] ? "Boundary closed. Drag points to adjust, then Save." : `${draft.drawing.rings[draft.drawing.active].length} vertices · Click the map${draft.drawing.rings[draft.drawing.active].length >= 3 ? ", then click point 1 to close." : " to add at least 3 points."}`}</p>;
}
