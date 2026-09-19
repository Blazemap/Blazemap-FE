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
import CasePublication from "./CasePublication";
import CaseWind from "./CaseWind";
import CaseForecastRegion from "./CaseForecastRegion";
import CaseAssignments from "./CaseAssignments";
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
  return <section aria-label="Selected internal case" className="bg-white p-4"><h3 className="font-extrabold">{detail?.title || "Case detail"}</h3>
    {resource.loading && <p role="status" className="text-sm">Loading case evidence…</p>}
    {resource.failed && <div role="alert" className="text-sm"><p>{resource.forbidden ? "Private case access unavailable." : "Case detail unavailable or stale. Refresh before making a decision."}</p><Button variant="outline" onClick={resource.retry}>Refresh case</Button></div>}
    {detail && <><p className="break-all text-xs text-muted-foreground">{detail.number} · Version {detail.version}</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">Human verification</dt><dd className="font-bold">{verificationLabels[detail.verification]}</dd></div><div><dt className="text-muted-foreground">Review priority</dt><dd>{priorityLabels[detail.priority]} · {detail.priorityReason || "No rationale recorded"}</dd></div><div><dt className="text-muted-foreground">Handling</dt><dd>{handlingLabels[detail.handling]}</dd></div><div><dt className="text-muted-foreground">Internal location</dt><dd>{detail.latitude === null ? "Not recorded" : `${detail.latitude}, ${detail.longitude}`}</dd></div></dl>
      {!canDraw && <Button asChild variant="outline" className="mt-4"><Link to={`/dashboard?case=${encodeURIComponent(detail.id)}`}>Open case on map</Link></Button>}
      <CaseAssignments user={user} detail={detail} disabled={resource.failed || resource.loading || !!draft || evidenceDraft.pending || publicationDraft.pending} onDraft={setAssignmentDraft} />
      <CaseForecastRegion user={user} detail={detail} refresh={resource.retry} />
      <CaseWind detail={detail} failed={resource.failed} onWind={onWind} />
      <fieldset disabled={resource.failed || resource.loading}><CaseEvidence key={`${detail.id}:${reportReviewStatus ?? ""}`} reportId={reportId} reportReviewStatus={reportReviewStatus} user={user} detail={detail} refresh={resource.retry} onDraft={setEvidenceDraft} draft={draft} setDraft={setDraft} canDraw={canDraw} /><fieldset disabled={evidenceDraft.pending}><CasePerimeter user={user} detail={detail} canDraw={canDraw} draft={draft} setDraft={setDraft} refresh={resource.retry} /></fieldset>{reportReviewStatus !== "DECLINED" && <CasePublication user={user} detail={detail} editing={!!draft} onDraft={setPublicationDraft} />}</fieldset>
      {detail.analysisLimitations.length > 0 && <details className="mt-5 border-t pt-4"><summary className="min-h-11 cursor-pointer text-sm font-bold">Existing analysis limitations</summary>{detail.analysisLimitations.map((analysis, i) => <div key={i} className="mt-3 text-xs"><p>{analysis.current ? "Current analysis" : "Historical analysis; not current"} · {analysis.completedAt && formatTime(analysis.completedAt)}</p><ul className="mt-2 list-disc space-y-1 pl-4">{analysis.limitations.map((value, j) => <li key={j}>{value}</li>)}</ul></div>)}<p className="mt-3 text-xs">Analysis is not human verification or a fire-spread forecast.</p></details>}
      <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Internal coordinates and perimeter stay private until explicitly approved for publication.</p>
    </>}
  </section>;
}
