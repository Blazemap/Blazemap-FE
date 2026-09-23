import { useEffect, useRef, useState } from "react";
import WarningBanner from "./WarningBanner";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { useCitizenFeed, usePublications } from "@/hooks/dashboard/usePublications";
import { reportStatusLabel } from "@/lib/report-status";
import { ownReportHasActiveMap, publicationHasMap, publicationPath, publicationRevisionLabel } from "@/lib/publications";
import { workspacePath } from "@/lib/dashboard";
import type { DashboardUser } from "@/types";
import { FeedEmpty, FeedRow, FeedRowsSkeleton, FeedSentinel, FeedShell } from "./FeedRow";
import FeedThumbnail from "./FeedThumbnail";
import OwnReportFeedDetail from "./OwnReportFeedDetail";
import { formatTime } from "@/pages/dashboard/utils";

export default function NewsFeed({ user, news = true, hours = 48 }: { user: DashboardUser; news?: boolean; hours?: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [from] = useState(() => new Date(Date.now() - hours * 3600000).toISOString());
  const publicationQuery = usePublications(user, true, news ? undefined : from, news);
  const feedQuery = useCitizenFeed(user, !news);
  const query = news ? publicationQuery : feedQuery;
  const title = news ? "News" : "Feed";
  const items = query.items;
  const scrollRef = useRef<HTMLElement>(null);
  const scrollTop = useRef(0);
  const restored = useRef(false);
  const detailId = news ? null : params.get("feed-report");
  const scrollKey = `blazemap:feed-scroll:${user.id}:${user.role}`;

  useEffect(() => {
    if (news || detailId || restored.current || !scrollRef.current || query.isPending) return;
    const state = location.state as { feedScrollTop?: unknown } | null;
    const stored = sessionStorage.getItem(scrollKey);
    const value = typeof state?.feedScrollTop === "number" ? state.feedScrollTop : stored === null ? scrollTop.current : Number(stored);
    if (!Number.isFinite(value) || value < 0) return;
    restored.current = true;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: value }));
    sessionStorage.removeItem(scrollKey);
  }, [detailId, location.state, news, query.isPending, scrollKey]);

  function rememberScroll() {
    const value = scrollRef.current?.scrollTop ?? 0;
    scrollTop.current = value;
    sessionStorage.setItem(scrollKey, String(value));
    return value;
  }
  function openOwnReport(id: string) {
    rememberScroll();
    setParams(current => { const next = new URLSearchParams(current); next.set("view", "feed"); next.set("feed-report", id); return next; }, { replace: true });
  }
  function closeOwnReport() {
    setParams(current => { const next = new URLSearchParams(current); next.delete("feed-report"); return next; }, { replace: true });
    restored.current = false;
  }
  function openPublication(slug: string) {
    const value = rememberScroll();
    navigate(publicationPath(slug, news ? "news" : "feed"), { state: { feedScrollTop: value } });
  }
  function viewOwnReportOnMap(id: string) {
    navigate(`${workspacePath(user.role)}?report=${encodeURIComponent(id)}`);
  }

  if (detailId) return <OwnReportFeedDetail user={user} id={detailId} onBack={closeOwnReport} onLocate={report => { if (ownReportHasActiveMap(report)) viewOwnReportOnMap(report.id); }} />;

  return <FeedShell title={title} description={news ? "Completed government publications" : "Your reports and published confirmed incidents"} refreshing={query.isFetching} onRefresh={query.retry} scrollRef={scrollRef}>
    {!news && <WarningBanner user={user} />}
    {query.isPending && <FeedRowsSkeleton citizen />}
    {(query.isError || query.forbidden) && <div role="alert" className="text-sm text-gray-600">{query.forbidden ? "Access unavailable. Previous results cleared." : `${title} could not refresh. Earlier results may be out of date.`}<Button variant="outline" disabled={query.isFetching} onClick={query.retry}>Retry</Button></div>}
    {!query.isPending && !query.isError && !query.forbidden && !items.length && <FeedEmpty>{news ? "No completed government publications have been published." : "No reports or published incidents yet."}</FeedEmpty>}
    {items.map(item => {
      if ("kind" in item && item.kind === "OWN_REPORT") return <FeedRow key={`OWN_REPORT:${item.id}`} citizen title={item.description} status={`Your report · ${reportStatusLabel(item)}`} time={formatTime(item.createdAt)} location={item.locationDescription || item.region?.name || "Private report location"} thumbnail={item.coverAttachment ? <FeedThumbnail user={user} access="private" attachment={item.coverAttachment} label={`Photo for your report: ${item.description}`} /> : undefined} onOpen={() => openOwnReport(item.id)} onMap={ownReportHasActiveMap(item) ? () => viewOwnReportOnMap(item.id) : undefined} />;
      if (!("kind" in item) || item.kind === "PUBLICATION") {
        const cover = item.attachments.find(attachment => attachment.contentType.startsWith("image/"));
        return <FeedRow key={`PUBLICATION:${item.id}`} citizen title={item.title} status={`${news ? item.outcome === "DECLINED" ? "Declined outcome" : "Completed incident" : "Published incident"}${publicationRevisionLabel(item) ? ` · ${publicationRevisionLabel(item)}` : ""}`} time={`${item.supersedesId ? "Updated" : "Published"} ${formatTime(item.publishedAt)}`} location={item.regions.map(region => region.name).join(", ") || "Location not published"} thumbnail={cover ? <FeedThumbnail user={user} access="public" attachment={cover} label={`Published photo for ${item.title}`} /> : undefined} onOpen={() => openPublication(item.slug)} onMap={publicationHasMap(item) ? () => navigate(`${workspacePath(user.role)}?publication=${encodeURIComponent(item.slug)}`) : undefined} />;
      }
      return null;
    })}
    {query.isFetchingNextPage && <FeedRowsSkeleton citizen />}
    <FeedSentinel enabled={!!query.hasNextPage && !query.isFetching && !query.isError && !query.forbidden} onLoad={query.loadMore} />
  </FeedShell>;
}
