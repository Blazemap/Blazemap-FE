import type { CasesData, Handling, MapData, MapItem, Verification } from "@/types";

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
    const mode = choice(item.publicLocationMode, ["NONE", "REGION_ONLY", "APPROVED_INCIDENT_POINT"]);
    return {
      id: `publication:${text(item.publicationId)}`, kind: "publication", title: text(item.title),
      ...point(item, mode === "APPROVED_INCIDENT_POINT"), time: date(item.publishedAt), source: "Published case summary",
      location: mode === "NONE" ? "Location withheld" : array(item.regions).map((region) => text(record(region).name)).join(", ") || "Approved incident location",
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
  return { items, sourceStatus, updatedAt: data.updatedAt === null ? null : date(data.updatedAt), lastSuccessAt: source.lastSuccessAt === undefined ? null : date(source.lastSuccessAt), limited: hotspots.length >= 2000 || cases.length >= 200 };
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
