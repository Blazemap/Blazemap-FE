import { useEffect } from "react";
import { Button } from "@/components/ui";
import { requestCaseAnalysis } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import type { DashboardUser } from "@/types";
import type { CaseDetail } from "@/types/government";
import { formatTime } from "@/pages/dashboard/utils";

export default function CaseAnalysis({ user, detail, disabled, onDraft }: { user: DashboardUser; detail: CaseDetail; disabled: boolean; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const run = useGovernmentMutation(user, () => requestCaseAnalysis(detail.id), undefined, "Analysis requested");
  useEffect(() => { onDraft({ dirty: false, pending: run.isPending }); return () => onDraft({ dirty: false, pending: false }); }, [run.isPending, onDraft]);
  return <section aria-label="Case analysis" className="mt-5 space-y-3 border-t pt-4">
    <h4 className="font-bold">AI analysis · Context revision {detail.contextRevision}</h4>
    <p className="text-xs">AI does not verify fires or authorize action; it assesses evidence strength and conditional impact. Running it may use a paid provider.</p>
    <Button variant="outline" disabled={disabled || run.isPending || detail.analyses.some(a => a.status === "RUNNING")} onClick={() => run.mutate()}>{run.isPending ? "Analyzing…" : "Run analysis"}</Button>
    {run.error && <p role="alert" className="text-sm">{run.error.message} Refresh before retrying if the result is uncertain.</p>}
    {!detail.analyses.length && <p role="status" className="text-sm">No analysis recorded.</p>}
    {detail.analyses.map(a => <details key={a.id} open={a.current} className="rounded border p-3 text-sm">
      <summary className="min-h-11 cursor-pointer font-bold">{a.current ? "Current analysis" : "Not current"} · {a.status} · Revision {a.contextRevision}</summary>
      <p className="text-xs">Started {formatTime(a.startedAt)}{a.completedAt && ` · Completed ${formatTime(a.completedAt)}`}</p>
      {a.failureCode && <p role="status">Analysis unavailable: {a.failureCode}</p>}
      {a.output && <div className="mt-3 space-y-3">
        <dl><dt className="font-bold">Evidence strength</dt><dd>{a.output.evidenceLevel}</dd><dt className="mt-2 font-bold">Conditional impact</dt><dd>{a.output.impactLevel}</dd><dt className="mt-2 font-bold">Suggested review priority</dt><dd>{a.output.suggestedPriority} · Does not change operator priority</dd></dl>
        <h5 className="font-bold">Reasons and source citations</h5><ul className="space-y-2">{a.output.reasons.map((r, i) => <li key={i}>{r.text}<p className="break-all text-xs">Sources: {r.sourceIds.join(", ")}</p></li>)}</ul>
        <h5 className="font-bold">Source details from this analysis snapshot</h5>
        {[...new Set([...a.output.reasons.flatMap(r => r.sourceIds), ...a.output.monitoringAreas.flatMap(r => r.sourceIds)])].map(id => { const source = a.sources.find(s => s.id === id); return <details key={id} className="rounded border p-2"><summary className="min-h-11 cursor-pointer break-all">{id}</summary>{source ? <dl className="break-words text-xs"><dt>Source group</dt><dd>{source.group}</dd>{Object.entries(source.facts).map(([key, value]) => <div key={key}><dt className="font-bold">{key}</dt><dd>{value}</dd></div>)}</dl> : <p>Source detail unavailable in this historical snapshot.</p>}</details>; })}
        <h5 className="font-bold">Missing information</h5><ul>{a.output.missingInformation.map((v, i) => <li key={i}>{v}</li>)}</ul>
        <h5 className="font-bold">Suggested checks</h5><ul>{a.output.suggestedChecks.map((v, i) => <li key={i}>{v}</li>)}</ul>
        <h5 className="font-bold">Monitoring areas</h5>{!a.output.monitoringAreas.length && <p>No supported area returned.</p>}<ul>{a.output.monitoringAreas.map((v, i) => <li key={i}>{v.name}: {v.reason}<p className="break-all text-xs">Sources: {v.sourceIds.join(", ")}</p></li>)}</ul>
        <h5 className="font-bold">Limitations</h5><ul>{a.output.limitations.map((v, i) => <li key={i}>{v}</li>)}</ul>
        <p className="text-xs">{a.output.model} · Generated {formatTime(a.output.generatedAt)} · Schema {a.schemaVersion ?? "unknown"} · Prompt {a.promptVersion ?? "unknown"} · Rules {a.ruleVersion ?? "unknown"}</p>
      </div>}
    </details>)}
  </section>;
}
