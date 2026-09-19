import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { associateGovernmentHotspot, createCaseFromReport, linkGovernmentReport } from "@/api/dashboard/government";
import { useGovernmentMutation, useReportCandidates } from "@/hooks/dashboard/useGovernment";
import type { DashboardUser } from "@/types";
import type { GovernmentReport } from "@/types/government";
import { formatTime } from "@/pages/dashboard/utils";

export default function ReportCandidates({ user, report, disabled, onDraft, kind = "reports" }: { user: DashboardUser; report: Pick<GovernmentReport, "id" | "case">; kind?: "reports" | "hotspots"; disabled: boolean; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const [distance, setDistance] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [criteria, setCriteria] = useState<{ distance: number; hours: number } | null>(null);
  const candidates = useReportCandidates(user, report.id, criteria, kind);
  const save = useGovernmentMutation(user, async (caseId: string | null) => {
    if (reason.trim().length < 5) throw new Error("Enter an association rationale.");
    if (kind === "hotspots") await associateGovernmentHotspot(report.id, caseId, reason.trim());
    else if (caseId) await linkGovernmentReport(report.id, caseId, reason.trim());
    else await createCaseFromReport(report.id, reason.trim());
    setReason("");
  });
  useEffect(() => { onDraft({ dirty: !!reason, pending: save.isPending }); return () => onDraft({ dirty: false, pending: false }); }, [reason, save.isPending, onDraft]);
  if (report.case) return <p className="text-xs">Linked case: {report.case.number}. Association is not confirmation.</p>;
  return <section aria-label="Candidate cases" className="space-y-3 border-t pt-3">
    <h4 className="font-bold">Associate indications with a case</h4>
    <p className="text-xs">Enter search limits for this review. Suggestions compare estimated locations and observation times; these are not approved association rules.</p>
    <form onSubmit={event => { event.preventDefault(); setCriteria({ distance: Number(distance), hours: Number(hours) }); }}>
      <fieldset disabled={disabled || save.isPending} className="space-y-2">
        <label className="block text-sm">Maximum distance (m)<input className="block min-h-11 w-full rounded border px-3" type="number" required min={1} max={100000} step={1} value={distance} onChange={e => setDistance(e.target.value)} /></label>
        <label className="block text-sm">Observation window (hours)<input className="block min-h-11 w-full rounded border px-3" type="number" required min={0.01} max={168} step="any" value={hours} onChange={e => setHours(e.target.value)} /></label>
        <Button disabled={candidates.loading}>Find candidates</Button>
      </fieldset>
    </form>
    {candidates.loading && <p role="status">Loading candidates…</p>}
    {candidates.failed && <p role="alert">Candidates unavailable. Search again before associating.</p>}
    {candidates.data && !candidates.failed && <><p className="text-xs">{candidates.data.limitation}</p>{!candidates.data.eligible && <p>Incident estimate required; observer position cannot be used for matching.</p>}{candidates.data.eligible && !candidates.data.items.length && <p>No candidates within the entered limits.</p>}</>}
    <label className="block text-sm">Association rationale<textarea className="block min-h-20 w-full rounded border p-3" maxLength={2000} value={reason} disabled={disabled || save.isPending} onChange={e => setReason(e.target.value)} /></label>
    <ul className="space-y-3">{!candidates.failed && candidates.data?.items.map(c => <li key={c.id} className="rounded border p-3 text-sm"><p className="font-bold">{c.number} · {c.title}</p><p>{c.distanceMeters.toFixed(0)} m · {c.timeDifferenceHours.toFixed(2)} hours apart</p><p className="break-all text-xs">Evidence {c.matchedObservationId} · {formatTime(c.matchedObservedAt)}</p><Button variant="outline" disabled={disabled || save.isPending || candidates.loading || reason.trim().length < 5} onClick={() => save.mutate(c.id)}>Link indication</Button></li>)}</ul>
    <Button variant="outline" disabled={disabled || save.isPending || reason.trim().length < 5} onClick={() => save.mutate(null)}>Create and link unverified case</Button>
    {save.isSuccess && <p role="status">Indication linked. Review the case queue; association does not confirm fire.</p>}
    {save.error && <p role="alert">{save.error.message}</p>}
  </section>;
}
