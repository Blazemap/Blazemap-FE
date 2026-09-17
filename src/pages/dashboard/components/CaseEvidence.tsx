import { useState } from "react";
import { Button } from "@/components/ui";
import type { DashboardUser } from "@/types";
import type { CaseDetail, FieldFinding, VerificationInput } from "@/types/government";
import { recordField, verifyGovernmentCase } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { formatTime } from "@/pages/dashboard/utils";

const control = "mt-1 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";
export default function CaseEvidence({ user, detail, refresh }: { user: DashboardUser; detail: CaseDetail; refresh: () => void }) {
  const [findings, setFindings] = useState<FieldFinding>("INCONCLUSIVE");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [observed, setObserved] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [outcome, setOutcome] = useState<VerificationInput["outcome"]>("INCONCLUSIVE");
  const [reason, setReason] = useState("");
  const [authority, setAuthority] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reviewedVersion, setReviewedVersion] = useState<number | null>(null);
  const field = detail.fieldUpdates.find(item => item.id === fieldId);
  const fieldMutation = useGovernmentMutation(user, async () => {
    const date = new Date(observed);
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) throw new Error("Enter the actual observation time, not a future time.");
    const hasPoint = latitude.trim() !== "" || longitude.trim() !== "";
    if (hasPoint && (!latitude.trim() || !longitude.trim() || !Number.isFinite(Number(latitude)) || Math.abs(Number(latitude)) > 90 || !Number.isFinite(Number(longitude)) || Math.abs(Number(longitude)) > 180)) throw new Error("Provide valid latitude and longitude together.");
    const id = await recordField(detail.id, { findings, description: description.trim(), source: source.trim(), observedAt: date.toISOString(), latitude: hasPoint ? Number(latitude) : null, longitude: hasPoint ? Number(longitude) : null });
    setFieldId(id); setConfirmed(false);
    return id;
  });
  const compatible = !!field && (outcome === "INCONCLUSIVE" || outcome === "CONFIRMED_FIRE" && field.findings === "VISIBLE_FIRE" || outcome === "NOT_FIRE" && field.findings === "NO_INDICATION");
  const decision = useGovernmentMutation(user, async () => {
    if (!compatible || !field || !confirmed || reviewedVersion !== detail.version) throw new Error("Select and review recorded field evidence against the current case version first.");
    await verifyGovernmentCase(detail.id, { outcome, fieldUpdateId: field.id, version: detail.version, reason: reason.trim(), authorityReference: authority.trim() });
    setConfirmed(false);
  }, "canConfirmIncidents");
  return <section className="mt-5 space-y-4 border-t pt-4" aria-label="Field evidence and verification">
    <h4 className="font-extrabold">Field evidence and verification</h4>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); fieldMutation.mutate(); }}><fieldset disabled={fieldMutation.isPending || decision.isPending} className="space-y-3"><legend className="text-sm font-bold">1. Record actual field evidence</legend>
      <label className="block text-xs font-bold">Findings<select className={control} value={findings} onChange={event => { setFindings(event.target.value as FieldFinding); fieldMutation.reset(); }}>{["VISIBLE_FIRE", "SMOKE_ONLY", "NO_INDICATION", "INCONCLUSIVE", "UNREACHABLE"].map(value => <option key={value} value={value}>{value.toLowerCase().replaceAll("_", " ")}</option>)}</select></label>
      <label className="block text-xs font-bold">Evidence source<input required minLength={3} maxLength={300} className={control} value={source} onChange={event => { setSource(event.target.value); fieldMutation.reset(); }} /></label>
      <label className="block text-xs font-bold">Observed at (local time)<input type="datetime-local" required className={control} value={observed} onChange={event => { setObserved(event.target.value); fieldMutation.reset(); }} /></label>
      <label className="block text-xs font-bold">Field description<textarea required minLength={5} maxLength={2000} className={`${control} py-2`} value={description} onChange={event => { setDescription(event.target.value); fieldMutation.reset(); }} /></label>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold">Latitude<input type="number" step="any" min={-90} max={90} className={control} value={latitude} onChange={event => { setLatitude(event.target.value); fieldMutation.reset(); }} /></label><label className="text-xs font-bold">Longitude<input type="number" step="any" min={-180} max={180} className={control} value={longitude} onChange={event => { setLongitude(event.target.value); fieldMutation.reset(); }} /></label></div>
      <p className="text-xs text-muted-foreground">Coordinates describe the field finding, not an observer guess. Leave both blank if unknown. Evidence alone does not confirm a fire.</p>
      <Button type="submit" disabled={fieldMutation.isSuccess}>{fieldMutation.isPending ? "Recording…" : fieldMutation.isSuccess ? "Evidence recorded" : "Record field evidence"}</Button></fieldset>
      {fieldMutation.error && <p role="alert" className="text-sm">{fieldMutation.error.message}</p>}
    </form>
    {user.canConfirmIncidents ? <form className="space-y-3 border-t pt-4" onSubmit={event => { event.preventDefault(); decision.mutate(); }}><fieldset className="space-y-3" disabled={fieldMutation.isPending || decision.isPending}><legend className="text-sm font-bold">2. Make an authorized decision</legend>
      <label className="block text-xs font-bold">Recorded evidence<select required className={control} value={fieldId} onChange={event => { setFieldId(event.target.value); setConfirmed(false); decision.reset(); }}><option value="">Select field evidence</option>{detail.fieldUpdates.map(item => <option key={item.id} value={item.id}>{item.findings} · {formatTime(item.observedAt)} · {item.source}</option>)}</select></label>
      {field && <div className="rounded-lg bg-white p-3 text-xs"><p>{field.description}</p><p className="mt-2">Source: {field.source} · Observed {formatTime(field.observedAt)}</p><p className="mt-2">{field.latitude === null ? "No field coordinates recorded" : `${field.latitude}, ${field.longitude}`}</p></div>}
      <label className="block text-xs font-bold">Decision<select className={control} value={outcome} onChange={event => { setOutcome(event.target.value as VerificationInput["outcome"]); setConfirmed(false); decision.reset(); }}><option value="INCONCLUSIVE">Inconclusive (does not clear prior verification)</option><option value="CONFIRMED_FIRE">Confirm fire</option><option value="NOT_FIRE">Not fire</option></select></label>
      {!compatible && field && <p className="text-xs text-amber-950">Confirmation requires visible fire. Not-fire decisions require no-indication inspection evidence.</p>}
      <label className="block text-xs font-bold">Decision reason<textarea required minLength={5} maxLength={2000} className={`${control} py-2`} value={reason} onChange={event => { setReason(event.target.value); setConfirmed(false); }} /></label>
      <label className="block text-xs font-bold">Authority reference<input required minLength={3} maxLength={500} className={control} value={authority} onChange={event => { setAuthority(event.target.value); setConfirmed(false); }} /></label>
      <label className="flex min-h-11 items-start gap-2 text-xs"><input type="checkbox" required checked={confirmed && reviewedVersion === detail.version} onChange={event => { setConfirmed(event.target.checked); setReviewedVersion(event.target.checked ? detail.version : null); }} className="mt-1 size-4 shrink-0" />I reviewed this evidence and authorize this decision using case version {detail.version}. Publication remains separate.</label>
      <Button type="submit" disabled={!compatible || !confirmed || reviewedVersion !== detail.version}>{decision.isPending ? "Saving decision…" : "Save verification decision"}</Button></fieldset>
      {decision.error && <div role="alert" className="text-sm"><p>{decision.error.message}</p><Button type="button" variant="outline" onClick={() => { setConfirmed(false); refresh(); }}>Refresh case and review again</Button></div>}
      {decision.isSuccess && <p role="status" className="text-sm">Decision saved. No publication was created.</p>}
    </form> : <p className="text-xs">Your account can record evidence but cannot authorize verification.</p>}
  </section>;
}
