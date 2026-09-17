import type { MapData, MapItem } from "@/types";

export function filterMap(items: MapItem[], search: string, publications: boolean, hotspots: boolean): MapItem[] {
  const query = search.trim().toLocaleLowerCase("en");
  return items.filter((item) => (item.kind === "publication" ? publications : hotspots) &&
    `${item.title} ${item.location} ${item.product ?? ""} ${item.instrument ?? ""}`.toLocaleLowerCase("en").includes(query));
}
export function ageMap(data: MapData, now: number): MapData {
  const sourceStatus = data.sourceStatus === "AVAILABLE"
    ? !data.lastSuccessAt ? "NOT_SYNCED" : now - Date.parse(data.lastSuccessAt) > 3600000 ? "STALE" : "AVAILABLE"
    : data.sourceStatus;
  if (sourceStatus === data.sourceStatus) return data;
  return { ...data, sourceStatus, items: data.items.map((item) => item.kind === "hotspot" ? { ...item, stale: true } : item) };
}
export function mapAvailability(data: MapData | null, failed: boolean): string {
  if (failed) return data ? "Satellite refresh failed. Showing earlier results." : "Satellite data is temporarily unavailable.";
  if (!data) return "";
  if (data.sourceStatus === "STALE") return "Satellite data is delayed. Hotspots may be out of date.";
  if (data.sourceStatus !== "AVAILABLE") return "Satellite data is temporarily unavailable.";
  return "";
}
export function hasPoint(item: { latitude: number | null; longitude: number | null }): item is { latitude: number; longitude: number } {
  return typeof item.latitude === "number" && Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 &&
    typeof item.longitude === "number" && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180;
}
export function toGeoJSON(items: MapItem[]) {
  return { type: "FeatureCollection" as const, features: items.filter(hasPoint).map((item) => ({ type: "Feature" as const, id: item.id,
    geometry: { type: "Point" as const, coordinates: [item.longitude, item.latitude] },
    properties: { id: item.id, kind: item.kind },
  })) };
}
