import CasePublication from "./CasePublication";
import ReportCandidates from "./ReportCandidates";
import { motion, useReducedMotion } from "framer-motion";
import type { PerimeterDraft } from "@/lib/perimeter";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, CircleCheck, CircleHelp, CircleStop, List, LoaderCircle, Trash2 } from "lucide-react";
import { DraftGuard } from "@/components/common";
import { hasPoint, formatTime } from "@/pages/dashboard/utils";
import { Button, EvidenceUpload, FieldHelp, FieldLength, FieldSelect } from "@/components/ui";
import type { DashboardUser, ReportPhoto } from "@/types";
import type { FieldInput, GovernmentReport, ReportActionInput, ReportActionStatus } from "@/types/government";
import ReportPhotos from "@/pages/reports/ReportPhotos";
import { effectiveReportPriority, observationAppearance, reportFilters, satelliteTimeDifference, triageAppearance, triageMissing, triageReasons } from "@/lib/report-triage";
import { reportStatus, reportStatusLabel } from "@/lib/report-status";
import { eligibleConfirmationEvidence } from "@/lib/government-confirmation";
import { handlingLabels, verificationLabels } from "@/constants";
import ReportTimeline from "@/pages/reports/ReportTimeline";
import { submitGovernmentReportAction } from "@/api/dashboard/government";
import { uploadPhoto } from "@/api/reports";
import { useGovernmentMutation, useGovernmentReports } from "@/hooks/dashboard/useGovernment";
import { GovernmentReportSkeleton } from "./DashboardSkeletons";
import { FeedEmpty } from "./FeedRow";

const control = "mt-1 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";
const filterIcons = [List, CheckCheck, LoaderCircle, CircleCheck, CircleStop];

function ReportIcon({ name }: { name: string }) {
  return <img src={`/icons8-${name}.png`} alt="" width={28} height={28} className="size-7 shrink-0" />;
}

function Priority({ report }: { report: GovernmentReport }) {
  const appearance = triageAppearance[effectiveReportPriority(report)];
  return <span className="flex items-center gap-2 text-sm font-extrabold" style={{ color: appearance.color }}>{report.triage.level === "HIGH" || report.triage.level === "CRITICAL" ? <ReportIcon name="warning" /> : <CircleHelp size={20} aria-hidden="true" />}Review priority: {appearance.label}</span>;
}

export type ReportSelectionProps = { onSelectReport: (report: GovernmentReport) => void; onViewReport: (report: GovernmentReport) => void; reports: ReturnType<typeof useGovernmentReports>; status: string; setStatus: (status: string) => void };

export default function GovernmentReports({ onSelectReport, onViewReport, reports, status, setStatus }: ReportSelectionProps) {
  const filters = useRef<HTMLDivElement>(null);
  useEffect(() => { filters.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [status]);
  return <div className="min-w-0 max-w-full space-y-4 overflow-hidden p-5">
    <div ref={filters} role="group" aria-label="Review status" data-lenis-prevent className="flex min-w-0 max-w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain p-1" onFocusCapture={event => event.target.scrollIntoView({ block: "nearest", inline: "nearest" })}>{reportFilters.map((filter, index) => { const Icon = filterIcons[index]; return <Button key={filter.value} className="shrink-0 whitespace-nowrap" variant={status === filter.value ? "default" : "outline"} aria-pressed={status === filter.value} onClick={() => setStatus(filter.value)}><Icon size={16} aria-hidden="true" />{filter.label}</Button>; })}</div>
    {status === "DECLINED" && <p className="text-xs text-muted-foreground">Ended shows declined reports only. Closed cases are not included by the report filter API.</p>}
    <p role="status" className="text-sm">{reports.data ? `${reports.data.data.length} reports loaded` : reports.failed ? "Reports unavailable" : ""}</p>
    {reports.failed && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm text-amber-950"><span>{reports.forbidden ? "Government access unavailable. Private reports cleared." : "Reports could not refresh. Retained data may be out of date."}</span><Button variant="outline" disabled={reports.loading} onClick={reports.retry}>Retry</Button></div>}
    {reports.initialLoading && <GovernmentReportSkeleton />}
    <p className="text-xs text-muted-foreground">Effective priority first, then newest reports. Priority is not fire confirmation. Confirming a fire requires a linked case, assigned team, and saved field result.</p>
    <ul className="space-y-3">{reports.data?.data.map(item => <li key={item.id}><article className="relative rounded-xl border bg-white p-4 focus-within:ring-2 focus-within:ring-primary hover:border-primary/50">
      <div className="flex flex-wrap items-center gap-2">{item.observationTypes.map(type => <span key={type} className="flex items-center gap-1 text-xs font-bold"><ReportIcon name={observationAppearance[type].icon} />{observationAppearance[type].label}</span>)}</div>
      <h3 className="mt-3"><button type="button" className="text-left text-xs font-bold after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none" disabled={reports.failed} onClick={() => onSelectReport(item)} aria-label={`Review report ${item.number}`}>{item.number}</button></h3>
      <div className="mt-2"><Priority report={item} /></div><p className="mt-2 whitespace-pre-wrap text-sm">{item.description}</p><p className="mt-2 text-xs">{triageReasons(item.triage)}</p><p className="mt-1 text-xs text-muted-foreground">{triageMissing(item.triage)}</p>
      <p className="mt-3 text-xs text-muted-foreground">Observed {formatTime(item.observedAt)} · {reportStatusLabel(item)}{item.case?.handlingStatus === "CLOSED" ? " · Case closed" : ""}</p>
      {hasPoint(item) && <Button variant="ghost" className="relative z-10 mt-2" disabled={reports.failed} onClick={() => onViewReport(item)}><ReportIcon name="map" />View on map</Button>}
    </article></li>)}</ul>
    {reports.loadingMore && <GovernmentReportSkeleton />}
    {!reports.failed && !reports.loading && reports.data?.data.length === 0 && <FeedEmpty>No matching reports.</FeedEmpty>}
    {reports.hasMore && <Button variant="outline" className="w-full" disabled={reports.loading} onClick={reports.showMore}>Show more</Button>}
  </div>;
}

function initialActionStatus(report: GovernmentReport): ReportActionStatus {
  const current = reportStatus(report);
  return current === "DECLINED" ? "DECLINED" : current === "REVIEWED" || current === "CONFIRMED" ? "REVIEWED" : "IN_PROGRESS";
}

type ReviewProps = {
  user: DashboardUser;
  report: GovernmentReport;
  caseEvidence?: (FieldInput & { id: string })[];
  caseAssignments?: import("@/types/government").CaseDetail["assignments"];
  caseVersion?: number;
  canDraw: boolean;
  onDraft: (dirty: boolean, pending: boolean) => void;
  perimeterDraft: PerimeterDraft | null;
  setPerimeterDraft: Dispatch<SetStateAction<PerimeterDraft | null>>;
};

function ConfirmationReadiness({ user, report, evidence, assignments, pending, onDraft }: { user: DashboardUser; report: GovernmentReport; evidence: (FieldInput & { id: string })[]; assignments: import("@/types/government").CaseDetail["assignments"]; pending: boolean; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const results = eligibleConfirmationEvidence(evidence);
  const confirmed = report.case?.verificationStatus === "CONFIRMED_FIRE";
  const states = [
    { label: "Case prepared", done: !!report.case },
    { label: "Team assigned", done: assignments.some(item => ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(item.status)) },
    { label: "Visible-fire field result", done: results.length > 0 },
    { label: "Fire boundary drawn", done: confirmed },
    { label: "Authorized confirmation", done: confirmed },
  ];
  const active = states.findIndex(item => !item.done);
  return <section className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm" aria-label="Confirmation readiness">
    <header className="border-b border-primary/10 bg-secondary/45 px-5 py-4"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Confirmation workflow</p><h5 className="mt-1 text-lg font-extrabold">Prepare an authorized fire decision</h5><p className="mt-1 text-xs leading-5 text-muted-foreground">A report or hotspot never confirms fire by itself.</p></header>
    <ol className="px-5 py-3">{states.map((step, index) => <li key={step.label} className={`relative flex min-h-12 items-center gap-3 ${index < states.length - 1 ? "after:absolute after:bottom-[-8px] after:left-[15px] after:top-10 after:w-px after:bg-primary/15" : ""}`}><span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border text-xs font-extrabold ${step.done ? "border-emerald-600 bg-emerald-600 text-white" : index === active ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground"}`}>{step.done ? <CircleCheck size={16} aria-hidden="true" /> : index + 1}</span><span className={`min-w-0 flex-1 text-sm font-bold ${index === active ? "text-primary" : step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span><span className={`text-[10px] font-extrabold uppercase tracking-wide ${step.done ? "text-emerald-700" : index === active ? "text-primary" : "text-muted-foreground"}`}>{step.done ? "Done" : index === active ? "Next" : "Waiting"}</span></li>)}</ol>
    <div className="border-t border-primary/10 px-5 py-4">{!report.case ? <><p className="mb-3 text-sm">Start by finding a related open case. If none exists, create a new unverified case.</p><ReportCandidates user={user} report={report} disabled={pending} onDraft={onDraft} /></> : <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold">{report.case?.title || "Reported fire indication"}</p><p className="mt-1 text-xs text-muted-foreground">{verificationLabels[report.case?.verificationStatus as keyof typeof verificationLabels] ?? report.case?.verificationStatus} · {handlingLabels[report.case?.handlingStatus as keyof typeof handlingLabels] ?? report.case?.handlingStatus}</p></div>{results.length > 0 && !confirmed && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">Field result ready</span>}</div><p className="mt-3 text-sm">{confirmed ? "This case is already confirmed." : "Continue in the case workspace. Draw a closed polygon after the assigned team records visible fire, then submit the authorized confirmation."}</p><Button asChild className="mt-3"><Link to={`/dashboard?case=${encodeURIComponent(report.case?.id ?? "")}`}>{confirmed ? "Open confirmed case" : "Continue to case workspace"}</Link></Button></>}</div>
  </section>;
}

export function ReportReview({ user, report, caseEvidence = [], caseAssignments = [], onDraft }: ReviewProps) {
  const reducedMotion = useReducedMotion();
  const initialStatus = initialActionStatus(report);
  const [description, setDescription] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReportActionStatus>(initialStatus);
  const [confirmationIntent, setConfirmationIntent] = useState(false);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [attempted, setAttempted] = useState(false);
  const submitted = useRef<ReportActionInput | null>(null);
  const [publicationDraft, setPublicationDraft] = useState({ dirty: false, pending: false });
  const [candidateDraft, setCandidateDraft] = useState({ dirty: false, pending: false });
  const photoRef = useRef(photos);
  useEffect(() => { photoRef.current = photos; }, [photos]);
  useEffect(() => () => photoRef.current.forEach(photo => URL.revokeObjectURL(photo.preview)), []);
  const save = useGovernmentMutation(user, async () => {
    if (!submitted.current && description.trim().length < 5) throw new Error("Enter a description of at least five characters.");
    const ids: string[] = [];
    for (let index = 0; !submitted.current && index < photos.length; index++) {
      const photo = photos[index];
      try { ids.push(photo.id || await uploadPhoto(user, photo, values => setPhotos(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item)))); }
      catch { throw new Error(`Photo ${index + 1} upload failed. Retry to resume, or remove it before saving.`); }
    }
    setAttempted(true);
    const payload: ReportActionInput = { status: reviewStatus, description: description.trim(), attachmentIds: ids, idempotencyKey: key };
    submitted.current ??= structuredClone(payload);
    try { await submitGovernmentReportAction(report.id, submitted.current); }
    catch (value) {
      if (value && typeof value === "object" && "code" in value && ["VERSION_CONFLICT", "VALIDATION_ERROR", "INVALID_TRANSITION", "INVALID_ATTACHMENT"].includes(String(value.code))) {
        submitted.current = null; setAttempted(false); setKey(crypto.randomUUID());
      }
      throw value;
    }
    submitted.current = null;
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setPhotos([]); setDescription(""); setAttempted(false); setKey(crypto.randomUUID());
  }, undefined, "Report review saved");
  const pending = save.isPending || publicationDraft.pending || candidateDraft.pending;
  const dirty = candidateDraft.dirty || publicationDraft.dirty || !!description || photos.length > 0 || reviewStatus !== initialStatus;
  useEffect(() => { onDraft(dirty, pending); return () => onDraft(false, false); }, [dirty, pending, onDraft]);
  const triage = report.triage;
  const editFromCase = !!report.case && (report.case.reportCount > 1 || report.case.handlingStatus === "CLOSED");
  return <motion.section initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.16 }} aria-label="Report triage review" className="space-y-4 rounded-sm border border-primary/10 bg-white p-4">
    <DraftGuard dirty={dirty} pending={pending} dashboard />
    <h3 className="font-extrabold">What happened</h3>
    <p className="whitespace-pre-wrap text-sm leading-6">{report.description}</p>
    <dl className="space-y-3 text-sm"><div><dt className="font-bold">Observations</dt><dd className="mt-1 flex flex-wrap gap-3">{report.observationTypes.map(type => <span key={type} className="flex items-center gap-2"><ReportIcon name={observationAppearance[type].icon} />{observationAppearance[type].label}</span>)}</dd></div><div><dt className="flex items-center gap-2 font-bold"><ReportIcon name="calendar" />Observed at</dt><dd>{formatTime(report.observedAt)}</dd></div><div><dt className="flex items-center gap-2 font-bold"><ReportIcon name="map" />Location</dt><dd className="whitespace-pre-wrap">{report.locationDescription || "Location description not supplied"}</dd><dd>{report.locationMode === "OBSERVER_POSITION" ? "Observer position, not incident location" : "Estimated incident location"} · {!hasPoint(report) ? "Location unavailable" : `${report.latitude}, ${report.longitude}`}</dd></div></dl>
    <section aria-label="Review priority and source coverage" className="space-y-2 border-t pt-3"><h4><Priority report={report} /></h4><p className="text-sm leading-6">{triageReasons(triage)}</p><p className="text-xs text-muted-foreground">{triageMissing(triage)}</p><dl className="space-y-2 text-xs"><div><dt className="font-bold">Satellite evidence</dt><dd>{triage.satelliteMatch ? `${triage.satelliteMatch.distanceMeters.toFixed(0)} m from the reported incident estimate. ${satelliteTimeDifference(report)}. ${triage.satelliteMatch.acquiredAt ? formatTime(triage.satelliteMatch.acquiredAt) : ""}` : "No nearby match returned. Missing coverage is not evidence of no fire."}</dd></div></dl></section>
    {report.attachments.length > 0 && <section aria-label="Original photos"><h4 className="flex items-center gap-2 text-sm font-bold"><ReportIcon name="photo" />Original photos</h4><ReportPhotos user={user} reportId={report.id} photos={report.attachments} /></section>}
    {!!report.updates?.length && <section aria-label="Citizen follow-ups" className="space-y-3 border-t pt-4"><h4 className="font-extrabold">Citizen follow-ups</h4>{report.updates.map(update => <article key={update.id} className="rounded-lg border border-primary/10 p-3"><p className="whitespace-pre-wrap text-sm">{update.message}</p>{!!update.attachments?.length && <ReportPhotos user={user} reportId={report.id} photos={update.attachments} />}<p className="mt-2 text-xs text-muted-foreground">{update.authorRole === "USER" ? "Reporter" : "Government reviewer"} · {formatTime(update.createdAt)}</p></article>)}</section>}
    <ReportTimeline report={report} user={user} />
    {editFromCase ? <p className="border-t pt-4 text-sm">This report belongs to a grouped or closed case. <Link className="font-bold text-primary underline" to={`/dashboard?case=${encodeURIComponent(report.case!.id)}`}>Continue in the case workspace</Link>.</p> : <form className="space-y-4 border-t pt-4" aria-label="Report action" onSubmit={event => { event.preventDefault(); if (!confirmationIntent) save.mutate(); }}>
      <fieldset disabled={pending} className="space-y-4">
        <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold">Review update</h4><FieldHelp title="Review status">Review status does not confirm a fire. Confirmation is available only in a linked case after an assigned team records a visible-fire field result.</FieldHelp></div>
        <label htmlFor="report-review-status" className="block text-sm font-bold">Status <span aria-hidden="true">*</span><FieldSelect id="report-review-status" required value={confirmationIntent ? "CONFIRM_FIRE" : reviewStatus} disabled={attempted || pending} onValueChange={value => { if (value === "CONFIRM_FIRE") setConfirmationIntent(true); else { setConfirmationIntent(false); setReviewStatus(value as ReportActionStatus); } }} options={[{ value: "IN_PROGRESS", label: "In progress" }, { value: "REVIEWED", label: "Reviewed" }, { value: "CONFIRM_FIRE", label: "Confirm fire" }, { value: "DECLINED", label: "Declined" }]} /></label>
        {!confirmationIntent && <><label htmlFor="report-owner-update" className="block text-sm font-bold">Update for the report owner <span aria-hidden="true">*</span><textarea id="report-owner-update" required aria-required="true" minLength={5} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} className={`${control} min-h-24 py-3`} /><FieldLength value={description} min={5} max={2000} /></label><EvidenceUpload count={photos.length} disabled={attempted || pending} error={photoError} onError={setPhotoError} onFiles={files => setPhotos(current => [...current, ...files.map(file => ({ file, preview: URL.createObjectURL(file), progress: 0 }))])} />{!!photos.length && <ul className="grid grid-cols-3 gap-2">{photos.map((photo, index) => <li key={photo.preview} className="relative h-20 overflow-hidden rounded-sm bg-secondary"><img src={photo.preview} alt={`Selected review evidence ${index + 1}`} className="size-full object-cover" /><button type="button" aria-label={`Remove review evidence ${index + 1}`} onClick={() => { URL.revokeObjectURL(photo.preview); setPhotos(current => current.filter((_, position) => position !== index)); }} className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-forest/80 text-white"><Trash2 size={14} aria-hidden="true" /></button></li>)}</ul>}</>}
        {confirmationIntent ? <ConfirmationReadiness user={user} report={report} evidence={caseEvidence} assignments={caseAssignments} pending={pending} onDraft={setCandidateDraft} /> : <Button disabled={pending || description.trim().length < 5}>{save.isPending ? "Saving…" : attempted ? "Retry unchanged action" : "Save review"}</Button>}
      </fieldset>
      {save.error && <p role="alert" className="text-sm">{save.error.message}</p>}
      {save.isSuccess && <p role="status" className="text-sm">Report review saved privately.</p>}
    </form>}
    {report.reviewStatus === "DECLINED" && <CasePublication user={user} report={report} editing={pending} onDraft={setPublicationDraft} />}
  </motion.section>;
}
