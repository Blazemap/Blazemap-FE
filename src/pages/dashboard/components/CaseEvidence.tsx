import ConfirmationEvidenceStep, { emptyConfirmationEvidence } from "./ConfirmationEvidenceStep";
import { useEffect, useState } from "react";
import { Button, FieldHelp, FieldLength, FieldSelect } from "@/components/ui";
import type { DashboardUser } from "@/types";
import type { CaseDetail } from "@/types/government";
import { reviewGovernmentReport } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { drawingFrom } from "@/lib/perimeter";
import type { PerimeterEditorProps } from "./CasePerimeter";

const control = "mt-1 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";
export default function CaseEvidence({ user, detail, refresh, onDraft, draft, setDraft, canDraw, reportId, reportReviewStatus }: PerimeterEditorProps & { user: DashboardUser; detail: CaseDetail; refresh: () => void; canDraw: boolean; reportId?: string; reportReviewStatus?: string; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const [status, setStatus] = useState<string>(reportReviewStatus === "DECLINED" ? "DECLINED" : detail.verification === "CONFIRMED_FIRE" ? "CONFIRMED_FIRE" : reportReviewStatus === "UNDER_REVIEW" || reportReviewStatus === "NEEDS_DETAILS" ? "IN_PROGRESS" : "REVIEWED");
  const [description, setDescription] = useState("");
  const [confirmationEvidence, setConfirmationEvidence] = useState(emptyConfirmationEvidence);
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
  const pending = mutation.isPending || !!draft?.pending;
  const confirmationEvidenceDirty = !!(confirmationEvidence.fieldUpdateId || confirmationEvidence.source || confirmationEvidence.observedAt || confirmationEvidence.latitude || confirmationEvidence.longitude);
  const dirty = !!(description || confirmation || (confirming && confirmationEvidenceDirty));
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
    if (!authorized || !canDraw || pending || draft || reportReviewStatus === "DECLINED" || !evidenceId || !detail.fieldUpdates.some(item => item.id === evidenceId && item.assignmentId && item.teamId && item.findings === "VISIBLE_FIRE")) return;
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
      {confirming && <ConfirmationEvidenceStep id="case-confirmation" evidence={detail.fieldUpdates} value={confirmationEvidence} onChange={setConfirmationEvidence} disabled={pending || !!confirmation} />}
      {confirmation && <p role="status" className="text-xs">Draw the required boundary. Confirmation remains unsaved until the closed polygon succeeds.</p>}
      {detail.verification === "CONFIRMED_FIRE" && !confirmation ? <p role="status" className="text-xs">This case is already confirmed. Use the separate boundary revision flow for audited changes.</p> : !confirmation && (confirming ? <><p className="text-xs">Select an existing visible-fire result, then draw the required closed boundary.</p><Button type="button" disabled={!authorized || !canDraw || pending || !!draft || !detail.fieldUpdates.some(item => item.id === confirmationEvidence.fieldUpdateId && item.assignmentId && item.teamId && item.findings === "VISIBLE_FIRE") || reportReviewStatus === "DECLINED"} onClick={startDrawing}>Draw fire boundary</Button></> : <Button disabled={!reportId}>{pending ? "Saving…" : "Save"}</Button>)}
    </fieldset>{mutation.error && <div role="alert"><p>{mutation.error.message}</p><Button type="button" variant="outline" onClick={refresh}>Refresh case</Button></div>}</form>}
  </section>;
}
