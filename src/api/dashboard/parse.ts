import type { CasesData, DemoArea, Handling, MapData, MapItem, Verification } from "@/types";
import { parsePolygon, polygonArea, type PublicPerimeter } from "../../lib/perimeter.ts";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid response");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || value.length > 20000) throw new Error("Invalid response");
  return value;
}
function date(value: unknown): string {
  const result = text(value);
  if (!Number.isFinite(Date.parse(result))) throw new Error("Invalid response");
  return result;
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw new Error("Invalid response");
  return value as T;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid response");
  return value;
}
function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid response");
  return value;
}
function hasPoint(item: { latitude: number | null; longitude: number | null }): item is { latitude: number; longitude: number } {
  return typeof item.latitude === "number" && Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 &&
    typeof item.longitude === "number" && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180;
}
function point(value: Record<string, unknown>, allowed = true) {
  const candidate = { latitude: value.latitude, longitude: value.longitude };
  if (!allowed) return { latitude: null, longitude: null };
  if (candidate.latitude === null && candidate.longitude === null) return { latitude: null, longitude: null };
  const result = { latitude: number(candidate.latitude), longitude: number(candidate.longitude) };
  if (!hasPoint(result)) throw new Error("Invalid coordinates");
  return result;
}
function verification(value: unknown): Verification {
  return choice(value, ["UNVERIFIED", "CONFIRMED_FIRE", "NOT_FIRE"]);
}
function handling(value: unknown): Handling {
  return choice(value, ["OPEN", "CHECK_SCHEDULED", "ON_SCENE", "RESPONDING", "MONITORING", "CLOSED"]);
}
export function parseMap(body: unknown): MapData {
  const data = record(record(body).data);
  const source = record(data.sourceStatus);
  const sourceStatus = choice(source.status, ["AVAILABLE", "STALE", "NOT_CONFIGURED", "NOT_SYNCED", "UNAVAILABLE"]);
  const hotspots = array(data.hotspots);
  const cases = array(data.cases);
  const items: MapItem[] = cases.map((raw) => {
    const item = record(raw);
    const mode = choice(item.publicLocationMode, ["NONE", "REGION_ONLY", "APPROVED_INCIDENT_POINT", "APPROVED_INCIDENT_PERIMETER"]);
    let publicPerimeter: PublicPerimeter | undefined;
    if (mode === "APPROVED_INCIDENT_PERIMETER") {
      if (item.verificationStatus !== "CONFIRMED_FIRE") throw new Error("Perimeter publication requires a confirmed fire");
      const p = record(item.publicPerimeter);
      const geometry = parsePolygon(p.geometry), areaHectares = number(p.areaHectares), revision = number(p.revision), source = text(p.source).trim();
      const computed = polygonArea(geometry);
      if (areaHectares <= 0 || Math.abs(computed - areaHectares) > Math.max(1e-8, computed * 1e-9) || !Number.isInteger(revision) || revision < 1 || source.length < 3 || source.length > 300 || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(text(p.observedAt))) throw new Error("Invalid public perimeter metadata");
      publicPerimeter = { geometry, areaHectares, revision, source, observedAt: date(p.observedAt) };
    }
    return {
      id: `publication:${text(item.publicationId)}`, kind: "publication", title: text(item.title),
      ...point(item, mode === "APPROVED_INCIDENT_POINT"), time: date(item.publishedAt), source: "Published case summary",
      location: mode === "NONE" ? "Location withheld" : array(item.regions).map((region) => text(record(region).name)).join(", ") || "Approved incident location",
      publicLocationMode: mode, ...(publicPerimeter ? { publicPerimeter } : {}),
      verification: verification(item.verificationStatus), handling: handling(item.handlingStatus), stale: false,
    };
  });
  for (const raw of hotspots) {
    const item = record(raw);
    if (item.indicationType !== "THERMAL_ANOMALY" || typeof item.stale !== "boolean" || item.frpUnit !== "MW") throw new Error("Invalid response");
    items.push({
      id: `hotspot:${text(item.id)}`, kind: "hotspot", title: "Satellite hotspot", ...point(item),
      time: date(item.acquiredAt), source: "NASA FIRMS", location: "Satellite detection location",
      product: text(item.product), instrument: [item.satellite, item.instrument].filter((v) => v !== null).map(text).join(" / "),
      confidence: item.confidenceRaw === null ? "Not supplied" : text(item.confidenceRaw),
      frp: item.frp === null ? null : number(item.frp), fetchedAt: date(item.fetchedAt), stale: item.stale || sourceStatus !== "AVAILABLE",
    });
  }
  const demoAreas: DemoArea[] = array(data.demoAreas ?? []).map(raw => {
    const area = record(raw), geometry = record(area.geometry);
    const name = text(area.name), areaHectares = number(area.areaHectares);
    if (area.demo !== true || !name.startsWith("[DEMO]") || geometry.type !== "Polygon" || areaHectares <= 0) throw new Error("Invalid demo area");
    const coordinates = array(geometry.coordinates).map(rawRing => {
      const ring: [number, number][] = array(rawRing).map(rawPoint => {
        const pair = array(rawPoint);
        if (pair.length !== 2) throw new Error("Invalid demo point");
        const longitude = number(pair[0]), latitude = number(pair[1]);
        if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) throw new Error("Invalid demo point");
        return [longitude, latitude];
      });
      if (ring.length < 4 || ring.length > 10000 || JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))) throw new Error("Invalid demo ring");
      return ring;
    });
    if (!coordinates.length || coordinates.length > 100) throw new Error("Invalid demo polygon");
    return { id: text(area.id), name, geometry: { type: "Polygon", coordinates }, areaHectares, generatedAt: date(area.generatedAt), demo: true };
  });
  return { items, demoAreas, sourceStatus, updatedAt: data.updatedAt === null ? null : date(data.updatedAt), lastSuccessAt: source.lastSuccessAt === undefined ? null : date(source.lastSuccessAt), limited: hotspots.length >= 2000 || cases.length >= 200 };
}
export function parseCases(body: unknown): CasesData {
  const data = record(body);
  const meta = record(data.meta);
  const total = number(meta.total), page = number(meta.page), pageSize = number(meta.pageSize);
  if (![total, page, pageSize].every(Number.isInteger) || total < 0 || page < 1 || pageSize < 1 || pageSize > 100) throw new Error("Invalid pagination");
  return { total, page, pageSize, items: array(data.data).map((raw) => {
    const item = record(raw);
    return { id: text(item.id), number: text(item.number), title: text(item.title), ...point(item), verification: verification(item.verificationStatus), handling: handling(item.handlingStatus), priority: choice(item.priority, ["HIGH", "MEDIUM", "LOW", "UNASSESSED"]), priorityReason: item.priorityReason === null ? null : text(item.priorityReason), updatedAt: date(item.updatedAt), openedAt: date(item.openedAt) };
  }) };
}
