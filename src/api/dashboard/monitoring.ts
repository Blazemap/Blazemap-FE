import { isAxiosError } from "axios";
import { apiClient } from "@/config/api-client";
import { apiEndpoints } from "@/constants";
import { monitoringAvatarImage } from "@/lib/avatar";
import type { DashboardUser, MonitoringAssignment, MonitoringAvatarUpdate, MonitoringEquipment, MonitoringEquipmentDetail, MonitoringFeature, MonitoringFeatureDetail, MonitoringOperationalUpdate, MonitoringOperations, MonitoringSummary, MonitoringTeam, MonitoringTeamDetail, MonitoringUser, MonitoringUserPatch, MonitoringUsers, SourceHealth } from "@/types";
import { GovernmentError, governmentErrorMessage, governmentRequest } from "./government";

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid monitoring response");
  return value as Record<string, unknown>;
};
const text = (value: unknown): string => {
  if (typeof value !== "string") throw new Error("Invalid monitoring text");
  return value;
};
const count = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error("Invalid monitoring count");
  return value;
};
const time = (value: unknown): string => {
  const result = text(value);
  if (!Number.isFinite(Date.parse(result))) throw new Error("Invalid monitoring time");
  return result;
};
const countRecord = <K extends string>(value: unknown, keys: readonly K[]): Record<K, number> => {
  const source = record(value);
  return Object.fromEntries(keys.map(key => [key, count(source[key])])) as Record<K, number>;
};

export function parseMonitoringSummary(value: unknown): MonitoringSummary {
  const data = record(record(value).data);
  const cases = record(data.cases);
  const reports = record(data.reports);
  const operations = record(data.operations);
  const publications = record(data.publications);
  return {
    asOf: time(data.asOf),
    cases: {
      total: count(cases.total),
      openUnverified: count(cases.openUnverified),
      openConfirmed: count(cases.openConfirmed),
      activeHandling: count(cases.activeHandling),
      highPriorityOpen: count(cases.highPriorityOpen),
      byVerification: countRecord(cases.byVerification, ["UNVERIFIED", "CONFIRMED_FIRE", "NOT_FIRE"] as const),
      byHandling: countRecord(cases.byHandling, ["OPEN", "CHECK_SCHEDULED", "ON_SCENE", "RESPONDING", "MONITORING", "CLOSED"] as const),
      byPriority: countRecord(cases.byPriority, ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNASSESSED"] as const),
    },
    reports: {
      total: count(reports.total),
      awaitingReview: count(reports.awaitingReview),
      inProgress: count(reports.inProgress),
      byReviewStatus: countRecord(reports.byReviewStatus, ["NEW", "UNDER_REVIEW", "NEEDS_DETAILS", "REVIEWED", "DECLINED"] as const),
    },
    operations: {
      activeTeams: count(operations.activeTeams),
      activeAssignments: count(operations.activeAssignments),
    },
    publications: { drafts: count(publications.drafts) },
  };
}

export function parseSourceHealth(value: unknown): SourceHealth {
  const data = record(record(value).data);
  const database = text(data.database);
  if (database !== "connected" && database !== "unavailable") throw new Error("Invalid database status");
  const validStatuses = ["AVAILABLE", "STALE", "NOT_CONFIGURED", "NOT_SYNCED", "ON_DEMAND", "UNAVAILABLE", "RUNNING", "SUCCEEDED", "FAILED", "OBSOLETE"];
  const sources = data.sources;
  if (!Array.isArray(sources)) throw new Error("Invalid source status list");
  return {
    database,
    sources: sources.map(value => {
      const source = record(value);
      const id = text(source.id);
      const status = text(source.status);
      if (!["FIRMS", "GOOGLE_WEATHER", "AI"].includes(id) || !validStatuses.includes(status)) throw new Error("Invalid source status");
      return {
        id: id as SourceHealth["sources"][number]["id"],
        name: text(source.name),
        status: status as SourceHealth["sources"][number]["status"],
        message: source.message == null ? null : text(source.message),
        lastSuccessAt: source.lastSuccessAt == null ? null : time(source.lastSuccessAt),
      };
    }),
    uploadsAvailable: data.uploadsAvailable === true,
    emailAvailable: data.emailAvailable === true,
    googleAvailable: data.googleAvailable === true,
  };
}

export function monitoringSummaryQueryOptions(user: DashboardUser) {
  return {
    queryKey: ["dashboard", user.id, user.role, "monitoring-summary"] as const,
    queryFn: async ({ signal }: { signal: AbortSignal }) => parseMonitoringSummary(await governmentRequest(apiEndpoints.monitoringSummary, "get", undefined, signal)),
  };
}

const parseMonitoringUser = (value: unknown): MonitoringUser => {
  const user = record(value);
  const role = text(user.role);
  if (role !== "USER" && role !== "ADMIN") throw new Error("Invalid user role");
  const image = monitoringAvatarImage(user.image);
  return { id: text(user.id), name: text(user.name), email: text(user.email), image: image?.value ?? null, role, active: user.active === true, emailVerified: user.emailVerified === true, canConfirmIncidents: user.canConfirmIncidents === true, canPublishInformation: user.canPublishInformation === true, createdAt: time(user.createdAt), updatedAt: time(user.updatedAt) };
};
export function parseMonitoringUsers(value: unknown): MonitoringUsers {
  const envelope = record(value);
  const meta = record(envelope.meta);
  if (!Array.isArray(envelope.data)) throw new Error("Invalid user list");
  return { data: envelope.data.map(parseMonitoringUser), meta: { total: count(meta.total), page: count(meta.page), pageSize: count(meta.pageSize) } };
}

const parseNullable = (value: unknown) => value == null ? null : text(value);
const parseBoolean = (value: unknown) => { if (typeof value !== "boolean") throw new Error("Invalid monitoring flag"); return value; };
const parseVersion = (value: unknown) => { const result = count(value); if (result < 1) throw new Error("Invalid operation version"); return result; };
const parseCondition = (value: unknown) => value == null ? null : text(value);
const parseObservedAt = (value: unknown) => value == null ? null : time(value);
function parseOperationalUpdate(value: unknown): MonitoringOperationalUpdate { const item = record(value); const subjectType = text(item.subjectType); if (!["TEAM", "EQUIPMENT", "FEATURE"].includes(subjectType)) throw new Error("Invalid operation subject"); return { id: text(item.id), subjectType: subjectType as MonitoringOperationalUpdate["subjectType"], subjectId: text(item.subjectId), condition: text(item.condition), source: text(item.source), observedAt: time(item.observedAt), notes: parseNullable(item.notes), createdAt: time(item.createdAt), sample: parseBoolean(item.sample) }; }
function parseTeam(value: unknown): MonitoringTeam { const item = record(value), performance = record(item.performance); return { id: text(item.id), name: text(item.name), organization: parseNullable(item.organization), activeAssignmentCount: count(item.activeAssignmentCount), performance: { totalAssignments: count(performance.totalAssignments), completedAssignments: count(performance.completedAssignments), cancelledAssignments: count(performance.cancelledAssignments), fieldResults: count(performance.fieldResults), averageCompletionMinutes: performance.averageCompletionMinutes == null ? null : count(performance.averageCompletionMinutes) }, active: parseBoolean(item.active), version: parseVersion(item.version), createdAt: time(item.createdAt), updatedAt: time(item.updatedAt), sample: parseBoolean(item.sample), latestCondition: parseCondition(item.latestCondition), latestObservedAt: parseObservedAt(item.latestObservedAt) }; }
function parseEquipment(value: unknown): MonitoringEquipment { const item = record(value), assignment = item.currentAssignment == null ? null : record(item.currentAssignment); return { id: text(item.id), name: text(item.name), kind: text(item.kind), teamId: parseNullable(item.teamId), currentAssignment: assignment ? { id: text(assignment.id), caseId: text(assignment.caseId), caseNumber: text(assignment.caseNumber), caseTitle: text(assignment.caseTitle), status: text(assignment.status) } : null, active: parseBoolean(item.active), version: parseVersion(item.version), createdAt: time(item.createdAt), updatedAt: time(item.updatedAt), sample: parseBoolean(item.sample), latestCondition: parseCondition(item.latestCondition), latestObservedAt: parseObservedAt(item.latestObservedAt) }; }
function parseFeature(value: unknown): MonitoringFeature { const item = record(value), kind = text(item.kind), sample = parseBoolean(item.sample), authoritative = parseBoolean(item.authoritative), verifiedAt = item.verifiedAt == null ? null : time(item.verifiedAt); if (!["ROAD", "RIVER", "WATER_SOURCE", "DESIGNATED_LOCATION"].includes(kind) || authoritative !== (!sample && verifiedAt !== null)) throw new Error("Invalid operation feature authority"); const latitude = Number(item.latitude), longitude = Number(item.longitude); if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error("Invalid operation feature coordinates"); return { id: text(item.id), name: parseNullable(item.name), kind: kind as MonitoringFeature["kind"], latitude, longitude, provider: text(item.provider), verifiedAt, authoritative, sample, latestCondition: parseCondition(item.latestCondition), latestObservedAt: parseObservedAt(item.latestObservedAt) }; }
function parseAssignment(value: unknown): MonitoringAssignment { const item = record(value); const status = text(item.status), result = item.result == null ? null : record(item.result); if (!["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) throw new Error("Invalid assignment status"); return { id: text(item.id), caseId: text(item.caseId), caseNumber: text(item.caseNumber), caseTitle: text(item.caseTitle), caseVerification: text(item.caseVerification), caseHandling: text(item.caseHandling), teamId: text(item.teamId), teamName: text(item.teamName), status: status as MonitoringAssignment["status"], notes: parseNullable(item.notes), version: parseVersion(item.version), sample: parseBoolean(item.sample), result: result ? { id: text(result.id), findings: text(result.findings), observedAt: time(result.observedAt) } : null, acceptedAt: parseObservedAt(item.acceptedAt), startedAt: parseObservedAt(item.startedAt), completedAt: parseObservedAt(item.completedAt), cancelledAt: parseObservedAt(item.cancelledAt), createdAt: time(item.createdAt), updatedAt: time(item.updatedAt) }; }
export function parseMonitoringOperations(value: unknown): MonitoringOperations {
  const data = record(record(value).data);
  if (!Array.isArray(data.teams) || !Array.isArray(data.equipment) || !Array.isArray(data.features) || !Array.isArray(data.updates) || !Array.isArray(data.assignments)) throw new Error("Invalid operations response");
  const counts = record(data.counts);
  return {
    asOf: time(data.asOf),
    teams: data.teams.map(parseTeam),
    equipment: data.equipment.map(parseEquipment),
    features: data.features.map(parseFeature),
    updates: data.updates.map(parseOperationalUpdate),
    assignments: data.assignments.map(parseAssignment),
    counts: { teams: count(counts.teams), availableTeams: count(counts.availableTeams), equipment: count(counts.equipment), availableEquipment: count(counts.availableEquipment), activeAssignments: count(counts.activeAssignments), access: count(counts.access), passableAccess: count(counts.passableAccess), water: count(counts.water), availableWater: count(counts.availableWater) },
  };
}

export function sourceHealthQueryOptions(user: DashboardUser) {
  return {
    queryKey: ["dashboard", user.id, user.role, "source-health"] as const,
    queryFn: async ({ signal }: { signal: AbortSignal }) => parseSourceHealth(await governmentRequest(apiEndpoints.publicStatus, "get", undefined, signal)),
  };
}

export type MonitoringUserFilters = { page: number; search: string; role: string; active: string; emailVerified: string };
export function monitoringUsersQueryOptions(user: DashboardUser, filters: MonitoringUserFilters) {
  return {
    queryKey: ["dashboard", user.id, user.role, "monitoring-users", filters] as const,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const params = new URLSearchParams({ page: String(filters.page), pageSize: "50" });
      if (filters.search) params.set("search", filters.search);
      if (filters.role) params.set("role", filters.role);
      if (filters.active) params.set("active", filters.active);
      if (filters.emailVerified) params.set("emailVerified", filters.emailVerified);
      return parseMonitoringUsers(await governmentRequest(`${apiEndpoints.adminUsers}?${params}`, "get", undefined, signal));
    },
  };
}
export function monitoringUserQueryOptions(user: DashboardUser, id: string) {
  return {
    queryKey: ["dashboard", user.id, user.role, "monitoring-user", id] as const,
    queryFn: async ({ signal }: { signal: AbortSignal }) => parseMonitoringUser(record(await governmentRequest(`${apiEndpoints.adminUsers}/${encodeURIComponent(id)}`, "get", undefined, signal)).data),
  };
}
export async function updateMonitoringUser(id: string, body: MonitoringUserPatch) {
  return parseMonitoringUser(record(await governmentRequest(`${apiEndpoints.adminUsers}/${encodeURIComponent(id)}`, "patch", body)).data);
}
export async function getMonitoringAvatar(id: string, signal: AbortSignal): Promise<Blob> {
  try {
    const response = await apiClient.get<Blob>(`${apiEndpoints.adminUsers}/${encodeURIComponent(id)}/avatar`, { signal, responseType: "blob" });
    if (!(response.data instanceof Blob) || response.data.type !== "image/jpeg" || response.data.size > 1048576) throw new GovernmentError("Invalid avatar response", 502);
    return response.data;
  } catch (error) {
    if (error instanceof GovernmentError || !isAxiosError(error)) throw error;
    throw new GovernmentError(governmentErrorMessage(error.response?.data) || "The profile photo could not be loaded.", error.response?.status ?? 0);
  }
}
export async function updateMonitoringAvatar(id: string, blob: Blob, expectedUpdatedAt: string, reason: string, signal: AbortSignal): Promise<MonitoringAvatarUpdate> {
  if (blob.type !== "image/jpeg" || !blob.size || blob.size > 1048576) throw new GovernmentError("A JPEG image up to 1 MB is required.", 400);
  try {
    const response = await apiClient.post<{ data: MonitoringAvatarUpdate }>(`${apiEndpoints.adminUsers}/${encodeURIComponent(id)}/avatar`, blob, { signal, headers: { "Content-Type": "image/jpeg", "X-Blazemap-Expected-Updated-At": expectedUpdatedAt, "X-Blazemap-Audit-Reason": encodeURIComponent(reason) } });
    const data = record(response.data.data);
    const image = monitoringAvatarImage(data.image);
    if (image?.kind !== "uploaded") throw new GovernmentError("Invalid avatar response", 502);
    return { image: image.value, updatedAt: time(data.updatedAt) };
  } catch (error) {
    if (error instanceof GovernmentError || !isAxiosError(error)) throw error;
    throw new GovernmentError(governmentErrorMessage(error.response?.data) || "The profile photo could not be saved.", error.response?.status ?? 0);
  }
}

export type CreateTeamInput = { name: string; organization: string | null; reason: string; idempotencyKey: string };
export type CreateEquipmentInput = { name: string; kind: string; teamId: string | null; reason: string; idempotencyKey: string };
export type CreateAssignmentInput = { version: number; teamId: string; notes: string; reason: string; idempotencyKey: string };
export type CreateOperationalFeatureInput = { name: string; kind: "ROAD" | "WATER_SOURCE"; latitude: number; longitude: number; condition: string; source: string; observedAt: string; reason: string; idempotencyKey: string };
export type CreateOperationalUpdateInput = { subjectType: "TEAM" | "EQUIPMENT" | "FEATURE"; subjectId: string; condition: string; source: string; observedAt: string; notes: string | null; reason: string; idempotencyKey: string };
export type MonitoringOperationsSection = "teams" | "equipment" | "assignments" | "access-water";
export function monitoringOperationsQueryOptions(user: DashboardUser, section?: MonitoringOperationsSection) {
  const path = section ? `${apiEndpoints.adminOperations}?${new URLSearchParams({ section })}` : apiEndpoints.adminOperations;
  return {
    queryKey: ["dashboard", user.id, user.role, "monitoring-operations", section ?? "all"] as const,
    queryFn: async ({ signal }: { signal: AbortSignal }) => parseMonitoringOperations(await governmentRequest(path, "get", undefined, signal)),
  };
}
const detailData = (value: unknown) => record(record(value).data);
export function monitoringTeamQueryOptions(user: DashboardUser, id: string) { return { queryKey: ["dashboard", user.id, user.role, "monitoring-team", id] as const, queryFn: async ({ signal }: { signal: AbortSignal }): Promise<MonitoringTeamDetail> => { const data = detailData(await governmentRequest(`${apiEndpoints.adminTeams}/${encodeURIComponent(id)}`, "get", undefined, signal)); if (!Array.isArray(data.updates)) throw new Error("Invalid team detail"); return { item: parseTeam(data.item), updates: data.updates.map(parseOperationalUpdate) }; } }; }
export function monitoringEquipmentQueryOptions(user: DashboardUser, id: string) { return { queryKey: ["dashboard", user.id, user.role, "monitoring-equipment", id] as const, queryFn: async ({ signal }: { signal: AbortSignal }): Promise<MonitoringEquipmentDetail> => { const data = detailData(await governmentRequest(`${apiEndpoints.adminEquipment}/${encodeURIComponent(id)}`, "get", undefined, signal)); if (!Array.isArray(data.teams) || !Array.isArray(data.updates)) throw new Error("Invalid equipment detail"); return { item: parseEquipment(data.item), teams: data.teams.map(value => { const team = record(value); return { id: text(team.id), name: text(team.name), active: parseBoolean(team.active) }; }), updates: data.updates.map(parseOperationalUpdate) }; } }; }
export function monitoringAssignmentQueryOptions(user: DashboardUser, id: string) { return { queryKey: ["dashboard", user.id, user.role, "monitoring-assignment", id] as const, queryFn: async ({ signal }: { signal: AbortSignal }) => parseAssignment(detailData(await governmentRequest(`${apiEndpoints.adminAssignments}/${encodeURIComponent(id)}`, "get", undefined, signal))) }; }
export function monitoringFeatureQueryOptions(user: DashboardUser, id: string) { return { queryKey: ["dashboard", user.id, user.role, "monitoring-feature", id] as const, queryFn: async ({ signal }: { signal: AbortSignal }): Promise<MonitoringFeatureDetail> => { const data = detailData(await governmentRequest(`${apiEndpoints.adminOperationalFeatures}/${encodeURIComponent(id)}`, "get", undefined, signal)); if (!Array.isArray(data.updates)) throw new Error("Invalid feature detail"); return { item: parseFeature(data.item), updates: data.updates.map(parseOperationalUpdate) }; } }; }
export async function createMonitoringTeam(body: CreateTeamInput) { await governmentRequest(apiEndpoints.adminTeams, "post", body); }
export async function updateMonitoringTeam(id: string, body: { version: number; name?: string; organization?: string | null; active?: boolean; reason: string }) { await governmentRequest(`${apiEndpoints.adminTeams}/${encodeURIComponent(id)}`, "patch", body); }
export async function createMonitoringEquipment(body: CreateEquipmentInput) { await governmentRequest(apiEndpoints.adminEquipment, "post", body); }
export async function updateMonitoringEquipment(id: string, body: { version: number; name?: string; kind?: string; teamId?: string | null; active?: boolean; reason: string }) { await governmentRequest(`${apiEndpoints.adminEquipment}/${encodeURIComponent(id)}`, "patch", body); }
export async function createMonitoringAssignment(caseId: string, body: CreateAssignmentInput) { await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(caseId)}/assignments`, "post", body); }
export async function updateMonitoringAssignment(id: string, body: { version: number; status: MonitoringOperations["assignments"][number]["status"]; fieldUpdateId?: string; reason: string }) { await governmentRequest(`${apiEndpoints.adminAssignments}/${encodeURIComponent(id)}`, "patch", body); }
export async function createMonitoringOperationalFeature(body: CreateOperationalFeatureInput) { await governmentRequest(apiEndpoints.adminOperationalFeatures, "post", body); }
export async function createMonitoringOperationalUpdate(body: CreateOperationalUpdateInput) { await governmentRequest(apiEndpoints.adminOperationalUpdates, "post", body); }
