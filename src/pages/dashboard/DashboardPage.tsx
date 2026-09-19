import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Activity, FileText, List, RefreshCw, ShieldCheck } from "lucide-react";
import { usePublicationMap } from "@/hooks/dashboard/usePublicationMap";
import MapLayers from "./components/MapLayers";
import { foreground } from "@/assets";
import { FeedEmpty, FeedRow, FeedRowsSkeleton, FeedSentinel } from "./components/FeedRow";
import { useGovernmentCase, useGovernmentReport, useGovernmentReports } from "@/hooks/dashboard/useGovernment";
import { dashboardLogin } from "@/lib";
import { DraftGuard, WorkspaceNav } from "@/components/common";
import { Button } from "@/components/ui";
import type { DashboardUser } from "@/types";
import { CasePanel } from "./components/GovernmentWorklist";
import type { GovernmentReport } from "@/types/government";
import type { PerimeterDraft } from "@/lib/perimeter";
import type { WindArrow } from "@/lib/wind";
import { CitizenDashboard, GovernmentWorklist, MapSkeleton, ObservationListSkeleton, PlaceSearch } from "@/pages/dashboard/components";
import { ItemDetail } from "./components/CitizenDashboard";
import { ReportReview } from "./components/GovernmentReports";
import { GovernmentReportDetailSkeleton } from "./components/DashboardSkeletons";
import MapPanel from "./components/MapPanel";
import { useDashboardSession, useQueryGetMap } from "@/hooks/dashboard";
import { governmentPublicItems, privateReportMarkers } from "@/lib/dashboard";
import { ageMap, filterMap, formatTime, mapAvailability, hasPoint } from "@/pages/dashboard/utils";

const SituationMap = lazy(() => import("@/pages/dashboard/components/SituationMap"));

export function Component() {
  const user = useLoaderData() as DashboardUser;
  const { signingOut } = useDashboardSession(user);
  if (signingOut) return <main className="grid h-dvh place-items-center bg-background"><p role="status">Checking your session…</p></main>;
  return user.role === "USER" ? <CitizenDashboard key={`${user.id}:${user.role}`} user={user} /> : <Workspace key={`${user.id}:${user.role}`} user={user} />;
}

function Workspace({ user }: { user: DashboardUser }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const feed = pathname === "/feed" || params.get("view") === "feed";
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const [hours, setHours] = useState(48);
  const [place, setPlace] = useState<import("@/lib/places").Place | null>(null);
  const [publications, setPublications] = useState(true);
  const [hotspots, setHotspots] = useState(true);
  const caseId = params.get("case");
  const selectedCase = useGovernmentCase(user, caseId ?? "");
  const [caseDraft, setCaseDraft] = useState({ dirty: false, pending: false });
  const onCaseDraft = useCallback((dirty: boolean, pending: boolean) => setCaseDraft({ dirty, pending }), []);
  const [listOpen, setListOpen] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [worklistOpen, setWorklistOpen] = useState(false);
  const [limit, setLimit] = useState(40);
  const [perimeterDraft, setPerimeterDraft] = useState<PerimeterDraft | null>(null);
  const [wind, setWind] = useState<WindArrow | null>(null);
  const [reportStatus, setReportStatus] = useState("");
  const [reportId, setReportId] = useState<string | null>(() => params.get("report"));
  const [reviewDraft, setReviewDraft] = useState({ dirty: false, pending: false });
  const onDraft = useCallback((dirty: boolean, pending: boolean) => setReviewDraft({ dirty, pending }), []);
  const internalFeed = useGovernmentReports(user, "", feed ? "" : reportStatus, feed ? 10 : 20);
  const reportDetail = useGovernmentReport(user, reportId);
  const reportsUnavailable = internalFeed.failed || reportDetail.failed;
  const reportTotal = internalFeed.data?.meta.total ?? 0;
  const authorizedReports = internalFeed.forbidden ? [] : internalFeed.data?.data ?? [];
  const report = reportDetail.forbidden || internalFeed.forbidden ? null : reportDetail.data ?? authorizedReports.find(item => item.id === reportId) ?? null;
  const loaded = useQueryGetMap(user, hours);
  const data = useMemo(() => loaded.data ? ageMap(loaded.data, loaded.now) : null, [loaded.data, loaded.now]);
  const privateCases = useMemo(() => {
    const loadedCases = data?.privateCases ?? [];
    const detail = selectedCase.data;
    if (!detail) return loadedCases;
    return [...loadedCases.filter(item => item.id !== detail.id), detail];
  }, [data?.privateCases, selectedCase.data]);
  const mapItems = useMemo(() => filterMap(governmentPublicItems(data?.items ?? [], privateCases), "", feed || publications, !feed && hotspots), [data?.items, feed, publications, hotspots, privateCases]);
  const mapReports = useMemo(() => {
    const markers = privateReportMarkers(data?.privateReports ?? [], privateCases);
    if (!perimeterDraft || !report || perimeterDraft.caseId !== `report:${report.id}` || markers.some(item => item.id === report.id)) return markers;
    return [...markers, report];
  }, [data?.privateReports, privateCases, perimeterDraft, report]);
  const publication = usePublicationMap(user, params.get("publication"));
  const items = publication.item && (feed || publications) ? [...mapItems.filter(item => item.id !== publication.item!.id), publication.item] : mapItems;
  const selected = publication.item ?? items.find(item => item.id === params.get("observation")) ?? null;
  const availability = mapAvailability(data, loaded.failed);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  function discardReview() {
    if (reviewDraft.pending || caseDraft.pending || perimeterDraft) return false;
    return !(reviewDraft.dirty || caseDraft.dirty) || window.confirm("Discard unsaved detail changes?");
  }
  function clearSelection() { setParams(current => { const next = new URLSearchParams(current); next.delete("observation"); next.delete("case"); next.delete("publication"); next.delete("report"); return next; }, { replace: true }); }
  function select(id: string) {
    if (!discardReview()) return;
    setReportId(null);
    setParams(current => { const next = new URLSearchParams(current); next.set("observation", id); next.delete("case"); next.delete("publication"); return next; }, { replace: true });
    if (!desktop) setWorklistOpen(false);
  }
  function selectReport(value: GovernmentReport) {
    if (!discardReview()) return false;
    if (!feed) clearSelection();
    setReportId(value.id);
    setFocusPoint(hasPoint(value) ? { latitude: value.latitude, longitude: value.longitude } : null);
    if (!desktop) setWorklistOpen(false);
    return true;
  }
  function selectCase(id: string) {
    if (!discardReview()) return;
    setReportId(null);
    setParams(current => { const next = new URLSearchParams(current); next.set("case", id); next.delete("observation"); next.delete("publication"); return next; }, { replace: true });
    if (!desktop) setWorklistOpen(false);
  }
  function viewReport(value: GovernmentReport) {
    if (!selectReport(value)) return;
    const next = new URLSearchParams(params);
    next.delete("observation"); next.delete("case"); next.delete("publication"); next.delete("view");
    navigate(`/dashboard?${next.toString()}`, { replace: true });
  }
  function closeDetail() { if (!discardReview()) return; setReportId(null); clearSelection(); }
  function changeRange(value: string) { if (!discardReview()) return; setHours(Number(value)); setLimit(40); clearSelection(); }
  function openList(value: "cases" | "results") {
    if (!desktop && (selected || report || caseId) && !discardReview()) return;
    if (!desktop) { clearSelection(); setReportId(null); }
    if (value === "cases") { setWorklistOpen(true); if (!desktop) setListOpen(false); }
    else { setListOpen(true); if (!desktop) setWorklistOpen(false); }
  }
  const searchControl = (id: string, side: "top" | "bottom") => <PlaceSearch id={id} side={side} onSelect={value => { if (!discardReview()) return; setPlace(value); const next = new URLSearchParams(params); next.delete("view"); navigate(`/dashboard?${next.toString()}`, { replace: true }); }} />;
  const filters = <MapLayers hours={hours} onRange={changeRange} feed={feed} publications={publications} hotspots={hotspots} onPublications={setPublications} onHotspots={setHotspots} />;
  const actions = <>{filters}{!feed && <><Button variant="ghost" aria-pressed={listOpen && (desktop || (!selected && !report && !caseId))} className={listOpen && (desktop || (!selected && !report && !caseId)) ? "bg-primary text-white shadow-sm hover:bg-forest hover:text-white" : undefined} data-worklist-trigger onClick={() => openList("results")}><List size={18} aria-hidden="true" />List</Button><Button variant="ghost" aria-pressed={worklistOpen && (desktop || (!selected && !report && !caseId))} className={worklistOpen && (desktop || (!selected && !report && !caseId)) ? "bg-primary text-white shadow-sm hover:bg-forest hover:text-white" : undefined} data-worklist-trigger onClick={() => openList("cases")}><ShieldCheck size={18} aria-hidden="true" />Worklist</Button></>}</>;
  const observations = <div className="p-4">
    {availability && <p role={loaded.failed ? "alert" : "status"} className="mb-4 text-xs text-amber-950">{availability}</p>}
    {loaded.initialLoading && <ObservationListSkeleton />}
    <ul className="space-y-2">{items.slice(0, limit).map(item => <li key={item.id}><button type="button" onClick={() => select(item.id)} className="flex w-full items-start gap-3 rounded-xl border border-primary/10 bg-white p-4 text-left hover:bg-secondary">{item.kind === "hotspot" ? <img src="/icons8-satellite.png" alt="" width={40} height={40} className="size-10 shrink-0" /> : <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-secondary text-primary"><FileText size={24} aria-hidden="true" /></span>}<span className="min-w-0 flex-1"><span className="block font-extrabold">{item.title}</span><span className="mt-2 block text-xs text-muted-foreground">{item.kind === "hotspot" ? "Satellite detection" : "Published report"} · {formatTime(item.time)}</span></span></button></li>)}</ul>
    {data && !items.length && <p className="py-8 text-sm">No matching observations.</p>}
    {items.length > limit && <Button variant="outline" className="mt-4 w-full" onClick={() => setLimit(value => value + 40)}>Show more</Button>}
    {data?.limited && <p className="mt-3 text-xs">Results are limited. Narrow the time range.</p>}
  </div>;
  const detailOpen = !!selected || !!report || !!caseId;
  const reportDrawing = perimeterDraft?.caseId === `report:${report?.id}`;
  const detail = caseId ? <CasePanel key={caseId} user={user} id={caseId} draft={perimeterDraft} setDraft={setPerimeterDraft} canDraw={!feed} onWind={setWind} onDraft={onCaseDraft} /> : report ? (reportDetail.initialLoading ? <GovernmentReportDetailSkeleton /> : <>{reportDetail.failed && <div role="alert" className="space-y-3 p-4 text-sm"><p>Report details could not refresh.</p><Button variant="outline" onClick={reportDetail.retry}>Retry</Button></div>}<fieldset disabled={reportsUnavailable} aria-busy={reportDetail.refreshing}><ReportReview key={report.id} user={user} report={report} onDraft={onDraft} perimeterDraft={reportDrawing ? perimeterDraft : null} setPerimeterDraft={setPerimeterDraft} canDraw={!feed && (!perimeterDraft || !!reportDrawing)} /></fieldset></>) : selected ? <ItemDetail item={selected} /> : null;
  return <main className="relative isolate h-dvh overflow-hidden bg-secondary/40 text-forest">
    <DraftGuard dashboard dirty={!!perimeterDraft || caseDraft.dirty} pending={!!perimeterDraft?.pending || caseDraft.pending} />
    <h1 className="sr-only">Coordination map</h1>
    <div inert={!!perimeterDraft || (!desktop && detailOpen)}><WorkspaceNav user={user}><div>{searchControl("mobile-observation-search", "bottom")}<div className="flex">{actions}</div></div></WorkspaceNav></div>
    {!feed && <section aria-label="Situation map" className="absolute inset-0"><Suspense fallback={<MapSkeleton />}><SituationMap place={place} focusPoint={focusPoint} items={items} selected={selected} onSelect={select} privateReports={loaded.failed ? [] : mapReports} selectedReport={report} onSelectReport={selectReport} privateCases={privateCases} selectedCaseId={caseId} onSelectCase={selectCase} perimeterDraft={perimeterDraft} onPerimeterDraft={setPerimeterDraft} wind={wind} /></Suspense></section>}
    {!feed && params.get("publication") && (publication.isPending || publication.isError || !publication.item) && <div role={publication.isError ? "alert" : "status"} className="absolute left-4 top-56 z-20 rounded-sm border bg-white p-4 text-sm sm:top-28">{publication.isPending ? "Loading published location…" : "Approved map location unavailable."}{publication.isError && <Button variant="outline" onClick={() => void publication.refetch()}>Retry</Button>}</div>}
    {feed && <section aria-label="Citizen reports feed" className="absolute inset-0 overflow-y-auto overscroll-contain bg-white px-4 pb-32 pt-56 sm:pt-28">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 h-[38vh] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000)]"><img src={foreground} alt="" className="absolute bottom-0 left-0 w-[42vw] max-w-lg opacity-20" /><img src={foreground} alt="" className="absolute bottom-0 right-0 w-[38vw] max-w-md -scale-x-100 opacity-15" /></div>
      <div className="relative mx-auto max-w-2xl">
        <div>
          <header className="mb-5 flex items-end justify-between border-b border-primary/10 pb-3"><h2 className="text-2xl font-extrabold">Citizen reports</h2><Button variant="outline" size="icon" className="rounded-full border-white/40 bg-white text-forest" aria-label="Refresh citizen reports" aria-busy={internalFeed.loading} disabled={internalFeed.loading} onClick={internalFeed.retry}><RefreshCw size={17} aria-hidden="true" /></Button></header>
          <div className="space-y-5"><p className="text-xs text-muted-foreground">All authorized citizen reports, newest first.</p>{internalFeed.initialLoading && <FeedRowsSkeleton />}{internalFeed.failed && <p role="alert">Internal reports unavailable. Refresh before reviewing.</p>}{internalFeed.data?.data.length === 0 && <FeedEmpty>No citizen reports for the selected review status.</FeedEmpty>}{authorizedReports.map(item => <FeedRow key={item.id} title={item.description} status={item.triage.level === "UNKNOWN" ? "Needs assessment" : `Review priority: ${item.triage.level}`} time={formatTime(item.observedAt)} location={!hasPoint(item) ? "Location unavailable" : item.locationMode === "OBSERVER_POSITION" ? "Observer position, not incident location" : item.locationDescription || "Estimated incident location"} onOpen={() => viewReport(item)} />)}{internalFeed.loadingMore && <FeedRowsSkeleton />}<FeedSentinel enabled={internalFeed.hasMore && !internalFeed.loading && !internalFeed.failed} onLoad={internalFeed.showMore} />{internalFeed.failed && <Button variant="outline" disabled={internalFeed.loading} onClick={internalFeed.retry}>Refresh</Button>}</div>
        </div>
      </div>
    </section>}
    <MapPanel title="List" count={`${items.length} observations`} side="left" desktop={desktop} open={!feed && !perimeterDraft && listOpen && (desktop || !detailOpen)} keepMounted disabled={!!perimeterDraft} onClose={() => setListOpen(false)}>{observations}</MapPanel>
    <MapPanel title="Worklist" count={internalFeed.data ? `${reportTotal} reports` : undefined} side="center" desktop={desktop} open={!feed && !perimeterDraft && worklistOpen && (desktop || !detailOpen)} keepMounted disabled={!!perimeterDraft} onClose={() => setWorklistOpen(false)}>
      <GovernmentWorklist reports={internalFeed} status={reportStatus} setStatus={setReportStatus} onSelectReport={selectReport} onViewReport={viewReport} />
    </MapPanel>
    <MapPanel title={caseId ? "Internal case details" : report ? `Review ${report.number}` : selected?.title ?? "Observation details"} count={!report && detailOpen ? "1 selected" : undefined} desktop={desktop} open={!feed && detailOpen} drawing={!!perimeterDraft} disabled={reviewDraft.pending || caseDraft.pending || !!perimeterDraft} onClose={closeDetail}>{detail}</MapPanel>
    <div inert={!!perimeterDraft || (!desktop && detailOpen)} className="absolute bottom-6 left-1/2 z-30 hidden w-[calc(100%-160px)] max-w-3xl -translate-x-1/2 items-center gap-1 rounded-full border bg-white p-2 shadow-xl sm:flex">{searchControl("observation-search", "top")}{actions}</div>
    {!desktop && !worklistOpen && !detailOpen && <Button className="absolute bottom-5 left-4 z-30" onClick={() => openList("cases")}><Activity size={17} aria-hidden="true" />Worklist</Button>}
  </main>;
}

export function ErrorBoundary() {
  return <main className="grid min-h-dvh place-items-center bg-white p-6"><div className="max-w-md"><h1 className="text-2xl font-extrabold">Unable to open the dashboard</h1><p className="mt-3 text-muted-foreground">Your session could not be checked. No private dashboard data has been loaded.</p><div className="mt-5 flex gap-3"><Button onClick={() => window.location.reload()}>Retry</Button><Button asChild variant="outline"><Link to={dashboardLogin("ADMIN")}>Government Login</Link></Button></div></div></main>;
}
