import { useEffect } from "react";
import WarningNotice from "./WarningNotice";
import { useQuery } from "@tanstack/react-query";
import { Link, useLoaderData, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { WorkspaceNav } from "@/components/common";
import { Button } from "@/components/ui";
import { publicRequest } from "@/hooks/dashboard/usePublications";
import { useDashboardSession } from "@/hooks/dashboard";
import { publicationHasMap, publicationPath, publicationRevisionLabel, type Publication } from "@/lib/publications";
import { parseRichText, RichTextRenderer } from "@/lib/rich-text";
import { workspacePath } from "@/lib/dashboard";
import type { DashboardUser } from "@/types";
import { FeedFoliage, FeedRowsSkeleton } from "./FeedRow";
import PublishedPhotos from "./PublishedPhotos";
import { formatTime } from "@/pages/dashboard/utils";

export function usePublication(user: DashboardUser, slug: string | null) {
  return useQuery<Publication>({ queryKey: ["dashboard", user.id, user.role, "publication", slug], enabled: !!slug, gcTime: 60_000, staleTime: 30_000, retry: false, refetchInterval: 30000, queryFn: async ({ signal }) => {
    const result = await publicRequest<{ data: Publication }>(user, `/api/public/information/${encodeURIComponent(slug!)}`, signal);
    if (result.data.slug !== slug || !["PUBLISHED", "SUPERSEDED", "WITHDRAWN"].includes(result.data.status)) throw new Error("Publication unavailable");
    return { ...result.data, bodyRich: result.data.bodyRich ? parseRichText(result.data.bodyRich) : null };
  } });
}
export default function PublicationPage() {
  const user = useLoaderData() as DashboardUser;
  const { signingOut } = useDashboardSession(user);
  const { slug } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const origin = params.get("from") === "news" ? "news" : "feed";
  const returnState = typeof (location.state as { feedScrollTop?: unknown } | null)?.feedScrollTop === "number" ? location.state : undefined;
  const query = usePublication(user, slug ?? null);
  const item = query.isError || signingOut ? null : query.data;
  useEffect(() => { document.title = item ? `${item.title} — Blazemap` : "Published information — Blazemap"; }, [item]);
  return <main className="relative min-h-dvh bg-white text-forest"><WorkspaceNav user={user} /><FeedFoliage /><section className="relative mx-auto max-w-2xl px-4 pb-24 pt-56 sm:pt-28"><Link to={`${workspacePath(user.role)}?view=${origin}`} state={returnState} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold"><ArrowLeft size={16} aria-hidden="true" />Back to {origin === "news" ? "News" : "feed"}</Link>{(query.isPending || signingOut) && <FeedRowsSkeleton citizen />}{query.isError && <div role="alert" className="space-y-3"><p>This publication is unavailable or could not be loaded.</p><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry</Button></div>}{item && <article className="space-y-5 rounded-sm border border-primary/10 bg-white p-5 shadow-sm"><h1 className="text-2xl font-extrabold">{item.title}</h1>{item.type === "WARNING" && <WarningNotice item={item} />}<p className="text-sm font-bold">{item.outcome === "DECLINED" ? "Declined" : item.outcome === "CONFIRMED" ? "Confirmed" : "Published"}{publicationRevisionLabel(item) ? ` · ${publicationRevisionLabel(item)}` : ""}</p>{item.supersedesId && <p className="rounded-lg bg-secondary p-3 text-sm">This publication updates an earlier News version.</p>}{item.status === "SUPERSEDED" && item.replacements[0] && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">This version has been superseded. <Link className="font-bold underline" to={publicationPath(item.replacements[0].slug, origin)}>View the latest update</Link>.</p>}{item.outcome === "DECLINED" && <p className="text-sm">Report disposition only. This does not establish that no fire occurred.</p>}<p className="text-sm text-muted-foreground">{item.supersedesId ? "Updated" : "Published"} {formatTime(item.publishedAt)} · {item.regions.map(region => region.name).join(", ") || "Location not published"}</p><p className="font-bold">{item.summary}</p><RichTextRenderer document={item.bodyRich ?? null} fallback={item.body} />{item.status === "PUBLISHED" && !item.expired && item.attachments.some(photo => photo.contentType.startsWith("image/")) && <PublishedPhotos user={user} title={item.title} photos={item.attachments.filter(photo => photo.contentType.startsWith("image/"))} />}<section aria-label="Approved sources"><h2 className="font-extrabold">Sources</h2><ul className="mt-2 space-y-2">{item.sources.map((source, index) => <li key={index}>{/^https?:\/\//.test(source.url) ? <a className="underline" href={source.url} target="_blank" rel="noreferrer noopener">{source.title}</a> : source.title}</li>)}</ul></section>{item.authorityReference && <p className="text-sm">Publication authority: {item.authorityReference}</p>}<section aria-label="Publication history"><h2 className="font-extrabold">Publication history</h2><p className="mt-2 text-sm">Updated {formatTime(item.updatedAt)}</p>{item.expired && <p className="text-sm">This publication has expired.</p>}{item.supersedesId && <p className="text-sm">Replaces an earlier publication.</p>}{item.withdrawalReason && <p className="text-sm">Withdrawal reason: {item.withdrawalReason}</p>}{item.replacements.map(replacement => <Link key={replacement.id} className="block min-h-11 py-3 text-sm underline" to={publicationPath(replacement.slug, origin)}>Replacement publication ({replacement.status.toLowerCase()})</Link>)}</section>{publicationHasMap(item) ? <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-bold" to={`${workspacePath(user.role)}?publication=${encodeURIComponent(item.slug)}`}><MapPin size={16} aria-hidden="true" />View on map</Link> : <p className="text-sm text-muted-foreground">No approved map location available.</p>}</article>}</section></main>;
}
