import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardError } from "@/api/dashboard";
import { GovernmentError, getCaseDetail, getGovernmentReports } from "@/api/dashboard/government";
import { queryKeys } from "@/api/queryKeys";
import type { DashboardUser } from "@/types";
import { checkDashboardAccount, clearDashboardQueries } from "./session";
import { useDashboardResource } from "./useDashboardResource";

async function load<T>(request: () => Promise<T>) {
  try { return await request(); }
  catch (error) { if (error instanceof GovernmentError && [401, 403].includes(error.status)) throw new DashboardError(error.status); throw error; }
}
export function useGovernmentReports(user: DashboardUser, page: number, search: string, status: string) {
  return useDashboardResource(user, ["dashboard", user.id, user.role, "government-reports", page, search, status], ({ signal }) => load(() => getGovernmentReports(page, search, status, signal)), false, user.role === "ADMIN");
}
export function useGovernmentCase(user: DashboardUser, id: string) {
  return useDashboardResource(user, queryKeys.dashboard.case(user, id), ({ signal }) => load(() => getCaseDetail(id, signal)), true, user.role === "ADMIN");
}
export function useGovernmentMutation<T, R>(user: DashboardUser, action: (input: T) => Promise<R>, capability?: "canConfirmIncidents" | "canPublishInformation") {
  const client = useQueryClient();
  return useMutation({ retry: false, mutationFn: async (input: T) => {
    const current = await checkDashboardAccount(user, AbortSignal.timeout(20000));
    if (current.role !== "ADMIN" || (capability && !current[capability])) throw new GovernmentError("Your current account lacks this capability.", 403);
    return action(input);
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ["dashboard", user.id, user.role] }); }, onError: error => {
    if (error instanceof GovernmentError && [401, 403].includes(error.status)) clearDashboardQueries();
  } });
}
