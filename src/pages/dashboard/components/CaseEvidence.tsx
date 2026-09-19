import { useEffect, useState } from "react";
import { Button, FieldSelect } from "@/components/ui";
import type { DashboardUser } from "@/types";
import type { CaseDetail, FieldFinding } from "@/types/government";
import { recordField, verifyGovernmentCase, updateGovernmentHandling, reviewGovernmentReport } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { drawingFrom } from "@/lib/perimeter";
import { formatTime } from "@/pages/dashboard/utils";
import type { PerimeterEditorProps } from "./CasePerimeter";

const control = "mt-1 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";
export default function CaseEvidence({ user, detail, refresh, onDraft, draft, setDraft, canDraw, reportId, reportReviewStatus }: PerimeterEditorProps & { user: DashboardUser; detail: CaseDetail; refresh: () => void; canDraw: boolean; reportId?: string; reportReviewStatus?: string; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const [status, setStatus] = useState<string>(reportReviewStatus === "DECLINED" ? "DECLINED" : detail.verification === "CONFIRMED_FIRE" ? "CONFIRMED_FIRE" : reportReviewStatus === "UNDER_REVIEW" || reportReviewStatus === "NEEDS_DETAILS" ? "IN_PROGRESS" : "REVIEWED");
  const [description, setDescription] = useState("");
  const [handling, setHandling] = useState(detail.handling);
  const handlingMutation = useGovernmentMutation(user, async () => { await updateGovernmentHandling(detail.id, detail.version, handling, description.trim()); setDescription(""); });
  const [fieldId, setFieldId] = useState("");
  const [findings, setFindings] = useState<FieldFinding>("INCONCLUSIVE");
  const [source, setSource] = useState("");
  const [observed, setObserved] = useState("");
  const [fieldDescription, setFieldDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const field = detail.fieldUpdates.find(item => item.id === fieldId);
  const confirmation = draft?.caseId === detail.id && !!draft.confirmation;
  const selectedStatus = confirmation ? "CONFIRMED_FIRE" : status;
  const authorized = user.role === "ADMIN" && user.canConfirmIncidents;
  const [authority, setAuthority] = useState("");
  const mutation = useGovernmentMutation(user, async (requested?: string) => {
    const selectedStatus = requested ?? (confirmation ? "CONFIRMED_FIRE" : status);
    if (selectedStatus === "CONFIRMED_FIRE") throw new Error("Complete the drawing before saving confirmation.");
    if (selectedStatus === "REVIEWED" || selectedStatus === "DECLINED") {
      if (!reportId) throw new Error("Open a report to change its review disposition.");
      await reviewGovernmentReport(reportId, selectedStatus, description.trim());
    } else if (selectedStatus === "NOT_FIRE") {
      if (!authorized || field?.findings !== "NO_INDICATION") throw new Error("ADMIN access and no-indication inspection evidence are required.");
      await verifyGovernmentCase(detail.id, { operatorWorkflow: true, outcome: "NOT_FIRE", authorityReference: authority.trim(), fieldUpdateId: field.id, version: detail.version, reason: description.trim(), reporterMessage: description.trim() });
    } else if (reportId) await reviewGovernmentReport(reportId, "UNDER_REVIEW", description.trim());
    else throw new Error("Open a report to change its review status.");
    setDescription("");
  });
  const evidence = useGovernmentMutation(user, async () => {
    const date = new Date(observed);
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) throw new Error("Enter the actual observation time, not a future time.");
    const lat = latitude.trim() ? Number(latitude) : null;
    const lng = longitude.trim() ? Number(longitude) : null;
    if ((lat === null) !== (lng === null) || (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) || (lng !== null && (!Number.isFinite(lng) || Math.abs(lng) > 180))) throw new Error("Enter valid latitude and longitude together.");
    if (["VISIBLE_FIRE", "NO_INDICATION"].includes(findings) && lat === null) throw new Error("Enter the actual observation coordinates for verification evidence.");
    const id = await recordField(detail.id, { findings, description: fieldDescription.trim(), source: source.trim(), observedAt: date.toISOString(), latitude: lat, longitude: lng });
    setFieldId(id);
    if (confirmation) setDraft(current => current?.caseId === detail.id ? { ...current, confirmation: { fieldUpdateId: id } } : current);
    setSource(""); setObserved(""); setFieldDescription(""); setLatitude(""); setLongitude("");
  });
  const pending = handlingMutation.isPending || mutation.isPending || evidence.isPending || !!draft?.pending;
  const dirty = !!(description || authority || source || observed || fieldDescription || latitude || longitude || confirmation);
  useEffect(() => { onDraft({ dirty, pending }); }, [dirty, pending, onDraft]);
  useEffect(() => () => onDraft({ dirty: false, pending: false }), [onDraft]);
  function selectStatus(value: string) {
    mutation.reset();
    if (confirmation && !window.confirm("Discard the unsaved confirmation drawing?")) return;
    if (confirmation) setDraft(null);
    setStatus(value);
  }
  function startDrawing() {
    if (!authorized || !canDraw || pending || draft || reportReviewStatus === "DECLINED") return;
    setDraft({ caseId: detail.id, version: detail.version, drawing: drawingFrom(null), history: [], observedAt: "", source: "", reason: description, authority: "", pending: false, fit: 1, confirmation: { fieldUpdateId: fieldId } });
    setDescription("");
  }
  return <section className="mt-5 space-y-4 border-t pt-4" aria-label="Operator status update">
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}><fieldset disabled={pending || (!!draft && !confirmation)} className="space-y-3">
      <label htmlFor="case-review-status" className="block text-sm font-bold">Status <span aria-hidden="true">*</span><FieldSelect id="case-review-status" required disabled={pending || (!!draft && !confirmation)} value={selectedStatus} onValueChange={selectStatus} options={[["REVIEWED", "Reviewed"], ["IN_PROGRESS", "In progress"], ["CONFIRMED_FIRE", "Confirmed"], ["DECLINED", "Declined"]].map(([value, label]) => ({ value, label, disabled: value !== "CONFIRMED_FIRE" && !reportId }))} /></label>
      <label className="block text-sm font-bold">Description <span aria-hidden="true">*</span><textarea required aria-required="true" minLength={5} maxLength={2000} className={`${control} py-2`} value={confirmation ? draft.reason : description} onChange={event => { if (confirmation) setDraft(current => current ? { ...current, reason: event.target.value } : current); else setDescription(event.target.value); }} /></label>
      <p className="text-xs text-muted-foreground">Visible to report owners, not public News. Declined is a report disposition, not a verified not-fire finding. In progress starts report review; case handling remains separate.</p>
      {!authorized && <p role="status" className="text-xs">Confirmation requires an active, email-verified ADMIN account.</p>}
      {reportReviewStatus === "DECLINED" && <p className="text-xs">Reopen report review before confirming its linked case. Decline and case verification are independent.</p>}
      {!canDraw && <p className="text-xs">Open this case on the map to select confirmed fire.</p>}
      {confirmation && <p role="status" className="text-xs">Draw the boundary now. Confirmation and perimeter remain unsaved until both are validated.</p>}
      {!confirmation && (selectedStatus === "CONFIRMED_FIRE" ? <><p className="text-xs">Selection alone does not confirm fire. Draw a closed boundary, then save it together with actual visible-fire evidence.</p><Button type="button" disabled={!authorized || !canDraw || pending || !!draft || reportReviewStatus === "DECLINED"} onClick={startDrawing}>Draw fire boundary</Button></> : <Button disabled={!reportId}>{pending ? "Saving…" : "Save"}</Button>)}
    </fieldset>{mutation.error && <div role="alert"><p>{mutation.error.message}</p><Button type="button" variant="outline" onClick={refresh}>Refresh case</Button></div>}</form>
    <details className="border-t pt-3"><summary className="min-h-11 cursor-pointer text-sm font-bold">Case handling and verified not-fire finding</summary><p className="text-xs">Separate operational distinctions are preserved. Use the description above for the report owner.</p><label htmlFor="case-handling" className="block text-xs font-bold">Case handling<FieldSelect id="case-handling" disabled={pending || (!!draft && !confirmation)} value={handling} onValueChange={value => setHandling(value as typeof handling)} options={["OPEN", "CHECK_SCHEDULED", "ON_SCENE", "RESPONDING", "MONITORING", "CLOSED"].map(value => ({ value, label: value.toLowerCase().replaceAll("_", " "), disabled: value === "RESPONDING" ? detail.verification !== "CONFIRMED_FIRE" : value === "CLOSED" && detail.activeAssignmentCount > 0 }))} /></label><label className="block text-xs font-bold">Operator-supplied authority note{field?.findings === "NO_INDICATION" && <span aria-hidden="true"> *</span>}<input required={field?.findings === "NO_INDICATION"} aria-required={field?.findings === "NO_INDICATION"} minLength={3} maxLength={500} className={control} value={authority} onChange={event => setAuthority(event.target.value)} /></label><Button disabled={pending || !!draft || description.trim().length < 5 || handling === detail.handling} onClick={() => handlingMutation.mutate()}>Save handling</Button><Button variant="outline" disabled={pending || !!draft || !authorized || authority.trim().length < 3 || field?.findings !== "NO_INDICATION" || description.trim().length < 5} onClick={() => mutation.mutate("NOT_FIRE")}>Record verified not-fire finding</Button><p className="text-xs">Requires selected no-indication inspection evidence and confirmation authority. Does not decline the report.</p>{handlingMutation.error && <p role="alert">{handlingMutation.error.message}</p>}</details>
    <details className="border-t pt-3"><summary className="min-h-11 cursor-pointer text-sm font-bold">Field evidence (required for verification)</summary>
      <fieldset disabled={pending} className="space-y-3"><label htmlFor="recorded-evidence" className="block text-xs font-bold">Recorded evidence{confirmation && <span aria-hidden="true"> *</span>}<FieldSelect id="recorded-evidence" required={confirmation} disabled={pending} value={confirmation ? draft.confirmation!.fieldUpdateId : fieldId} onValueChange={value => { setFieldId(value); if (confirmation) setDraft(current => current ? { ...current, confirmation: { fieldUpdateId: value } } : current); }} placeholder="Select actual field evidence" options={detail.fieldUpdates.map(item => ({ value: item.id, label: `${item.findings.toLowerCase().replaceAll("_", " ")} · ${formatTime(item.observedAt)} · ${item.source}` }))} /></label>
      {field && <p className="whitespace-pre-wrap text-sm">{field.description}<br />{field.source} · {formatTime(field.observedAt)}</p>}
      <p className="text-xs">Confirmation requires a recorded visible-fire observation. Citizen reports and drawings are not substitutes. Perimeter source and time must describe the actual boundary observation, not be inferred from the status description.</p></fieldset>
      <details><summary className="min-h-11 cursor-pointer text-sm font-bold">Record an actual field observation</summary><form className="space-y-3" onSubmit={event => { event.preventDefault(); evidence.mutate(); }}><fieldset disabled={pending || (!!draft && !confirmation)} className="space-y-3">
        <label htmlFor="field-findings" className="block text-xs font-bold">Findings <span aria-hidden="true">*</span><FieldSelect id="field-findings" required disabled={pending || (!!draft && !confirmation)} value={findings} onValueChange={value => setFindings(value as FieldFinding)} options={["VISIBLE_FIRE", "SMOKE_ONLY", "NO_INDICATION", "INCONCLUSIVE", "UNREACHABLE"].map(value => ({ value, label: value.toLowerCase().replaceAll("_", " ") }))} /></label>
        <label className="block text-xs font-bold">Evidence source <span aria-hidden="true">*</span><input required aria-required="true" minLength={3} maxLength={300} className={control} value={source} onChange={event => setSource(event.target.value)} /></label>
        <label className="block text-xs font-bold">Observed at (local time) <span aria-hidden="true">*</span><input type="datetime-local" required aria-required="true" className={control} value={observed} onChange={event => setObserved(event.target.value)} /></label>
        <label className="block text-xs font-bold">Field description <span aria-hidden="true">*</span><textarea required aria-required="true" minLength={5} maxLength={2000} className={`${control} py-2`} value={fieldDescription} onChange={event => setFieldDescription(event.target.value)} /></label>
        <p className="text-xs">Enter actual observation coordinates, not the report location or polygon center. Coordinates are required for visible-fire and no-indication verification.</p>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold">Observation latitude<input type="number" step="any" min={-90} max={90} className={control} value={latitude} onChange={event => setLatitude(event.target.value)} /></label><label className="text-xs font-bold">Observation longitude<input type="number" step="any" min={-180} max={180} className={control} value={longitude} onChange={event => setLongitude(event.target.value)} /></label></div>
        <Button>Record field evidence</Button></fieldset>{confirmation && <p className="text-xs">After recording evidence, review the refreshed case version in the perimeter editor. Your drawing is retained.</p>}{evidence.error && <p role="alert">{evidence.error.message}</p>}</form></details>
    </details>
  </section>;
}
