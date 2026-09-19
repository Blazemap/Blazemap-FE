import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthError, dashboardLogin } from "@/lib";
import { DashboardError } from "@/api/dashboard";
import { GovernmentError, getCaseDetail, getGovernmentReport, getGovernmentReports } from "@/api/dashboard/government";
import { queryKeys } from "@/api/queryKeys";
import type { DashboardUser } from "@/types";
import { checkDashboardAccount, clearDashboardQueries } from "./session";
import { useDashboardResource } from "./useDashboardResource";

async function load<T>(request: () => Promise<T>) {
  try { return await request(); }
  catch (error) { if (error instanceof GovernmentError && [401, 403].includes(error.status)) throw new DashboardError(error.status); throw error; }
}
export function useGovernmentReports(user: DashboardUser, search: string, status: string, pageSize = 20) {
  const query = useInfiniteQuery({
    queryKey: ["dashboard", user.id, user.role, "government-reports", search, status, pageSize],
    enabled: user.role === "ADMIN",
    gcTime: 0,
    retry: false,
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const authorize = async () => {
        try { await checkDashboardAccount(user, signal); }
        catch (error) { signal.throwIfAborted(); clearDashboardQueries(); throw error; }
      };
      await authorize();
      try {
        const result = await load(() => getGovernmentReports(pageParam, search, status, signal, pageSize));
        await authorize();
        return result;
      } catch (error) {
        signal.throwIfAborted();
        if (error instanceof DashboardError && [401, 403].includes(error.status)) {
          clearDashboardQueries();
          if (error.status === 401) window.location.replace(dashboardLogin(user.role));
          throw error;
        }
        await authorize();
        throw error;
      }
    },
    getNextPageParam: last => last.data.length > 0 && last.meta.page * last.meta.pageSize < last.meta.total ? last.meta.page + 1 : undefined,
  });
  const forbidden = user.role !== "ADMIN" || query.data === null ||
    (query.error instanceof DashboardError && [401, 403].includes(query.error.status)) ||
    (query.error instanceof AuthError && (query.error.status === 401 || query.error.code === "EMAIL_NOT_VERIFIED"));
  const pages = forbidden ? undefined : query.data?.pages;
  const last = pages?.at(-1);
  const data = last ? { data: Array.from(new Map(pages!.flatMap(page => page.data).map(item => [item.id, item])).values()), meta: last.meta } : null;
  return {
    data,
    loading: query.isFetching,
    initialLoading: query.isPending && !data,
    loadingMore: query.isFetchingNextPage,
    failed: query.isError || forbidden,
    forbidden,
    hasMore: !!data?.data.length && query.hasNextPage && !forbidden,
    showMore: () => { if (!forbidden && data?.data.length && query.hasNextPage && !query.isFetching) void query.fetchNextPage({ cancelRefetch: false }); },
    retry: () => { if (user.role === "ADMIN") void query.refetch({ cancelRefetch: false }); },
  };
}
export function useGovernmentReport(user: DashboardUser, id: string | null) {
  return useDashboardResource(user, ["dashboard", user.id, user.role, "government-report", id], ({ signal }) => load(() => getGovernmentReport(id!, signal)), true, user.role === "ADMIN" && !!id);
}
export function useGovernmentCase(user: DashboardUser, id: string) {
  return useDashboardResource(user, queryKeys.dashboard.case(user, id), ({ signal }) => load(() => getCaseDetail(id, signal)), true, user.role === "ADMIN" && !!id);
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
