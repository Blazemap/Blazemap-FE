import CasePublication from "./CasePublication";
import ReportCandidates from "./ReportCandidates";
import { motion, useReducedMotion } from "framer-motion";
import { drawingFrom, drawingPolygon, editDraft, polygonArea, type PerimeterDraft } from "@/lib/perimeter";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { CheckCheck, CircleCheck, CircleHelp, CircleStop, List, LoaderCircle } from "lucide-react";
import { DraftGuard } from "@/components/common";
import { hasPoint, formatTime } from "@/pages/dashboard/utils";
import { Button, EvidenceUpload, FieldHelp, FieldSelect } from "@/components/ui";
import type { DashboardUser, ReportPhoto } from "@/types";
import type { GovernmentReport, ReportActionInput, ReportActionStatus } from "@/types/government";
import ReportPhotos from "@/pages/reports/ReportPhotos";
import { observationAppearance, reportFilters, satelliteTimeDifference, triageAppearance, triageMissing, triageReasons } from "@/lib/report-triage";
import { reportStatus, reportStatusLabel } from "@/lib/report-status";
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
  const appearance = triageAppearance[report.triage.level];
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
    <p className="text-xs text-muted-foreground">Newest reports first. Priority is not fire confirmation. Missing coverage does not mean no fire.</p>
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
  return current === "CONFIRMED" ? "CONFIRMED_FIRE" : current ?? "IN_PROGRESS";
}
export function ReportReview({ user, report, onDraft, perimeterDraft, setPerimeterDraft, canDraw }: { user: DashboardUser; report: GovernmentReport; canDraw: boolean; onDraft: (dirty: boolean, pending: boolean) => void; perimeterDraft: PerimeterDraft | null; setPerimeterDraft: Dispatch<SetStateAction<PerimeterDraft | null>> }) {
  const reducedMotion = useReducedMotion();
  const initialStatus = initialActionStatus(report);
  const [description, setDescription] = useState("");
  const [fieldSource, setFieldSource] = useState("");
  const [fieldTime, setFieldTime] = useState("");
  const [fieldLatitude, setFieldLatitude] = useState("");
  const [fieldLongitude, setFieldLongitude] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReportActionStatus>(initialStatus);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [error, setError] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [attempted, setAttempted] = useState(false);
  const submitted = useRef<ReportActionInput | null>(null);
  const [publicationDraft, setPublicationDraft] = useState({ dirty: false, pending: false });
  const photoRef = useRef(photos);
  const drawingId = `report:${report.id}`;
  const activeDrawing = perimeterDraft?.caseId === drawingId ? perimeterDraft : null;
  let polygonError = "";
  let area: number | null = null;
  if (activeDrawing) {
    try { area = polygonArea(drawingPolygon(activeDrawing.drawing)); }
    catch (value) { polygonError = value instanceof Error ? value.message : "Invalid polygon"; }
  }
  useEffect(() => { photoRef.current = photos; }, [photos]);
  useEffect(() => () => photoRef.current.forEach(photo => URL.revokeObjectURL(photo.preview)), []);
  const save = useGovernmentMutation(user, async () => {
    setError("");
    if (!submitted.current && description.trim().length < 5) throw new Error("Enter a description of at least five characters.");
    let perimeter;
    if (!submitted.current && reviewStatus === "CONFIRMED_FIRE") {
      if (!perimeterDraft || perimeterDraft.caseId !== drawingId) throw new Error("Draw and close the fire boundary before saving.");
      perimeter = drawingPolygon(perimeterDraft.drawing);
      if (fieldSource.trim().length < 3 || !fieldTime || !Number.isFinite(Date.parse(fieldTime)) || Date.parse(fieldTime) > Date.now() || !fieldLatitude.trim() || !fieldLongitude.trim() || !Number.isFinite(Number(fieldLatitude)) || !Number.isFinite(Number(fieldLongitude)) || Math.abs(Number(fieldLatitude)) > 90 || Math.abs(Number(fieldLongitude)) > 180) throw new Error("Enter the actual field observation source, past observation time and valid incident coordinates.");
    }
    if (reviewStatus === "CONFIRMED_FIRE") setPerimeterDraft(current => current?.caseId === drawingId ? { ...current, pending: true } : current);
    const ids: string[] = [];
    for (let index = 0; !submitted.current && index < photos.length; index++) {
      const photo = photos[index];
      try { ids.push(photo.id || await uploadPhoto(user, photo, values => setPhotos(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item)))); }
      catch {
        setPerimeterDraft(current => current?.caseId === drawingId ? { ...current, pending: false } : current);
        throw new Error(`Photo ${index + 1} upload failed. Retry to resume, or remove it before saving.`);
      }
    }
    setAttempted(true);
    setPerimeterDraft(current => current?.caseId === drawingId ? { ...current, attempted: true } : current);
    const base = { description: description.trim(), attachmentIds: ids, idempotencyKey: key };
    const payload: ReportActionInput = reviewStatus === "CONFIRMED_FIRE" ? { ...base, status: "CONFIRMED_FIRE", confirmed: { evidence: { findings: "VISIBLE_FIRE", source: fieldSource.trim(), observedAt: new Date(fieldTime).toISOString(), latitude: Number(fieldLatitude), longitude: Number(fieldLongitude) }, perimeter: perimeter!, authorityReference: "APPLICATION_ADMIN_ROLE", ...(report.case ? { expectedCaseVersion: report.case.version } : {}) } } : { ...base, status: reviewStatus };
    submitted.current ??= structuredClone(payload);
    try { await submitGovernmentReportAction(report.id, submitted.current); }
    catch (value) {
      setPerimeterDraft(current => current?.caseId === drawingId ? { ...current, pending: false } : current);
      if (value && typeof value === "object" && "code" in value && ["VERSION_CONFLICT", "VALIDATION_ERROR", "INVALID_TRANSITION", "INVALID_REFERENCE", "INVALID_ATTACHMENT", "INVALID_REGION", "PUBLICATION_REVIEW_REQUIRED"].includes(String(value.code))) {
        submitted.current = null;
        setAttempted(false);
        setPerimeterDraft(current => current?.caseId === drawingId ? { ...current, attempted: false } : current);
        setKey(crypto.randomUUID());
      }
      throw value;
    }
    submitted.current = null;
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
    setDescription("");
    setFieldSource(""); setFieldTime(""); setFieldLatitude(""); setFieldLongitude("");
    setAttempted(false);
    setKey(crypto.randomUUID());
    setPerimeterDraft(current => current?.caseId === drawingId ? null : current);
  }, reviewStatus === "CONFIRMED_FIRE" ? "canConfirmIncidents" : undefined);
  const [candidateDraft, setCandidateDraft] = useState({ dirty: false, pending: false });
  const pending = save.isPending || publicationDraft.pending || candidateDraft.pending;
  const dirty = !!fieldSource || !!fieldTime || !!fieldLatitude || !!fieldLongitude || candidateDraft.dirty || publicationDraft.dirty || !!description || photos.length > 0 || reviewStatus !== initialStatus || !!activeDrawing;
  useEffect(() => { onDraft(dirty, pending); return () => onDraft(false, false); }, [dirty, pending, onDraft]);
  function selectStatus(value: string) {
    const next = value as ReportActionStatus;
    save.reset();
    if (next !== "CONFIRMED_FIRE" && activeDrawing) {
      if (!window.confirm("Discard the unsaved polygon?")) return;
      setPerimeterDraft(null);
    }
    setReviewStatus(next);
  }
  function startDrawing() {
    if (!canDraw || attempted || pending || !user.canConfirmIncidents || report.case?.verificationStatus === "CONFIRMED_FIRE") return;
    setPerimeterDraft({ caseId: drawingId, version: 1, drawing: drawingFrom(null), history: [], observedAt: "", source: "Operator-mapped report verification", reason: description, authority: "APPLICATION_ADMIN_ROLE", pending: false, fit: 1 });
  }
  function updateDrawing(action: Parameters<typeof editDraft>[1]) {
    setPerimeterDraft(current => current?.caseId === drawingId && !attempted ? editDraft(current, action) : current);
  }
  const alreadyConfirmed = report.case?.verificationStatus === "CONFIRMED_FIRE";
  const confirmationUnavailable = reviewStatus === "CONFIRMED_FIRE" && (!user.canConfirmIncidents || alreadyConfirmed || (!activeDrawing && !canDraw));
  const saveDisabled = pending || (!attempted && (description.trim().length < 5 || confirmationUnavailable || (reviewStatus === "CONFIRMED_FIRE" && (!activeDrawing || !!polygonError))));
  const triage = report.triage;
  return <motion.section initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.16 }} aria-label="Report triage review" className="space-y-4 rounded-sm border border-primary/10 bg-white p-4">
    <DraftGuard dirty={dirty} pending={pending} dashboard />
    <h3 className="font-extrabold">What happened</h3>
    <p className="whitespace-pre-wrap text-sm leading-6">{report.description}</p>
    <dl className="space-y-3 text-sm"><div><dt className="font-bold">Observations</dt><dd className="mt-1 flex flex-wrap gap-3">{report.observationTypes.map(type => <span key={type} className="flex items-center gap-2"><ReportIcon name={observationAppearance[type].icon} />{observationAppearance[type].label}</span>)}</dd></div><div><dt className="flex items-center gap-2 font-bold"><ReportIcon name="calendar" />Observed at</dt><dd>{formatTime(report.observedAt)}</dd></div><div><dt className="flex items-center gap-2 font-bold"><ReportIcon name="map" />Location</dt><dd className="whitespace-pre-wrap">{report.locationDescription || "Location description not supplied"}</dd><dd>{report.locationMode === "OBSERVER_POSITION" ? "Observer position, not incident location" : "Estimated incident location"} · {!hasPoint(report) ? "Location unavailable" : `${report.latitude}, ${report.longitude}`}</dd></div></dl>
    <section aria-label="Review priority and source coverage" className="space-y-2 border-t pt-3"><h4><Priority report={report} /></h4><p className="text-sm leading-6">{triageReasons(triage)}</p><p className="text-xs text-muted-foreground">{triageMissing(triage)}</p><dl className="space-y-2 text-xs"><div><dt className="font-bold">Satellite evidence</dt><dd>{triage.satelliteMatch ? `${triage.satelliteMatch.distanceMeters.toFixed(0)} m from the reported incident estimate. ${satelliteTimeDifference(report)}. ${triage.satelliteMatch.acquiredAt ? formatTime(triage.satelliteMatch.acquiredAt) : ""}` : "No nearby match returned. Missing coverage is not evidence of no fire."}</dd></div><div><dt className="font-bold">Settlement evidence</dt><dd>{triage.settlementMatch ? `${triage.settlementMatch.name || "Unnamed settlement"} · ${triage.settlementMatch.distanceMeters === null ? "Distance unavailable" : `${triage.settlementMatch.distanceMeters.toFixed(0)} m from the reported incident estimate`}` : "No nearby settlement match returned."}</dd></div><div><dt className="font-bold">Assessment time</dt><dd>{formatTime(triage.evaluatedAt)}</dd></div></dl><p className="text-xs text-muted-foreground">Priority is supplied by the server, not fire confirmation. No distance or time threshold is assumed here.</p></section>
    {report.attachments.length > 0 && <section aria-label="Original photos"><h4 className="flex items-center gap-2 text-sm font-bold"><ReportIcon name="photo" />Original photos</h4><ReportPhotos user={user} reportId={report.id} photos={report.attachments} /></section>}
    {!report.case && <section aria-label="Wind and potential impact" className="space-y-2 border-t pt-3"><h4 className="font-bold">Wind and potential impact</h4><p className="text-xs">No linked case wind context is available. A verified region and a current regional forecast are required. Spread speed, arrival times, and affected areas are not predicted.</p></section>}
    <ReportCandidates key={report.id} user={user} report={report} disabled={save.isPending || publicationDraft.pending || attempted || !!activeDrawing} onDraft={setCandidateDraft} />
    <ReportTimeline report={report} user={user} />
    <form className="space-y-3 border-t pt-4" aria-label="Report action" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <fieldset disabled={pending} className="space-y-5">
        <section aria-labelledby="review-update-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-2"><h4 id="review-update-heading" className="text-sm font-bold">Review update</h4><FieldHelp title="Review status">In progress starts review. Reviewed records a completed review without confirming fire. Declined ends this report’s review; it is not a verified not-fire finding. Confirmed requires actual visible-fire evidence and a closed fire boundary.</FieldHelp></div>
        <label htmlFor="report-review-status" className="block text-sm font-bold">Status <span aria-hidden="true">*</span><FieldSelect id="report-review-status" required value={reviewStatus} disabled={attempted || pending} onValueChange={selectStatus} options={[{ value: "IN_PROGRESS", label: "In progress" }, { value: "REVIEWED", label: "Reviewed" }, { value: "CONFIRMED_FIRE", label: "Confirmed" }, { value: "DECLINED", label: "Declined" }]} /></label>
        <label htmlFor="review-description" className="block text-sm font-bold">Update for the report owner <span aria-hidden="true">*</span></label>
        <p id="review-description-help" className="text-xs text-muted-foreground">Explain the review decision or next action in 5–2,000 characters. For confirmation, describe the visible fire observed. This update and any photos are visible to the report owner and government reviewers, not public News.</p>
        <textarea id="review-description" aria-describedby="review-description-help" required aria-required="true" minLength={5} maxLength={2000} disabled={attempted} value={description} onChange={event => setDescription(event.target.value)} className={`${control} min-h-24 py-2`} />
        </section>
        {reviewStatus === "CONFIRMED_FIRE" && <section aria-labelledby="field-observation-heading" className="space-y-3 border-t pt-4">
          <h4 id="field-observation-heading" className="flex items-center gap-2 text-sm font-bold"><ReportIcon name="flame" />Actual field observation</h4>
          <p className="text-xs text-muted-foreground">Required only to confirm fire. Use an actual visible-fire observation, not a citizen report or satellite alert.</p>
          <div className="flex items-center justify-between gap-2"><label htmlFor="field-source" className="text-sm font-bold">Evidence source <span aria-hidden="true">*</span></label><FieldHelp title="Evidence source">Identify who made the field observation or the inspection record it came from, for example a patrol team and its log reference. This is not another description of the review decision.</FieldHelp></div>
          <p id="field-source-help" className="text-xs text-muted-foreground">Name the observing team or inspection record (3–300 characters).</p>
          <input id="field-source" aria-describedby="field-source-help" required aria-required="true" minLength={3} maxLength={300} disabled={attempted} className={control} value={fieldSource} onChange={e => setFieldSource(e.target.value)} />
          <label htmlFor="field-time" className="flex items-center gap-2 text-sm font-bold"><ReportIcon name="calendar" />Actual observation time <span aria-hidden="true">*</span></label>
          <p id="field-time-help" className="text-xs text-muted-foreground">When the fire was seen, in your local time—not when you entered this update. Future times are not allowed.</p>
          <input id="field-time" aria-describedby="field-time-help" required aria-required="true" type="datetime-local" disabled={attempted} className={control} value={fieldTime} onChange={e => setFieldTime(e.target.value)} />
          <div className="flex items-center justify-between gap-2"><h5 className="flex items-center gap-2 text-sm font-bold"><ReportIcon name="map" />Actual incident location</h5><FieldHelp title="Incident coordinates">Enter decimal degrees for the observed fire location. Latitude ranges from −90 to 90; longitude from −180 to 180. Do not copy an observer’s position, the citizen’s estimate, or the drawing’s center.</FieldHelp></div>
          <p id="field-location-help" className="text-xs text-muted-foreground">Coordinates of the fire observed in the field, not the report’s estimated location.</p>
          <label className="block text-sm">Actual incident latitude <span aria-hidden="true">*</span><input aria-describedby="field-location-help" required aria-required="true" type="number" min={-90} max={90} step="any" disabled={attempted} className={control} value={fieldLatitude} onChange={e => setFieldLatitude(e.target.value)} /></label>
          <label className="block text-sm">Actual incident longitude <span aria-hidden="true">*</span><input aria-describedby="field-location-help" required aria-required="true" type="number" min={-180} max={180} step="any" disabled={attempted} className={control} value={fieldLongitude} onChange={e => setFieldLongitude(e.target.value)} /></label>
          <div className="flex items-center justify-between gap-2 border-t pt-3"><h5 className="text-sm font-bold">Fire boundary</h5><FieldHelp title="Confirmation polygon">A polygon is a closed boundary on the map. Add at least three points around the observed fire and close the shape. The boundary and field observation are validated and saved together with this review.</FieldHelp></div>
          {!user.canConfirmIncidents && <p role="status" className="text-xs">Confirmation requires an active, email-verified ADMIN account.</p>}
          {alreadyConfirmed && <p role="status" className="text-xs">This linked case is already confirmed. Open the case and use Revise boundary for a versioned, audited change.</p>}
          {!activeDrawing && <Button type="button" variant="outline" disabled={!canDraw || attempted || !user.canConfirmIncidents || alreadyConfirmed} onClick={startDrawing}>Draw polygon</Button>}
           {activeDrawing && <><p className="text-xs">Click the map to add vertices. Click the first point after at least three vertices to close the polygon.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={attempted || !activeDrawing.history.length} onClick={() => updateDrawing({ type: "undo" })}>Undo</Button><Button type="button" variant="outline" disabled={attempted} onClick={() => updateDrawing({ type: activeDrawing.drawing.closed[activeDrawing.drawing.active] ? "reopen" : "close" })}>{activeDrawing.drawing.closed[activeDrawing.drawing.active] ? "Edit polygon" : "Close polygon"}</Button><Button type="button" variant="outline" disabled={attempted || !activeDrawing.drawing.rings.flat().length} onClick={() => setPerimeterDraft(current => current?.caseId === drawingId ? { ...current, fit: current.fit + 1 } : current)}>Fit drawing</Button><Button type="button" variant="outline" disabled={attempted} onClick={() => setPerimeterDraft(null)}>Cancel drawing</Button></div><p role="status" className="text-xs">{polygonError || `Preview ready · ${area?.toLocaleString("en", { maximumFractionDigits: 2 })} ha (approximate)`}</p></>}
        </section>}
        <section aria-label="Optional evidence photos" className="space-y-3 border-t pt-4">
          <EvidenceUpload count={photos.length} disabled={attempted || pending} error={error} onError={setError} onFiles={files => setPhotos(current => [...current, ...files.map(file => ({ file, preview: URL.createObjectURL(file), progress: 0 }))])} />
          <ul className="space-y-2">{photos.map((photo, index) => <li key={photo.preview} className="flex items-center gap-3 rounded border p-2"><img src={photo.preview} alt={`Selected evidence ${index + 1}`} className="size-16 object-cover" /><span className="min-w-0 flex-1 break-all text-xs">{photo.file.name}{save.isPending && <span role="status" className="mt-1 block bg-secondary p-2 motion-safe:animate-pulse">Uploading {photo.progress}%</span>}{photo.id && " · Ready"}</span><Button type="button" variant="ghost" aria-label={`Remove photo ${index + 1}: ${photo.file.name}`} disabled={attempted || pending} onClick={() => { URL.revokeObjectURL(photo.preview); setPhotos(current => current.filter((_, itemIndex) => itemIndex !== index)); setError(""); }}>Remove</Button></li>)}</ul>
        </section>
        <Button disabled={saveDisabled}>{save.isPending ? "Saving…" : attempted ? "Retry unchanged action" : "Save"}</Button>
      </fieldset>
      {save.error && <p role="alert" className="text-sm">{save.error.message}</p>}
      {attempted && save.error && <p className="text-xs">The result is uncertain. Retry the unchanged form to avoid a duplicate history entry.</p>}
      {save.isSuccess && <p role="status" className="text-sm">Report action saved privately.</p>}
    </form>
    {report.reviewStatus === "DECLINED" && <CasePublication user={user} report={report} editing={pending} onDraft={setPublicationDraft} />}
  </motion.section>;
}
