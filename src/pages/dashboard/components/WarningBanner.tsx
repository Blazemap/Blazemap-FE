import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { publicRequest } from "@/hooks/dashboard/usePublications";
import { nextFeedPage, publicationPath, type FeedPage, type Publication } from "@/lib/publications";
import type { DashboardUser } from "@/types";
import { formatTime } from "@/pages/dashboard/utils";

export default function WarningBanner({ user }: { user: DashboardUser }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const query = useInfiniteQuery({ queryKey: ["dashboard", user.id, user.role, "active-warnings"], gcTime: 0, retry: false, refetchInterval: 30000, initialPageParam: 1, queryFn: ({ signal, pageParam }) => publicRequest<FeedPage<Publication>>(user, "/api/public/information", signal, { type: "WARNING", active: "true", page: pageParam, pageSize: 10 }), getNextPageParam: nextFeedPage });
  const items = query.isError ? [] : (query.data?.pages ?? []).flatMap(page => page.data).filter(item => item.type === "WARNING" && item.status === "PUBLISHED" && !!item.validUntil && Date.parse(item.validUntil) > now);
  if (query.isPending) return <div role="status" aria-label="Loading warning advisories" className="rounded-lg border bg-white p-3"><div aria-hidden="true" className="h-5 w-64 max-w-full rounded bg-secondary motion-safe:animate-pulse" /></div>;
  if (query.isError) return <div role="alert" className="rounded-lg border bg-white p-3 text-sm">Warning advisories could not refresh. <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div>;
  if (!items.length && !query.hasNextPage) return null;
  return <details className="max-h-[40dvh] overflow-auto rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><summary className="min-h-8 cursor-pointer font-extrabold">Active warning advisories · general feed</summary><p className="my-2 text-xs">Check affected regions. Not a personalized alert or evacuation order.</p><ul className="space-y-3">{items.map(item => <li key={item.id}><Link className="font-bold underline" to={publicationPath(item.slug, "feed")}>{item.title}</Link><p>{item.regions.map(r => r.name).join(", ")}</p><p className="text-xs">Valid until {formatTime(item.validUntil!)}</p></li>)}</ul>{query.hasNextPage && <Button variant="outline" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>More warnings</Button>}</details>;
}
