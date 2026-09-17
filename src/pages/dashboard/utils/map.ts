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
  if (!data) return failed ? "Map data could not load. Please retry." : "";
  if (!failed && data.sourceStatus === "AVAILABLE") return "";
  const lastSync = data.lastSuccessAt ? ` Last successful sync: ${new Date(data.lastSuccessAt).toLocaleString("en-GB")}.` : " No successful sync recorded.";
  return `${data.sourceStatus === "NOT_CONFIGURED" ? "Satellite source is not configured." : "Satellite data is not up to date."}${lastSync}`;
}
export function hasPoint<T extends { latitude: number | null; longitude: number | null }>(item: T): item is T & { latitude: number; longitude: number } {
  return typeof item.latitude === "number" && Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 &&
    typeof item.longitude === "number" && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180;
}
export function hotspotSize(frp?: number | null): number {
  return typeof frp === "number" && Number.isFinite(frp) && frp >= 0 ? 0.75 + 0.75 * Math.sqrt(Math.min(frp, 100) / 100) : 0.75;
}
export function hotspotConfidence(confidence?: string): string {
  const value = confidence?.trim();
  return ({ l: "Low", low: "Low", n: "Nominal", nominal: "Nominal", h: "High", high: "High" } as Record<string, string>)[value?.toLowerCase() ?? ""] ?? (value || "Not supplied");
}
export function hotspotFrp(frp?: number | null): string {
  return typeof frp === "number" && Number.isFinite(frp) && frp >= 0 ? `${frp.toLocaleString("en", { maximumFractionDigits: 2 })} MW` : "Not supplied";
}
export function publicPerimeterFeatures(items: MapItem[]) {
  return { type: "FeatureCollection" as const, features: items.flatMap(item => item.kind === "publication" && item.publicLocationMode === "APPROVED_INCIDENT_PERIMETER" && item.publicPerimeter ? [{ type: "Feature" as const, id: item.id, geometry: item.publicPerimeter.geometry, properties: { id: item.id } }] : []) };
}
export function toGeoJSON(items: MapItem[]) {
  return { type: "FeatureCollection" as const, features: items.filter(hasPoint).map((item) => ({ type: "Feature" as const, id: item.id,
    geometry: { type: "Point" as const, coordinates: [item.longitude, item.latitude] },
    properties: { id: item.id, kind: item.kind, flameSize: hotspotSize(item.frp) },
  })) };
}
