import ConfirmationEvidenceStep, { emptyConfirmationEvidence } from "./ConfirmationEvidenceStep";
import { useEffect, useState } from "react";
import { Button, FieldHelp, FieldLength, FieldSelect } from "@/components/ui";
import type { DashboardUser } from "@/types";
import type { CaseDetail } from "@/types/government";
import { recordField, reviewGovernmentReport } from "@/api/dashboard/government";
import IncidentPointInput from "./IncidentPointInput";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { drawingFrom } from "@/lib/perimeter";
import { eligibleConfirmationEvidence } from "@/lib/government-confirmation";
import type { PerimeterEditorProps } from "./CasePerimeter";

const control = "mt-1 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";
function fieldObservationTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) throw new Error("Enter the actual field observation time.");
  return date.toISOString();
}
export default function CaseEvidence({ user, detail, refresh, onDraft, draft, setDraft, canDraw, reportId, reportReviewStatus }: PerimeterEditorProps & { user: DashboardUser; detail: CaseDetail; refresh: () => void; canDraw: boolean; reportId?: string; reportReviewStatus?: string; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const [status, setStatus] = useState<string>(reportReviewStatus === "DECLINED" ? "DECLINED" : detail.verification === "CONFIRMED_FIRE" ? "CONFIRMED_FIRE" : reportReviewStatus === "UNDER_REVIEW" || reportReviewStatus === "NEEDS_DETAILS" ? "IN_PROGRESS" : "REVIEWED");
  const [description, setDescription] = useState("");
  const [confirmationEvidence, setConfirmationEvidence] = useState(emptyConfirmationEvidence);
  const [recording, setRecording] = useState(false);
  const [assignmentId, setAssignmentId] = useState("");
  const [source, setSource] = useState("");
  const [observedAt, setObservedAt] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [observation, setObservation] = useState("");
  const eligibleAssignments = detail.assignments.filter(item => ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(item.status));
  const existingResults = eligibleConfirmationEvidence(detail.fieldUpdates);
  const evidenceReady = existingResults.some(item => item.id === confirmationEvidence.fieldUpdateId);
  const selectedAssignment = eligibleAssignments.find(item => item.id === assignmentId);
  const confirmation = draft?.caseId === detail.id && !!draft.confirmation;
  const selectedStatus = confirmation ? "CONFIRMED_FIRE" : status;
  const confirming = selectedStatus === "CONFIRMED_FIRE" && (detail.verification !== "CONFIRMED_FIRE" || confirmation);
  const authorized = user.role === "ADMIN" && user.canConfirmIncidents;
  const mutation = useGovernmentMutation(user, async (requested?: string) => {
    const nextStatus = requested ?? (confirmation ? "CONFIRMED_FIRE" : status);
    if (nextStatus === "CONFIRMED_FIRE") throw new Error("Complete the drawing before saving confirmation.");
    if (nextStatus === "REVIEWED" || nextStatus === "DECLINED") {
      if (!reportId) throw new Error("Open a report to change its review disposition.");
      await reviewGovernmentReport(reportId, nextStatus, description.trim());
    } else if (reportId) await reviewGovernmentReport(reportId, "UNDER_REVIEW", description.trim());
    else throw new Error("Open a report to change its review status.");
    setDescription("");
  }, undefined, "Review update saved");
  const evidence = useGovernmentMutation(user, async () => {
    if (!selectedAssignment) throw new Error("Select an accepted or in-progress assignment.");
    const timestamp = fieldObservationTime(observedAt);
    const lat = Number(latitude), lng = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) throw new Error("Select the actual field observation point.");
    const fieldUpdateId = await recordField(detail.id, { findings: "VISIBLE_FIRE", description: observation.trim(), source: source.trim(), teamId: selectedAssignment.teamId, assignmentId: selectedAssignment.id, observedAt: timestamp, latitude: lat, longitude: lng });
    refresh();
    setConfirmationEvidence(value => ({ ...value, fieldUpdateId }));
    setRecording(false);
    setAssignmentId(""); setSource(""); setObservedAt(""); setLatitude(""); setLongitude(""); setObservation("");
  }, undefined, "Field observation recorded");
  const pending = mutation.isPending || evidence.isPending || !!draft?.pending;
  const confirmationEvidenceDirty = !!(confirmationEvidence.fieldUpdateId || confirmationEvidence.source || confirmationEvidence.observedAt || confirmationEvidence.latitude || confirmationEvidence.longitude);
  const dirty = !!(description || confirmation || recording && (assignmentId || source || observedAt || latitude || longitude || observation) || (confirming && confirmationEvidenceDirty));
  useEffect(() => { onDraft({ dirty, pending }); }, [dirty, pending, onDraft]);
  useEffect(() => () => onDraft({ dirty: false, pending: false }), [onDraft]);
  function selectStatus(value: string) {
    mutation.reset();
    if (value !== "CONFIRMED_FIRE" && (confirmation || confirmationEvidenceDirty) && !window.confirm("Discard the unsaved confirmation evidence and boundary?")) return;
    if (confirmation) setDraft(null);
    if (value !== "CONFIRMED_FIRE") setConfirmationEvidence(emptyConfirmationEvidence());
    setStatus(value);
  }
  function startDrawing() {
    const evidenceId = confirmationEvidence.fieldUpdateId;
    if (!authorized || !canDraw || pending || draft || reportReviewStatus === "DECLINED" || !evidenceId || !evidenceReady) return;
    setDraft({ caseId: detail.id, version: detail.version, drawing: drawingFrom(null), history: [], observedAt: "", source: "", reason: description, authority: "", pending: false, fit: 1, confirmation: { fieldUpdateId: evidenceId, reuseFieldObservation: true } });
    setDescription("");
  }
  return <section className="mt-5 space-y-4 border-t pt-4" aria-label="Operator status update">
    {(reportId || detail.verification !== "CONFIRMED_FIRE") && <form className="space-y-3" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}><fieldset disabled={pending || (!!draft && !confirmation)} className="space-y-3">
      <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold">Review update</h4><FieldHelp title="Review and case status">Review updates are for the report owner. Declining a report does not verify that there is no fire. Case handling tracks the response separately; a verified finding requires actual inspection evidence.</FieldHelp></div>
      <label htmlFor="case-review-status" className="block text-sm font-bold">Status <span aria-hidden="true">*</span><FieldSelect id="case-review-status" required disabled={pending || (!!draft && !confirmation)} value={selectedStatus} onValueChange={selectStatus} options={[["REVIEWED", "Reviewed"], ["IN_PROGRESS", "In progress"], ["CONFIRMED_FIRE", "Confirmed"], ["DECLINED", "Declined"]].map(([value, label]) => ({ value, label, disabled: value !== "CONFIRMED_FIRE" && !reportId }))} /></label>
      <p id="case-description-help" className="text-xs text-muted-foreground">Private update for the report owner (5–2,000 characters).</p>
      <label className="block text-sm font-bold">Update for the report owner <span aria-hidden="true">*</span><textarea aria-describedby="case-description-help" required aria-required="true" minLength={5} maxLength={2000} className={`${control} py-2`} value={confirmation ? draft.reason : description} onChange={event => { if (confirmation) setDraft(current => current ? { ...current, reason: event.target.value } : current); else setDescription(event.target.value); }} /><FieldLength value={confirmation ? draft.reason : description} min={5} max={2000} /></label>
      {!authorized && <p role="status" className="text-xs">Confirmation requires an active, email-verified ADMIN account.</p>}
      {reportReviewStatus === "DECLINED" && <p className="text-xs">Reopen report review before confirming its linked case. Decline and case verification are independent.</p>}
      {!canDraw && <p className="text-xs">Open this case on the map to select confirmed fire.</p>}
      {confirming && !confirmation && !eligibleAssignments.length && !existingResults.length && <p role="status" className="rounded-lg border border-primary/15 bg-secondary/25 p-3 text-sm">Use <strong>Accept assignment</strong> in the Assignments section above. Once the team starts field work, record its observation here.</p>}
      {confirming && !confirmation && eligibleAssignments.length > 0 && !existingResults.length && !recording && <div className="rounded-lg border border-primary/15 bg-secondary/25 p-3 text-sm"><p>Has an assigned team observed fire at the location? Record its observation here before drawing the boundary.</p><Button type="button" variant="outline" className="mt-3" disabled={pending} onClick={() => setRecording(true)}>Record team observation</Button></div>}
      {confirming && existingResults.length > 0 && <ConfirmationEvidenceStep id="case-confirmation" evidence={detail.fieldUpdates} value={confirmationEvidence} onChange={setConfirmationEvidence} disabled={pending || !!confirmation} />}
      {confirmation && <p role="status" className="text-xs">Draw the boundary on the map, then save the confirmation and boundary together.</p>}
      {detail.verification === "CONFIRMED_FIRE" && !confirmation ? <p role="status" className="text-xs">This case is already confirmed. Use the separate boundary revision flow for audited changes.</p> : !confirmation && (confirming ? evidenceReady && <Button type="button" disabled={!authorized || !canDraw || pending || !!draft || reportReviewStatus === "DECLINED"} onClick={startDrawing}>Draw fire boundary</Button> : <Button disabled={!reportId}>{pending ? "Saving…" : "Save"}</Button>)}
     </fieldset>{mutation.error && <div role="alert"><p>{mutation.error.message}</p><Button type="button" variant="outline" onClick={refresh}>Refresh case</Button></div>}</form>}
     {recording && confirming && !confirmation && <form className="space-y-3 rounded-lg border border-primary/15 bg-white p-4" onSubmit={event => { event.preventDefault(); evidence.mutate(); }}><h4 className="font-bold">Record visible-fire result</h4><p className="text-xs text-muted-foreground">Record only an actual observation from an assigned field team, not a report estimate.</p><fieldset disabled={pending} className="space-y-3"><label htmlFor="visible-fire-assignment" className="block text-sm font-bold">Assigned team <span aria-hidden="true">*</span><FieldSelect id="visible-fire-assignment" required value={assignmentId} onValueChange={setAssignmentId} placeholder="Select accepted field assignment" options={eligibleAssignments.map(item => ({ value: item.id, label: item.team.name }))} /></label><label htmlFor="visible-fire-observed" className="block text-sm font-bold">Observed (local time) <span aria-hidden="true">*</span><input id="visible-fire-observed" type="datetime-local" required value={observedAt} onChange={event => setObservedAt(event.target.value)} className={control} /></label><label htmlFor="visible-fire-source" className="block text-sm font-bold">Observation source <span aria-hidden="true">*</span><input id="visible-fire-source" required minLength={3} maxLength={300} value={source} onChange={event => setSource(event.target.value)} className={control} /></label><label htmlFor="visible-fire-description" className="block text-sm font-bold">Observed findings <span aria-hidden="true">*</span><textarea id="visible-fire-description" required minLength={5} maxLength={2000} value={observation} onChange={event => setObservation(event.target.value)} className={`${control} py-2`} /></label><IncidentPointInput latitude={latitude} longitude={longitude} disabled={pending} onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} /><div className="flex flex-wrap gap-2"><Button type="submit" disabled={!selectedAssignment || !source.trim() || !observedAt || !observation.trim() || !latitude.trim() || !longitude.trim() || pending}>{evidence.isPending ? "Recording…" : "Record result"}</Button><Button type="button" variant="outline" onClick={() => { setRecording(false); setAssignmentId(""); setSource(""); setObservedAt(""); setLatitude(""); setLongitude(""); setObservation(""); evidence.reset(); }}>Cancel</Button></div></fieldset>{evidence.error && <p role="alert" className="text-sm">{evidence.error.message}</p>}</form>}
   </section>;
}
