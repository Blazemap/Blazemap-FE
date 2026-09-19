import { useState } from "react";
import { Button } from "@/components/ui";
import { useQueryGetCases } from "@/hooks/dashboard/useDashboardResource";
import type { DashboardUser } from "@/types";

export default function CaseQueue({ user, onSelect }: { user: DashboardUser; onSelect: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [verification, setVerification] = useState("");
  const [priority, setPriority] = useState("");
  const resource = useQueryGetCases(user, { query: "", verification, priority, page });
  return <section aria-label="Case queue" className="space-y-3 border-t p-5">
    <h3 className="font-bold">Case queue</h3>
    <p className="text-xs">Newest updates first, including cases without a mapped location. Priority is operator-assigned.</p>
    <label className="block text-sm">Verification<select className="block min-h-11 w-full rounded border px-3" value={verification} onChange={e => { setVerification(e.target.value); setPage(1); }}><option value="">All</option><option value="UNVERIFIED">Unverified</option><option value="CONFIRMED_FIRE">Confirmed fire</option><option value="NOT_FIRE">Not fire</option></select></label>
    <label className="block text-sm">Priority<select className="block min-h-11 w-full rounded border px-3" value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}><option value="">All</option>{["HIGH", "MEDIUM", "LOW", "UNASSESSED"].map(v => <option key={v}>{v}</option>)}</select></label>
    {resource.loading && <p role="status">Loading cases…</p>}
    {resource.failed ? <div role="alert"><p>Case queue unavailable.</p><Button variant="outline" onClick={resource.retry}>Retry</Button></div> : <><ul className="space-y-2">{resource.data?.items.map(c => <li key={c.id} className="rounded border p-3 text-sm"><h4 className="font-bold">{c.number} · {c.title}</h4><p>{c.verification} · {c.handling} · {c.priority}</p><Button variant="outline" disabled={resource.loading} onClick={() => onSelect(c.id)}>Review case</Button></li>)}</ul>{resource.data?.items.length === 0 && <p>No matching cases.</p>}</>}
    <div className="flex gap-2"><Button variant="outline" disabled={resource.loading || page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" disabled={resource.loading || resource.failed || !resource.data || page * resource.data.pageSize >= resource.data.total} onClick={() => setPage(p => p + 1)}>Next</Button></div>
  </section>;
}
