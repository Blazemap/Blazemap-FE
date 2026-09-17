import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addReportUpdate, createReport, reportQueryOptions, reportsQueryOptions, regionsQueryOptions } from "@/api/reports";
import { queryKeys } from "@/api/queryKeys";
import type { DashboardUser, ReportPayload } from "@/types";

export function useQueryGetReports(user: DashboardUser, page: number) { return useQuery({ ...reportsQueryOptions(user, page), retry: false }); }
export function useQueryGetReport(user: DashboardUser, id: string) { return useQuery({ ...reportQueryOptions(user, id), retry: false }); }
export function useQueryGetRegions(search: string) { return useQuery({ ...regionsQueryOptions(search), retry: false }); }
export function useMutationCreateReport(user: DashboardUser) {
  return useMutation({ mutationFn: (payload: ReportPayload) => createReport(user, payload), retry: false, gcTime: 0 });
}
export function useMutationAddReportUpdate(user: DashboardUser, id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (message: string) => addReportUpdate(user, id, message), retry: false, gcTime: 0, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.dashboard.report(user, id) }) });
}
