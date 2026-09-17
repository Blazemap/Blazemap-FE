import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAvatar, saveAvatar } from "@/api/profile";
import { queryKeys } from "@/api/queryKeys";
import type { DashboardUser } from "@/types";
import { avatarSource, uploadedAvatar } from "@/lib/avatar";

export function useAvatar(user: DashboardUser) {
  const query = useQuery({ queryKey: queryKeys.dashboard.avatar(user), queryFn: ({ signal }) => getAvatar(user, signal), enabled: uploadedAvatar(user.image), gcTime: 0, staleTime: 60000, retry: false });
  const [preview, setPreview] = useState<{ blob: Blob; url: string }>();
  useEffect(() => {
    if (!query.data) return;
    const blob = query.data;
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => setPreview({ blob, url });
    image.src = url;
    return () => { image.onload = null; image.src = ""; URL.revokeObjectURL(url); };
  }, [query.data]);
  return { ...query, url: avatarSource(user.image, !query.isError && preview?.blob === query.data ? preview?.url : undefined) };
}
export function useMutationSaveAvatar(user: DashboardUser) {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ blob, signal }: { blob: Blob; signal: AbortSignal }) => saveAvatar(user, blob, signal), retry: false, gcTime: 0, onSuccess: async updated => {
    await Promise.all([queryKeys.account, queryKeys.dashboard.session(user), queryKeys.dashboard.guard(user)].map(queryKey => client.cancelQueries({ queryKey })));
    client.setQueryData(queryKeys.account, updated);
    client.setQueryData(queryKeys.dashboard.session(user), updated);
    client.setQueryData(queryKeys.dashboard.guard(user), updated);
    await client.invalidateQueries({ queryKey: ["dashboard", user.id, user.role, "avatar"] });
  } });
}
