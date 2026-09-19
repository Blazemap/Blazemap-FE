import { useEffect, useState } from "react";
import { LngLatBounds, type Map } from "maplibre-gl";
import type { DemoArea } from "@/types";

export function DemoAreas({ map, areas }: { map: Map | null; areas: DemoArea[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = areas.find(area => area.id === selectedId);
  useEffect(() => {
    if (!map || !areas.length) return;
    map.addSource("demo-areas", { type: "geojson", data: { type: "FeatureCollection", features: areas.map(area => ({ type: "Feature", id: area.id, geometry: area.geometry, properties: { id: area.id, name: area.name } })) } });
    map.addLayer({ id: "demo-area-fill", source: "demo-areas", type: "fill", paint: { "fill-color": "#e87542", "fill-opacity": 0.28 } });
    map.addLayer({ id: "demo-area-outline", source: "demo-areas", type: "line", paint: { "line-color": "#a83f17", "line-width": 2, "line-dasharray": [3, 2] } });
    map.addLayer({ id: "demo-area-label", source: "demo-areas", type: "symbol", layout: { "text-field": "DEMO", "text-font": ["Noto Sans Regular"], "text-size": 12 }, paint: { "text-color": "#742b10", "text-halo-color": "#ffffff", "text-halo-width": 2 } });
    const click = (event: { features?: { properties: Record<string, unknown> }[] }) => { const id = event.features?.[0]?.properties.id; if (typeof id === "string") setSelectedId(id); };
    map.on("click", "demo-area-fill", click);
    return () => {
      map.off("click", "demo-area-fill", click);
      for (const id of ["demo-area-label", "demo-area-outline", "demo-area-fill"]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource("demo-areas")) map.removeSource("demo-areas");
    };
  }, [map, areas]);
  if (!map || !areas.length) return null;
  function focusAreas() {
    if (!map) return;
    const bounds = new LngLatBounds();
    for (const area of areas) for (const point of area.geometry.coordinates[0]) bounds.extend(point);
    map.fitBounds(bounds, { padding: 90, maxZoom: 12, duration: 0 });
  }
  return <div className="absolute bottom-40 left-4 z-20 max-w-[min(20rem,calc(100vw-6rem))] rounded-sm border border-primary/10 bg-white p-3 text-sm text-forest shadow-sm">
    <button type="button" className="min-h-11 font-bold underline underline-offset-4" onClick={focusAreas}>View {areas.length} DEMO fire areas</button>
    {selected && <section aria-label="Demo area details"><div className="flex items-start justify-between gap-3"><h2 className="font-bold">{selected.name}</h2><button type="button" className="min-h-11 px-2" aria-label="Close demo area details" onClick={() => setSelectedId(null)}>Close</button></div><p className="mt-2">{selected.areaHectares.toLocaleString("en")} ha · Simulated confirmed scenario</p><p className="mt-2 text-xs text-muted-foreground">Generated {new Date(selected.generatedAt).toLocaleString("en-GB")}</p><p className="mt-2 text-xs text-amber-900">Training data only. Not a real fire boundary or government verification.</p></section>}
  </div>;
}
