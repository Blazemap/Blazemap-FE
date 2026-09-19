import { isAxiosError } from "axios";
import { apiClient } from "@/config/api-client";
import { apiEndpoints } from "@/constants";
import type { DashboardUser, NotificationPage } from "@/types";
import { checkDashboardAccount, clearDashboardQueries } from "@/hooks/dashboard/session";

async function guarded<T>(user: DashboardUser, action: (signal: AbortSignal) => Promise<T>, signal = AbortSignal.timeout(20000)) {
  await checkDashboardAccount(user, signal);
  try {
    const result = await action(signal);
    await checkDashboardAccount(user, signal);
    return result;
  } catch (error) {
    signal.throwIfAborted();
    if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) clearDashboardQueries();
    throw error;
  }
}

export function getNotifications(user: DashboardUser, cursor: string | undefined, signal: AbortSignal) {
  return guarded(user, async current => (await apiClient.get<NotificationPage>(apiEndpoints.notifications, { signal: current, params: { pageSize: 10, ...(cursor ? { cursor } : {}) } })).data, signal);
}
export function readNotification(user: DashboardUser, id: string) {
  return guarded(user, async signal => { await apiClient.patch(`${apiEndpoints.notifications}/${encodeURIComponent(id)}/read`, {}, { signal }); });
}
export function readAllNotifications(user: DashboardUser) {
  return guarded(user, async signal => { await apiClient.post(`${apiEndpoints.notifications}/read-all`, {}, { signal }); });
}
