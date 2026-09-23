import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { downloadPhotoBlob } from "@/api/reports";
import type { DashboardUser } from "@/types";

export default function FeedThumbnail({ user, attachment, access, label }: { user: DashboardUser; attachment: { id: string; filename: string }; access: "private" | "public"; label: string }) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["dashboard", user.id, user.role, "feed-thumbnail-content", access, attachment.id],
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => downloadPhotoBlob(user, attachment.id, access, signal),
  });
  const url = useMemo(() => query.data ? URL.createObjectURL(query.data) : null, [query.data]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const loaded = !!url && loadedUrl === url;
  const imageError = !!url && failedUrl === url;
  return <div className="relative aspect-video w-full overflow-hidden border-y border-primary/10 bg-secondary">
    {(!url || !loaded) && !query.isError && !imageError && <div role="status" aria-label={`Loading ${label}`} className="absolute inset-0 motion-safe:animate-pulse" />}
    {url && !imageError && <img src={url} alt={label} onLoad={() => setLoadedUrl(url)} onError={() => setFailedUrl(url)} className={`absolute inset-0 h-full w-full object-cover ${loaded ? "" : "invisible"}`} />}
    {(query.isError || imageError) && <div className="absolute inset-0 grid place-items-center gap-2 px-4 text-center"><p role="status" className="text-xs font-semibold text-muted-foreground">Photo unavailable</p><button type="button" className="text-xs font-bold text-primary underline" onClick={() => { setFailedUrl(null); void query.refetch(); }}>Retry</button></div>}
  </div>;
}
