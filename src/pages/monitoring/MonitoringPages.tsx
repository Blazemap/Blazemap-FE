import { useState, type FormEvent, type ReactNode } from "react";
import { Activity, BarChart3, FileClock, Flame, RadioTower, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button, FieldSelect } from "@/components/ui";
import { handlingLabels, priorityLabels, verificationLabels } from "@/constants";
import { useMonitoringSummary, useMonitoringUsers, useQueryGetCases, useSourceHealth } from "@/hooks/dashboard";
import { useGovernmentReports } from "@/hooks/dashboard/useGovernment";
import { observationAppearance, triageAppearance } from "@/lib/report-triage";
import { reportStatusLabel } from "@/lib/report-status";
import { formatTime } from "@/pages/dashboard/utils";
import type { CaseFilters, SourceHealth } from "@/types";
import type { GovernmentReport } from "@/types/government";
import { BarChart, DonutChart, EmptyPanel, ErrorPanel, MasterDetail, PageIntro, panelClass, SectionHeading, StatCard, StatusPill, type ChartPart } from "./MonitoringComponents";
import { useMonitoringContext } from "./MonitoringPage";
import { DistributionSkeleton, HealthSkeleton, InventorySkeleton, QueueSkeleton, StatSkeletons } from "./MonitoringSkeletons";

const attentionStatuses = new Set(["STALE", "NOT_CONFIGURED", "NOT_SYNCED", "UNAVAILABLE", "FAILED", "OBSOLETE"]);
const triageRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, UNKNOWN: 3 } as const;
type FilterDefinition = { key: string; label: string; value: string; options: { value: string; label: string }[] };

function reportLocation(report: GovernmentReport) {
  if (report.locationMode === "OBSERVER_POSITION") return "Observer position only";
  return report.locationDescription || report.region?.name || "Incident location not described";
}

function sourceState(status: SourceHealth["sources"][number]["status"]) {
  if (status === "AVAILABLE" || status === "SUCCEEDED") return { label: "Available", tone: "success" as const };
  if (status === "RUNNING") return { label: "Updating", tone: "info" as const };
  if (status === "STALE") return { label: "Stale", tone: "warning" as const };
  if (status === "NOT_CONFIGURED") return { label: "Not configured", tone: "neutral" as const };
  if (status === "NOT_SYNCED") return { label: "Not synced", tone: "warning" as const };
  return { label: "Unavailable", tone: "danger" as const };
}

function summaryCharts(data: NonNullable<ReturnType<typeof useMonitoringSummary>["data"]>) {
  const verification: ChartPart[] = [
    { label: "Not yet verified", value: data.cases.byVerification.UNVERIFIED, color: "#d49a36" },
    { label: "Confirmed fire", value: data.cases.byVerification.CONFIRMED_FIRE, color: "#d85d3f" },
    { label: "Not a fire", value: data.cases.byVerification.NOT_FIRE, color: "#6c9274" },
  ];
  const priority: ChartPart[] = [
    { label: "High", value: data.cases.byPriority.HIGH, color: "#b85c3c" },
    { label: "Medium", value: data.cases.byPriority.MEDIUM, color: "#d5a447" },
    { label: "Low", value: data.cases.byPriority.LOW, color: "#6f9878" },
    { label: "Unassessed", value: data.cases.byPriority.UNASSESSED, color: "#a9b6aa" },
  ];
  const reports: ChartPart[] = [
    { label: "Awaiting review", value: data.reports.byReviewStatus.NEW, color: "#d49a36" },
    { label: "Under review", value: data.reports.byReviewStatus.UNDER_REVIEW, color: "#547d63" },
    { label: "Needs details", value: data.reports.byReviewStatus.NEEDS_DETAILS, color: "#799b7f" },
    { label: "Reviewed", value: data.reports.byReviewStatus.REVIEWED, color: "#254f39" },
    { label: "Declined", value: data.reports.byReviewStatus.DECLINED, color: "#a9b6aa" },
  ];
  const handling: ChartPart[] = Object.entries(data.cases.byHandling).map(([status, value], index) => ({ label: handlingLabels[status as keyof typeof handlingLabels], value, color: ["#274f39", "#4c7558", "#70947a", "#d85d3f", "#d5a447", "#a9b6aa"][index] }));
  return { verification, priority, reports, handling };
}

function InventoryToolbar({ initialSearch, filters, onApply, onReset }: { initialSearch: string; filters: FilterDefinition[]; onApply: (search: string, values: Record<string, string>) => void; onReset: () => void }) {
  const [search, setSearch] = useState(initialSearch);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(filters.map(filter => [filter.key, filter.value])));
  const submit = (event: FormEvent) => { event.preventDefault(); onApply(search.trim(), values); };
  return <form className="border-b border-primary/10 bg-secondary/20 p-4 sm:p-5" onSubmit={submit}><div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,0.45fr))_auto] lg:items-end"><label className="block text-xs font-bold">Search<input type="search" maxLength={200} placeholder="Number, title, name, or email" value={search} onChange={event => setSearch(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm" /></label>{filters.map(filter => <label key={filter.key} htmlFor={`filter-${filter.key}`} className="block text-xs font-bold">{filter.label}<FieldSelect id={`filter-${filter.key}`} value={values[filter.key] ?? ""} onValueChange={value => setValues(current => ({ ...current, [filter.key]: value }))} placeholder="All" options={filter.options} /></label>)}<div className="flex gap-2"><Button type="submit" className="flex-1 lg:flex-none"><Search size={16} aria-hidden="true" />Apply</Button><Button type="button" variant="outline" size="icon" aria-label="Reset filters" onClick={onReset}><X size={16} aria-hidden="true" /></Button></div></div></form>;
}

function DetailPath({ id, query, children }: { id: string; query: string; children: ReactNode }) {
  const { pathname } = useLocation();
  const editable = pathname === "/monitoring/users" || pathname === "/monitoring/reports";
  const to = `${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
  return <div className="flex items-center gap-3"><Link to={to} className="inline-flex min-h-11 items-center text-xs font-extrabold text-primary hover:underline">{children}</Link>{editable && <Button asChild variant="outline"><Link to={to} state={{ edit: true }} aria-label={`Edit ${id}`}>Edit</Link></Button>}</div>;
}

export function OverviewPage() {
  const { user } = useMonitoringContext();
  const summary = useMonitoringSummary(user);
  const health = useSourceHealth(user);
  const reports = useGovernmentReports(user, "", "", 10);
  const charts = summary.data ? summaryCharts(summary.data) : null;
  const sourceAttention = health.data ? health.data.sources.filter(source => attentionStatuses.has(source.status)).length + (health.data.database === "connected" ? 0 : 1) + (health.data.uploadsAvailable ? 0 : 1) : 0;
  const queue = [...(reports.data?.data ?? [])].filter(report => report.reviewStatus !== "DECLINED").sort((a, b) => triageRank[a.triage.level] - triageRank[b.triage.level] || Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
  const loading = summary.loading || health.loading || reports.loading;
  const retry = () => { summary.retry(); health.retry(); reports.retry(); };
  return <>
    <PageIntro eyebrow="Overview" title="See what needs attention now." description="Current report queues, case status, workload distribution, and source health in one operational view." icon={Activity} action={<Button variant="outline" size="icon" aria-label="Refresh overview" disabled={loading} onClick={retry}><RefreshCw size={17} aria-hidden="true" /></Button>} />
    {summary.failed || health.failed || reports.failed ? <div className="mt-5"><ErrorPanel message="Some overview data could not refresh." loading={loading} retry={retry} /></div> : null}
    <section className="mt-7"><SectionHeading title="Needs attention" description="Current records that may require review or follow-up." />{summary.initialLoading && !summary.data ? <StatSkeletons /> : <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"><StatCard label="Reports awaiting review" value={summary.data?.reports.awaitingReview ?? 0} detail={`${summary.data?.reports.inProgress ?? 0} additional reports are in progress.`} icon={FileClock} attention /><StatCard label="Unverified open cases" value={summary.data?.cases.openUnverified ?? 0} detail={`${summary.data?.cases.highPriorityOpen ?? 0} open cases currently carry high priority.`} icon={ShieldAlert} attention /><StatCard label="Confirmed open cases" value={summary.data?.cases.openConfirmed ?? 0} detail={`${summary.data?.cases.activeHandling ?? 0} cases are in active handling stages.`} icon={Flame} /><StatCard label="Sources needing attention" value={sourceAttention} detail="FIRMS, BMKG, AI, database, and uploads." icon={RadioTower} attention /></div>}</section>
    {(summary.initialLoading || charts) && <section className="mt-7"><SectionHeading title="Operational distribution" description="Whole-system current-state counts from one backend snapshot." aside={<BarChart3 size={20} aria-hidden="true" className="text-primary" />} />
{summary.initialLoading && !summary.data ? <DistributionSkeleton /> : charts && <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-4"><DonutChart title="Case verification" subtitle="All stored cases" total={summary.data!.cases.total} parts={charts.verification} href="/monitoring/cases" /><BarChart title="Open-case priority" subtitle="Closed cases excluded" parts={charts.priority} href="/monitoring/cases" /><BarChart title="Case handling" subtitle="All handling states" parts={charts.handling} href="/monitoring/cases" /><BarChart title="Report workflow" subtitle="All citizen reports" parts={charts.reports} href="/monitoring/reports" /></div>}
</section>}
    <div className="mt-7 grid items-start gap-5 xl:grid-cols-[1.25fr_0.75fr]"><section className={`overflow-hidden ${panelClass}`}><header className="flex items-end justify-between gap-4 border-b border-primary/10 px-5 py-4 sm:px-6"><div><h2 className="text-base font-extrabold">Priority report queue</h2><p className="mt-1 text-xs text-muted-foreground">Highest priority among the latest reports.</p></div><Link to="/monitoring/reports" className="text-xs font-extrabold text-primary hover:underline">View reports</Link></header>{reports.initialLoading && !reports.data ? <QueueSkeleton /> : !queue.length ? <EmptyPanel>No reports are available.</EmptyPanel> : <ol className="divide-y divide-primary/10">{queue.map(report => { const appearance = triageAppearance[report.triage.level]; return <li key={report.id}><Link to={`/monitoring/reports/${encodeURIComponent(report.id)}`} className="grid gap-4 px-5 py-4 hover:bg-secondary/30 sm:grid-cols-[1fr_auto] sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-extrabold">{report.number}</span><span className="rounded-full px-2 py-0.5 text-xs font-extrabold" style={{ color: appearance.color, backgroundColor: `${appearance.color}12` }}>{appearance.label}</span><span className="text-xs text-muted-foreground">{reportStatusLabel(report)}</span></div><p className="mt-2 line-clamp-2 text-sm leading-6">{report.description}</p><p className="mt-2 truncate text-xs text-muted-foreground">{reportLocation(report)} · {formatTime(report.observedAt)}</p></div><div className="flex gap-1">{report.observationTypes.map(type => <img key={type} src={`/icons8-${observationAppearance[type].icon}.png`} alt={observationAppearance[type].label} width={26} height={26} className="size-6 object-contain" />)}</div></Link></li>; })}</ol>}</section><section className={`${panelClass} p-5 sm:p-6`}><h2 className="text-base font-extrabold">Source health</h2><p className="mt-1 text-xs text-muted-foreground">Latest independent availability states.</p>{health.initialLoading && !health.data ? <HealthSkeleton /> : <ul className="mt-5 divide-y divide-primary/10">{health.data?.sources.map(source => { const state = sourceState(source.status); return <li key={source.id} className="flex items-center justify-between gap-4 py-4"><span className="text-sm font-bold">{source.name}</span><StatusPill tone={state.tone}>{state.label}</StatusPill></li>; })}<li className="flex items-center justify-between gap-4 py-4"><span className="text-sm font-bold">Database</span><StatusPill tone={health.data?.database === "connected" ? "success" : "danger"}>{health.data?.database === "connected" ? "Connected" : "Unavailable"}</StatusPill></li></ul>}</section></div>
  </>;
}

export function ReportsPage() {
  const { user } = useMonitoringContext();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const workflow = params.get("workflow") ?? "";
  const reports = useGovernmentReports(user, search, workflow, 20);
  const query = params.toString();
  const apply = (nextSearch: string, values: Record<string, string>) => { const next = new URLSearchParams(); if (nextSearch) next.set("search", nextSearch); if (values.workflow) next.set("workflow", values.workflow); setParams(next); };
  return <MasterDetail user={user}><div><PageIntro eyebrow="Reports" title="Review the incoming report inventory." description="Latest citizen observations with triage context, location certainty, and workflow status." action={<Button variant="outline" size="icon" aria-label="Refresh reports" disabled={reports.loading} onClick={reports.retry}><RefreshCw size={17} aria-hidden="true" /></Button>} />{reports.failed && <div className="mt-5"><ErrorPanel message="Reports could not refresh." loading={reports.loading} retry={reports.retry} /></div>}<section className={`mt-7 overflow-hidden ${panelClass}`}><InventoryToolbar key={`${search}:${workflow}`} initialSearch={search} filters={[{ key: "workflow", label: "Workflow", value: workflow, options: [{ value: "IN_PROGRESS", label: "In progress" }, { value: "REVIEWED", label: "Reviewed" }, { value: "CONFIRMED", label: "Confirmed" }, { value: "DECLINED", label: "Declined" }] }]} onApply={apply} onReset={() => setParams({})} /><header className="flex items-end justify-between gap-4 border-b border-primary/10 px-5 py-4 sm:px-6"><div><h2 className="text-base font-extrabold">Citizen reports</h2><p className="mt-1 text-xs text-muted-foreground">Filtered server-side. Open details without losing this list context.</p></div><span className="text-xs font-bold text-muted-foreground">{reports.data ? `${reports.data.meta.total} total` : ""}</span></header>{reports.initialLoading && !reports.data ? <InventorySkeleton section="reports" /> : !reports.data?.data.length ? <EmptyPanel>No reports match these filters.</EmptyPanel> : <><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-secondary/45 text-xs text-muted-foreground"><tr><th className="px-5 py-3 sm:px-6">Report</th><th className="px-4 py-3">Observations</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Workflow</th><th className="px-4 py-3">Location</th><th className="px-5 py-3 sm:px-6">Observed</th><th className="px-5 py-3 text-right sm:px-6">Action</th></tr></thead><tbody className="divide-y divide-primary/10">{reports.data.data.map(report => { const appearance = triageAppearance[report.triage.level]; return <tr key={report.id} className="hover:bg-secondary/20"><td className="px-5 py-4 sm:px-6"><DetailPath id={report.id} query={query}>{report.number}</DetailPath><span className="mt-1 block max-w-sm truncate text-xs text-muted-foreground">{report.description}</span></td><td className="px-4 py-4"><div className="flex gap-1">{report.observationTypes.map(type => <img key={type} src={`/icons8-${observationAppearance[type].icon}.png`} alt={observationAppearance[type].label} width={25} height={25} className="size-6" />)}</div></td><td className="px-4 py-4"><span className="font-extrabold" style={{ color: appearance.color }}>{appearance.label}</span></td><td className="px-4 py-4">{reportStatusLabel(report)}</td><td className="max-w-xs truncate px-4 py-4 text-xs text-muted-foreground">{reportLocation(report)}</td><td className="px-5 py-4 text-xs text-muted-foreground sm:px-6">{formatTime(report.observedAt)}</td><td className="px-5 py-4 text-right sm:px-6"><DetailPath id={report.id} query={query}>View details</DetailPath></td></tr>; })}</tbody></table></div>{reports.hasMore && <div className="border-t border-primary/10 p-4 text-center"><Button variant="outline" disabled={reports.loading} onClick={reports.showMore}>Load more reports</Button></div>}</>}</section></div></MasterDetail>;
}

export function CasesPage() {
  const { user } = useMonitoringContext();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search") ?? "";
  const verification = params.get("verification") ?? "";
  const handling = params.get("handling") ?? "";
  const priority = params.get("priority") ?? "";
  const filters: CaseFilters = { query: search, verification, handling, priority, page };
  const cases = useQueryGetCases(user, filters);
  const query = params.toString();
  const pages = Math.max(1, Math.ceil((cases.data?.total ?? 0) / (cases.data?.pageSize ?? 20)));
  const apply = (nextSearch: string, values: Record<string, string>) => { const next = new URLSearchParams(); if (nextSearch) next.set("search", nextSearch); for (const key of ["verification", "handling", "priority"]) if (values[key]) next.set(key, values[key]); setParams(next); };
  const changePage = (nextPage: number) => { const next = new URLSearchParams(params); next.set("page", String(nextPage)); setParams(next); };
  return <MasterDetail user={user}><div><PageIntro eyebrow="Cases" title="Monitor current case records." description="Verification, handling, and priority remain distinct so potential impact is not mistaken for confirmation." action={<Button variant="outline" size="icon" aria-label="Refresh cases" disabled={cases.loading} onClick={cases.retry}><RefreshCw size={17} aria-hidden="true" /></Button>} />{cases.failed && <div className="mt-5"><ErrorPanel message="Cases could not refresh." loading={cases.loading} retry={cases.retry} /></div>}<section className={`mt-7 overflow-hidden ${panelClass}`}><InventoryToolbar key={`${search}:${verification}:${handling}:${priority}`} initialSearch={search} filters={[{ key: "verification", label: "Verification", value: verification, options: Object.entries(verificationLabels).map(([value, label]) => ({ value, label })) }, { key: "handling", label: "Handling", value: handling, options: Object.entries(handlingLabels).map(([value, label]) => ({ value, label })) }, { key: "priority", label: "Priority", value: priority, options: Object.entries(priorityLabels).map(([value, label]) => ({ value, label })) }]} onApply={apply} onReset={() => setParams({})} /><header className="flex items-end justify-between gap-4 border-b border-primary/10 px-5 py-4 sm:px-6"><div><h2 className="text-base font-extrabold">Case inventory</h2><p className="mt-1 text-xs text-muted-foreground">Filtered server-side. Select a case for details and versioned edits.</p></div><span className="text-xs font-bold text-muted-foreground">{cases.data ? `${cases.data.total} total` : ""}</span></header>{cases.initialLoading && !cases.data ? <InventorySkeleton section="cases" /> : !cases.data?.items.length ? <EmptyPanel>No cases match these filters.</EmptyPanel> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-secondary/45 text-xs text-muted-foreground"><tr><th className="px-5 py-3 sm:px-6">Case</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Handling</th><th className="px-4 py-3">Priority</th><th className="px-5 py-3 sm:px-6">Context updated</th><th className="px-5 py-3 text-right sm:px-6">Action</th></tr></thead><tbody className="divide-y divide-primary/10">{cases.data.items.map(item => <tr key={item.id} className="hover:bg-secondary/20"><td className="px-5 py-4 sm:px-6"><DetailPath id={item.id} query={query}>{item.number}</DetailPath><span className="mt-1 block max-w-sm truncate text-xs text-muted-foreground">{item.title}</span></td><td className="px-4 py-4 font-semibold">{verificationLabels[item.verification]}</td><td className="px-4 py-4">{handlingLabels[item.handling]}</td><td className="px-4 py-4 font-bold">{priorityLabels[item.priority]}</td><td className="px-5 py-4 text-xs text-muted-foreground sm:px-6">{formatTime(item.updatedAt)}</td><td className="px-5 py-4 text-right sm:px-6"><DetailPath id={item.id} query={query}>View details</DetailPath></td></tr>)}</tbody></table></div>}<footer className="flex items-center justify-between gap-4 border-t border-primary/10 px-5 py-4 sm:px-6"><span className="text-xs text-muted-foreground">Page {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || cases.loading} onClick={() => changePage(page - 1)}>Previous</Button><Button variant="outline" disabled={page >= pages || cases.loading} onClick={() => changePage(page + 1)}>Next</Button></div></footer></section></div></MasterDetail>;
}

export function UsersPage() {
  const { user } = useMonitoringContext();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search") ?? "";
  const role = params.get("role") ?? "";
  const active = params.get("active") ?? "";
  const emailVerified = params.get("emailVerified") ?? "";
  const users = useMonitoringUsers(user, { page, search, role, active, emailVerified });
  const query = params.toString();
  const pages = Math.max(1, Math.ceil((users.data?.meta.total ?? 0) / (users.data?.meta.pageSize ?? 50)));
  const apply = (nextSearch: string, values: Record<string, string>) => { const next = new URLSearchParams(); if (nextSearch) next.set("search", nextSearch); for (const key of ["role", "active", "emailVerified"]) if (values[key]) next.set(key, values[key]); setParams(next); };
  const changePage = (nextPage: number) => { const next = new URLSearchParams(params); next.set("page", String(nextPage)); setParams(next); };
  return <MasterDetail user={user}><div><PageIntro eyebrow="Users" title="Review account access and verification." description="Administrative account projection without sessions, tokens, credentials, or password material." action={<Button variant="outline" size="icon" aria-label="Refresh users" disabled={users.loading} onClick={users.retry}><RefreshCw size={17} aria-hidden="true" /></Button>} />{users.failed && <div className="mt-5"><ErrorPanel message="Users could not refresh." loading={users.loading} retry={users.retry} /></div>}<section className={`mt-7 overflow-hidden ${panelClass}`}><InventoryToolbar key={`${search}:${role}:${active}:${emailVerified}`} initialSearch={search} filters={[{ key: "role", label: "Role", value: role, options: [{ value: "USER", label: "User" }, { value: "ADMIN", label: "Administrator" }] }, { key: "active", label: "Account", value: active, options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] }, { key: "emailVerified", label: "Email", value: emailVerified, options: [{ value: "true", label: "Verified" }, { value: "false", label: "Unverified" }] }]} onApply={apply} onReset={() => setParams({})} /><header className="flex items-end justify-between gap-4 border-b border-primary/10 px-5 py-4 sm:px-6"><div><h2 className="text-base font-extrabold">Accounts</h2><p className="mt-1 text-xs text-muted-foreground">Filtered server-side. Open details for audited access controls.</p></div><span className="text-xs font-bold text-muted-foreground">{users.data ? `${users.data.meta.total} total` : ""}</span></header>{users.initialLoading && !users.data ? <InventorySkeleton section="users" /> : !users.data?.data.length ? <EmptyPanel>No users match these filters.</EmptyPanel> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-secondary/45 text-xs text-muted-foreground"><tr><th className="px-5 py-3 sm:px-6">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Email</th><th className="px-5 py-3 sm:px-6">Created</th><th className="px-5 py-3 text-right sm:px-6">Action</th></tr></thead><tbody className="divide-y divide-primary/10">{users.data.data.map(item => <tr key={item.id} className="hover:bg-secondary/20"><td className="px-5 py-4 sm:px-6"><DetailPath id={item.id} query={query}>{item.name}</DetailPath><span className="mt-1 block text-xs text-muted-foreground">{item.email}</span></td><td className="px-4 py-4"><StatusPill tone={item.role === "ADMIN" ? "info" : "neutral"}>{item.role}</StatusPill></td><td className="px-4 py-4"><StatusPill tone={item.active ? "success" : "danger"}>{item.active ? "Active" : "Inactive"}</StatusPill></td><td className="px-4 py-4"><StatusPill tone={item.emailVerified ? "success" : "warning"}>{item.emailVerified ? "Verified" : "Unverified"}</StatusPill></td><td className="px-5 py-4 text-xs text-muted-foreground sm:px-6">{formatTime(item.createdAt)}</td><td className="px-5 py-4 text-right sm:px-6"><DetailPath id={item.id} query={query}>View details</DetailPath></td></tr>)}</tbody></table></div>}<footer className="flex items-center justify-between gap-4 border-t border-primary/10 px-5 py-4 sm:px-6"><span className="text-xs text-muted-foreground">Page {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || users.loading} onClick={() => changePage(page - 1)}>Previous</Button><Button variant="outline" disabled={page >= pages || users.loading} onClick={() => changePage(page + 1)}>Next</Button></div></footer></section></div></MasterDetail>;
}
