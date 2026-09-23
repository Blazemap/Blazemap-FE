import axios, { isAxiosError } from "axios";
import { apiClient } from "@/config/api-client";
import { apiEndpoints, dashboardRefreshMs } from "@/constants";
import { getSharedAccount } from "@/api/dashboard";
import { queryKeys } from "@/api/queryKeys";
import type { DashboardUser, OwnReport, Region, ReportList, ReportPayload, ReportPhoto } from "@/types";

export class ReportError extends Error {
  readonly status: number;
  constructor(status = 0) { super("Private request failed"); this.status = status; }
}
async function request<T>(path: string, signal?: AbortSignal, body?: unknown): Promise<T> {
  try {
    const response = body === undefined ? await apiClient.get<T>(path, { signal }) : await apiClient.post<T>(path, body, { signal });
    return response.data;
  } catch (error) { throw new ReportError(isAxiosError(error) ? error.response?.status : 0); }
}
export async function requireReportAccount(user: DashboardUser, fresh = false) {
  const current = await getSharedAccount(fresh);
  if (current.id !== user.id || current.role !== user.role) throw new ReportError(403);
}
export function reportsQueryOptions(user: DashboardUser, page: number, pageSize = 20) {
  return { queryKey: queryKeys.dashboard.reports(user, page, pageSize), gcTime: 0, refetchInterval: dashboardRefreshMs, queryFn: async ({ signal }: { signal: AbortSignal }) => {
    await requireReportAccount(user);
    const result = await request<ReportList>(`${apiEndpoints.reports}?page=${page}&pageSize=${pageSize}`, signal);
    await requireReportAccount(user);
    signal.throwIfAborted();
    return result;
  } };
}
export function reportQueryOptions(user: DashboardUser, id: string) {
  return { queryKey: queryKeys.dashboard.report(user, id), gcTime: 0, refetchInterval: dashboardRefreshMs, queryFn: async ({ signal }: { signal: AbortSignal }) => {
    await requireReportAccount(user);
    const result = (await request<{ data: OwnReport }>(`${apiEndpoints.reports}/${encodeURIComponent(id)}`, signal)).data;
    await requireReportAccount(user);
    signal.throwIfAborted();
    return result;
  } };
}
export function regionsQueryOptions(search: string) {
  return { queryKey: ["regions", search], queryFn: async ({ signal }: { signal: AbortSignal }) => (await request<{ data: Region[] }>(`${apiEndpoints.regions}?search=${encodeURIComponent(search)}`, signal)).data };
}
export async function createReport(user: DashboardUser, payload: ReportPayload) {
  await requireReportAccount(user);
  const result = (await request<{ data: OwnReport }>(apiEndpoints.reports, undefined, payload)).data;
  if (!result || typeof result.id !== "string" || !result.id || typeof result.number !== "string" || !Number.isFinite(Date.parse(result.createdAt))) throw new ReportError(502);
  return result;
}
export async function addReportUpdate(user: DashboardUser, id: string, message: string, attachmentIds: string[] = []) {
  await requireReportAccount(user);
  const result = await request<{ data: { id: string } }>(`${apiEndpoints.reports}/${encodeURIComponent(id)}/updates`, undefined, { kind: "CLARIFICATION", message: message.trim(), attachmentIds });
  if (!result.data?.id) throw new ReportError(502);
}
export async function uploadPhoto(user: DashboardUser, photo: ReportPhoto, update: (value: Partial<ReportPhoto>) => void): Promise<string> {
  await requireReportAccount(user);
  let id = photo.intentId;
  if (!photo.uploaded) {
    const { data: intent } = await request<{ data: { id: string; uploadUrl: string; method: string; headers: Record<string, string> } }>(`${apiEndpoints.uploads}/intents`, undefined, { filename: photo.file.name, size: photo.file.size, contentType: photo.file.type });
    const url = new URL(intent.uploadUrl);
    if (url.protocol !== "https:" || url.username || url.password || intent.method !== "PUT" || !intent.id) throw new ReportError(502);
    id = intent.id;
    update({ intentId: id, progress: 0 });
    await axios.put(url.href, photo.file, { adapter: "xhr", withCredentials: false, timeout: 120000, headers: intent.headers, onUploadProgress: ({ loaded, total }) => update({ progress: Math.min(99, Math.round(loaded / (total || photo.file.size) * 100)) }) });
    update({ uploaded: true });
  }
  if (!id) throw new ReportError(502);
  const result = await request<{ data: { id: string } }>(`${apiEndpoints.uploads}/${encodeURIComponent(id)}/finalize`, undefined, {});
  if (result.data?.id !== id) throw new ReportError(502);
  update({ id, progress: 100, error: undefined });
  return id;
}
export async function downloadPhotoBlob(user: DashboardUser, id: string, access: "private" | "public", signal?: AbortSignal) {
  signal?.throwIfAborted();
  await requireReportAccount(user, true);
  signal?.throwIfAborted();
  try {
    const path = access === "private" ? `${apiEndpoints.uploads}/${encodeURIComponent(id)}/content` : `/api/public/media/${encodeURIComponent(id)}/content`;
    const response = await apiClient.get<Blob>(path, { signal, responseType: "blob" });
    if (!(response.data instanceof Blob) || !response.data.size || response.data.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(response.data.type)) throw new ReportError(502);
    return response.data;
  } catch (error) { if (error instanceof ReportError) throw error; throw new ReportError(isAxiosError(error) ? error.response?.status : 0); }
}
export async function downloadPhoto(user: DashboardUser, id: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  await requireReportAccount(user, true);
  signal?.throwIfAborted();
  const result = await request<{ data: { url: string } }>(`${apiEndpoints.uploads}/${encodeURIComponent(id)}/download`, signal);
  await requireReportAccount(user, true);
  signal?.throwIfAborted();
  const url = new URL(result.data.url);
  if (url.protocol !== "https:" || url.username || url.password) throw new ReportError(502);
  return url.href;
}
