import { useMutation, useQueryClient, useQuery, type QueryKey } from "@tanstack/react-query";
import { DashboardError, casesQueryOptions, mapQueryOptions, caseEvidenceQueryOptions, confirmCaseLocation, monitoringSummaryQueryOptions, sourceHealthQueryOptions, monitoringUsersQueryOptions, monitoringUserQueryOptions, monitoringOperationsQueryOptions, monitoringTeamQueryOptions, monitoringEquipmentQueryOptions, monitoringAssignmentQueryOptions, monitoringFeatureQueryOptions, type MonitoringUserFilters } from "@/api/dashboard";
import { dashboardRefreshMs } from "@/constants";
import { AuthError, dashboardLogin } from "@/lib";
import type { CaseFilters, DashboardUser } from "@/types";
import { checkDashboardAccount, clearDashboardQueries } from "./session";

export function useDashboardResource<T>(user: DashboardUser, queryKey: QueryKey, load: (context: { signal: AbortSignal }) => Promise<T>, polling = false, enabled = true) {
  const query = useQuery({
    queryKey,
    enabled,
    gcTime: queryKey[3] === "map" ? 5 * 60_000 : 0,
    queryFn: async ({ signal }) => {
      await checkDashboardAccount(user, signal);
      try {
        const data = await load({ signal });
        await checkDashboardAccount(user, signal);
        return data;
      } catch (error) {
        signal.throwIfAborted();
        if (error instanceof DashboardError && error.status === 401) {
          clearDashboardQueries();
          window.location.replace(dashboardLogin(user.role));
        }
        if (error instanceof DashboardError && error.status === 403) { clearDashboardQueries(); return null; }
        throw error;
      }
    },
    refetchInterval: polling ? (current) => current.state.fetchStatus === "fetching" ? false : dashboardRefreshMs : false,
  });
  const forbidden = query.data === null || (query.error instanceof AuthError && query.error.status === 401);
  const data = forbidden ? null : query.data ?? null;
  return {
    data,
    loading: query.isFetching,
    initialLoading: query.isPending && !data,
    refreshing: query.isFetching && !!data,
    failed: query.isError || forbidden,
    forbidden,
    receivedAt: query.dataUpdatedAt && query.data !== null ? new Date(query.dataUpdatedAt).toISOString() : null,
    now: Math.max(query.dataUpdatedAt, query.errorUpdatedAt),
    retry: () => { void query.refetch({ cancelRefetch: false }); },
  };
}
export function useQueryGetMap(user: DashboardUser, hours: number, caseStatus: "active" | "closed" | "all" = "active") {
  const options = mapQueryOptions(user, hours, caseStatus);
  return useDashboardResource(user, options.queryKey, options.queryFn, true);
}
export function useCaseLocation(user: DashboardUser, id: string) {
  const client = useQueryClient();
  const options = caseEvidenceQueryOptions(user, id);
  const evidence = useDashboardResource(user, options.queryKey, options.queryFn, false, user.role === "ADMIN" && user.canConfirmIncidents === true);
  const mutation = useMutation({ mutationFn: async (body: { version: number; fieldUpdateId: string; reason: string; authorityReference: string }) => {
    const current = await checkDashboardAccount(user, AbortSignal.timeout(20000));
    await confirmCaseLocation(current, id, body);
  }, retry: false, onSuccess: async () => { await client.invalidateQueries({ queryKey: ["dashboard", user.id, user.role] }); } });
  return { evidence, mutation };
}
export function useQueryGetCases(user: DashboardUser, filters: CaseFilters) {
  const options = casesQueryOptions(user, filters);
  return useDashboardResource(user, options.queryKey, options.queryFn, false, user.role === "ADMIN");
}
export function useMonitoringSummary(user: DashboardUser) {
  const options = monitoringSummaryQueryOptions(user);
  return useDashboardResource(user, options.queryKey, options.queryFn, true, user.role === "ADMIN");
}
export function useSourceHealth(user: DashboardUser) {
  const options = sourceHealthQueryOptions(user);
  return useDashboardResource(user, options.queryKey, options.queryFn, true, user.role === "ADMIN");
}
export function useMonitoringUsers(user: DashboardUser, filters: MonitoringUserFilters = { page: 1, search: "", role: "", active: "", emailVerified: "" }) {
  const options = monitoringUsersQueryOptions(user, filters);
  return useDashboardResource(user, options.queryKey, options.queryFn, false, user.role === "ADMIN");
}
export function useMonitoringUser(user: DashboardUser, id: string) {
  const options = monitoringUserQueryOptions(user, id);
  return useDashboardResource(user, options.queryKey, options.queryFn, false, user.role === "ADMIN" && !!id);
}
export function useMonitoringTeams(user: DashboardUser) {
  const options = monitoringOperationsQueryOptions(user, "teams");
  return useDashboardResource(user, options.queryKey, options.queryFn, true, user.role === "ADMIN");
}
export function useMonitoringEquipment(user: DashboardUser) {
  const options = monitoringOperationsQueryOptions(user, "equipment");
  return useDashboardResource(user, options.queryKey, options.queryFn, true, user.role === "ADMIN");
}
export function useMonitoringAssignments(user: DashboardUser) {
  const options = monitoringOperationsQueryOptions(user, "assignments");
  return useDashboardResource(user, options.queryKey, options.queryFn, true, user.role === "ADMIN");
}
export function useMonitoringAccessWater(user: DashboardUser) {
  const options = monitoringOperationsQueryOptions(user, "access-water");
  return useDashboardResource(user, options.queryKey, options.queryFn, true, user.role === "ADMIN");
}
export function useMonitoringOperations(user: DashboardUser) {
  const options = monitoringOperationsQueryOptions(user);
  return useDashboardResource(user, options.queryKey, options.queryFn, true, user.role === "ADMIN");
}
export function useMonitoringTeam(user: DashboardUser, id: string) { const options = monitoringTeamQueryOptions(user, id); return useDashboardResource(user, options.queryKey, options.queryFn, false, user.role === "ADMIN" && !!id); }
export function useMonitoringEquipmentDetail(user: DashboardUser, id: string) { const options = monitoringEquipmentQueryOptions(user, id); return useDashboardResource(user, options.queryKey, options.queryFn, false, user.role === "ADMIN" && !!id); }
export function useMonitoringAssignment(user: DashboardUser, id: string) { const options = monitoringAssignmentQueryOptions(user, id); return useDashboardResource(user, options.queryKey, options.queryFn, false, user.role === "ADMIN" && !!id); }
export function useMonitoringFeature(user: DashboardUser, id: string) { const options = monitoringFeatureQueryOptions(user, id); return useDashboardResource(user, options.queryKey, options.queryFn, false, user.role === "ADMIN" && !!id); }
