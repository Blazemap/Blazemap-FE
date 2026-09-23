import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DashboardUser } from "@/types";
import { handlingLabels, priorityLabels, verificationLabels } from "@/constants";
import { Button } from "@/components/ui";
import { useGovernmentCase } from "@/hooks/dashboard/useGovernment";
import { formatTime } from "@/pages/dashboard/utils";
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
export function CasePanel({ user, id, draft, setDraft, canDraw, onWind, onDraft, reportId, reportReviewStatus }: { user: DashboardUser; id: string; reportId?: string; reportReviewStatus?: string; canDraw: boolean; onDraft: (dirty: boolean, pending: boolean) => void } & PerimeterEditorProps & WindProps) {
  const resource = useGovernmentCase(user, id);
  const detail = resource.data;
  const [evidenceDraft, setEvidenceDraft] = useState({ dirty: false, pending: false });
  const [publicationDraft, setPublicationDraft] = useState({ dirty: false, pending: false });
  const [assignmentDraft, setAssignmentDraft] = useState({ dirty: false, pending: false });
  useEffect(() => { onDraft(evidenceDraft.dirty || publicationDraft.dirty || assignmentDraft.dirty, evidenceDraft.pending || publicationDraft.pending || assignmentDraft.pending); }, [evidenceDraft, publicationDraft, assignmentDraft, onDraft]);
  useEffect(() => () => onDraft(false, false), [onDraft]);
  useEffect(() => { if (resource.forbidden) setDraft(null); }, [resource.forbidden, setDraft]);
  return <section aria-label="Selected internal case" aria-busy={resource.loading} className="bg-white p-4"><h3 className="font-extrabold">{detail?.title || "Case detail"}</h3>
    {resource.initialLoading && !detail && <GovernmentCaseDetailSkeleton />}
    {resource.failed && <div role="alert" className="text-sm"><p>{resource.forbidden ? "Private case access unavailable." : "Case detail unavailable or stale. Refresh before making a decision."}</p><Button variant="outline" onClick={resource.retry}>Refresh case</Button></div>}
    {detail && <><p className="break-all text-xs text-muted-foreground">{detail.number} · Version {detail.version}</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">Human verification</dt><dd className="font-bold">{verificationLabels[detail.verification]}</dd></div><div><dt className="text-muted-foreground">Review priority</dt><dd>{priorityLabels[detail.priority]} · {detail.priorityReason || "No rationale recorded"}</dd></div><div><dt className="text-muted-foreground">Handling</dt><dd>{handlingLabels[detail.handling]}</dd></div><div><dt className="text-muted-foreground">Internal location</dt><dd>{detail.latitude === null ? "Not recorded" : `${detail.latitude}, ${detail.longitude}`}</dd></div></dl>
      <section aria-labelledby="case-linked-reports" className="mt-5 border-t border-primary/10 pt-4"><h4 id="case-linked-reports" className="font-bold">Linked reports ({detail.reports.length})</h4>{detail.reports.length ? <ul className="mt-3 space-y-2">{detail.reports.map(report => <li key={report.id} className="rounded-lg border border-primary/10 p-3"><p className="text-sm font-bold">{report.number}</p><p className="mt-1 line-clamp-2 text-sm">{report.description}</p><p className="mt-2 text-xs text-muted-foreground">Observed {formatTime(report.observedAt)} · {report.reviewStatus.toLowerCase().replaceAll("_", " ")}</p><Button asChild variant="outline" className="mt-2"><Link to={`/monitoring/reports/${encodeURIComponent(report.id)}`}>View report</Link></Button></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No citizen reports linked to this case.</p>}</section>
      {!canDraw && <Button asChild variant="outline" className="mt-4"><Link to={`/dashboard?case=${encodeURIComponent(detail.id)}`}>Open case on map</Link></Button>}
      {detail.handling === "CLOSED" ? <><CaseWind detail={detail} failed={resource.failed} onWind={onWind} />{detail.verification === "CONFIRMED_FIRE" && <Button asChild variant="outline"><Link to={`/dashboard?view=feed&news-case=${encodeURIComponent(detail.id)}`}>Open News in Feed</Link></Button>}</> : <><CaseAssignments user={user} detail={detail} disabled={resource.failed || resource.initialLoading || !!draft || evidenceDraft.pending || publicationDraft.pending} onDraft={setAssignmentDraft} /><CaseForecastRegion detail={detail} /><CaseWind detail={detail} failed={resource.failed} onWind={onWind} /><fieldset disabled={resource.failed || resource.initialLoading}><CaseEvidence key={`${detail.id}:${reportReviewStatus ?? ""}`} reportId={reportId} reportReviewStatus={reportReviewStatus} user={user} detail={detail} refresh={resource.retry} onDraft={setEvidenceDraft} draft={draft} setDraft={setDraft} canDraw={canDraw} /><fieldset disabled={evidenceDraft.pending}><CasePerimeter user={user} detail={detail} canDraw={canDraw} draft={draft} setDraft={setDraft} refresh={resource.retry} /></fieldset></fieldset>{detail.verification === "CONFIRMED_FIRE" && <><ActiveIncidentPublication key={`public:${detail.id}`} user={user} detail={detail} onDraft={setPublicationDraft} /><Button asChild variant="outline"><Link to={`/dashboard?view=feed&news-case=${encodeURIComponent(detail.id)}`}>Prepare News in Feed</Link></Button></>}</>}
    </>}
  </section>;
}
