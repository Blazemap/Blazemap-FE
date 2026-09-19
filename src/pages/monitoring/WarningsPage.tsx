import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { checkDashboardAccount } from "@/hooks/dashboard/session";
import type { DashboardUser } from "@/types";
import { GovernmentError, governmentRequest } from "@/api/dashboard/government";
import { DraftGuard } from "@/components/common";
import { Button, FieldSelect } from "@/components/ui";
import type { FeedPage, Publication, WarningReference } from "@/lib/publications";
import { publicationPath } from "@/lib/publications";
import WarningNotice from "@/pages/dashboard/components/WarningNotice";
import { formatTime } from "@/pages/dashboard/utils";
import { useMonitoringContext } from "./MonitoringPage";
import { PageIntro, panelClass, StatusPill } from "./MonitoringComponents";
import { control } from "./OperationsShared";

type Warning = Omit<Publication, "status" | "regions" | "publishedAt"> & { status: Publication["status"] | "DRAFT"; regions: { id: string; name: string }[]; publishedAt: string | null };
type Region = { id: string; name: string; level: string };
async function request<T>(user: DashboardUser, path: string, method: "get" | "post" | "patch" = "get", body?: unknown, signal = AbortSignal.timeout(30000)): Promise<T> {
  const current = await checkDashboardAccount(user, signal);
  if (current.role !== "ADMIN" || !current.canPublishInformation) throw new Error("Warning publication capability unavailable.");
  const result = await governmentRequest(path, method, body, signal);
  await checkDashboardAccount(user, signal);
  return result as T;
}
const warningColumns = ["Warning", "Affected regions", "State", "Published", "Valid until", "Action"];
function WarningSkeleton() {
  return <>{Array.from({ length: 6 }, (_, row) => <tr key={row} aria-hidden="true" className="motion-safe:animate-pulse">{warningColumns.map((column, index) => <td key={column} className="px-5 py-4"><span className={`block max-w-full rounded bg-secondary ${index === 5 ? "h-11 w-24 rounded-full" : index === 2 ? "h-6 w-24 rounded-full" : index < 2 ? "h-5 w-44" : "h-4 w-32"}`} /></td>)}</tr>)}</>;
}

export default function WarningsPage() {
  const { user } = useMonitoringContext();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Warning | null | undefined>();
  const client = useQueryClient();
  const queryKey = ["dashboard", user.id, user.role, "warnings"];
  const query = useQuery({ queryKey: [...queryKey, page], gcTime: 0, retry: false, queryFn: ({ signal }) => request<FeedPage<Warning>>(user, `/api/admin/information?type=WARNING&pageSize=20&page=${page}`, "get", undefined, signal) });
  async function saved(item: Warning) { setSelected(item); await client.invalidateQueries({ queryKey }); await client.invalidateQueries({ queryKey: ["dashboard", user.id, user.role, "active-warnings"] }); }
  const initialLoading = query.isPending && !query.data;
  const meta = query.data?.meta;
  const currentPage = meta?.page ?? page;
  const pageCount = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : undefined;
  const start = meta && query.data?.data.length ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const end = meta ? Math.min(meta.total, start ? start + (query.data?.data.length ?? 0) - 1 : 0) : 0;
  return <>
    <PageIntro eyebrow="Public advisories" title="Warnings" description="Human-reviewed informational advisories. No evacuation orders or autonomous routing." />
    {selected !== undefined ? <WarningEditor key={`${selected?.id ?? "new"}:${selected?.updatedAt ?? ""}`} item={selected} saved={saved} close={() => setSelected(undefined)} /> : <section aria-labelledby="warnings-inventory-title" className={`${panelClass} mt-7 overflow-hidden`}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-primary/10 px-5 py-4 sm:px-6">
        <div><h2 id="warnings-inventory-title" className="text-base font-extrabold">Warnings inventory</h2>{meta && <p className="mt-1 text-xs text-muted-foreground">{meta.total.toLocaleString("en")} total</p>}</div>
        <div className="flex flex-wrap gap-3"><Button onClick={() => setSelected(null)}>Create warning</Button><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} aria-hidden="true" className={query.isFetching ? "motion-safe:animate-spin" : ""} />{query.isFetching && !initialLoading ? "Refreshing…" : "Refresh"}</Button></div>
      </header>
      <p role="status" className="sr-only">{initialLoading ? "Loading warnings" : query.isFetching ? "Refreshing warnings" : ""}</p>
      {query.isError && query.data && <p role="alert" className="border-b border-primary/10 px-5 py-4 text-sm">Warnings could not refresh. Displayed data may be out of date. Refresh before reviewing.</p>}
      <div role="region" aria-label="Warnings table" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary">
        <table aria-labelledby="warnings-inventory-title" aria-busy={query.isFetching} className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-secondary/45 text-xs text-muted-foreground"><tr>{warningColumns.map(column => <th scope="col" key={column} className="px-5 py-3">{column}</th>)}</tr></thead>
          <tbody className="divide-y divide-primary/10">
            {initialLoading ? <WarningSkeleton /> : query.data?.data.length ? query.data.data.map(item => <tr key={item.id}>
              <th scope="row" className="max-w-80 break-words px-5 py-4 font-extrabold">{item.title}</th>
              <td className="max-w-72 break-words px-5 py-4 text-muted-foreground">{item.regions.map(region => region.name).join(", ") || "No regions recorded"}</td>
              <td className="px-5 py-4"><StatusPill tone={item.status === "WITHDRAWN" ? "danger" : item.status === "PUBLISHED" && !item.expired ? "success" : "neutral"}>{item.status.charAt(0) + item.status.slice(1).toLowerCase()}</StatusPill>{item.expired && <p className="mt-1 text-xs text-muted-foreground">Expired</p>}</td>
              <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{item.publishedAt ? <time dateTime={item.publishedAt}>{formatTime(item.publishedAt)}</time> : "Not published"}</td>
              <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{item.validUntil ? <time dateTime={item.validUntil}>{formatTime(item.validUntil)}</time> : "Not set"}</td>
              <td className="px-5 py-4"><Button variant="outline" aria-label={`Review warning: ${item.title}`} disabled={query.isFetching || query.isError} onClick={() => setSelected(item)}>Review</Button></td>
            </tr>) : <tr><td colSpan={warningColumns.length} className="h-40 px-5 py-8 text-center text-sm text-muted-foreground">{query.isError ? <p role="alert">Warnings could not load. Refresh to try again.</p> : query.data ? <p>{meta?.total === 0 ? "No warning advisories." : "No warnings on this page. Return to the previous page."}</p> : <p>Warnings unavailable. Refresh to try again.</p>}</td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-primary/10 px-5 py-4 sm:px-6">
        <p className="text-xs text-muted-foreground">{meta ? `Showing ${start}–${end} of ${meta.total} warnings` : initialLoading ? "Loading warnings…" : "Warning count unavailable"}</p>
        <nav aria-label="Warnings pagination" className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={currentPage <= 1 || query.isFetching} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="text-xs font-bold tabular-nums">Page {currentPage}{pageCount !== undefined && currentPage <= pageCount && ` of ${pageCount}`}</span><Button variant="outline" disabled={!meta || query.isError || query.isFetching || currentPage * meta.pageSize >= meta.total || !query.data?.data.length} onClick={() => setPage(currentPage + 1)}>Next</Button></nav>
      </footer>
    </section>}
  </>;
}

function WarningEditor({ item, saved, close }: { item: Warning | null; saved: (item: Warning) => Promise<void>; close: () => void }) {
  const { user } = useMonitoringContext();
  const [title, setTitle] = useState(item?.title ?? "");
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [validUntil, setValidUntil] = useState(item?.validUntil?.slice(0, 16) ?? "");
  const [regions, setRegions] = useState(item?.regions ?? []);
  const [sources, setSources] = useState(item?.sources ?? [{ title: "", url: "" }]);
  const [references, setReferences] = useState<WarningReference[]>(item?.advisory?.operationalReferences ?? []);
  const [search, setSearch] = useState("");
  const [authority, setAuthority] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pendingRequest = useRef<{ payload: string; key: string } | null>(null);
  const submitted = useRef<{ path: string; method: "post" | "patch"; payload: Record<string, unknown> } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const editable = !item || ["DRAFT", "PUBLISHED"].includes(item.status);
  const options = useQuery({ queryKey: ["dashboard", user.id, user.role, "warning-options"], retry: false, gcTime: 0, queryFn: ({ signal }) => request<{ data: WarningReference[] }>(user, "/api/admin/warnings/options", "get", undefined, signal) });
  const regionOptions = useQuery({ queryKey: ["dashboard", user.id, user.role, "warning-regions", search], retry: false, gcTime: 0, queryFn: ({ signal }) => request<{ data: Region[] }>(user, `/api/public/regions?search=${encodeURIComponent(search)}`, "get", undefined, signal) });
  function key(payload: unknown) { const serialized = JSON.stringify(payload); if (pendingRequest.current?.payload !== serialized) pendingRequest.current = { payload: serialized, key: crypto.randomUUID() }; return pendingRequest.current.key; }
  const mutation = useMutation({ mutationFn: async (action: "save" | "publish" | "withdraw") => {
    async function send(command: { path: string; method: "post" | "patch"; payload: Record<string, unknown> }) {
      submitted.current = command;
      setUncertain(true);
      try {
        const result = await request<{ data: Warning }>(user, command.path, command.method, command.payload);
        submitted.current = null; setUncertain(false); setDirty(false); setConfirmed(false); pendingRequest.current = null;
        await saved(result.data);
      } catch (error) {
        if (error instanceof GovernmentError && [400, 401, 403, 404, 409, 422, 429].includes(error.status)) { submitted.current = null; setUncertain(false); }
        throw error;
      }
    }
    if (submitted.current) return send(submitted.current);
    let path = "/api/admin/warnings", method: "post" | "patch" = "post", payload: Record<string, unknown>;
    if (action === "save") {
      if (!validUntil || !Number.isFinite(Date.parse(`${validUntil}:00Z`))) throw new Error("Enter a valid UTC end time.");
      payload = { title, summary, body, validUntil: new Date(`${validUntil}:00Z`).toISOString(), sources, regionIds: regions.map(r => r.id), operationalReferences: references.map(r => ({ featureId: r.featureId, updateId: r.updateId })), ...(item ? { expectedUpdatedAt: item.updatedAt } : {}) };
      if (item) { path += `/${encodeURIComponent(item.id)}`; method = "patch"; }
    } else {
      if (!item || dirty || !confirmed) throw new Error("Save and review the preview, then explicitly confirm the action.");
      path += `/${encodeURIComponent(item.id)}/action`;
      payload = { action, expectedUpdatedAt: item.updatedAt, confirm: true, ...(action === "publish" ? { authorityReference: authority } : { reason }) };
    }
    await send({ path, method, payload: { ...payload, idempotencyKey: key({ path, payload }) } });
  } });
  return <section className={`${panelClass} mt-5 p-5 sm:p-6`}>
    <DraftGuard dirty={dirty || uncertain} pending={mutation.isPending} />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">{item ? `${item.status.toLowerCase()} warning` : "Create warning"}</h2><Button variant="outline" disabled={mutation.isPending} onClick={() => { if (!(dirty || uncertain) || window.confirm(uncertain ? "The previous request may have succeeded. Leave and refresh the list before any new action?" : "Discard unsaved warning changes?")) close(); }}>Back to warnings</Button></div>
    <form onSubmit={event => { event.preventDefault(); mutation.mutate("save"); }} onChange={() => { setDirty(true); setConfirmed(false); }}>
      <fieldset disabled={mutation.isPending || uncertain || !editable} className="grid gap-4">
        <label className="text-sm font-bold">Title<input required aria-required="true" minLength={3} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} className={control} /></label>
        <label className="text-sm font-bold">Public summary<textarea required aria-required="true" minLength={5} maxLength={600} value={summary} onChange={e => setSummary(e.target.value)} className={`${control} min-h-20 py-3`} /></label>
        <label className="text-sm font-bold">Approved public text<textarea required aria-required="true" minLength={5} maxLength={40000} value={body} onChange={e => setBody(e.target.value)} className={`${control} min-h-36 py-3`} /></label>
        <label className="text-sm font-bold">Valid until (UTC)<input required aria-required="true" type="datetime-local" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={control} /></label>
        <fieldset className="space-y-3"><legend className="font-bold">Affected verified regions</legend><label className="block text-sm">Search region<input value={search} onChange={e => setSearch(e.target.value)} maxLength={200} className={control} /></label>{regionOptions.isPending ? <div role="status" aria-label="Loading verified regions" className="h-11 rounded bg-secondary motion-safe:animate-pulse" /> : regionOptions.isError ? <p role="alert">Verified regions unavailable. <Button type="button" variant="outline" onClick={() => void regionOptions.refetch()}>Retry</Button></p> : <><label htmlFor="warning-region" className="text-sm">Add affected region</label><FieldSelect id="warning-region" value="" placeholder="Select verified region" options={(regionOptions.data?.data ?? []).filter(r => !regions.some(v => v.id === r.id)).map(r => ({ value: r.id, label: `${r.name} · ${r.level}` }))} onValueChange={id => { const region = regionOptions.data?.data.find(r => r.id === id); if (region) { setRegions([...regions, region]); setDirty(true); setConfirmed(false); } }} /></>}{regions.map(r => <div key={r.id} className="flex items-center justify-between gap-3 text-sm"><span>{r.name}</span><Button type="button" variant="ghost" onClick={() => { setRegions(regions.filter(v => v.id !== r.id)); setDirty(true); }}>Remove {r.name}</Button></div>)}</fieldset>
        <fieldset className="space-y-3"><legend className="font-bold">Approved factual sources</legend>{sources.map((source, index) => <div key={index} className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Source title<input required aria-required="true" minLength={2} maxLength={200} value={source.title} onChange={e => setSources(sources.map((s, i) => i === index ? { ...s, title: e.target.value } : s))} className={control} /></label><label className="text-sm">Source URL<input required aria-required="true" type="url" maxLength={2000} value={source.url} onChange={e => setSources(sources.map((s, i) => i === index ? { ...s, url: e.target.value } : s))} className={control} /></label>{sources.length > 1 && <Button type="button" variant="ghost" onClick={() => { setSources(sources.filter((_, i) => i !== index)); setDirty(true); }}>Remove source {index + 1}</Button>}</div>)}<Button type="button" variant="outline" disabled={sources.length >= 30} onClick={() => { setSources([...sources, { title: "", url: "" }]); setDirty(true); }}>Add source</Button></fieldset>
        <fieldset className="space-y-3"><legend className="font-bold">Optional operational references</legend><p className="text-sm">Only verified access and authority-designated locations with observations within 24 hours. No routes are calculated. Publishing without references is allowed.</p>{options.isPending ? <div role="status" aria-label="Loading operational references" className="h-11 rounded bg-secondary motion-safe:animate-pulse" /> : options.isError ? <p role="alert">Operational references unavailable. <Button type="button" variant="outline" onClick={() => void options.refetch()}>Retry</Button></p> : <><label htmlFor="warning-reference" className="text-sm">Add verified operational reference</label><FieldSelect id="warning-reference" value="" placeholder="Select optional reference" options={(options.data?.data ?? []).filter(r => !references.some(v => v.featureId === r.featureId)).map(r => ({ value: r.featureId, label: `${r.name} · ${r.condition} · ${formatTime(r.observedAt)}` }))} onValueChange={id => { const ref = options.data?.data.find(r => r.featureId === id); if (ref) { setReferences([...references, ref]); setDirty(true); setConfirmed(false); } }} />{!options.data?.data.length && <p className="text-sm">No eligible operational references recorded.</p>}</>}{references.map(r => <div key={r.featureId} className="text-sm"><p>{r.name} · {r.condition} · {formatTime(r.observedAt)} · {r.source}</p><Button type="button" variant="ghost" onClick={() => { setReferences(references.filter(v => v.featureId !== r.featureId)); setDirty(true); }}>Remove {r.name}</Button></div>)}</fieldset>
        {editable && <Button type="submit" disabled={!regions.length || mutation.isPending}>{item?.status === "PUBLISHED" ? "Save replacement draft" : "Save draft"}</Button>}
      </fieldset>
    </form>
    {item && <section aria-label="Saved public preview" className="mt-7 space-y-4 border-t pt-5"><h2 className="font-extrabold">Saved public preview{dirty ? " — unsaved edits not included" : ""}</h2><h3 className="text-xl font-bold">{item.title}</h3><p>{item.regions.map(r => r.name).join(", ")}</p><p className="font-bold">{item.summary}</p><p className="whitespace-pre-wrap">{item.body}</p><WarningNotice item={{ ...item, status: item.status === "DRAFT" ? "WITHDRAWN" : item.status }} /><ul>{item.sources.map((s, i) => <li key={i}><a className="underline" href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a></li>)}</ul>{item.status !== "DRAFT" && <Link className="inline-flex min-h-11 items-center font-bold underline" to={publicationPath(item.slug, "feed")}>Open public detail</Link>}
      {item.status === "WITHDRAWN" && <p>Withdrawn: {item.withdrawalReason}</p>}
      {["DRAFT", "PUBLISHED"].includes(item.status) && <fieldset disabled={dirty || mutation.isPending || uncertain} className="space-y-4"><label className="block text-sm font-bold">{item.status === "DRAFT" ? "Publication authority reference (operator supplied)" : "Withdrawal reason"}<input minLength={item.status === "DRAFT" ? 3 : 5} maxLength={item.status === "DRAFT" ? 500 : 2000} value={item.status === "DRAFT" ? authority : reason} onChange={e => { if (item.status === "DRAFT") setAuthority(e.target.value); else setReason(e.target.value); setConfirmed(false); }} className={control} /></label><label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 size-4" />{item.status === "DRAFT" ? "I reviewed the saved text, sources, affected regions and validity for public release as an informational advisory, not an evacuation order." : "I confirm withdrawal of this public warning."}</label><Button type="button" disabled={!confirmed || (item.status === "DRAFT" ? authority.trim().length < 3 : reason.trim().length < 5)} onClick={() => mutation.mutate(item.status === "DRAFT" ? "publish" : "withdraw")}>{item.status === "DRAFT" ? "Publish warning" : "Withdraw warning"}</Button></fieldset>}
    </section>}
    {uncertain && !mutation.isPending && <div role="alert" className="mt-4 space-y-3"><p>The outcome is unknown. Editing is locked to avoid duplicate advisories. Retry the exact request or return to the list and refresh.</p><Button onClick={() => mutation.mutate("save")}>Retry exact request</Button></div>}
    {mutation.isPending && <p role="status" className="mt-4">Saving warning…</p>}{mutation.error && <p role="alert" className="mt-4">{mutation.error.message} Your text is retained. For a revision conflict, return to the list, refresh and review the latest version.</p>}
  </section>;
}
