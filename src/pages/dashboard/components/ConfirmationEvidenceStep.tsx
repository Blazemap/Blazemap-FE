import { FieldSelect } from "@/components/ui";
import { eligibleConfirmationEvidence, type ConfirmationEvidenceRecord } from "@/lib/government-confirmation";
import { formatTime } from "@/pages/dashboard/utils";

export type ConfirmationEvidenceValue = {
  mode: "existing";
  fieldUpdateId: string;
  description: string;
  source: string;
  observedAt: string;
  latitude: string;
  longitude: string;
};

export const emptyConfirmationEvidence = (): ConfirmationEvidenceValue => ({ mode: "existing", fieldUpdateId: "", description: "", source: "", observedAt: "", latitude: "", longitude: "" });

export default function ConfirmationEvidenceStep({ id, evidence, value, onChange, disabled = false }: {
  id: string;
  evidence: ConfirmationEvidenceRecord[];
  value: ConfirmationEvidenceValue;
  onChange: (value: ConfirmationEvidenceValue) => void;
  disabled?: boolean;
  allowReportEstimate?: boolean;
  reportLabel?: string;
  requireDescription?: boolean;
  recordDisabled?: boolean;
  onRecord?: () => void;
  recording?: boolean;
  error?: string;
}) {
  const eligible = eligibleConfirmationEvidence(evidence);
  const selected = eligible.find(item => item.id === value.fieldUpdateId);
  return <section aria-labelledby={`${id}-heading`} className="space-y-3 rounded-lg border border-primary/15 bg-secondary/25 p-4">
    <div><h5 id={`${id}-heading`} className="text-sm font-extrabold">Assigned field result</h5><p className="mt-1 text-xs text-muted-foreground">Only a coordinate-backed visible-fire result from a team assigned to this case can support confirmation.</p></div>
    {!eligible.length ? <p role="status" className="rounded-md bg-white p-3 text-sm">No eligible result yet. Assign a team, move the assignment into field work, and record its result first.</p> : <>
      <label htmlFor={`${id}-existing`} className="block text-xs font-bold">Visible-fire result <span aria-hidden="true">*</span><FieldSelect id={`${id}-existing`} required disabled={disabled} value={value.fieldUpdateId} onValueChange={fieldUpdateId => onChange({ ...value, fieldUpdateId })} placeholder="Select assigned field result" options={eligible.map(item => ({ value: item.id, label: `${item.assignment?.team.name ?? "Assigned team"} · ${formatTime(item.observedAt)} · ${item.source}` }))} /></label>
      {selected && <div className="rounded-md bg-white p-3 text-xs"><p className="whitespace-pre-wrap">{("description" in selected && typeof selected.description === "string" && selected.description) || "No observation note supplied."}</p><p className="mt-2 font-bold">{selected.assignment?.team.name}</p><p className="mt-1 text-muted-foreground">{selected.source} · {formatTime(selected.observedAt)}</p></div>}
    </>}
  </section>;
}
