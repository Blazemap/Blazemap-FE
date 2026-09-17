import { isAxiosError } from "axios";
import { apiClient } from "@/config/api-client";
import { apiEndpoints } from "@/constants";
import { queryKeys } from "@/api/queryKeys";
import type { CaseEvidence, CaseFilters, DashboardUser } from "@/types";
import { parseCases, parseMap } from "./parse";

export class DashboardError extends Error {
  readonly status: number;
  constructor(status = 0) { super("Dashboard request unavailable"); this.status = status; }
}
async function request(path: string, signal: AbortSignal, params: URLSearchParams): Promise<unknown> {
  try {
    const response = await apiClient.get<unknown>(path, { signal, params });
    return response.data;
  } catch (error) {
    signal.throwIfAborted();
    throw new DashboardError(isAxiosError(error) ? error.response?.status : 0);
  }
}
export function mapQueryOptions(user: DashboardUser, hours: number) {
  return { queryKey: queryKeys.dashboard.map(user, hours), queryFn: async ({ signal }: { signal: AbortSignal }) => {
    if (![24, 48, 168].includes(hours)) throw new DashboardError();
    const to = new Date();
    const params = new URLSearchParams({ from: new Date(to.getTime() - hours * 3600000).toISOString(), to: to.toISOString() });
    return parseMap(await request(apiEndpoints.map, signal, params));
  } };
}
export function caseEvidenceQueryOptions(user: DashboardUser, id: string) {
  return { queryKey: queryKeys.dashboard.case(user, id), queryFn: async ({ signal }: { signal: AbortSignal }): Promise<CaseEvidence> => {
    if (user.role !== "ADMIN") throw new DashboardError(403);
    const response = await apiClient.get<{ data: CaseEvidence }>(`${apiEndpoints.cases}/${encodeURIComponent(id)}`, { signal });
    const value = response.data.data;
    if (value.id !== id || !Number.isInteger(value.version) || value.version < 1 || !Array.isArray(value.fieldUpdates)) throw new DashboardError(502);
    return { id: value.id, version: value.version, fieldUpdates: value.fieldUpdates.filter(field => field.findings === "VISIBLE_FIRE" && typeof field.id === "string" && Number.isFinite(Date.parse(field.observedAt)) && typeof field.latitude === "number" && Math.abs(field.latitude) <= 90 && typeof field.longitude === "number" && Math.abs(field.longitude) <= 180).map(field => ({ id: field.id, findings: field.findings, observedAt: field.observedAt, latitude: field.latitude, longitude: field.longitude })) };
  } };
}
export async function confirmCaseLocation(user: DashboardUser, id: string, body: { version: number; fieldUpdateId: string; reason: string; authorityReference: string }) {
  if (user.role !== "ADMIN" || !user.canConfirmIncidents) throw new DashboardError(403);
  try {
    const response = await apiClient.post<{ data: { id: string; version: number } }>(`${apiEndpoints.cases}/${encodeURIComponent(id)}/verify`, { ...body, outcome: "CONFIRMED_FIRE" });
    if (response.data.data.id !== id || response.data.data.version <= body.version) throw new DashboardError(502);
  } catch (error) { throw error instanceof DashboardError ? error : new DashboardError(isAxiosError(error) ? error.response?.status : 0); }
}
export function casesQueryOptions(user: DashboardUser, filters: CaseFilters) {
  return { queryKey: queryKeys.dashboard.cases(user, filters), enabled: user.role === "ADMIN", queryFn: async ({ signal }: { signal: AbortSignal }) => {
    if (user.role !== "ADMIN") throw new DashboardError(403);
    const { query, verification, priority, page } = filters;
    if (!Number.isInteger(page) || page < 1 || query.length > 200 || !["", "UNVERIFIED", "CONFIRMED_FIRE", "NOT_FIRE"].includes(verification) || !["", "HIGH", "MEDIUM", "LOW", "UNASSESSED"].includes(priority)) throw new DashboardError();
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (query) params.set("search", query);
    if (verification) params.set("verificationStatus", verification);
    if (priority) params.set("priority", priority);
    return parseCases(await request(apiEndpoints.cases, signal, params));
  } };
}
