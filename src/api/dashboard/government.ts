import { isAxiosError } from "axios";
import { apiClient } from "@/config/api-client";
import { apiEndpoints } from "@/constants";
import { parseCases } from "./parse";
import { parsePolygon } from "@/lib/perimeter";
import { parseWindContext } from "@/lib/wind";
import type { CaseDetail, FieldFinding, FieldInput, GovernmentReports, PerimeterInput, PublicationDraft, PublicationInput, VerificationInput } from "@/types/government";

export class GovernmentError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) { super(message); this.status = status; }
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new GovernmentError("Invalid server response", 502);
  return v as Record<string, unknown>;
};
const text = (v: unknown): string => { if (typeof v !== "string") throw new GovernmentError("Invalid text response", 502); return v; };
const time = (v: unknown): string => { const s = text(v); if (!Number.isFinite(Date.parse(s))) throw new GovernmentError("Invalid observation time", 502); return s; };
const number = (v: unknown): number => { if (typeof v !== "number" || !Number.isFinite(v)) throw new GovernmentError("Invalid number response", 502); return v; };
const list = (v: unknown): unknown[] => { if (!Array.isArray(v)) throw new GovernmentError("Invalid list response", 502); return v; };
const strings = (v: unknown) => list(v).map(text);
const nullableTime = (v: unknown) => v == null ? null : time(v);
const distance = (v: unknown) => { const n = number(v); if (n < 0) throw new GovernmentError("Invalid distance", 502); return n; };
const integer = (v: unknown, minimum = 1) => { const n = number(v); if (!Number.isInteger(n) || n < minimum) throw new GovernmentError("Invalid revision", 502); return n; };
export async function governmentRequest(path: string, method: "get" | "post" | "patch" = "get", body?: unknown, signal?: AbortSignal): Promise<unknown> {
  try { return (await apiClient.request<unknown>({ url: path, method, data: body, signal })).data; }
  catch (error) {
    if (!isAxiosError(error)) throw error;
    const status = error.response?.status ?? 0;
    const value = error.response?.data;
    const server = value && typeof value === "object" && typeof value.message === "string" ? value.message : null;
    throw new GovernmentError(server || (status === 409 ? "The record changed or this transition is not allowed. Refresh and review before retrying; your draft is retained." : status === 401 || status === 403 ? "Government access could not be verified. No further changes are allowed." : "The request could not be confirmed. Refresh the record before retrying."), status);
  }
}
export function parseGovernmentReports(value: unknown): GovernmentReports {
  const envelope = object(value), meta = object(envelope.meta);
  const data = list(envelope.data).map(raw => {
    const r = object(raw), t = object(r.triage);
    if (!["CRITICAL", "HIGH", "MEDIUM", "UNKNOWN"].includes(text(t.level))) throw new GovernmentError("Invalid triage level", 502);
    const satellite = t.satelliteMatch === null ? null : object(t.satelliteMatch);
    const settlement = t.settlementMatch === null ? null : object(t.settlementMatch);
    const region = r.region === null ? null : object(r.region);
    const linked = r.case === null ? null : object(r.case);
    const latitude = r.latitude === null ? null : number(r.latitude), longitude = r.longitude === null ? null : number(r.longitude);
    if ((latitude === null) !== (longitude === null) || (latitude !== null && Math.abs(latitude) > 90) || (longitude !== null && Math.abs(longitude) > 180)) throw new GovernmentError("Invalid report coordinates", 502);
    if (!["INCIDENT_ESTIMATE", "OBSERVER_POSITION"].includes(text(r.locationMode)) || !["NEW", "NEEDS_DETAILS", "REVIEWED"].includes(text(r.reviewStatus))) throw new GovernmentError("Invalid report status", 502);
    const observations = strings(r.observationTypes);
    if (observations.some(v => !["SMOKE", "FLAME", "BURNING_SMELL"].includes(v))) throw new GovernmentError("Invalid observation", 502);
    return {
      id: text(r.id), number: text(r.number), observationTypes: observations as GovernmentReports["data"][number]["observationTypes"], observedAt: time(r.observedAt), createdAt: time(r.createdAt),
      locationMode: r.locationMode as "INCIDENT_ESTIMATE" | "OBSERVER_POSITION", latitude, longitude, accuracyMeters: r.accuracyMeters == null ? null : distance(r.accuracyMeters), locationDescription: text(r.locationDescription), description: text(r.description), reviewStatus: r.reviewStatus as "NEW" | "NEEDS_DETAILS" | "REVIEWED",
      regionId: r.regionId == null ? null : text(r.regionId), region: region ? { id: text(region.id), name: text(region.name), timezone: text(region.timezone) } : null,
      case: linked ? { id: text(linked.id), number: text(linked.number), verificationStatus: text(linked.verificationStatus), handlingStatus: text(linked.handlingStatus) } : null,
      attachments: list(r.attachments).map(raw => { const a = object(raw); return { id: text(a.id), filename: text(a.filename), size: distance(a.size), contentType: text(a.contentType) }; }),
      triage: { level: t.level as GovernmentReports["data"][number]["triage"]["level"], reasonCodes: strings(t.reasonCodes), missingData: strings(t.missingData), evaluatedAt: time(t.evaluatedAt), ruleVersion: text(t.ruleVersion), satelliteMatch: satellite ? { distanceMeters: distance(satellite.distanceMeters), acquiredAt: nullableTime(satellite.acquiredAt) } : null, settlementMatch: settlement ? { name: settlement.name === null ? null : text(settlement.name), distanceMeters: settlement.distanceMeters === null ? null : distance(settlement.distanceMeters) } : null },
    };
  });
  const pageSize = integer(meta.pageSize);
  if (pageSize > 100) throw new GovernmentError("Invalid page size", 502);
  return { data, meta: { total: integer(meta.total, 0), page: integer(meta.page), pageSize } };
}
export async function getGovernmentReports(page: number, search: string, status: string, signal: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search) params.set("search", search);
  if (status) params.set("reviewStatus", status);
  return parseGovernmentReports(await governmentRequest(`${apiEndpoints.adminReports}?${params}`, "get", undefined, signal));
}
export async function getCaseDetail(id: string, signal?: AbortSignal): Promise<CaseDetail> {
  const raw = object(object(await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(id)}`, "get", undefined, signal)).data);
  const item = parseCases({ data: [raw], meta: { total: 1, page: 1, pageSize: 1 } }).items[0];
  if (item.id !== id) throw new GovernmentError("Case response does not match", 502);
  return { ...item, windContext: parseWindContext(raw.windContext), version: integer(raw.version), perimeter: raw.perimeter == null ? null : parsePolygon(raw.perimeter), perimeterObservedAt: nullableTime(raw.perimeterObservedAt), perimeterSource: raw.perimeterSource == null ? null : text(raw.perimeterSource), perimeterRevision: integer(raw.perimeterRevision, 0), areaHectares: raw.areaHectares == null ? null : distance(raw.areaHectares),
    fieldUpdates: list(raw.fieldUpdates).map(value => {
      const f = object(value), findings = text(f.findings);
      if (!["VISIBLE_FIRE", "SMOKE_ONLY", "NO_INDICATION", "INCONCLUSIVE", "UNREACHABLE"].includes(findings)) throw new GovernmentError("Invalid field finding", 502);
      const latitude = f.latitude === null ? null : number(f.latitude), longitude = f.longitude === null ? null : number(f.longitude);
      if ((latitude === null) !== (longitude === null) || (latitude !== null && Math.abs(latitude) > 90) || (longitude !== null && Math.abs(longitude) > 180)) throw new GovernmentError("Invalid evidence coordinates", 502);
      return { id: text(f.id), findings: findings as FieldFinding, description: text(f.description), source: text(f.source), observedAt: time(f.observedAt), latitude, longitude };
    }),
    analysisLimitations: list(raw.analyses ?? []).flatMap(value => {
      const a = object(value);
      if (a.status !== "SUCCEEDED" || !a.output || typeof a.output !== "object") return [];
      return [{ completedAt: nullableTime(a.completedAt), current: a.id === raw.latestAnalysisId && a.contextRevision === raw.contextRevision, limitations: strings(object(a.output).limitations) }];
    }),
  };
}
export async function createGovernmentCase(body: { title: string; reason: string; latitude: number | null; longitude: number | null; regionId: string | null }) {
  const value = object(object(await governmentRequest(apiEndpoints.cases, "post", body)).data);
  return { id: text(value.id), number: text(value.number) };
}
export async function linkGovernmentReport(id: string, caseId: string, reason: string) {
  await governmentRequest(`${apiEndpoints.adminReports}/${encodeURIComponent(id)}`, "patch", { caseId, reviewStatus: "REVIEWED", reason });
}
export async function recordField(id: string, body: FieldInput) {
  const value = object(object(await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(id)}/field-updates`, "post", body)).data);
  return text(value.id);
}
export async function verifyGovernmentCase(id: string, body: VerificationInput) {
  await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(id)}/verify`, "post", body);
}
export async function savePerimeter(id: string, body: PerimeterInput) {
  await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(id)}`, "patch", body);
}
export function parsePublication(value: unknown): PublicationDraft {
  const p = object(object(value).data);
  if (p.status !== "DRAFT" && p.status !== "PUBLISHED") throw new GovernmentError("Publication is not a current draft or publication", 409);
  return { id: text(p.id), title: text(p.title), summary: text(p.summary), body: text(p.body), updatedAt: time(p.updatedAt), status: p.status, sources: list(p.sources).map(value => { const s = object(value); return { title: text(s.title), url: text(s.url) }; }) };
}
export async function savePublication(body: PublicationInput, id?: string) {
  return parsePublication(await governmentRequest(`${apiEndpoints.adminInformation}${id ? `/${encodeURIComponent(id)}` : ""}`, id ? "patch" : "post", body));
}
export async function publishPerimeter(id: string, expectedUpdatedAt: string, authorityReference: string) {
  return parsePublication(await governmentRequest(`${apiEndpoints.adminInformation}/${encodeURIComponent(id)}/publish`, "post", { expectedUpdatedAt, authorityReference }));
}
