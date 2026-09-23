import { useState } from "react";
import { Button, FieldSelect } from "@/components/ui";
import { useQueryGetCases } from "@/hooks/dashboard/useDashboardResource";
import type { DashboardUser } from "@/types";
import { handlingLabels, priorityLabels, verificationLabels } from "@/constants";
import { QueueSkeleton } from "@/pages/monitoring/MonitoringSkeletons";

export default function CaseQueue({ user, onSelect }: { user: DashboardUser; onSelect: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [verification, setVerification] = useState("");
  const [priority, setPriority] = useState("");
  const resource = useQueryGetCases(user, { query: "", verification, priority, page });
  return <section aria-label="Cases" aria-busy={resource.refreshing} className="space-y-3 p-5">
    <h3 className="font-bold">Cases</h3>
    <p className="text-xs text-muted-foreground">Including cases without a mapped location.</p>
    <div className="grid grid-cols-2 gap-3"><label htmlFor="case-queue-verification" className="min-w-0 text-sm">Verification<FieldSelect id="case-queue-verification" value={verification} onValueChange={value => { setVerification(value); setPage(1); }} placeholder="All" options={Object.entries(verificationLabels).map(([value, label]) => ({ value, label }))} /></label><label htmlFor="case-queue-priority" className="min-w-0 text-sm">Priority<FieldSelect id="case-queue-priority" value={priority} onValueChange={value => { setPriority(value); setPage(1); }} placeholder="All" options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))} /></label></div>
    {resource.initialLoading && !resource.data && <QueueSkeleton label="Loading cases" />}
    {resource.failed && <div role="alert"><p>Case queue unavailable.</p><Button variant="outline" onClick={resource.retry}>Retry</Button></div>}
    {resource.data && <><ul className="space-y-2">{resource.data.items.map(c => <li key={c.id} className="rounded border p-3 text-sm"><h4 className="font-bold">{c.number} · {c.title}</h4><p className="mt-1 text-xs text-muted-foreground">{verificationLabels[c.verification]} · {handlingLabels[c.handling]} · {priorityLabels[c.priority]}</p><Button variant="outline" className="mt-3" disabled={resource.loading} onClick={() => onSelect(c.id)}>Open case</Button></li>)}</ul>{resource.data.items.length === 0 && <p>No matching cases.</p>}</>}
    <div className="flex gap-2"><Button variant="outline" disabled={resource.loading || page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" disabled={resource.loading || resource.failed || !resource.data || page * resource.data.pageSize >= resource.data.total} onClick={() => setPage(p => p + 1)}>Next</Button></div>
  </section>;
}
