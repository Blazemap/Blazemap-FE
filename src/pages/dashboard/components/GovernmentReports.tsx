import { useState } from "react";
import { Button } from "@/components/ui";
import type { DashboardUser } from "@/types";
import type { GovernmentReport } from "@/types/government";
import { createGovernmentCase, linkGovernmentReport } from "@/api/dashboard/government";
import { useGovernmentMutation, useGovernmentReports } from "@/hooks/dashboard/useGovernment";
import { formatTime } from "@/pages/dashboard/utils";
import { ObservationListSkeleton } from "./DashboardSkeletons";

const control = "mt-1 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";
const label = (value: string) => value.toLowerCase().replaceAll("_", " ");
export default function GovernmentReports({ user, onCase }: { user: DashboardUser; onCase: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const reports = useGovernmentReports(user, page, query, status);
  const report = reports.data?.data.find(item => item.id === selected);
  return <div className="space-y-4 p-5">
    <form onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); setSelected(null); }}><label className="text-sm font-bold">Report number or description<input type="search" maxLength={200} className={control} value={search} onChange={event => setSearch(event.target.value)} /></label><Button type="submit" variant="outline" className="mt-2">Search reports</Button></form>
    <label className="block text-sm font-bold">Review status<select className={control} value={status} onChange={event => { setStatus(event.target.value); setPage(1); setSelected(null); }}><option value="">All statuses</option>{["NEW", "NEEDS_DETAILS", "REVIEWED"].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
    <div className="flex items-center justify-between"><p role="status" className="text-sm">{reports.loading ? "Loading reports…" : reports.data ? `${reports.data.meta.total} reports` : "Reports unavailable"}</p><Button variant="ghost" disabled={reports.loading} onClick={reports.retry}>Refresh</Button></div>
    {reports.failed && <p role="alert" className="text-sm text-amber-950">{reports.forbidden ? "Government access unavailable. Private reports cleared." : "Reports could not refresh. Retained data may be out of date."}</p>}
    {reports.loading && !reports.data && <ObservationListSkeleton />}
    {report && <><Button variant="ghost" onClick={() => setSelected(null)}>Back to reports</Button><fieldset disabled={reports.failed || reports.loading}><ReportReview key={report.id} user={user} report={report} onCase={onCase} /></fieldset></>}
    <p className="text-xs text-muted-foreground">Newest reports first. Triage is review priority, not fire confirmation. Missing coverage does not mean no fire.</p>
    <ul className="space-y-3">{reports.data?.data.map(item => <li key={item.id}><button type="button" aria-pressed={selected === item.id} className={`w-full rounded-xl border p-4 text-left ${selected === item.id ? "border-primary bg-secondary/50" : "bg-white"}`} onClick={() => setSelected(item.id)}><span className="block text-xs">{item.number}</span><span className="mt-2 block text-sm font-extrabold">Review priority: {item.triage.level}</span><span className="mt-2 block text-sm">{item.description}</span><span className="mt-2 block text-xs">Reasons: {item.triage.reasonCodes.map(label).join(", ") || "None supplied"}</span><span className="mt-1 block text-xs">Missing data: {item.triage.missingData.map(label).join(", ") || "None reported"}</span><span className="mt-2 block text-xs text-muted-foreground">Observed {formatTime(item.observedAt)} · {label(item.reviewStatus)}</span></button></li>)}</ul>
    {reports.data?.data.length === 0 && <p className="py-5 text-sm">No matching reports.</p>}
    {reports.data && <div className="flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelected(null); }}>Previous</Button><span className="text-xs">Page {page}</span><Button variant="outline" disabled={page * reports.data.meta.pageSize >= reports.data.meta.total} onClick={() => { setPage(page + 1); setSelected(null); }}>Next</Button></div>}
  </div>;
}
function ReportReview({ user, report, onCase }: { user: DashboardUser; report: GovernmentReport; onCase: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [caseId, setCaseId] = useState("");
  const [created, setCreated] = useState<{ id: string; number: string } | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  const mutation = useGovernmentMutation(user, async (mode: "create" | "link") => {
    const target = mode === "create" ? created ?? await createGovernmentCase({ title: title.trim(), reason: reason.trim(), latitude: report.locationMode === "INCIDENT_ESTIMATE" ? report.latitude : null, longitude: report.locationMode === "INCIDENT_ESTIMATE" ? report.longitude : null, regionId: report.regionId }) : { id: caseId.trim(), number: "" };
    if (mode === "create") setCreated(target);
    await linkGovernmentReport(report.id, target.id, reason.trim());
    setLinked(target.id);
    return target.id;
  });
  const triage = report.triage;
  return <section aria-label="Report triage review" className="space-y-3 rounded-sm border border-primary/10 bg-white p-4">
    <h3 className="font-extrabold">Review {report.number}</h3><p className="text-sm">{report.description}</p>
    <dl className="space-y-2 text-xs"><div><dt>Observation</dt><dd>{report.observationTypes.map(label).join(", ")} · {formatTime(report.observedAt)}</dd></div><div><dt>Location meaning</dt><dd>{label(report.locationMode)} · {report.latitude === null ? "Coordinates unavailable" : `${report.latitude}, ${report.longitude}`}</dd></div><div><dt>Location description</dt><dd>{report.locationDescription || report.region?.name || "Not supplied"}</dd></div><div><dt>Triage evaluated</dt><dd>{formatTime(triage.evaluatedAt)} · {triage.ruleVersion}</dd></div><div><dt>Satellite match</dt><dd>{triage.satelliteMatch ? `${triage.satelliteMatch.distanceMeters.toFixed(0)} m · ${triage.satelliteMatch.acquiredAt ? formatTime(triage.satelliteMatch.acquiredAt) : "Acquisition time unavailable"}` : "No match returned; check missing coverage above."}</dd></div><div><dt>Settlement match</dt><dd>{triage.settlementMatch ? `${triage.settlementMatch.name || "Unnamed settlement"} · ${triage.settlementMatch.distanceMeters === null ? "Distance unavailable" : `${triage.settlementMatch.distanceMeters.toFixed(0)} m`}` : "No match returned; check missing coverage above."}</dd></div></dl>
    {(report.case || linked) ? <Button onClick={() => onCase(linked || report.case!.id)}>Open linked case</Button> : <form className="space-y-3" onSubmit={event => { event.preventDefault(); mutation.mutate("create"); }}>
      <fieldset disabled={mutation.isPending} className="space-y-3"><legend className="text-sm font-bold">Create or link an unverified case</legend><label className="block text-xs font-bold">Case title<input required minLength={3} maxLength={200} className={control} value={title} onChange={event => setTitle(event.target.value)} disabled={!!created} /></label><label className="block text-xs font-bold">Association reason<textarea required minLength={5} maxLength={2000} className={`${control} py-2`} value={reason} onChange={event => setReason(event.target.value)} /></label><Button type="submit" disabled={mutation.isPending}>{created ? "Retry linking created case" : "Create case and link report"}</Button>
      {!created && <><label className="block text-xs font-bold">Or existing case ID<input maxLength={128} className={control} value={caseId} onChange={event => setCaseId(event.target.value)} /></label><Button type="button" variant="outline" disabled={!caseId.trim() || reason.trim().length < 5 || mutation.isPending} onClick={() => mutation.mutate("link")}>Link existing case</Button></>}
      </fieldset>
    </form>}
    {created && !linked && <p role="status" className="text-xs">Created {created.number} ({created.id}). Linking is not confirmed. Retry the link, not case creation.</p>}
    {mutation.error && <p role="alert" className="text-sm">{mutation.error.message}</p>}
    <p className="text-xs text-muted-foreground">Linking a report never confirms a fire. Observer positions are not copied as incident locations.</p>
  </section>;
}
