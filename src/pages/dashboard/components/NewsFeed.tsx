import { useState } from "react";
import WarningBanner from "./WarningBanner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { useCitizenFeed, usePublications } from "@/hooks/dashboard/usePublications";
import { reportStatusLabel } from "@/lib/report-status";
import { publicationHasMap, publicationPath } from "@/lib/publications";
import { workspacePath } from "@/lib/dashboard";
import type { DashboardUser } from "@/types";
import { FeedEmpty, FeedRow, FeedRowsSkeleton, FeedSentinel, FeedShell } from "./FeedRow";
import { formatTime } from "@/pages/dashboard/utils";

export default function NewsFeed({ user, news = true, hours = 48 }: { user: DashboardUser; news?: boolean; hours?: number }) {
  const navigate = useNavigate();
  const [from] = useState(() => new Date(Date.now() - hours * 3600000).toISOString());
  const publicationQuery = usePublications(user, true, news ? undefined : from, news);
  const feedQuery = useCitizenFeed(user, !news);
  const query = news ? publicationQuery : feedQuery;
  const title = news ? "News" : "Feed";
  const items = query.items;
  return <FeedShell title={title} description={news ? "Completed government publications" : "Your reports and published confirmed incidents"} refreshing={query.isFetching} onRefresh={query.retry}>
    {!news && <WarningBanner user={user} />}
    {query.isPending && <FeedRowsSkeleton citizen />}
    {(query.isError || query.forbidden) && <div role="alert" className="text-sm text-gray-600">{query.forbidden ? "Access unavailable. Previous results cleared." : `${title} could not refresh. Earlier results may be out of date.`}<Button variant="outline" disabled={query.isFetching} onClick={query.retry}>Retry</Button></div>}
    {!query.isPending && !query.isError && !query.forbidden && !items.length && <FeedEmpty>{news ? "No completed government publications have been published." : "No reports or published incidents yet."}</FeedEmpty>}
    {items.map(item => {
      if ("kind" in item && item.kind === "OWN_REPORT") return <FeedRow key={`OWN_REPORT:${item.id}`} citizen title={item.description} status={`Your report · ${reportStatusLabel(item)}`} time={formatTime(item.createdAt)} location={item.locationDescription || item.region?.name || "Private report location"} onOpen={() => navigate(`/dashboard?panel=my-reports&report=${encodeURIComponent(item.id)}`)} onMap={typeof item.latitude === "number" && typeof item.longitude === "number" ? () => navigate(`/dashboard?panel=my-reports&report=${encodeURIComponent(item.id)}`) : undefined} />;
      if (!("kind" in item) || item.kind === "PUBLICATION") return <FeedRow key={`PUBLICATION:${item.id}`} citizen title={item.title} status={news ? item.outcome === "DECLINED" ? "Declined outcome" : "Completed incident" : "Published incident"} time={formatTime(item.publishedAt)} location={item.regions.map(region => region.name).join(", ") || "Location not published"} onOpen={() => navigate(publicationPath(item.slug, news ? "news" : "feed"))} onMap={publicationHasMap(item) ? () => navigate(`${workspacePath(user.role)}?publication=${encodeURIComponent(item.slug)}`) : undefined} />;
      return null;
    })}
    {query.isFetchingNextPage && <FeedRowsSkeleton citizen />}
    <FeedSentinel enabled={!!query.hasNextPage && !query.isFetching && !query.isError && !query.forbidden} onLoad={query.loadMore} />
  </FeedShell>;
}
