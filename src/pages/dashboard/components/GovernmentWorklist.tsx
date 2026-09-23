import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DashboardUser } from "@/types";
import { handlingLabels, priorityLabels, verificationLabels } from "@/constants";
import { Button, FieldSelect } from "@/components/ui";
import { updateGovernmentHandling } from "@/api/dashboard/government";
import { useGovernmentCase, useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { formatTime } from "@/pages/dashboard/utils";
import { ReportAssociationContext } from "@/lib/report-association";
import GovernmentReports, { type ReportSelectionProps } from "./GovernmentReports";
import CaseEvidence from "./CaseEvidence";
import CasePerimeter, { type PerimeterEditorProps } from "./CasePerimeter";

import ActiveIncidentPublication from "./ActiveIncidentPublication";
import CaseWind from "./CaseWind";
import CaseForecastRegion from "./CaseForecastRegion";
import CaseAssignments from "./CaseAssignments";
import { GovernmentCaseDetailSkeleton } from "./DashboardSkeletons";
import type { WindArrow } from "@/lib/wind";
type WindProps = { onWind: (value: WindArrow | null) => void };

export default function GovernmentWorklist(props: ReportSelectionProps) {
  return <section aria-label="Citizen reports"><GovernmentReports {...props} /></section>;
}
function CaseNewsAction({ caseId, closed }: { caseId: string; closed: boolean }) {
  return <section aria-label="Case News" className="mt-4 rounded-xl border border-primary/15 bg-white p-4"><h4 className="text-sm font-extrabold">News</h4><p className="mt-2 text-xs leading-5 text-muted-foreground">{closed ? "View the case update in Feed." : "Prepare a case update for Feed separately from the incident publication."}</p><Button asChild variant="outline" className="mt-4 w-full"><Link to={`/dashboard?view=feed&news-case=${encodeURIComponent(caseId)}`}>{closed ? "Open News in Feed" : "Prepare News in Feed"}</Link></Button></section>;
}
function CaseClosure({ user, detail, disabled, onDraft }: { user: DashboardUser; detail: NonNullable<ReturnType<typeof useGovernmentCase>["data"]>; disabled: boolean; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  const [fieldUpdateId, setFieldUpdateId] = useState("");
  const [reason, setReason] = useState("");
  const reportPicker = useContext(ReportAssociationContext);
  const eligibleEvidence = detail.fieldUpdates.filter(item => item.source !== "Authorized government review with operator-mapped boundary" && item.source.trim().length >= 3 && item.description.trim().length >= 5);
  const mutation = useGovernmentMutation(user, async () => updateGovernmentHandling(detail.id, detail.version, "CLOSED", reason.trim(), fieldUpdateId), undefined, "Case closed");
  const dirty = open && !!(fieldUpdateId || reason);
  useEffect(() => { onDraft({ dirty, pending: mutation.isPending }); }, [dirty, mutation.isPending, onDraft]);
  useEffect(() => () => onDraft({ dirty: false, pending: false }), [onDraft]);
  if (detail.handling === "CLOSED") return null;
  return <section aria-labelledby="close-case-title" className="mt-5 rounded-xl border border-primary/15 bg-white p-4"><h4 id="close-case-title" className="text-sm font-extrabold">Finish case handling</h4>
    {reportPicker.selectedIds.size > 0 ? <p role="status" className="mt-2 text-sm text-muted-foreground">Save the related report selection with the fire confirmation or boundary revision before closing this case.</p> : detail.activeAssignmentCount > 0 ? <p className="mt-2 text-sm text-muted-foreground">Complete or cancel all {detail.activeAssignmentCount} active team assignment{detail.activeAssignmentCount === 1 ? "" : "s"} above before closing this case.</p> : !eligibleEvidence.length ? <p className="mt-2 text-sm text-muted-foreground">Record a field observation from this case before closing it.</p> : <><p className="mt-2 text-sm text-muted-foreground">All team assignments are final. Select the field observation that supports completion, then notify linked report owners.</p>{!open ? <Button type="button" variant="outline" className="mt-4" disabled={disabled} onClick={() => setOpen(true)}>Close case</Button> : <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); if (fieldUpdateId && reason.trim().length >= 5) mutation.mutate(); }}><fieldset disabled={disabled || mutation.isPending} className="space-y-4" aria-busy={mutation.isPending}><label htmlFor="case-closure-evidence" className="block text-sm font-bold">Completion evidence <span aria-hidden="true">*</span><FieldSelect id="case-closure-evidence" required value={fieldUpdateId} onValueChange={setFieldUpdateId} placeholder="Select a field observation" options={eligibleEvidence.map(item => ({ value: item.id, label: `${formatTime(item.observedAt)} · ${item.source} · ${item.description}` }))} /></label><label htmlFor="case-closure-reason" className="block text-sm font-bold">Completion update for report owners <span aria-hidden="true">*</span><textarea id="case-closure-reason" required aria-required="true" minLength={5} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-white p-3 text-sm" /></label><div className="flex flex-wrap gap-2"><Button type="submit" disabled={!fieldUpdateId || reason.trim().length < 5 || mutation.isPending}>{mutation.isPending ? "Closing…" : "Confirm closure"}</Button><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { setOpen(false); setFieldUpdateId(""); setReason(""); mutation.reset(); }}>Cancel</Button></div></fieldset>{mutation.error && <p role="alert" className="text-sm text-red-800">{mutation.error.message}</p>}</form>}</>}
  </section>;
}
export function CasePanel({ user, id, draft, setDraft, canDraw, onWind, onDraft, reportId, reportReviewStatus }: { user: DashboardUser; id: string; reportId?: string; reportReviewStatus?: string; canDraw: boolean; onDraft: (dirty: boolean, pending: boolean) => void } & PerimeterEditorProps & WindProps) {
  const resource = useGovernmentCase(user, id);
  const detail = resource.data;
  const reportPicker = useContext(ReportAssociationContext);
  const [evidenceDraft, setEvidenceDraft] = useState({ dirty: false, pending: false });
  const [publicationDraft, setPublicationDraft] = useState({ dirty: false, pending: false });
  const [assignmentDraft, setAssignmentDraft] = useState({ dirty: false, pending: false });
  const [closureDraft, setClosureDraft] = useState({ dirty: false, pending: false });
  useEffect(() => { onDraft(evidenceDraft.dirty || publicationDraft.dirty || assignmentDraft.dirty || closureDraft.dirty, evidenceDraft.pending || publicationDraft.pending || assignmentDraft.pending || closureDraft.pending); }, [evidenceDraft, publicationDraft, assignmentDraft, closureDraft, onDraft]);
  useEffect(() => () => onDraft(false, false), [onDraft]);
  useEffect(() => { if (resource.forbidden) setDraft(null); }, [resource.forbidden, setDraft]);
  return <section aria-label="Selected internal case" aria-busy={resource.loading} className="bg-white p-4"><h3 className="font-extrabold">{detail?.title || "Case detail"}</h3>
    {resource.initialLoading && !detail && <GovernmentCaseDetailSkeleton />}
    {resource.failed && <div role="alert" className="text-sm"><p>{resource.forbidden ? "Private case access unavailable." : "Case detail unavailable or stale. Refresh before making a decision."}</p><Button variant="outline" onClick={resource.retry}>Refresh case</Button></div>}
    {detail && <><p className="break-all text-xs text-muted-foreground">{detail.number} · Version {detail.version}</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">Human verification</dt><dd className="font-bold">{verificationLabels[detail.verification]}</dd></div><div><dt className="text-muted-foreground">Review priority</dt><dd>{priorityLabels[detail.priority]} · {detail.priorityReason || "No rationale recorded"}</dd></div><div><dt className="text-muted-foreground">Handling</dt><dd>{handlingLabels[detail.handling]}</dd></div><div><dt className="text-muted-foreground">Internal location</dt><dd>{detail.latitude === null ? "Not recorded" : `${detail.latitude}, ${detail.longitude}`}</dd></div></dl>
      <section aria-labelledby="case-linked-reports" className="mt-5 border-t border-primary/10 pt-4"><h4 id="case-linked-reports" className="font-bold">Linked reports ({detail.reports.length})</h4>{detail.reports.length ? <ul className="mt-3 space-y-2">{detail.reports.map(report => <li key={report.id} className="rounded-lg border border-primary/10 p-3"><p className="text-sm font-bold">{report.number}</p><p className="mt-1 line-clamp-2 text-sm">{report.description}</p><p className="mt-2 text-xs text-muted-foreground">Observed {formatTime(report.observedAt)} · {detail.verification === "CONFIRMED_FIRE" && report.reviewStatus !== "DECLINED" ? "Confirmed fire (case)" : report.reviewStatus.toLowerCase().replaceAll("_", " ")}</p><Button asChild variant="outline" className="mt-2"><Link to={`/monitoring/reports/${encodeURIComponent(report.id)}`}>View report</Link></Button></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No citizen reports linked to this case.</p>}</section>
      {!canDraw && <Button asChild variant="outline" className="mt-4"><Link to={`/dashboard?case=${encodeURIComponent(detail.id)}`}>Open case on map</Link></Button>}
      {detail.handling !== "CLOSED" && detail.verification !== "NOT_FIRE" && <section aria-label="Related report draft" className="mt-5 rounded-xl border border-primary/15 bg-white p-4"><h4 className="font-extrabold">Related reports</h4><p className="mt-2 text-xs leading-5 text-muted-foreground">Select additional report pins that describe this case. The selection is not linked until {detail.verification === "CONFIRMED_FIRE" ? "a reviewed boundary revision" : "fire confirmation and the boundary"} is saved.</p><p role="status" className="mt-2 text-xs font-bold">{reportPicker.selectedIds.size} selected for {detail.verification === "CONFIRMED_FIRE" ? "boundary revision" : "confirmation"}</p>{reportPicker.selectedIds.size > 0 && <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{reportPicker.selectedReports.map(item => <li key={item.id}>{item.number}</li>)}</ul>}<div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!canDraw || resource.failed || resource.loading || !!draft || evidenceDraft.pending || assignmentDraft.pending || publicationDraft.pending || closureDraft.pending} onClick={() => reportPicker.startCase(detail.id)}>Select report pins</Button>{reportPicker.selectedIds.size > 0 && <Button type="button" variant="ghost" disabled={evidenceDraft.pending || assignmentDraft.pending || publicationDraft.pending || closureDraft.pending} onClick={reportPicker.clearCase}>Clear selection</Button>}</div></section>}
      {detail.handling === "CLOSED" ? <><CaseWind detail={detail} failed={resource.failed} onWind={onWind} />{detail.verification === "CONFIRMED_FIRE" && <CaseNewsAction caseId={detail.id} closed />}</> : <><CaseAssignments user={user} detail={detail} disabled={resource.failed || resource.initialLoading || !!draft || evidenceDraft.pending || publicationDraft.pending} onDraft={setAssignmentDraft} /><CaseForecastRegion detail={detail} /><CaseWind detail={detail} failed={resource.failed} onWind={onWind} /><fieldset disabled={resource.failed || resource.initialLoading}><CaseEvidence key={`${detail.id}:${reportReviewStatus ?? ""}`} reportId={reportId} reportReviewStatus={reportReviewStatus} user={user} detail={detail} refresh={resource.retry} onDraft={setEvidenceDraft} draft={draft} setDraft={setDraft} canDraw={canDraw} /><fieldset disabled={evidenceDraft.pending}><CasePerimeter user={user} detail={detail} canDraw={canDraw} draft={draft} setDraft={setDraft} refresh={resource.retry} /></fieldset></fieldset><CaseClosure user={user} detail={detail} disabled={resource.failed || resource.initialLoading || !!draft || evidenceDraft.pending || assignmentDraft.pending || publicationDraft.pending} onDraft={setClosureDraft} />{detail.verification === "CONFIRMED_FIRE" && <><ActiveIncidentPublication key={`public:${detail.id}`} user={user} detail={detail} onDraft={setPublicationDraft} /><CaseNewsAction caseId={detail.id} closed={false} /></>}</>}
    </>}
  </section>;
}
