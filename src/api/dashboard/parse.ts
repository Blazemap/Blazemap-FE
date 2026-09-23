import type { CasesData, DemoArea, Handling, MapData, MapItem, OwnReport, Verification } from "@/types";
import { parsePolygon, polygonArea, type PublicPerimeter } from "../../lib/perimeter.ts";
import { parseGovernmentReports } from "./government.ts";
import { parseWindContext } from "../../lib/wind.ts";

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
function ownReport(raw: unknown): OwnReport {
  const item = record(raw);
  const region = item.region === null ? null : record(item.region);
  const linked = item.case === null ? null : record(item.case);
  const observations: OwnReport["observationTypes"] = array(item.observationTypes).map(value => choice(value, ["SMOKE", "FLAME", "BURNING_SMELL"] as const));
  const coordinates = point(item);
  let perimeter: PublicPerimeter | null = null;
  if (linked?.perimeter && linked.verificationStatus === "CONFIRMED_FIRE") {
    const p = record(linked.perimeter);
    const geometry = parsePolygon(p.geometry);
    const areaHectares = number(p.areaHectares), revision = number(p.revision);
    if (areaHectares <= 0 || !Number.isInteger(revision) || revision < 1 || Math.abs(polygonArea(geometry) - areaHectares) > Math.max(1e-8, areaHectares * 1e-9)) throw new Error("Invalid owner perimeter");
    perimeter = { geometry, areaHectares, revision, source: text(p.source), observedAt: date(p.observedAt) };
  }
  return {
    id: text(item.id), number: text(item.number), observationTypes: observations, observedAt: date(item.observedAt), createdAt: date(item.createdAt),
    locationMode: choice(item.locationMode, ["INCIDENT_ESTIMATE", "OBSERVER_POSITION"]), ...coordinates,
    accuracyMeters: item.accuracyMeters == null ? null : number(item.accuracyMeters), locationDescription: text(item.locationDescription), description: text(item.description),
    reviewStatus: choice(item.reviewStatus, ["NEW", "UNDER_REVIEW", "NEEDS_DETAILS", "REVIEWED", "DECLINED"]),
    region: region ? { id: text(region.id), name: text(region.name), timezone: text(region.timezone) } : null,
    case: linked ? { number: text(linked.number), title: linked.title == null ? undefined : text(linked.title), verificationStatus: text(linked.verificationStatus), handlingStatus: text(linked.handlingStatus), perimeter } : null,
    windContext: item.windContext === undefined ? undefined : parseWindContext(item.windContext),
    attachments: array(item.attachments).map(value => { const attachment = record(value); return { id: text(attachment.id), filename: text(attachment.filename), size: number(attachment.size), contentType: text(attachment.contentType) }; }),
  };
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
       publicLocationMode: mode, ...(publicPerimeter ? { publicPerimeter } : {}), caseNumber: item.number === undefined ? undefined : text(item.number), windContext: item.windContext === undefined ? null : parseWindContext(item.windContext),
       verification: verification(item.verificationStatus), handling: handling(item.handlingStatus), stale: false,
    };
  });
  for (const raw of array(data.nearbyCases ?? [])) {
    const item = record(raw), perimeter = record(item.publicPerimeter), geometry = parsePolygon(perimeter.geometry), areaHectares = number(perimeter.areaHectares), revision = number(perimeter.revision);
    items.push({ id: `case:${text(item.id)}`, kind: "publication", title: text(item.title), ...point(item), time: date(item.updatedAt), source: "Confirmed nearby case", location: "Within 2 km of your saved location", publicLocationMode: "APPROVED_INCIDENT_PERIMETER", publicPerimeter: { geometry, areaHectares, revision, source: text(perimeter.source), observedAt: date(perimeter.observedAt) }, verification: verification(item.verificationStatus), handling: handling(item.handlingStatus), stale: false });
  }
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
  const ownReports = array(data.ownReports ?? []).map(ownReport);
  const privateReports = parseGovernmentReports({ data: array(data.privateReports ?? []), meta: { total: array(data.privateReports ?? []).length, page: 1, pageSize: Math.max(1, Math.min(100, array(data.privateReports ?? []).length || 1)) } }).data;
  const privateCases = parseCases({ data: array(data.privateCases ?? []), meta: { total: array(data.privateCases ?? []).length, page: 1, pageSize: Math.max(1, Math.min(100, array(data.privateCases ?? []).length || 1)) } }).items;
  const operationalFeatures = array(data.operationalFeatures ?? []).map(raw => { const feature = record(raw), kind = choice(feature.kind, ["ROAD", "WATER_SOURCE"] as const), coordinates = point(feature); if (!hasPoint(coordinates)) throw new Error("Invalid operational feature"); return { id: text(feature.id), name: text(feature.name), kind, ...coordinates, condition: feature.condition == null ? null : text(feature.condition), observedAt: feature.observedAt == null ? null : date(feature.observedAt) }; });
  if (data.privateLimited !== undefined && typeof data.privateLimited !== "boolean") throw new Error("Invalid private map limit");
  return { items, ownReports, privateReports, privateCases, operationalFeatures, privateLimited: data.privateLimited === true, demoAreas, sourceStatus, updatedAt: data.updatedAt === null ? null : date(data.updatedAt), lastSuccessAt: source.lastSuccessAt === undefined ? null : date(source.lastSuccessAt), limited: hotspots.length >= 2000 };
}
export function parseCases(body: unknown): CasesData {
  const data = record(body);
  const meta = record(data.meta);
  const total = number(meta.total), page = number(meta.page), pageSize = number(meta.pageSize);
  if (![total, page, pageSize].every(Number.isInteger) || total < 0 || page < 1 || pageSize < 1 || pageSize > 100) throw new Error("Invalid pagination");
  return { total, page, pageSize, items: array(data.data).map((raw) => {
    const item = record(raw);
    const perimeter = item.perimeter == null ? null : parsePolygon(item.perimeter);
    const perimeterRevision = item.perimeterRevision === undefined ? 0 : number(item.perimeterRevision);
    if (!Number.isInteger(perimeterRevision) || perimeterRevision < 0 || (perimeter && perimeterRevision < 1)) throw new Error("Invalid perimeter revision");
    return { id: text(item.id), number: text(item.number), title: text(item.title), ...point(item), regionId: item.regionId == null ? null : text(item.regionId), verification: verification(item.verificationStatus), handling: handling(item.handlingStatus), priority: choice(item.priority, ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNASSESSED"]), priorityReason: item.priorityReason === null ? null : text(item.priorityReason), updatedAt: date(item.updatedAt), openedAt: date(item.openedAt), perimeter, perimeterRevision };
  }) };
}
