import { isAxiosError } from "axios";
import { apiClient } from "@/config/api-client";
import { apiEndpoints } from "@/constants";
import { parseCases } from "./parse";
import { parsePolygon } from "@/lib/perimeter";
import { parseWindContext } from "@/lib/wind";
import { parseRichText } from "@/lib/rich-text";
import { parseEvidenceProvenance } from "@/lib/government-confirmation";
import { caseFromReportsPayload, parseReportCount } from "@/lib/report-grouping";
import type { CaseDetail, CompletionReportCase, CompletionReportDraftInput, FieldFinding, FieldInput, GovernmentReports, PerimeterInput, PublicationDraft, PublicationInput, ReportActionInput, VerificationInput } from "@/types/government";

export class GovernmentError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status = 0, code?: string) { super(message); this.status = status; this.code = code; }
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
export function governmentErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const response = value as Record<string, unknown>;
  const details = Array.isArray(response.errors) ? response.errors : [];
  const detail = details.find(item => item && typeof item === "object" && typeof (item as Record<string, unknown>).message === "string") as Record<string, unknown> | undefined;
  if (detail) return detail.message as string;
  return typeof response.message === "string" ? response.message : null;
}
export async function governmentRequest(path: string, method: "get" | "post" | "patch" = "get", body?: unknown, signal?: AbortSignal): Promise<unknown> {
  try { return (await apiClient.request<unknown>({ url: path, method, data: body, signal })).data; }
  catch (error) {
    if (!isAxiosError(error)) throw error;
    const status = error.response?.status ?? 0;
    const server = governmentErrorMessage(error.response?.data);
    const code = typeof error.response?.data?.code === "string" ? error.response.data.code : undefined;
    throw new GovernmentError(server || (status === 409 ? "The record changed or this transition is not allowed. Refresh and review before retrying; your draft is retained." : status === 401 || status === 403 ? "Government access could not be verified. No further changes are allowed." : "The request could not be confirmed. Refresh the record before retrying."), status, code);
  }
}
function parsePriority(value: unknown): CaseDetail["priority"] {
  if (!["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNASSESSED"].includes(text(value))) throw new GovernmentError("Invalid priority", 502);
  return value as CaseDetail["priority"];
}
export function parseGovernmentReports(value: unknown): GovernmentReports {
  const envelope = object(value), meta = object(envelope.meta);
  const data = list(envelope.data).map(raw => {
    const r = object(raw), t = object(r.triage);
    if (!["CRITICAL", "HIGH", "MEDIUM", "UNKNOWN"].includes(text(t.level))) throw new GovernmentError("Invalid triage level", 502);
    const satellite = t.satelliteMatch === null ? null : object(t.satelliteMatch);
    const settlement = t.settlementMatch === null ? null : object(t.settlementMatch);
    const region = r.region === null ? null : object(r.region);
    const reporter = r.reporter == null ? null : object(r.reporter);
    const linked = r.case === null ? null : object(r.case);
    const latitude = r.latitude === null ? null : number(r.latitude), longitude = r.longitude === null ? null : number(r.longitude);
    if ((latitude === null) !== (longitude === null) || (latitude !== null && Math.abs(latitude) > 90) || (longitude !== null && Math.abs(longitude) > 180)) throw new GovernmentError("Invalid report coordinates", 502);
    if (!["INCIDENT_ESTIMATE", "OBSERVER_POSITION"].includes(text(r.locationMode)) || !["NEW", "UNDER_REVIEW", "NEEDS_DETAILS", "REVIEWED", "DECLINED"].includes(text(r.reviewStatus))) throw new GovernmentError("Invalid report status", 502);
    const observations = strings(r.observationTypes);
    if (observations.some(v => !["SMOKE", "FLAME", "BURNING_SMELL"].includes(v))) throw new GovernmentError("Invalid observation", 502);
    return {
      id: text(r.id), number: text(r.number), observationTypes: observations as GovernmentReports["data"][number]["observationTypes"], observedAt: time(r.observedAt), createdAt: time(r.createdAt),
      locationMode: r.locationMode as "INCIDENT_ESTIMATE" | "OBSERVER_POSITION", latitude, longitude, accuracyMeters: r.accuracyMeters == null ? null : distance(r.accuracyMeters), locationDescription: text(r.locationDescription), description: text(r.description), reviewStatus: r.reviewStatus as "NEW" | "UNDER_REVIEW" | "NEEDS_DETAILS" | "REVIEWED" | "DECLINED",
      regionId: r.regionId == null ? null : text(r.regionId), region: region ? { id: text(region.id), name: text(region.name), timezone: text(region.timezone) } : null,
      reporter: reporter ? { id: text(reporter.id), name: text(reporter.name), email: text(reporter.email) } : undefined,
      case: linked ? { id: text(linked.id), number: text(linked.number), title: text(linked.title), verificationStatus: text(linked.verificationStatus), handlingStatus: text(linked.handlingStatus), version: integer(linked.version), reportCount: parseReportCount(linked.reportCount), priority: linked.priority == null ? undefined : parsePriority(linked.priority), priorityReason: linked.priorityReason == null ? null : text(linked.priorityReason) } : null,
      updates: r.updates === undefined ? undefined : list(r.updates).map(value => { const update = object(value); return { id: text(update.id), message: text(update.message), kind: text(update.kind), authorRole: text(update.authorRole), createdAt: time(update.createdAt), attachments: list(update.attachments ?? []).map(value => { const attachment = object(value); return { id: text(attachment.id), filename: text(attachment.filename), contentType: text(attachment.contentType), size: distance(attachment.size) }; }) }; }),
      progress: r.progress === undefined ? undefined : list(r.progress).map(value => { const p = object(value); return { id: text(p.id), stage: text(p.stage), description: text(p.description), createdAt: time(p.createdAt), actorDisplay: text(p.actorDisplay), attachments: list(p.attachments ?? []).map(value => { const a = object(value); return { id: text(a.id), filename: text(a.filename), contentType: text(a.contentType), size: distance(a.size) }; }) }; }),
      attachments: list(r.attachments).map(raw => { const a = object(raw); return { id: text(a.id), filename: text(a.filename), size: distance(a.size), contentType: text(a.contentType) }; }),
      coverAttachment: r.coverAttachment == null ? null : (() => { const a = object(r.coverAttachment); return { id: text(a.id), filename: text(a.filename) }; })(),
      triage: { level: t.level as GovernmentReports["data"][number]["triage"]["level"], reasonCodes: strings(t.reasonCodes), missingData: strings(t.missingData), evaluatedAt: time(t.evaluatedAt), ruleVersion: text(t.ruleVersion), satelliteMatch: satellite ? { distanceMeters: distance(satellite.distanceMeters), acquiredAt: nullableTime(satellite.acquiredAt) } : null, settlementMatch: settlement ? { name: settlement.name === null ? null : text(settlement.name), distanceMeters: settlement.distanceMeters === null ? null : distance(settlement.distanceMeters) } : null },
    };
  });
  const pageSize = integer(meta.pageSize);
  if (pageSize > 100) throw new GovernmentError("Invalid page size", 502);
  return { data, meta: { total: integer(meta.total, 0), page: integer(meta.page), pageSize } };
}
export async function getGovernmentReports(page: number, search: string, status: string, signal: AbortSignal, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set("search", search);
  if (status) params.set("workflowStatus", status);
  return parseGovernmentReports(await governmentRequest(`${apiEndpoints.adminReports}?${params}`, "get", undefined, signal));
}
export async function getGovernmentReport(id: string, signal: AbortSignal) {
  const response = object(await governmentRequest(`${apiEndpoints.adminReports}/${encodeURIComponent(id)}`, "get", undefined, signal));
  const report = parseGovernmentReports({ data: [response.data], meta: { total: 1, page: 1, pageSize: 1 } }).data[0];
  if (report.id !== id) throw new GovernmentError("Report response does not match", 502);
  return report;
}
export async function getCaseDetail(id: string, signal?: AbortSignal, rawOverride?: unknown): Promise<CaseDetail> {
  const raw = rawOverride === undefined ? object(object(await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(id)}`, "get", undefined, signal)).data) : object(rawOverride);
  const item = parseCases({ data: [raw], meta: { total: 1, page: 1, pageSize: 1 } }).items[0];
  if (item.id !== id) throw new GovernmentError("Case response does not match", 502);
  const region = raw.region == null ? null : object(raw.region);
  const weatherValue = object(raw.weatherResolution), weatherStatus = text(weatherValue.status), weatherBasis = text(weatherValue.basis);
  if (!["CURRENT", "UNAVAILABLE"].includes(weatherStatus) || !["CASE_COORDINATES", "UNAVAILABLE"].includes(weatherBasis) || typeof weatherValue.stale !== "boolean") throw new GovernmentError("Invalid weather resolution", 502);
  const weatherProvenance = weatherValue.provenance == null ? null : object(weatherValue.provenance), weatherTimestamps = weatherValue.timestamps == null ? null : object(weatherValue.timestamps), weatherForecast = weatherValue.forecast == null ? null : object(weatherValue.forecast);
  if (weatherStatus === "CURRENT" && (weatherBasis !== "CASE_COORDINATES" || !weatherProvenance || !weatherTimestamps || !weatherForecast || weatherValue.stale || weatherValue.unavailableReason !== null)) throw new GovernmentError("Incomplete current weather", 502);
  if (weatherStatus === "UNAVAILABLE" && (weatherBasis !== "UNAVAILABLE" || weatherProvenance || weatherTimestamps || weatherForecast)) throw new GovernmentError("Invalid unavailable weather", 502);
  if (weatherProvenance && (weatherProvenance.provider !== "GOOGLE_WEATHER" || weatherProvenance.relationBasis !== "CASE_COORDINATES" || weatherProvenance.containmentClaimed !== false)) throw new GovernmentError("Invalid weather provenance", 502);
  if (weatherTimestamps && weatherTimestamps.issuedAt !== null) throw new GovernmentError("Invalid weather timestamps", 502);
  if (weatherForecast && (weatherForecast.provider !== "GOOGLE_WEATHER" || weatherForecast.issuedAt !== null || weatherForecast.windSpeedUnit !== "km/h" || weatherForecast.attribution !== weatherProvenance?.attribution)) throw new GovernmentError("Invalid weather forecast", 502);
  return { ...item, activePublication: raw.activePublication == null ? null : parsePublication({ data: raw.activePublication }), reports: list(raw.reports ?? []).map(value => { const report = object(value); return { id: text(report.id), number: text(report.number), description: text(report.description), reviewStatus: text(report.reviewStatus), observedAt: time(report.observedAt) }; }), assignments: list(raw.assignments ?? []).map(value => { const assignment = object(value), team = object(assignment.team); const status = text(assignment.status); if (!["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) throw new GovernmentError("Invalid assignment", 502); return { id: text(assignment.id), teamId: text(assignment.teamId), status: status as CaseDetail["assignments"][number]["status"], team: { id: text(team.id), name: text(team.name) }, acceptedAt: nullableTime(assignment.acceptedAt), startedAt: nullableTime(assignment.startedAt), completedAt: nullableTime(assignment.completedAt), cancelledAt: nullableTime(assignment.cancelledAt) }; }), weatherResolution: { status: weatherStatus as CaseDetail["weatherResolution"]["status"], basis: weatherBasis as CaseDetail["weatherResolution"]["basis"], stale: weatherValue.stale, unavailableReason: weatherValue.unavailableReason == null ? null : text(weatherValue.unavailableReason), provenance: weatherProvenance ? { provider: text(weatherProvenance.provider) as "GOOGLE_WEATHER", relationBasis: text(weatherProvenance.relationBasis) as "CASE_COORDINATES", containmentClaimed: false as const, attribution: text(weatherProvenance.attribution) } : null, timestamps: weatherTimestamps ? { issuedAt: null, validAt: time(weatherTimestamps.validAt), fetchedAt: time(weatherTimestamps.fetchedAt), usableUntil: time(weatherTimestamps.usableUntil) } : null, forecast: weatherForecast ? { id: text(weatherForecast.id), provider: text(weatherForecast.provider) as "GOOGLE_WEATHER", issuedAt: null, attribution: text(weatherForecast.attribution), validAt: time(weatherForecast.validAt), fetchedAt: time(weatherForecast.fetchedAt), temperature: weatherForecast.temperature == null ? null : number(weatherForecast.temperature), humidity: weatherForecast.humidity == null ? null : number(weatherForecast.humidity), windSpeed: weatherForecast.windSpeed == null ? null : number(weatherForecast.windSpeed), windSpeedUnit: "km/h", windFromDegrees: weatherForecast.windFromDegrees == null ? null : number(weatherForecast.windFromDegrees) } : null }, regionId: raw.regionId == null ? null : text(raw.regionId), region: region ? { id: text(region.id), name: text(region.name) } : null, operatorAuthorityConfigured: raw.operatorAuthorityConfigured === true, activeAssignmentCount: raw.activeAssignmentCount === undefined ? 0 : integer(raw.activeAssignmentCount, 0), windContext: parseWindContext(raw.windContext), version: integer(raw.version), perimeter: raw.perimeter == null ? null : parsePolygon(raw.perimeter), perimeterObservedAt: nullableTime(raw.perimeterObservedAt), perimeterSource: raw.perimeterSource == null ? null : text(raw.perimeterSource), perimeterRevision: integer(raw.perimeterRevision, 0), areaHectares: raw.areaHectares == null ? null : distance(raw.areaHectares),
    fieldUpdates: list(raw.fieldUpdates).map(value => {
      const f = object(value), findings = text(f.findings);
      if (!["VISIBLE_FIRE", "SMOKE_ONLY", "NO_INDICATION", "INCONCLUSIVE", "UNREACHABLE"].includes(findings)) throw new GovernmentError("Invalid field finding", 502);
      const latitude = f.latitude === null ? null : number(f.latitude), longitude = f.longitude === null ? null : number(f.longitude);
      if ((latitude === null) !== (longitude === null) || (latitude !== null && Math.abs(latitude) > 90) || (longitude !== null && Math.abs(longitude) > 180)) throw new GovernmentError("Invalid evidence coordinates", 502);
      const provenance = parseEvidenceProvenance(f.provenance);
      const assignment = f.assignment == null ? null : object(f.assignment);
      const team = assignment ? object(assignment.team) : null;
      return { id: text(f.id), findings: findings as FieldFinding, description: text(f.description), source: text(f.source), ...(provenance ? { provenance: provenance as FieldInput["provenance"] } : {}), sourceReportId: f.sourceReportId == null ? null : text(f.sourceReportId), teamId: f.teamId == null ? null : text(f.teamId), assignmentId: f.assignmentId == null ? null : text(f.assignmentId), assignment: assignment && team ? { id: text(assignment.id), status: text(assignment.status), team: { id: text(team.id), name: text(team.name) } } : null, observedAt: time(f.observedAt), latitude, longitude };
    }),
    priorityHistory: list(raw.priorityHistory ?? []).map(value => {
      const entry = object(value), from = text(entry.from), to = text(entry.to);
      if (!["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNASSESSED"].includes(from) || !["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNASSESSED"].includes(to)) throw new GovernmentError("Invalid priority history", 502);
      return { id: text(entry.id), from: from as CaseDetail["priorityHistory"][number]["from"], to: to as CaseDetail["priorityHistory"][number]["to"], reason: entry.reason == null ? null : text(entry.reason), changedAt: time(entry.changedAt), changedBy: text(entry.changedBy) };
    }),
    exposure: raw.exposure == null ? null : parseExposure(raw.exposure),
    contextRevision: integer(raw.contextRevision),
    analyses: list(raw.analyses ?? []).map(value => {
      const a = object(value), status = text(a.status), revision = integer(a.contextRevision);
      if (!["RUNNING", "SUCCEEDED", "FAILED", "OBSOLETE"].includes(status)) throw new GovernmentError("Invalid analysis status", 502);
      const o = a.output == null ? null : object(a.output);
      if (status === "SUCCEEDED" && !o) throw new GovernmentError("Missing analysis output", 502);
      if (o && (o.caseId !== id || o.contextRevision !== revision || !["LOW", "MODERATE", "HIGH", "INSUFFICIENT_DATA"].includes(text(o.evidenceLevel)) || !["LOW", "MODERATE", "HIGH", "INSUFFICIENT_DATA"].includes(text(o.impactLevel)) || !["LOW", "MEDIUM", "HIGH", "UNASSESSED"].includes(text(o.suggestedPriority)))) throw new GovernmentError("Invalid analysis context", 502);
      return { sources: list(a.sources ?? []).map(value => { const s = object(value); return { id: text(s.id), group: text(s.group), facts: Object.fromEntries(Object.entries(object(s.facts)).map(([k, v]) => [k, text(v)])) }; }), id: text(a.id), contextRevision: revision, status, current: status === "SUCCEEDED" && a.id === raw.latestAnalysisId && revision === raw.contextRevision, startedAt: time(a.startedAt), completedAt: nullableTime(a.completedAt), failureCode: a.failureCode == null ? null : text(a.failureCode), schemaVersion: a.schemaVersion == null ? null : text(a.schemaVersion), promptVersion: a.promptVersion == null ? null : text(a.promptVersion), ruleVersion: a.ruleVersion == null ? null : text(a.ruleVersion), output: o ? {
        caseId: text(o.caseId), contextRevision: revision, evidenceLevel: text(o.evidenceLevel), impactLevel: text(o.impactLevel), suggestedPriority: o.suggestedPriority as CaseDetail["priority"], model: text(o.model), generatedAt: time(o.generatedAt),
        reasons: list(o.reasons).map(value => { const r = object(value); return { text: text(r.text), sourceIds: strings(r.sourceIds) }; }),
        monitoringAreas: list(o.monitoringAreas).map(value => { const r = object(value); return { name: text(r.name), reason: text(r.reason), sourceIds: strings(r.sourceIds) }; }),
        missingInformation: strings(o.missingInformation), suggestedChecks: strings(o.suggestedChecks), limitations: strings(o.limitations),
      } : null };
    }),
    analysisLimitations: list(raw.analyses ?? []).flatMap(value => {
      const a = object(value);
      if (a.status !== "SUCCEEDED" || !a.output || typeof a.output !== "object") return [];
      return [{ completedAt: nullableTime(a.completedAt), current: a.id === raw.latestAnalysisId && a.contextRevision === raw.contextRevision, limitations: strings(object(a.output).limitations) }];
    }),
  };
}
export function parseExposure(value: unknown): NonNullable<CaseDetail["exposure"]> {
  const e = object(value);
  const bool = (v: unknown) => { if (typeof v !== "boolean") throw new GovernmentError("Invalid exposure state", 502); return v; };
  return { evaluatedAt: time(e.evaluatedAt), scope: text(e.scope), limited: bool(e.limited), limitation: text(e.limitation), items: list(e.items).map(value => {
    const f = object(value), d = f.designation == null ? null : object(f.designation), c = f.condition == null ? null : object(f.condition);
    return { id: text(f.id), name: f.name == null ? null : text(f.name), kind: text(f.kind), provider: text(f.provider), license: text(f.license), attribution: text(f.attribution), sourceDate: time(f.sourceDate), verifiedAt: nullableTime(f.verifiedAt), distanceMeters: f.distanceMeters == null ? null : distance(f.distanceMeters), intersectsPoint: f.intersectsPoint == null ? null : bool(f.intersectsPoint), downwind: f.downwind == null ? null : bool(f.downwind), unavailableReason: f.unavailableReason == null ? null : text(f.unavailableReason), designation: d ? { authority: text(d.authority), reference: text(d.reference), verifiedAt: time(d.verifiedAt) } : null, condition: c ? { condition: text(c.condition), source: text(c.source), observedAt: time(c.observedAt), stale: bool(c.stale) } : null };
  }) };
}
export async function requestCaseAnalysis(id: string) {
  await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(id)}/analyze`, "post", {});
}
export async function createCaseFromReport(id: string, reason: string) {
  const value = object(object(await governmentRequest(`${apiEndpoints.adminReports}/${encodeURIComponent(id)}/case`, "post", { reason })).data);
  return { id: text(value.id), number: text(value.number) };
}
export async function createCaseFromReports(reportIds: string[], title: string, reason: string) {
  const input = caseFromReportsPayload(reportIds, title, reason);
  const value = object(object(await governmentRequest(`${apiEndpoints.cases}/from-reports`, "post", input)).data);
  const createdReportIds = strings(value.reportIds);
  if (new Set(createdReportIds).size !== input.reportIds.length || input.reportIds.some(id => !createdReportIds.includes(id))) throw new GovernmentError("Created case reports do not match the selection", 502);
  return { id: text(value.id), number: text(value.number), title: text(value.title), reportIds: createdReportIds };
}
export async function getReportCandidates(id: string, maxDistanceMeters: number, hours: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ maxDistanceMeters: String(maxDistanceMeters), hours: String(hours) });
  const response = object(await governmentRequest(`${apiEndpoints.adminReports}/${encodeURIComponent(id)}/candidates?${params}`, "get", undefined, signal));
  const meta = object(response.meta);
  if (typeof meta.eligible !== "boolean" || meta.automaticAssociation !== false) throw new GovernmentError("Invalid candidate response", 502);
  return { eligible: meta.eligible, limitation: text(meta.limitation), items: list(response.data).map(value => {
    const c = object(value);
    return { id: text(c.id), number: text(c.number), title: text(c.title), distanceMeters: distance(c.distanceMeters), timeDifferenceHours: distance(c.timeDifferenceHours), matchedObservationId: text(c.matchedObservationId), matchedObservedAt: time(c.matchedObservedAt) };
  }) };
}
export async function createGovernmentCase(body: { title: string; reason: string; latitude: number | null; longitude: number | null; regionId: string | null }) {
  const value = object(object(await governmentRequest(apiEndpoints.cases, "post", body)).data);
  return { id: text(value.id), number: text(value.number) };
}
export async function linkGovernmentReport(id: string, caseId: string, reason: string) {
  await governmentRequest(`${apiEndpoints.adminReports}/${encodeURIComponent(id)}`, "patch", { caseId, reason });
}
export async function reviewGovernmentReport(id: string, reviewStatus: "UNDER_REVIEW" | "REVIEWED" | "DECLINED", reporterMessage: string) {
  await governmentRequest(`${apiEndpoints.adminReports}/${encodeURIComponent(id)}`, "patch", { reviewStatus, reporterMessage, reason: reporterMessage });
}
export async function submitGovernmentReportAction(id: string, body: ReportActionInput) {
  await governmentRequest(`${apiEndpoints.adminReports}/${encodeURIComponent(id)}/action`, "post", body);
}
export async function updateGovernmentHandling(id: string, version: number, handlingStatus: string, reporterMessage: string, completionFieldUpdateId?: string) {
  await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(id)}`, "patch", { version, handlingStatus, reporterMessage, reason: reporterMessage, ...(handlingStatus === "CLOSED" ? { completionFieldUpdateId } : {}) });
}
export async function updateGovernmentCase(id: string, body: { version: number; priority?: string; handlingStatus?: string; reason: string; reporterMessage?: string }) {
  await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(id)}`, "patch", body);
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
  return { id: text(p.id), slug: text(p.slug), title: text(p.title), summary: text(p.summary), body: text(p.body), bodyRich: p.bodyRich == null ? null : parseRichText(p.bodyRich), updatedAt: time(p.updatedAt), publishedAt: p.publishedAt == null ? null : time(p.publishedAt), validUntil: p.validUntil == null ? null : time(p.validUntil), status: p.status, sources: list(p.sources).map(value => { const s = object(value); return { title: text(s.title), url: text(s.url) }; }), regions: list(p.regions ?? []).map(value => { const region = object(value); return { id: region.id == null ? undefined : text(region.id), name: text(region.name), timezone: region.timezone == null ? undefined : text(region.timezone) }; }), publicLocationMode: ["NONE", "REGION_ONLY", "APPROVED_INCIDENT_PERIMETER"].includes(String(p.publicLocationMode)) ? p.publicLocationMode as PublicationDraft["publicLocationMode"] : "NONE", privacyReviewed: p.privacyReviewed === true, supersedesId: p.supersedesId == null ? null : text(p.supersedesId) };
}
export async function savePublication(body: PublicationInput, id?: string) {
  return parsePublication(await governmentRequest(`${apiEndpoints.adminInformation}${id ? `/${encodeURIComponent(id)}` : ""}`, id ? "patch" : "post", body));
}
export async function getCompletionReport(caseId: string, signal?: AbortSignal): Promise<CompletionReportCase> {
  const raw = object(object(await governmentRequest(`${apiEndpoints.adminCompletionReports}/${encodeURIComponent(caseId)}`, "get", undefined, signal)).data);
  const publication = raw.publication == null ? null : parsePublication({ data: raw.publication });
  const region = raw.region == null ? null : object(raw.region);
  const evidence = raw.completionEvidence == null ? null : object(raw.completionEvidence);
  const perimeterValue = raw.perimeter == null ? null : object(raw.perimeter);
  const perimeter = perimeterValue ? { geometry: parsePolygon(perimeterValue.geometry), observedAt: time(perimeterValue.observedAt), source: text(perimeterValue.source), areaHectares: number(perimeterValue.areaHectares), revision: integer(perimeterValue.revision) } : null;
  return { id: text(raw.id), number: text(raw.number), title: text(raw.title), verificationStatus: text(raw.verificationStatus) as CompletionReportCase["verificationStatus"], handlingStatus: text(raw.handlingStatus) as CompletionReportCase["handlingStatus"], version: integer(raw.version), closedAt: raw.closedAt == null ? null : time(raw.closedAt), closureReason: raw.closureReason == null ? null : text(raw.closureReason), region: region ? { id: text(region.id), name: text(region.name), timezone: text(region.timezone) } : null, perimeter, completionEvidence: evidence ? { findings: text(evidence.findings) as FieldFinding, description: text(evidence.description), source: text(evidence.source), observedAt: time(evidence.observedAt), createdAt: time(evidence.createdAt), attachments: list(evidence.attachments ?? []).map(value => { const attachment = object(value); return { filename: text(attachment.filename), contentType: text(attachment.contentType), size: number(attachment.size) }; }) } : null, reports: list(raw.reports ?? []).map(value => { const report = object(value); return { number: text(report.number), observationTypes: strings(report.observationTypes), observedAt: time(report.observedAt), description: text(report.description) }; }), publication };
}
export async function saveCompletionReport(body: CompletionReportDraftInput) {
  return parsePublication(await governmentRequest(apiEndpoints.adminCompletionReports, "post", body));
}
export async function publishCompletionReport(id: string, expectedUpdatedAt: string, expectedCaseVersion: number) {
  return parsePublication(await governmentRequest(`${apiEndpoints.adminCompletionReports}/${encodeURIComponent(id)}/publish`, "post", { expectedUpdatedAt, expectedCaseVersion }));
}
export async function publishPerimeter(id: string, expectedUpdatedAt: string, authorityReference: string, expectedCaseVersion: number) {
  return parsePublication(await governmentRequest(`${apiEndpoints.adminInformation}/${encodeURIComponent(id)}/publish`, "post", { expectedUpdatedAt, authorityReference, expectedCaseVersion }));
}
