import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Flame, Search, Send, X } from "lucide-react";
import { Link } from "react-router-dom";
import { downloadPhoto } from "@/api/reports";
import { Button } from "@/components/ui";
import { useMutationAddReportUpdate, useQueryGetReport, useQueryGetReports } from "@/hooks/reports";
import { privateError } from "@/lib";
import type { DashboardUser } from "@/types";

const statusLabels = { NEW: "Received", NEEDS_DETAILS: "More details requested", REVIEWED: "Reviewed" };
function time(value: string) { return `${new Date(value).toLocaleString("en-GB", { timeZone: "UTC" })} UTC`; }

export default function ReportsPage({ user, id, onDraft, onClose }: { user: DashboardUser; id: string | null; onDraft: (dirty: boolean, pending: boolean) => void; onClose?: () => void }) {
  return id ? <ReportDetail key={id} user={user} id={id} onDraft={onDraft} onClose={onClose} /> : <ReportList user={user} onClose={onClose} />;
}

function PanelHeader({ count, loading = false, onClose }: { count?: number; loading?: boolean; onClose?: () => void }) {
  return <header className="flex shrink-0 items-center justify-between border-b border-primary/10 bg-white px-7 py-6"><div><h2 className="text-2xl font-extrabold tracking-tight">My reports</h2>{loading ? <span aria-hidden="true" className="mt-2 block h-2.5 w-16 animate-pulse rounded-full bg-secondary" /> : <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{count ?? 0} reports</p>}</div>{onClose && <button type="button" onClick={onClose} aria-label="Close My reports" className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-forest"><X size={20} strokeWidth={2.5} aria-hidden="true" /></button>}</header>;
}

function ReportListSkeleton() {
  return <div role="status" aria-label="Loading your reports" className="animate-pulse bg-white"><span className="sr-only">Loading your reports</span>{Array.from({ length: 5 }, (_, index) => <div key={index} className="border-b border-primary/10 px-5 py-4"><div className="flex justify-between gap-4"><span className="h-5 w-20 rounded-full bg-secondary" /><span className="h-3 w-14 rounded-full bg-secondary/70" /></div><span className="mt-4 block h-3 w-28 rounded-full bg-secondary" /><span className="mt-3 block h-2.5 w-4/5 rounded-full bg-secondary/70" /></div>)}</div>;
}

function ReportDetailSkeleton() {
  return <div role="status" aria-label="Loading report details" className="animate-pulse px-7 py-6"><span className="sr-only">Loading report details</span><div className="flex justify-between gap-4"><span className="h-6 w-36 rounded-full bg-secondary" /><span className="size-11 rounded-sm bg-secondary" /></div>{Array.from({ length: 4 }, (_, index) => <div key={index} className="border-b border-primary/10 py-5"><span className="block h-2.5 w-28 rounded-full bg-secondary/80" /><span className="mt-3 block h-3 w-4/5 rounded-full bg-secondary" /></div>)}</div>;
}

function ReportList({ user, onClose }: { user: DashboardUser; onClose?: () => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const query = useQueryGetReports(user, page);
  const reports = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("en");
    return (query.data?.data ?? []).filter(report => `${report.number} ${report.locationDescription} ${report.description}`.toLocaleLowerCase("en").includes(term));
  }, [query.data?.data, search]);
  const total = query.data?.meta.total ?? 0;

  return <div className="flex min-h-0 flex-1 flex-col bg-white">
    <PanelHeader count={total} loading={query.isPending} onClose={onClose} />
    <div className="shrink-0 border-b border-primary/10 bg-white px-5 py-3"><div className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" aria-hidden="true" /><label htmlFor="my-reports-search" className="sr-only">Search my reports</label><input id="my-reports-search" type="search" maxLength={200} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search my reports" className="h-10 w-full rounded-sm border-0 bg-[#eef3e9] pl-10 pr-3 text-sm font-semibold outline-none transition focus:bg-white focus:ring-2 focus:ring-primary/15" /></div></div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#eef3e9]">
      {query.isPending && <ReportListSkeleton />}
      {query.isError && <div role="alert" className="p-6 text-sm"><p>{privateError(query.error)}</p><Button className="mt-3 rounded-sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button></div>}
      {!query.isError && query.data && reports.length > 0 && <ul className="divide-y divide-primary/10 bg-white">{reports.map(report => <li key={report.id}><Link className="block px-5 py-4 transition-colors hover:bg-secondary/40" to={`/dashboard?panel=my-reports&report=${encodeURIComponent(report.id)}`}><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-secondary px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-primary">{statusLabels[report.reviewStatus]}</span><time dateTime={report.createdAt} className="text-[10px] font-semibold text-muted-foreground">{new Date(report.createdAt).toLocaleDateString("en-GB")}</time></div><h3 className="mt-3 break-all text-sm font-extrabold">{report.number}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{report.locationDescription}</p></Link></li>)}</ul>}
      {!query.isError && query.data && reports.length === 0 && <div className="flex h-full min-h-64 flex-col items-center justify-center px-8 pb-16 text-center"><span className="grid size-16 place-items-center rounded-full bg-secondary text-primary/55"><Flame size={30} strokeWidth={1.8} aria-hidden="true" /></span><h3 className="mt-4 font-extrabold text-forest/75">{total === 0 ? "No reports yet" : "No matching reports"}</h3><p className="mt-1 max-w-64 text-sm leading-6 text-muted-foreground">{total === 0 ? "You haven't submitted any observations." : "Try another search."}</p></div>}
    </div>
    {query.data && total > query.data.meta.pageSize && <div className="flex shrink-0 items-center justify-between border-t border-primary/10 bg-white p-4"><Button variant="outline" className="rounded-sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><span className="text-xs font-bold text-muted-foreground">Page {page}</span><Button variant="outline" className="rounded-sm" disabled={page * query.data.meta.pageSize >= total} onClick={() => setPage(value => value + 1)}>Next</Button></div>}
  </div>;
}

function ReportDetail({ user, id, onDraft, onClose }: { user: DashboardUser; id: string; onDraft: (dirty: boolean, pending: boolean) => void; onClose?: () => void }) {
  const query = useQueryGetReport(user, id);
  const mutation = useMutationAddReportUpdate(user, id);
  const [message, setMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const report = query.isError ? undefined : query.data;
  useEffect(() => { onDraft(!!message, mutation.isPending); }, [message, mutation.isPending, onDraft]);
  useEffect(() => () => onDraft(false, false), [onDraft]);

  async function download(attachmentId: string) {
    if (downloading) return;
    setDownloading(true); setDownloadError("");
    try { const url = await downloadPhoto(user, attachmentId); const link = document.createElement("a"); link.href = url; link.rel = "noreferrer noopener"; link.target = "_blank"; link.click(); }
    catch (caught) { setDownloadError(privateError(caught)); }
    finally { setDownloading(false); }
  }

  return <div className="flex min-h-0 flex-1 flex-col bg-white">
    <header className="flex shrink-0 items-center justify-between border-b border-primary/10 px-4 py-3"><Button asChild variant="ghost" className="rounded-sm"><Link to="/dashboard?panel=my-reports"><ArrowLeft size={16} aria-hidden="true" />My reports</Link></Button>{onClose && <button type="button" onClick={onClose} aria-label="Close report detail" className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-secondary"><X size={19} aria-hidden="true" /></button>}</header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6">
      {query.isPending && <ReportDetailSkeleton />}
      {query.isError && <div role="alert"><p>This report could not be loaded for this account.</p><Button variant="outline" className="mt-3 rounded-sm" onClick={() => void query.refetch()}>Retry</Button></div>}
      {report && <article><div className="flex items-start justify-between gap-3"><div><p className="break-all text-xl font-extrabold">{report.number}</p><p className="mt-2 text-sm font-bold text-primary">{statusLabels[report.reviewStatus]}</p></div><span className="grid size-11 place-items-center rounded-sm bg-orange-50 text-orange-700"><Flame size={21} aria-hidden="true" /></span></div><dl className="mt-6 divide-y divide-primary/10 border-y border-primary/10 text-sm"><div className="py-5"><dt className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Original observation</dt><dd className="mt-2">{report.observationTypes.map(type => type.replaceAll("_", " ").toLowerCase()).join(", ")}</dd><dd className="mt-2 whitespace-pre-wrap leading-6">{report.description}</dd></div><div className="py-5"><dt className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Observed / received</dt><dd className="mt-2">{time(report.observedAt)} / {time(report.createdAt)}</dd></div><div className="py-5"><dt className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Location</dt><dd className="mt-2">{report.locationMode === "OBSERVER_POSITION" ? "Observer position" : "Estimated incident location"}{report.latitude !== null && ` · ${report.latitude}, ${report.longitude}`}</dd><dd>{report.region?.name}</dd><dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{report.locationDescription}</dd></div>{report.case && <div className="py-5"><dt className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Case progress</dt><dd className="mt-2">{report.case.verificationStatus.replaceAll("_", " ")} · {report.case.handlingStatus.replaceAll("_", " ")}</dd></div>}</dl><p className="mt-4 text-xs leading-5 text-muted-foreground">Receipt is not confirmation of a fire or response dispatch.</p>
        {!!report.attachments.length && <section className="mt-6"><h3 className="font-extrabold">Private photos</h3><ul className="mt-2 divide-y divide-primary/10">{report.attachments.map(photo => <li key={photo.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 truncate text-sm">{photo.filename} · {Math.ceil(photo.size / 1024)} KiB</span><Button type="button" variant="outline" className="rounded-sm" disabled={downloading} onClick={() => void download(photo.id)}>View</Button></li>)}</ul>{downloadError && <p role="alert" className="mt-2 text-sm text-red-800">{downloadError}</p>}</section>}
        {!!report.updates?.length && <section className="mt-6"><h3 className="font-extrabold">Updates</h3><ol className="mt-3 divide-y divide-primary/10 border-y border-primary/10">{report.updates.map(update => <li key={update.id} className="py-4 text-sm"><p className="whitespace-pre-wrap leading-6">{update.message}</p><p className="mt-1 text-xs text-muted-foreground">{update.authorRole} · {time(update.createdAt)}</p></li>)}</ol></section>}
        <form className="mt-7 border-t border-primary/10 pt-6" onSubmit={async event => { event.preventDefault(); const value = message.trim(); if (!value) return; await mutation.mutateAsync(value); setMessage(""); setUncertain(false); }}><h3 className="font-extrabold">Add factual follow-up</h3><label htmlFor="follow-up" className="mt-3 block text-sm font-bold">Message<textarea id="follow-up" required minLength={3} maxLength={2000} rows={4} className="mt-2 w-full resize-none rounded-sm border bg-white p-3 text-sm" value={message} onChange={event => setMessage(event.target.value)} /></label><label className="mt-3 flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={uncertain} onChange={event => setUncertain(event.target.checked)} />I included uncertainty and did not claim unverified confirmation.</label>{mutation.isError && <p role="alert" className="mt-2 text-sm text-red-800">{privateError(mutation.error)}</p>}<Button disabled={!message.trim() || !uncertain || mutation.isPending} className="mt-4 w-full rounded-sm"><Send size={16} aria-hidden="true" />{mutation.isPending ? "Sending…" : "Send update"}</Button></form>
      </article>}
    </div>
  </div>;
}
