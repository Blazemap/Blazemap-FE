import { useInfiniteQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { apiClient } from "@/config/api-client";
import { AuthError } from "@/lib";
import { feedPageSize, nextFeedPage, uniqueFeedItems, type CitizenFeedItem, type FeedPage, type Publication } from "@/lib/publications";
import { queryKeys } from "@/api/queryKeys";
import { apiEndpoints, dashboardRefreshMs } from "@/constants";
import type { DashboardUser } from "@/types";
import { checkDashboardAccount, clearDashboardQueries } from "./session";

export async function publicRequest<T>(user: DashboardUser, path: string, signal: AbortSignal, params?: Record<string, string | number>) {
  await checkDashboardAccount(user, signal);
  try {
    const result = (await apiClient.get<T>(path, { params, signal })).data;
    await checkDashboardAccount(user, signal);
    return result;
  } catch (error) {
    signal.throwIfAborted();
    if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) clearDashboardQueries();
    await checkDashboardAccount(user, signal);
    throw error;
  }
}
export function useCitizenFeed(user: DashboardUser, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.dashboard.feed(user),
    enabled: user.role === "USER" && enabled,
    gcTime: 300_000,
    staleTime: 30_000,
    refetchInterval: dashboardRefreshMs,
    retry: false,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => publicRequest<FeedPage<CitizenFeedItem>>(user, apiEndpoints.feed, signal, { page: pageParam, pageSize: feedPageSize }),
    getNextPageParam: nextFeedPage,
  });
  const forbidden = query.data === null || query.error instanceof AuthError || (isAxiosError(query.error) && [401, 403].includes(query.error.response?.status ?? 0));
  const items = forbidden ? [] : Array.from(new Map((query.data?.pages ?? []).flatMap(page => page.data).map(item => [`${item.kind}:${item.id}`, item])).values());
  return { ...query, items, forbidden, loadMore: () => { if (!forbidden && query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage({ cancelRefetch: false }); }, retry: () => { if (!query.isFetching) void (query.isFetchNextPageError ? query.fetchNextPage({ cancelRefetch: false }) : query.refetch({ cancelRefetch: false })); } };
}

export function usePublications(user: DashboardUser, news: boolean, from?: string, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: ["dashboard", user.id, user.role, "publications", news, from],
    enabled,
    gcTime: 300_000,
    staleTime: 30_000,
    retry: false,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => publicRequest<FeedPage<Publication>>(user, "/api/public/information", signal, { page: pageParam, pageSize: feedPageSize, ...(news ? { news: "true" } : { feed: "true", ...(from ? { from } : {}) }) }),
    getNextPageParam: nextFeedPage,
  });
  const forbidden = query.data === null || query.error instanceof AuthError || (isAxiosError(query.error) && [401, 403].includes(query.error.response?.status ?? 0));
  const items = forbidden ? [] : uniqueFeedItems(query.data?.pages ?? []);
  return { ...query, items, forbidden, loadMore: () => { if (!forbidden && query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage({ cancelRefetch: false }); }, retry: () => { if (!query.isFetching) void (query.isFetchNextPageError ? query.fetchNextPage({ cancelRefetch: false }) : query.refetch({ cancelRefetch: false })); } };
}
