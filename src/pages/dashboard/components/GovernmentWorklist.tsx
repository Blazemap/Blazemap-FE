import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardUser } from "@/types";
import { handlingLabels, priorityLabels, verificationLabels } from "@/constants";
import { Button } from "@/components/ui";
import { useQueryGetCases } from "@/hooks/dashboard";
import { useGovernmentCase } from "@/hooks/dashboard/useGovernment";
import { formatTime } from "@/pages/dashboard/utils";
import GovernmentReports from "./GovernmentReports";
import CaseEvidence from "./CaseEvidence";
import CasePerimeter, { type PerimeterEditorProps } from "./CasePerimeter";
import CasePublication from "./CasePublication";
import CaseWind from "./CaseWind";
import { ObservationListSkeleton } from "./DashboardSkeletons";
import type { WindArrow } from "@/lib/wind";
type WindProps = { onWind: (value: WindArrow | null) => void };

const control = "mt-1 min-h-11 w-full rounded-lg border border-primary/35 bg-white px-3 text-sm";
export default function GovernmentWorklist({ user, draft, setDraft, canDraw, onWind }: { user: DashboardUser; canDraw: boolean } & PerimeterEditorProps & WindProps) {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"cases" | "reports">(draft || params.has("case") ? "cases" : "reports");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const selected = draft?.caseId ?? params.get("case");
  function setSelected(id: string | null) {
    setParams(current => { const next = new URLSearchParams(current); if (id) next.set("case", id); else next.delete("case"); return next; }, { replace: true });
  }
  const resource = useQueryGetCases(user, { query, verification, priority, page });
  function select(id: string | null) {
    if (draft && draft.caseId !== id) return;
    setSelected(id);
  }
  return <section aria-labelledby="worklist-title" className="flex shrink-0 flex-col">
    <div className="border-b p-5"><h2 id="worklist-title" className="text-xl font-extrabold">Government worklist</h2><p className="mt-1 text-sm text-muted-foreground">Review priority is not fire verification.</p><div className="mt-3 flex gap-2"><Button variant={tab === "cases" ? "default" : "outline"} aria-pressed={tab === "cases"} onClick={() => setTab("cases")}>Cases</Button><Button variant={tab === "reports" ? "default" : "outline"} aria-pressed={tab === "reports"} disabled={!!draft} onClick={() => setTab("reports")}>Report queue</Button></div></div>
    {tab === "reports" ? <GovernmentReports user={user} onCase={id => { setSelected(id); setTab("cases"); }} /> : <div className="space-y-4 p-5">
      {selected && <CasePanel onWind={onWind} key={selected} user={user} id={selected} draft={draft} setDraft={setDraft} canDraw={canDraw} onClose={() => select(null)} />}
      <form onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}><label htmlFor="case-search" className="text-sm font-bold">Case title or number</label><div className="flex items-end gap-2"><input id="case-search" value={search} onChange={event => setSearch(event.target.value)} maxLength={200} className={control} type="search" /><Button type="submit" variant="outline">Search</Button></div></form>
      <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Human verification<select className={control} value={verification} onChange={event => { setVerification(event.target.value); setPage(1); }}><option value="">All statuses</option>{Object.entries(verificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold">Review priority<select className={control} value={priority} onChange={event => { setPriority(event.target.value); setPage(1); }}><option value="">All priorities</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold" role="status">{resource.data ? `${resource.data.total} matching cases` : resource.loading ? "Loading cases…" : "Cases unavailable"}</p><Button variant="ghost" disabled={resource.loading} onClick={resource.retry}>Refresh</Button></div>
      {resource.failed && <p role="alert" className="rounded-lg border border-amber-700/25 bg-amber-50 p-3 text-sm text-amber-950">{resource.forbidden ? "Government access is no longer available. Internal cases have been cleared." : "The worklist could not refresh. Retained cases may be out of date."}</p>}
      {resource.receivedAt && <p className="text-xs text-muted-foreground">Retrieved {formatTime(resource.receivedAt)}</p>}
      {resource.loading && !resource.data && <ObservationListSkeleton />}
      {resource.data?.items.length === 0 && <p className="py-8 text-sm">No matching cases.</p>}
      <ul className="space-y-3">{resource.data?.items.map(item => <li key={item.id}><button type="button" disabled={!!draft && draft.caseId !== item.id} aria-pressed={selected === item.id} onClick={() => select(item.id)} className={`w-full rounded-xl border p-4 text-left hover:bg-secondary/40 disabled:opacity-50 ${selected === item.id ? "border-primary bg-secondary/50" : "bg-white"}`}><span className="block text-xs text-muted-foreground">{item.number}</span><span className="mt-1 block font-extrabold">{item.title}</span><span className="mt-3 block text-sm">{verificationLabels[item.verification]}</span><span className="mt-1 block text-xs text-muted-foreground">Review priority: {priorityLabels[item.priority]} · {handlingLabels[item.handling]}</span><span className="mt-3 block text-xs text-muted-foreground">Updated {formatTime(item.updatedAt)}</span></button></li>)}</ul>
      {resource.data && resource.data.total > resource.data.pageSize && <div className="flex items-center justify-between gap-2"><Button aria-label="Previous cases page" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} aria-hidden="true" /></Button><span className="text-sm">Page {page} of {Math.ceil(resource.data.total / resource.data.pageSize)}</span><Button aria-label="Next cases page" variant="outline" disabled={page * resource.data.pageSize >= resource.data.total} onClick={() => setPage(page + 1)}><ChevronRight size={16} aria-hidden="true" /></Button></div>}
    </div>}
  </section>;
}
function CasePanel({ user, id, draft, setDraft, onClose, canDraw, onWind }: { user: DashboardUser; id: string; onClose: () => void; canDraw: boolean } & PerimeterEditorProps & WindProps) {
  const resource = useGovernmentCase(user, id);
  const detail = resource.data;
  useEffect(() => { if (resource.forbidden) setDraft(null); }, [resource.forbidden, setDraft]);
  return <section aria-label="Selected internal case" className="rounded-sm border border-primary/10 bg-white p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-extrabold">{detail?.title || "Case detail"}</h3><Button variant="ghost" disabled={!!draft} onClick={onClose}>Back to cases</Button></div>
    {resource.loading && <p role="status" className="text-sm">Loading case evidence…</p>}
    {resource.failed && <div role="alert" className="text-sm"><p>{resource.forbidden ? "Private case access unavailable." : "Case detail unavailable or stale. Refresh before making a decision."}</p><Button variant="outline" onClick={resource.retry}>Refresh case</Button></div>}
    {detail && <><p className="break-all text-xs text-muted-foreground">{detail.number} · Version {detail.version}</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">Human verification</dt><dd className="font-bold">{verificationLabels[detail.verification]}</dd></div><div><dt className="text-muted-foreground">Review priority</dt><dd>{priorityLabels[detail.priority]} · {detail.priorityReason || "No rationale recorded"}</dd></div><div><dt className="text-muted-foreground">Handling</dt><dd>{handlingLabels[detail.handling]}</dd></div><div><dt className="text-muted-foreground">Internal location</dt><dd>{detail.latitude === null ? "Not recorded" : `${detail.latitude}, ${detail.longitude}`}</dd></div></dl>
      {!canDraw && <Button asChild variant="outline" className="mt-4"><Link to={`/dashboard?case=${encodeURIComponent(detail.id)}`}>Open case on map</Link></Button>}
      <CaseWind detail={detail} failed={resource.failed} onWind={onWind} />
      <fieldset disabled={resource.failed || resource.loading}><fieldset disabled={!!draft}><CaseEvidence user={user} detail={detail} refresh={resource.retry} /></fieldset><CasePerimeter user={user} detail={detail} canDraw={canDraw} draft={draft} setDraft={setDraft} refresh={resource.retry} /><CasePublication user={user} detail={detail} editing={!!draft} /></fieldset>
      {detail.analysisLimitations.length > 0 && <details className="mt-5 border-t pt-4"><summary className="min-h-11 cursor-pointer text-sm font-bold">Existing analysis limitations</summary>{detail.analysisLimitations.map((analysis, i) => <div key={i} className="mt-3 text-xs"><p>{analysis.current ? "Current analysis" : "Historical analysis; not current"} · {analysis.completedAt && formatTime(analysis.completedAt)}</p><ul className="mt-2 list-disc space-y-1 pl-4">{analysis.limitations.map((value, j) => <li key={j}>{value}</li>)}</ul></div>)}<p className="mt-3 text-xs">Analysis is not human verification or a fire-spread forecast.</p></details>}
      <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Internal coordinates and perimeter stay private until explicitly approved for publication.</p>
    </>}
  </section>;
}
