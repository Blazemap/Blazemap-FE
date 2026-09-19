import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotifications, readAllNotifications, readNotification } from "@/api/notifications";
import { queryKeys } from "@/api/queryKeys";
import type { DashboardUser } from "@/types";

export function useNotifications(user: DashboardUser) {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: queryKeys.dashboard.notifications(user),
    enabled: user.role === "USER",
    gcTime: 0,
    retry: false,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => getNotifications(user, pageParam, signal),
    getNextPageParam: page => page.meta.nextCursor ?? undefined,
  });
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.dashboard.notifications(user) });
  const read = useMutation({ mutationFn: (id: string) => readNotification(user, id), retry: false, onSuccess: invalidate });
  const readAll = useMutation({ mutationFn: () => readAllNotifications(user), retry: false, onSuccess: invalidate });
  const items = Array.from(new Map(query.data?.pages.flatMap(page => page.data).map(item => [item.id, item]) ?? []).values());
  return { ...query, items, unreadCount: query.data?.pages[0]?.meta.unreadCount ?? 0, read, readAll, showMore: () => { if (query.hasNextPage && !query.isFetching) void query.fetchNextPage({ cancelRefetch: false }); } };
}
