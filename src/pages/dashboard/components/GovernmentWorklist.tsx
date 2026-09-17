import { useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import type { DashboardUser, CaseItem } from "@/types";
import { handlingLabels, priorityLabels, verificationLabels } from "@/constants";
import { Button } from "@/components/ui";
import { useQueryGetCases, useCaseLocation } from "@/hooks/dashboard";
import { formatTime } from "@/pages/dashboard/utils";

function CaseLocation({ user, id }: { user: DashboardUser; id: string }) {
  const { evidence, mutation } = useCaseLocation(user, id);
  const [fieldId, setFieldId] = useState("");
  const [reason, setReason] = useState("");
  const [authority, setAuthority] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const field = evidence.data?.fieldUpdates.find(item => item.id === fieldId);
  return <details className="mt-5 border-t pt-4"><summary className="min-h-11 cursor-pointer text-sm font-extrabold">Update verified point</summary><p className="text-xs leading-5 text-muted-foreground">Select an existing visible-fire field finding. This records a new authorized verification, not a map-click estimate. Public location approval is separate. No polygon or perimeter is created.</p>{evidence.failed && <p role="alert" className="mt-3 text-sm">Field evidence unavailable. <button className="underline" onClick={evidence.retry}>Retry</button></p>}<form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); if (!field || !evidence.data || !confirmed || mutation.isPending) return; mutation.mutate({ version: evidence.data.version, fieldUpdateId: field.id, reason: reason.trim(), authorityReference: authority.trim() }); }}><label className="block text-xs font-bold" htmlFor="verified-field">Recorded field point<select id="verified-field" required className={control} value={fieldId} onChange={event => { setFieldId(event.target.value); setConfirmed(false); mutation.reset(); }}><option value="">Select field evidence</option>{evidence.data?.fieldUpdates.map(item => <option key={item.id} value={item.id}>{formatTime(item.observedAt)} · {item.latitude}, {item.longitude}</option>)}</select></label>{evidence.data && !evidence.data.fieldUpdates.length && <p className="text-xs">No recorded visible-fire field point is available.</p>}<label className="block text-xs font-bold" htmlFor="point-reason">Decision reason<textarea id="point-reason" required minLength={5} maxLength={2000} className={`${control} py-2`} value={reason} onChange={event => setReason(event.target.value)} /></label><label className="block text-xs font-bold" htmlFor="point-authority">Authority reference<input id="point-authority" required minLength={3} maxLength={500} className={control} value={authority} onChange={event => setAuthority(event.target.value)} /></label><label className="flex min-h-11 items-start gap-2 text-xs leading-5"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" />I reviewed this field evidence and authorize this confirmed incident point.</label>{mutation.isError && <p role="alert" className="text-sm text-red-800">The update was not confirmed. Refresh evidence before retrying; your decision text is retained.</p>}{mutation.isSuccess && <p role="status" className="text-sm">Verification saved. Public map coordinates remain unchanged until publication review.</p>}<Button type="submit" disabled={!field || !confirmed || mutation.isPending || mutation.isSuccess || evidence.failed}>{mutation.isPending ? "Saving…" : "Save verified point"}</Button></form></details>;
}

const control = "mt-1 min-h-11 w-full rounded-lg border border-primary/35 bg-white px-3 text-sm";
export default function GovernmentWorklist({ user }: { user: DashboardUser }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CaseItem | null>(null);
  const key = `${query}:${verification}:${priority}:${page}`;
  return <section aria-labelledby="worklist-title" className="flex shrink-0 flex-col">
    <div className="border-b p-5">
      <h2 id="worklist-title" className="text-xl font-extrabold">Government worklist</h2>
      <p className="mt-1 text-sm text-muted-foreground">Internal cases. Review priority is not fire verification.</p>
      <form className="mt-4" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(1); setSelected(null); }}>
        <label htmlFor="case-search" className="text-sm font-bold">Case title or number</label>
        <div className="flex items-end gap-2"><input id="case-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={200} className={control} type="search" /><Button type="submit" variant="outline">Search</Button></div>
      </form>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label htmlFor="case-verification" className="text-xs font-bold">Human verification<select id="case-verification" className={control} value={verification} onChange={(event) => { setVerification(event.target.value); setPage(1); setSelected(null); }}><option value="">All statuses</option>{Object.entries(verificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label htmlFor="case-priority" className="text-xs font-bold">Review priority<select id="case-priority" className={control} value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); setSelected(null); }}><option value="">All priorities</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
    </div>
    <CaseResults key={key} user={user} query={query} verification={verification} priority={priority} page={page} onPage={setPage} selected={selected} onSelect={setSelected} />
  </section>;
}
function CaseResults({ user, query, verification, priority, page, onPage, selected, onSelect }: { user: DashboardUser; query: string; verification: string; priority: string; page: number; onPage: (page: number) => void; selected: CaseItem | null; onSelect: (item: CaseItem | null) => void }) {
  const resource = useQueryGetCases(user, { query, verification, priority, page });
  const current = resource.data?.items.find((item) => item.id === selected?.id);
  return <div className="p-5">
    <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-bold" role="status">{resource.data ? `${resource.data.total} matching cases` : resource.loading ? "Loading cases…" : "Cases unavailable"}</p><Button variant="ghost" disabled={resource.loading} onClick={resource.retry}>Refresh</Button></div>
    {resource.failed && <p role="alert" className="mb-4 rounded-lg border border-amber-700/25 bg-amber-50 p-3 text-sm text-amber-950">{resource.forbidden ? "Government access is no longer available. Internal cases have been cleared." : resource.data ? "Refresh failed. These retained cases may be out of date." : "The worklist could not be loaded. Try refreshing."}</p>}
    {resource.receivedAt && <p className="mb-4 text-xs text-muted-foreground">Retrieved {formatTime(resource.receivedAt)}</p>}
    {current && <section aria-label="Selected internal case" className="mb-5 rounded-xl border border-primary/30 bg-secondary/50 p-4">
      <div className="flex items-start justify-between gap-2"><h3 className="font-extrabold">{current.title}</h3><Button variant="ghost" onClick={() => onSelect(null)}>Close</Button></div>
      <p className="break-all text-xs text-muted-foreground">{current.number}</p>
      <dl className="mt-4 space-y-3 text-sm">
        <div><dt className="text-muted-foreground">Human verification</dt><dd className="font-bold">{verificationLabels[current.verification]}</dd></div>
        <div><dt className="text-muted-foreground">Review priority</dt><dd className="font-bold">{priorityLabels[current.priority]}</dd></div>
        <div><dt className="text-muted-foreground">Priority rationale</dt><dd>{current.priorityReason || "No rationale recorded."}</dd></div>
        <div><dt className="text-muted-foreground">Handling status</dt><dd>{handlingLabels[current.handling]}</dd></div>
        <div><dt className="text-muted-foreground">Case location</dt><dd>{current.latitude === null ? "Not recorded" : `${current.latitude.toFixed(5)}, ${current.longitude?.toFixed(5)}`}</dd></div>
        <div><dt className="text-muted-foreground">Case record updated</dt><dd>{formatTime(current.updatedAt)}</dd></div>
        <div><dt className="text-muted-foreground">Opened</dt><dd>{formatTime(current.openedAt)}</dd></div>
      </dl>
      {user.canConfirmIncidents && current.verification === "CONFIRMED_FIRE" && <CaseLocation key={current.id} user={user} id={current.id} />}
      <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Source: internal case register. Update time is not evidence observation time. Internal coordinates are not added to the published map.</p>
    </section>}
    {resource.data?.items.length === 0 && <div className="py-8 text-center"><ClipboardList aria-hidden="true" className="mx-auto mb-3 size-7 text-muted-foreground" /><h3 className="font-bold">No matching cases</h3><p className="mt-2 text-sm text-muted-foreground">Try another search or verification filter.</p></div>}
    <ul className="space-y-3">{resource.data?.items.map((item) => <li key={item.id}><button type="button" aria-pressed={selected?.id === item.id} onClick={() => onSelect(item)} className={`w-full rounded-xl border p-4 text-left hover:bg-secondary/40 ${selected?.id === item.id ? "border-primary bg-secondary/50" : "bg-white"}`}>
      <span className="block text-xs text-muted-foreground">{item.number}</span><span className="mt-1 block font-extrabold">{item.title}</span>
      <span className="mt-3 block text-sm">{verificationLabels[item.verification]}</span>
      <span className="mt-1 block text-xs text-muted-foreground">Review priority: {priorityLabels[item.priority]} · {handlingLabels[item.handling]}</span>
      <span className="mt-3 block text-xs text-muted-foreground">Updated {formatTime(item.updatedAt)}</span>
    </button></li>)}</ul>
    {resource.data && resource.data.total > resource.data.pageSize && <div className="mt-5 flex items-center justify-between gap-2"><Button aria-label="Previous cases page" variant="outline" disabled={page <= 1} onClick={() => { onSelect(null); onPage(page - 1); }}><ChevronLeft size={16} aria-hidden="true" /></Button><span className="text-sm">Page {page} of {Math.ceil(resource.data.total / resource.data.pageSize)}</span><Button aria-label="Next cases page" variant="outline" disabled={page * resource.data.pageSize >= resource.data.total} onClick={() => { onSelect(null); onPage(page + 1); }}><ChevronRight size={16} aria-hidden="true" /></Button></div>}
  </div>;
}
