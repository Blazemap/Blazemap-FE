import { useMutation, useQueryClient, useQuery, type QueryKey } from "@tanstack/react-query";
import { DashboardError, casesQueryOptions, mapQueryOptions, caseEvidenceQueryOptions, confirmCaseLocation } from "@/api/dashboard";
import { dashboardRefreshMs } from "@/constants";
import { AuthError, dashboardLogin } from "@/lib";
import type { CaseFilters, DashboardUser } from "@/types";
import { checkDashboardAccount, clearDashboardQueries } from "./session";

function useDashboardResource<T>(user: DashboardUser, queryKey: QueryKey, load: (context: { signal: AbortSignal }) => Promise<T>, polling = false, enabled = true) {
  const query = useQuery({
    queryKey,
    enabled,
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
        if (error instanceof DashboardError && error.status === 403) return null;
        throw error;
      }
    },
    refetchInterval: polling ? (current) => current.state.fetchStatus === "fetching" ? false : dashboardRefreshMs : false,
  });
  const forbidden = query.data === null || (query.error instanceof AuthError && query.error.status === 401);
  return {
    data: forbidden ? null : query.data ?? null,
    loading: query.isFetching || query.isLoading,
    failed: query.isError || forbidden,
    forbidden,
    receivedAt: query.dataUpdatedAt && query.data !== null ? new Date(query.dataUpdatedAt).toISOString() : null,
    now: Math.max(query.dataUpdatedAt, query.errorUpdatedAt),
    retry: () => { void query.refetch({ cancelRefetch: false }); },
  };
}
export function useQueryGetMap(user: DashboardUser, hours: number) {
  const options = mapQueryOptions(user, hours);
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
