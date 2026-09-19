import { apiEndpoints } from "@/constants";
import type { DashboardUser, MonitoringOperations, MonitoringSummary, MonitoringUser, MonitoringUserPatch, MonitoringUsers, SourceHealth } from "@/types";
import { governmentRequest } from "./government";

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
      byPriority: countRecord(cases.byPriority, ["HIGH", "MEDIUM", "LOW", "UNASSESSED"] as const),
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
  const validStatuses = ["AVAILABLE", "STALE", "NOT_CONFIGURED", "NOT_SYNCED", "UNAVAILABLE", "RUNNING", "SUCCEEDED", "FAILED", "OBSOLETE"];
  const sources = data.sources;
  if (!Array.isArray(sources)) throw new Error("Invalid source status list");
  return {
    database,
    sources: sources.map(value => {
      const source = record(value);
      const id = text(source.id);
      const status = text(source.status);
      if (!["FIRMS", "BMKG", "AI"].includes(id) || !validStatuses.includes(status)) throw new Error("Invalid source status");
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
  return { id: text(user.id), name: text(user.name), email: text(user.email), role, active: user.active === true, emailVerified: user.emailVerified === true, canConfirmIncidents: user.canConfirmIncidents === true, canPublishInformation: user.canPublishInformation === true, createdAt: time(user.createdAt), updatedAt: time(user.updatedAt) };
};
export function parseMonitoringUsers(value: unknown): MonitoringUsers {
  const envelope = record(value);
  const meta = record(envelope.meta);
  if (!Array.isArray(envelope.data)) throw new Error("Invalid user list");
  return { data: envelope.data.map(parseMonitoringUser), meta: { total: count(meta.total), page: count(meta.page), pageSize: count(meta.pageSize) } };
}

export function parseMonitoringOperations(value: unknown): MonitoringOperations {
  const data = record(record(value).data);
  const parseNullable = (value: unknown) => value == null ? null : text(value);
  const parseBoolean = (value: unknown) => { if (typeof value !== "boolean") throw new Error("Invalid monitoring flag"); return value; };
  const version = (value: unknown) => { const result = count(value); if (result < 1) throw new Error("Invalid operation version"); return result; };
  const condition = (value: unknown) => value == null ? null : text(value);
  const observedAt = (value: unknown) => value == null ? null : time(value);
  if (!Array.isArray(data.teams) || !Array.isArray(data.equipment) || !Array.isArray(data.features) || !Array.isArray(data.updates) || !Array.isArray(data.assignments)) throw new Error("Invalid operations response");
  const features = data.features.map(value => {
    const item = record(value), kind = text(item.kind), sample = parseBoolean(item.sample), authoritative = parseBoolean(item.authoritative), verifiedAt = item.verifiedAt == null ? null : time(item.verifiedAt);
    if (!["ROAD", "RIVER", "WATER_SOURCE"].includes(kind) || authoritative !== (!sample && verifiedAt !== null)) throw new Error("Invalid operation feature authority");
    return { id: text(item.id), name: parseNullable(item.name), kind: kind as MonitoringOperations["features"][number]["kind"], provider: text(item.provider), verifiedAt, authoritative, sample, latestCondition: condition(item.latestCondition), latestObservedAt: observedAt(item.latestObservedAt) };
  });
  const counts = record(data.counts);
  return {
    asOf: time(data.asOf),
    teams: data.teams.map(value => { const item = record(value); return { id: text(item.id), name: text(item.name), organization: parseNullable(item.organization), activeAssignmentCount: count(item.activeAssignmentCount), active: parseBoolean(item.active), version: version(item.version), createdAt: time(item.createdAt), updatedAt: time(item.updatedAt), sample: parseBoolean(item.sample), latestCondition: condition(item.latestCondition), latestObservedAt: observedAt(item.latestObservedAt) }; }),
    equipment: data.equipment.map(value => { const item = record(value); return { id: text(item.id), name: text(item.name), kind: text(item.kind), teamId: parseNullable(item.teamId), active: parseBoolean(item.active), version: version(item.version), createdAt: time(item.createdAt), updatedAt: time(item.updatedAt), sample: parseBoolean(item.sample), latestCondition: condition(item.latestCondition), latestObservedAt: observedAt(item.latestObservedAt) }; }),
    features,
    updates: data.updates.map(value => { const item = record(value); const subjectType = text(item.subjectType); if (!["TEAM", "EQUIPMENT", "FEATURE"].includes(subjectType)) throw new Error("Invalid operation subject"); return { id: text(item.id), subjectType: subjectType as MonitoringOperations["updates"][number]["subjectType"], subjectId: text(item.subjectId), condition: text(item.condition), source: text(item.source), observedAt: time(item.observedAt), notes: parseNullable(item.notes), createdAt: time(item.createdAt), sample: parseBoolean(item.sample) }; }),
    assignments: data.assignments.map(value => { const item = record(value); const status = text(item.status); if (!["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) throw new Error("Invalid assignment status"); return { id: text(item.id), caseId: text(item.caseId), caseNumber: text(item.caseNumber), caseTitle: text(item.caseTitle), caseVerification: text(item.caseVerification), caseHandling: text(item.caseHandling), teamId: text(item.teamId), teamName: text(item.teamName), status: status as MonitoringOperations["assignments"][number]["status"], notes: parseNullable(item.notes), version: version(item.version), sample: parseBoolean(item.sample), createdAt: time(item.createdAt), updatedAt: time(item.updatedAt) }; }),
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

export type CreateTeamInput = { name: string; organization: string | null; reason: string; idempotencyKey: string };
export type CreateEquipmentInput = { name: string; kind: string; teamId: string | null; reason: string; idempotencyKey: string };
export type CreateAssignmentInput = { version: number; teamId: string; notes: string; reason: string; idempotencyKey: string };
export type CreateOperationalUpdateInput = { subjectType: "TEAM" | "EQUIPMENT" | "FEATURE"; subjectId: string; condition: string; source: string; observedAt: string; notes: string | null; reason: string; idempotencyKey: string };
export type MonitoringOperationsSection = "teams" | "equipment" | "assignments" | "access-water";
export function monitoringOperationsQueryOptions(user: DashboardUser, section?: MonitoringOperationsSection) {
  const path = section ? `${apiEndpoints.adminOperations}?${new URLSearchParams({ section })}` : apiEndpoints.adminOperations;
  return {
    queryKey: ["dashboard", user.id, user.role, "monitoring-operations", section ?? "all"] as const,
    queryFn: async ({ signal }: { signal: AbortSignal }) => parseMonitoringOperations(await governmentRequest(path, "get", undefined, signal)),
  };
}
export async function createMonitoringTeam(body: CreateTeamInput) { await governmentRequest(apiEndpoints.adminTeams, "post", body); }
export async function updateMonitoringTeam(id: string, body: { version: number; name?: string; organization?: string | null; active?: boolean; reason: string }) { await governmentRequest(`${apiEndpoints.adminTeams}/${encodeURIComponent(id)}`, "patch", body); }
export async function createMonitoringEquipment(body: CreateEquipmentInput) { await governmentRequest(apiEndpoints.adminEquipment, "post", body); }
export async function updateMonitoringEquipment(id: string, body: { version: number; name?: string; kind?: string; teamId?: string | null; active?: boolean; reason: string }) { await governmentRequest(`${apiEndpoints.adminEquipment}/${encodeURIComponent(id)}`, "patch", body); }
export async function createMonitoringAssignment(caseId: string, body: CreateAssignmentInput) { await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(caseId)}/assignments`, "post", body); }
export async function updateMonitoringAssignment(id: string, body: { version: number; status: MonitoringOperations["assignments"][number]["status"]; reason: string }) { await governmentRequest(`${apiEndpoints.adminAssignments}/${encodeURIComponent(id)}`, "patch", body); }
export async function createMonitoringOperationalUpdate(body: CreateOperationalUpdateInput) { await governmentRequest(apiEndpoints.adminOperationalUpdates, "post", body); }
