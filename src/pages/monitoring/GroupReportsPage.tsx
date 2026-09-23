import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Layers3 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createCaseFromReports } from "@/api/dashboard/government";
import { DraftGuard } from "@/components/common";
import { Button, FieldLength } from "@/components/ui";
import { useGovernmentMutation, useGovernmentReports } from "@/hooks/dashboard/useGovernment";
import { effectiveReportPriority, observationAppearance, triageAppearance } from "@/lib/report-triage";
import { formatTime } from "@/pages/dashboard/utils";
import type { GovernmentReport } from "@/types/government";
import GroupReportsMap from "./GroupReportsMap";
import { EmptyPanel, ErrorPanel, PageIntro, panelClass } from "./MonitoringComponents";
import { useMonitoringContext } from "./MonitoringPage";
import { QueueSkeleton } from "./MonitoringSkeletons";
import { MapSkeleton } from "@/pages/dashboard/components";

const control = "mt-2 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";

function eligibleReport(report: GovernmentReport) {
  return !report.case && report.locationMode === "INCIDENT_ESTIMATE";
}

export function GroupReportsPage() {
  const { user } = useMonitoringContext();
  const navigate = useNavigate();
  const reports = useGovernmentReports(user, "", "", 100);
  const candidates = useMemo(() => (reports.data?.data ?? []).filter(eligibleReport), [reports.data]);
  const mappedCandidates = candidates.filter(report => report.latitude !== null && report.longitude !== null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [createdId, setCreatedId] = useState("");
  useEffect(() => { if (createdId) void navigate(`/monitoring/cases/${encodeURIComponent(createdId)}`, { replace: true }); }, [createdId, navigate]);
  const selectedReports = candidates.filter(report => selectedIds.has(report.id));
  const regionConflict = new Set(selectedReports.flatMap(report => report.regionId ? [report.regionId] : [])).size > 1;
  const dirty = !createdId && (selectedIds.size > 0 || !!title || !!reason);
  const mutation = useGovernmentMutation(user, async () => createCaseFromReports([...selectedIds], title, reason), undefined, "Case created");
  const toggle = useCallback((id: string) => {
    mutation.reset();
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [mutation]);
  const valid = selectedIds.size >= 2 && title.trim().length >= 3 && reason.trim().length >= 5 && !regionConflict;

  return <div className="space-y-6">
    <DraftGuard dirty={dirty} pending={mutation.isPending} dashboard />
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="outline"><Link to="/monitoring/reports"><ArrowLeft size={16} aria-hidden="true" />Back to reports</Link></Button><p className="text-xs font-bold text-muted-foreground">{selectedIds.size} selected</p></div>
    <PageIntro eyebrow="Report grouping" title="Create one case from related reports." description="Review unlinked incident-estimate reports on the map and in the list. Grouping creates an unverified case for investigation; report count alone never confirms a fire." />
    {reports.failed && <ErrorPanel message="Unlinked reports could not refresh." loading={reports.loading} retry={reports.retry} />}
    <div className="grid min-h-[560px] gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
      <section aria-labelledby="group-map-title" className={`${panelClass} overflow-hidden p-3`}><div className="flex flex-wrap items-start justify-between gap-3 px-2 pb-3"><div><h2 id="group-map-title" className="font-extrabold">Eligible report map</h2><p className="mt-1 text-xs text-muted-foreground">Only unlinked incident estimates with coordinates are mapped. Hotspots are excluded.</p></div><span className="text-xs font-bold text-muted-foreground">{mappedCandidates.length} mapped</span></div>{reports.initialLoading && !reports.data ? <div className="h-[480px]"><MapSkeleton /></div> : <GroupReportsMap reports={mappedCandidates} selectedIds={selectedIds} onToggle={toggle} />}</section>
      <aside className="space-y-5">
        <section className={`${panelClass} overflow-hidden`}><header className="border-b border-primary/10 p-5"><h2 className="font-extrabold">Select reports</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose at least two reports from the same verified region.</p></header>{reports.initialLoading && !reports.data ? <QueueSkeleton label="Loading reports available for grouping" /> : !candidates.length ? <EmptyPanel>No unlinked incident-estimate reports are available.</EmptyPanel> : <ul className="max-h-[430px] divide-y divide-primary/10 overflow-y-auto">{candidates.map(report => { const selected = selectedIds.has(report.id); const appearance = triageAppearance[effectiveReportPriority(report)]; return <li key={report.id}><label className={`flex cursor-pointer items-start gap-3 p-4 hover:bg-secondary/25 ${selected ? "bg-secondary/40" : ""}`}><input type="checkbox" checked={selected} onChange={() => toggle(report.id)} className="mt-1 size-4 shrink-0 accent-primary" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm">{report.number}</strong><span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ color: appearance.color, backgroundColor: `${appearance.color}12` }}>{appearance.label}</span></span><span className="mt-1 line-clamp-2 block text-xs leading-5">{report.description}</span><span className="mt-2 block text-[11px] text-muted-foreground">{report.region?.name ?? "No verified region"} · {formatTime(report.observedAt)}</span><span className="mt-2 flex gap-1">{report.observationTypes.map(type => <img key={type} src={`/icons8-${observationAppearance[type].icon}.png`} alt={observationAppearance[type].label} width={22} height={22} className="size-5 object-contain" />)}</span></span></label></li>; })}</ul>}{reports.hasMore && <div className="border-t border-primary/10 p-4"><Button type="button" variant="outline" className="w-full" disabled={reports.loadingMore} onClick={reports.showMore}>{reports.loadingMore ? "Loading…" : "Load more reports"}</Button></div>}</section>
        <section className={`${panelClass} p-5`}><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary"><Layers3 size={19} aria-hidden="true" /></span><div><h2 className="font-extrabold">Case details</h2><p className="text-xs text-muted-foreground">Saved with an audit rationale.</p></div></div><form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); if (!valid) return; mutation.mutate(undefined, { onSuccess: created => setCreatedId(created.id) }); }}><fieldset disabled={mutation.isPending} className="space-y-4"><label htmlFor="group-case-title" className="block text-sm font-bold">Case title <span aria-hidden="true">*</span><input id="group-case-title" required minLength={3} maxLength={200} value={title} onChange={event => { setTitle(event.target.value); mutation.reset(); }} className={control} /><FieldLength value={title} min={3} max={200} /></label><label htmlFor="group-case-reason" className="block text-sm font-bold">Grouping rationale <span aria-hidden="true">*</span><textarea id="group-case-reason" required minLength={5} maxLength={2000} value={reason} onChange={event => { setReason(event.target.value); mutation.reset(); }} className={`${control} min-h-28 py-3`} /><FieldLength value={reason} min={5} max={2000} /></label></fieldset><p className="text-xs leading-5 text-muted-foreground">The new case starts unverified. Confirmation still requires case evidence and an audited perimeter.</p>{selectedIds.size < 2 && <p className="text-xs font-bold text-amber-800">Select at least two reports.</p>}{regionConflict && <p role="alert" className="text-xs font-bold text-red-800">Selected reports use different verified regions. Adjust the selection before creating the case.</p>}{mutation.error && <p role="alert" className="text-sm text-red-800">{mutation.error.message}</p>}<Button type="submit" className="w-full" disabled={!valid || mutation.isPending}>{mutation.isPending ? "Creating case…" : "Create grouped case"}</Button></form></section>
      </aside>
    </div>
  </div>;
}
