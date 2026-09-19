import WarningNotice from "./WarningNotice";
import { useQuery } from "@tanstack/react-query";
import { Link, useLoaderData, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { WorkspaceNav } from "@/components/common";
import { Button } from "@/components/ui";
import { publicRequest } from "@/hooks/dashboard/usePublications";
import { useDashboardSession } from "@/hooks/dashboard";
import { publicationHasMap, publicationPath, type Publication } from "@/lib/publications";
import { workspacePath } from "@/lib/dashboard";
import type { DashboardUser } from "@/types";
import { FeedFoliage, FeedRowsSkeleton } from "./FeedRow";
import { formatTime } from "@/pages/dashboard/utils";

export function usePublication(user: DashboardUser, slug: string | null) {
  return useQuery<Publication>({ queryKey: ["dashboard", user.id, user.role, "publication", slug], enabled: !!slug, gcTime: 0, retry: false, refetchInterval: query => query.state.data?.type === "WARNING" ? 30000 : false, queryFn: async ({ signal }) => {
    const result = await publicRequest<{ data: Publication }>(user, `/api/public/information/${encodeURIComponent(slug!)}`, signal);
    if (result.data.slug !== slug || !["PUBLISHED", "SUPERSEDED", "WITHDRAWN"].includes(result.data.status)) throw new Error("Publication unavailable");
    return result.data;
  } });
}
function PublishedPhoto({ user, photo }: { user: DashboardUser; photo: Publication["attachments"][number] }) {
  const query = useQuery({ queryKey: ["dashboard", user.id, user.role, "public-media", photo.id], gcTime: 0, retry: false, queryFn: async ({ signal }) => (await publicRequest<{ data: { url: string } }>(user, `/api/public/media/${encodeURIComponent(photo.id)}`, signal)).data.url });
  if (query.isPending) return <div role="status" aria-label="Loading published photo" className="aspect-video animate-pulse bg-secondary" />;
  if (query.isError || !query.data || !/^https?:\/\//.test(query.data)) return <p className="text-sm text-muted-foreground">Published photo unavailable.</p>;
  return <img src={query.data} alt={photo.filename} className="max-h-96 w-full rounded-sm object-contain" loading="lazy" />;
}
export default function PublicationPage() {
  const user = useLoaderData() as DashboardUser;
  const { signingOut } = useDashboardSession(user);
  const { slug } = useParams();
  const [params] = useSearchParams();
  const origin = params.get("from") === "news" ? "news" : "feed";
  const query = usePublication(user, slug ?? null);
  const item = query.isError || signingOut ? null : query.data;
  return <main className="relative min-h-dvh bg-white text-forest"><WorkspaceNav user={user} /><FeedFoliage /><section className="relative mx-auto max-w-2xl px-4 pb-24 pt-56 sm:pt-28"><Link to={`${workspacePath(user.role)}?view=${origin}`} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold"><ArrowLeft size={16} aria-hidden="true" />Back to {origin === "news" ? "News" : "feed"}</Link>{(query.isPending || signingOut) && <FeedRowsSkeleton citizen />}{query.isError && <div role="alert" className="space-y-3"><p>This publication is unavailable or could not be loaded.</p><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry</Button></div>}{item && <article className="space-y-5 rounded-sm border border-primary/10 bg-white p-5 shadow-sm"><h1 className="text-2xl font-extrabold">{item.title}</h1>{item.type === "WARNING" && <WarningNotice item={item} />}<p className="text-sm font-bold">{item.outcome === "DECLINED" ? "Declined" : item.outcome === "CONFIRMED" ? "Confirmed" : "Published"} · {item.status.toLowerCase()}</p>{item.outcome === "DECLINED" && <p className="text-sm">Report disposition only. This does not establish that no fire occurred.</p>}<p className="text-sm text-muted-foreground">Published {formatTime(item.publishedAt)} · {item.regions.map(region => region.name).join(", ") || "Location not published"}</p><p className="font-bold">{item.summary}</p><p className="whitespace-pre-wrap leading-7">{item.body}</p>{item.status === "PUBLISHED" && !item.expired && item.attachments.filter(photo => photo.contentType.startsWith("image/")).map(photo => <PublishedPhoto key={photo.id} user={user} photo={photo} />)}<section aria-label="Approved sources"><h2 className="font-extrabold">Sources</h2><ul className="mt-2 space-y-2">{item.sources.map((source, index) => <li key={index}>{/^https?:\/\//.test(source.url) ? <a className="underline" href={source.url} target="_blank" rel="noreferrer noopener">{source.title}</a> : source.title}</li>)}</ul></section>{item.authorityReference && <p className="text-sm">Publication authority: {item.authorityReference}</p>}<section aria-label="Publication history"><h2 className="font-extrabold">Publication history</h2><p className="mt-2 text-sm">Updated {formatTime(item.updatedAt)}</p>{item.expired && <p className="text-sm">This publication has expired.</p>}{item.supersedesId && <p className="text-sm">Replaces an earlier publication.</p>}{item.withdrawalReason && <p className="text-sm">Withdrawal reason: {item.withdrawalReason}</p>}{item.replacements.map(replacement => <Link key={replacement.id} className="block min-h-11 py-3 text-sm underline" to={publicationPath(replacement.slug, origin)}>Replacement publication ({replacement.status.toLowerCase()})</Link>)}</section>{publicationHasMap(item) ? <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-bold" to={`${workspacePath(user.role)}?publication=${encodeURIComponent(item.slug)}`}><MapPin size={16} aria-hidden="true" />View on map</Link> : <p className="text-sm text-muted-foreground">No approved map location available.</p>}</article>}</section></main>;
}
