import { useContext, useEffect, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, FieldLength } from "@/components/ui";
import { createCaseFromReport, createCaseFromReports, linkGovernmentReport } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { ReportAssociationContext } from "@/lib/report-association";
import { reportAssociationAction } from "@/lib/report-grouping";
import type { DashboardUser } from "@/types";
import type { GovernmentReport } from "@/types/government";

export default function ReportCandidates({ user, report, disabled, onDraft }: { user: DashboardUser; report: Pick<GovernmentReport, "id" | "number" | "case">; disabled: boolean; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const picker = useContext(ReportAssociationContext);
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const save = useGovernmentMutation(user, async (related: GovernmentReport | null) => {
    const rationale = reason.trim();
    if (rationale.length < 5) throw new Error("Explain why the reports are related, or why this report needs its own case.");
    if (!related) return (await createCaseFromReport(report.id, rationale)).id;
    const action = reportAssociationAction(report.id, related);
    if (action.kind === "LINK") {
      await linkGovernmentReport(report.id, action.caseId, rationale);
      return action.caseId;
    }
    return (await createCaseFromReports(action.reportIds, `Related reports ${report.number} and ${related.number}`, rationale)).id;
  }, undefined, "Case prepared");
  useEffect(() => { onDraft({ dirty: !!reason, pending: save.isPending }); return () => onDraft({ dirty: false, pending: false }); }, [reason, save.isPending, onDraft]);
  if (report.case) return null;
  const openCase = (caseId: string) => {
    setReason("");
    navigate(`/dashboard?case=${encodeURIComponent(caseId)}`, { replace: true });
  };
  const chooseRelated = () => {
    if (reason.trim().length < 5 || disabled || save.isPending || !picker.available) return;
    picker.start({ sourceId: report.id, apply: related => save.mutate(related, { onSuccess: openCase }) });
  };
  return <section aria-label="Prepare case" className="space-y-4">
    <p className="text-sm leading-6">Check the map for another report from the same incident. Select its document pin. If it already belongs to a case, this report will join that case; otherwise both reports will create one unverified case.</p>
    <label htmlFor={`report-${report.id}-association-reason`} className="block text-xs font-bold">Update for the report owner and grouping rationale<textarea id={`report-${report.id}-association-reason`} required minLength={5} maxLength={2000} value={reason} disabled={disabled || save.isPending} onChange={event => { setReason(event.target.value); save.reset(); }} className="mt-1 min-h-24 w-full rounded-lg border border-input p-3 text-sm" placeholder="Explain the relationship or why field verification is needed." /><FieldLength value={reason} min={5} max={2000} /></label>
    <div className="flex flex-wrap gap-3"><Button type="button" disabled={disabled || save.isPending || reason.trim().length < 5 || !picker.available} onClick={chooseRelated}><Link2 size={16} aria-hidden="true" />{picker.activeSourceId === report.id ? "Select a report pin" : "Select related report on map"}</Button><Button type="button" variant="outline" disabled={disabled || save.isPending || reason.trim().length < 5} onClick={() => save.mutate(null, { onSuccess: openCase })}><Plus size={16} aria-hidden="true" />No related report — create case</Button></div>
    <p className="text-xs leading-5 text-muted-foreground">Hotspots are map indicators only and cannot be selected. A new case stays unverified; assign a team, save field evidence, and draw the boundary before confirmation.</p>
    {save.isPending && <p role="status" className="text-sm text-muted-foreground">Preparing case…</p>}
    {save.error && <p role="alert" className="text-sm text-red-800">{save.error.message}</p>}
  </section>;
}
