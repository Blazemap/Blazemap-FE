import { apiClient } from "@/config/api-client";
import { apiEndpoints } from "@/constants";
import { getSharedAccount } from "@/api/dashboard";
import { AuthError } from "@/lib";
import type { DashboardUser } from "@/types";

async function requireOwner(user: DashboardUser, signal: AbortSignal) {
  const current = await getSharedAccount();
  signal.throwIfAborted();
  if (current.id !== user.id || current.role !== user.role) throw new AuthError("ACCOUNT_CHANGED", 403);
}
export async function getAvatar(user: DashboardUser, signal: AbortSignal): Promise<Blob> {
  await requireOwner(user, signal);
  const response = await apiClient.get<Blob>(`${apiEndpoints.profile}/${encodeURIComponent(user.id)}/avatar`, { signal, responseType: "blob" });
  await requireOwner(user, signal);
  if (!(response.data instanceof Blob) || response.data.type !== "image/jpeg" || response.data.size > 1048576) throw new AuthError("INVALID_RESPONSE", 502);
  return response.data;
}
export async function saveAvatar(user: DashboardUser, blob: Blob, signal: AbortSignal): Promise<DashboardUser> {
  if (blob.type !== "image/jpeg" || !blob.size || blob.size > 1048576) throw new AuthError("INVALID_AVATAR", 400);
  await requireOwner(user, signal);
  const result = await apiClient.post<{ data: { image: string } }>(`${apiEndpoints.profile}/${encodeURIComponent(user.id)}/avatar`, blob, { signal, headers: { "Content-Type": "image/jpeg" } });
  const current = await getSharedAccount(true);
  signal.throwIfAborted();
  if (current.id !== user.id || current.role !== user.role) throw new AuthError("ACCOUNT_CHANGED", 403);
  if (!current.image || current.image !== result.data.data.image) throw new AuthError("PROFILE_NOT_CONFIRMED", 502);
  return current;
}
