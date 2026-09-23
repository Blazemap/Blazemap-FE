import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addReportUpdate, createReport, reportQueryOptions, reportsQueryOptions, regionsQueryOptions } from "@/api/reports";
import { queryKeys } from "@/api/queryKeys";
import type { DashboardUser, ReportPayload } from "@/types";

export function useQueryGetReports(user: DashboardUser, page: number, pageSize = 20, enabled = true) { return useQuery({ ...reportsQueryOptions(user, page, pageSize), enabled, retry: false }); }
export function useQueryGetReport(user: DashboardUser, id: string) { return useQuery({ ...reportQueryOptions(user, id), retry: false }); }
export function useQueryGetRegions(search: string) { return useQuery({ ...regionsQueryOptions(search), retry: false }); }
export function useMutationCreateReport(user: DashboardUser) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (payload: ReportPayload) => createReport(user, payload), retry: false, gcTime: 0, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.dashboard.reportsAll(user) }) });
}
export function useMutationAddReportUpdate(user: DashboardUser, id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { message: string; attachmentIds: string[] }) => addReportUpdate(user, id, input.message, input.attachmentIds), retry: false, gcTime: 0, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.dashboard.report(user, id) }) });
}
