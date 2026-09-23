import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLoaderData, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FileText, FolderOpen, List, RefreshCw, ShieldCheck } from "lucide-react";
import { usePublicationMap } from "@/hooks/dashboard/usePublicationMap";
import { getGovernmentReport } from "@/api/dashboard/government";
import MapLayers from "./components/MapLayers";
import CaseQueue from "./components/CaseQueue";
import { foreground } from "@/assets";
import { FeedEmpty, FeedRow, FeedRowsSkeleton, FeedSentinel } from "./components/FeedRow";
import FeedThumbnail from "./components/FeedThumbnail";
import { useGovernmentCase, useGovernmentReport, useGovernmentReports } from "@/hooks/dashboard/useGovernment";
import { dashboardLogin } from "@/lib";
import { effectiveReportPriority, triageAppearance } from "@/lib/report-triage";
import { DraftGuard, Preloader, WorkspaceNav } from "@/components/common";
import { Button } from "@/components/ui";
import type { DashboardUser } from "@/types";
import { CasePanel } from "./components/GovernmentWorklist";
import type { GovernmentReport } from "@/types/government";
import type { PerimeterDraft } from "@/lib/perimeter";
import type { WindArrow } from "@/lib/wind";
import { CitizenDashboard, GovernmentWorklist, MapSkeleton, ObservationListSkeleton, PlaceSearch, PublishedLocationSkeleton } from "@/pages/dashboard/components";
import { ItemDetail } from "./components/CitizenDashboard";
import { IncidentPointContext, updateIncidentPick, type IncidentPick } from "@/lib/incident-point";
import { ReportAssociationContext, type ReportAssociationPick } from "@/lib/report-association";
import { ReportReview } from "./components/GovernmentReports";
import { GovernmentReportDetailSkeleton } from "./components/DashboardSkeletons";
import MapPanel from "./components/MapPanel";
import GovernmentFeedDetail from "./components/GovernmentFeedDetail";
import CompletionNewsEditor from "./components/CompletionNewsEditor";
import { useDashboardSession, useQueryGetMap } from "@/hooks/dashboard";
import { governmentPublicItems, privateReportMarkers } from "@/lib/dashboard";
import { pageTitle } from "@/lib/page-title";
import { ageMap, filterMap, formatTime, mapAvailability, hasPoint } from "@/pages/dashboard/utils";

const SituationMap = lazy(() => import("@/pages/dashboard/components/SituationMap"));
const emptyReportSelection: ReadonlySet<string> = new Set();

export function Component() {
  const user = useLoaderData() as DashboardUser;
  const location = useLocation();
  const { signingOut } = useDashboardSession(user);
  useEffect(() => { document.title = pageTitle(location.pathname, location.search); }, [location.pathname, location.search]);
  if (signingOut) return <Preloader />;
  return user.role === "USER" ? <CitizenDashboard key={`${user.id}:${user.role}`} user={user} /> : <Workspace key={`${user.id}:${user.role}`} user={user} />;
}

function Workspace({ user }: { user: DashboardUser }) {
  const [incidentPick, setIncidentPick] = useState<IncidentPick | null>(null);
  const [associationPick, setAssociationPick] = useState<ReportAssociationPick | null>(null);
  const [caseReportPick, setCaseReportPick] = useState<string | null>(null);
  const [caseReportDraft, setCaseReportDraft] = useState<{ caseId: string; ids: Set<string> } | null>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const feed = pathname === "/feed" || params.get("view") === "feed";
  const newsCaseId = feed ? params.get("news-case") : null;
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const [hours, setHours] = useState(48);
  const [place, setPlace] = useState<import("@/lib/places").Place | null>(null);
  const [publications, setPublications] = useState(true);
  const [hotspots, setHotspots] = useState(true);
  const [operations, setOperations] = useState(false);
  const caseId = params.get("case");
  const caseReportIds = caseReportDraft?.caseId === caseId ? caseReportDraft.ids : emptyReportSelection;
  const selectedCase = useGovernmentCase(user, caseId ?? "");
  const newsCase = useGovernmentCase(user, newsCaseId ?? "");
  const [caseDraft, setCaseDraft] = useState({ dirty: false, pending: false });
  const onCaseDraft = useCallback((dirty: boolean, pending: boolean) => setCaseDraft({ dirty, pending }), []);
  const [newsDraft, setNewsDraft] = useState({ dirty: false, pending: false });
  const onNewsDraft = useCallback((state: { dirty: boolean; pending: boolean }) => setNewsDraft(state), []);
  const [listOpen, setListOpen] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [worklistOpen, setWorklistOpen] = useState(false);
  const [casesOpen, setCasesOpen] = useState(false);
  const [limit, setLimit] = useState(40);
  const [perimeterDraft, setPerimeterDraft] = useState<PerimeterDraft | null>(null);
  const [wind, setWind] = useState<WindArrow | null>(null);
  const [reportStatus, setReportStatus] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const selectedReportId = params.get("report") ?? reportId;
  const [feedReportId, setFeedReportId] = useState<string | null>(() => feed ? params.get("feed-report") : null);
  const feedScrollRef = useRef<HTMLElement>(null);
  const feedScrollTop = useRef(0);
  const [reviewDraft, setReviewDraft] = useState({ dirty: false, pending: false });
  const onDraft = useCallback((dirty: boolean, pending: boolean) => setReviewDraft({ dirty, pending }), []);
  const internalFeed = useGovernmentReports(user, "", feed ? "" : reportStatus, feed ? 10 : 20);
  const reportDetail = useGovernmentReport(user, selectedReportId);
  const feedReportDetail = useGovernmentReport(user, feedReportId);
  const reportTotal = internalFeed.data?.meta.total ?? 0;
  const authorizedReports = internalFeed.forbidden ? [] : internalFeed.data?.data ?? [];
  const report = reportDetail.forbidden || internalFeed.forbidden ? null : reportDetail.data ?? authorizedReports.find(item => item.id === selectedReportId) ?? null;
  const feedReport = feedReportDetail.forbidden || internalFeed.forbidden ? null : feedReportDetail.data ?? null;
  const reportCase = useGovernmentCase(user, report?.case?.id ?? "");
  const feedReportCase = useGovernmentCase(user, feedReport?.case?.id ?? "");
  const [caseStatus, setCaseStatus] = useState<"active" | "closed" | "all">("active");
  const loaded = useQueryGetMap(user, hours, caseStatus);
  const data = useMemo(() => loaded.data ? ageMap(loaded.data, loaded.now) : null, [loaded.data, loaded.now]);
  const privateCases = useMemo(() => {
    const loadedCases = data?.privateCases ?? [];
    const detail = selectedCase.data;
    if (!detail || (caseStatus === "active" && detail.handling === "CLOSED") || (caseStatus === "closed" && detail.handling !== "CLOSED")) return loadedCases;
    return [...loadedCases.filter(item => item.id !== detail.id), detail];
  }, [data?.privateCases, selectedCase.data, caseStatus]);
  const mapItems = useMemo(() => filterMap(governmentPublicItems(data?.items ?? [], privateCases), "", feed || publications, !feed && hotspots), [data?.items, feed, publications, hotspots, privateCases]);
  const mapReports = useMemo(() => {
    if (caseReportPick) return (data?.privateReports ?? []).filter(item => !item.case && item.reviewStatus === "REVIEWED" && item.locationMode === "INCIDENT_ESTIMATE" && hasPoint(item));
    if (associationPick) return (data?.privateReports ?? []).filter(item => item.id !== associationPick.sourceId && item.locationMode === "INCIDENT_ESTIMATE" && (!item.case || item.case.handlingStatus !== "CLOSED" && item.case.verificationStatus !== "NOT_FIRE"));
    const markers = privateReportMarkers(data?.privateReports ?? [], privateCases);
    if (!report || !hasPoint(report) || markers.some(item => item.id === report.id)) return markers;
    return [...markers, report];
  }, [associationPick, caseReportPick, data?.privateReports, privateCases, report]);
  const publication = usePublicationMap(user, params.get("publication"));
  const items = publication.item ? [...mapItems.filter(item => item.id !== publication.item!.id), publication.item] : mapItems;
  const selected = publication.item ?? items.find(item => item.id === params.get("observation")) ?? null;
  const availability = mapAvailability(data, loaded.failed);
  const [showInitialAvailability, setShowInitialAvailability] = useState(true);
  useEffect(() => {
    if (loaded.initialLoading || loaded.failed || !showInitialAvailability) return;
    const timeout = window.setTimeout(() => setShowInitialAvailability(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [loaded.initialLoading, loaded.failed, showInitialAvailability]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  function discardReview() {
    if (incidentPick || caseReportPick || reviewDraft.pending || caseDraft.pending || perimeterDraft) return false;
    if (!(reviewDraft.dirty || caseDraft.dirty || caseReportIds.size > 0)) return true;
    const discard = window.confirm("Discard unsaved detail changes?");
    if (discard && caseReportIds.size) setCaseReportDraft(null);
    return discard;
  }
  function clearSelection() { setCaseReportPick(null); setCaseReportDraft(null); setParams(current => { const next = new URLSearchParams(current); next.delete("observation"); next.delete("case"); next.delete("publication"); next.delete("report"); return next; }, { replace: true }); }
  function select(id: string) {
    if (!discardReview()) return;
    setReportId(null);
    setParams(current => { const next = new URLSearchParams(current); next.set("observation", id); next.delete("case"); next.delete("publication"); next.delete("report"); return next; }, { replace: true });
    if (!desktop) { setWorklistOpen(false); setCasesOpen(false); }
  }
  function selectReport(value: GovernmentReport) {
    if (caseReportPick) {
      if (loaded.failed || caseReportPick !== caseId || value.case || value.reviewStatus !== "REVIEWED" || value.locationMode !== "INCIDENT_ESTIMATE") return false;
      setCaseReportDraft(current => { const next = new Set(current?.caseId === caseReportPick ? current.ids : []); if (next.has(value.id)) next.delete(value.id); else next.add(value.id); return { caseId: caseReportPick, ids: next }; });
      return true;
    }
    if (associationPick) { associationPick.apply(value); setAssociationPick(null); return true; }
    if (!discardReview()) return false;
    if (!feed) clearSelection();
    else setParams(current => { const next = new URLSearchParams(current); next.delete("report"); return next; }, { replace: true });
    setReportId(value.id);
    setFocusPoint(hasPoint(value) ? { latitude: value.latitude, longitude: value.longitude } : null);
    if (!desktop) { setWorklistOpen(false); setCasesOpen(false); }
    return true;
  }
  function selectCase(id: string) {
    if (!discardReview()) return;
    if (id !== caseId) { setCaseReportPick(null); setCaseReportDraft(null); }
    setReportId(null);
    setParams(current => { const next = new URLSearchParams(current); next.set("case", id); next.delete("observation"); next.delete("publication"); next.delete("report"); return next; }, { replace: true });
    if (!desktop) { setWorklistOpen(false); setCasesOpen(false); }
  }
  function viewReport(value: GovernmentReport) {
    if (!selectReport(value)) return;
    setFeedReportId(null);
    const next = new URLSearchParams(params);
    next.delete("observation"); next.delete("case"); next.delete("publication"); next.delete("report"); next.delete("view"); next.delete("feed-report");
    navigate(`/dashboard?${next.toString()}`, { replace: true });
  }
  function openFeedReport(value: GovernmentReport) {
    if (!discardReview()) return;
    feedScrollTop.current = feedScrollRef.current?.scrollTop ?? 0;
    setFeedReportId(value.id);
    setParams(current => { const next = new URLSearchParams(current); next.set("view", "feed"); next.set("feed-report", value.id); return next; }, { replace: true });
  }
  function closeFeedReport() {
    if (!discardReview()) return;
    setFeedReportId(null);
    setParams(current => { const next = new URLSearchParams(current); next.delete("feed-report"); return next; }, { replace: true });
  }
  function closeDetail() { if (!discardReview()) return; setReportId(null); clearSelection(); }
  useEffect(() => {
    if (!feed || feedReportId || newsCaseId || !feedScrollRef.current) return;
    const frame = requestAnimationFrame(() => feedScrollRef.current?.scrollTo({ top: feedScrollTop.current }));
    return () => cancelAnimationFrame(frame);
  }, [feed, feedReportId, newsCaseId]);
  function changeRange(value: string) { if (!discardReview()) return; setHours(Number(value)); setLimit(40); clearSelection(); }
  function openList(value: "reports" | "cases" | "results") {
    if (!desktop && (selected || report || caseId) && !discardReview()) return;
    if (!desktop) { clearSelection(); setReportId(null); }
    if (value === "reports") { setWorklistOpen(true); setCasesOpen(false); if (!desktop) setListOpen(false); }
    else if (value === "cases") { setCasesOpen(true); setWorklistOpen(false); if (!desktop) setListOpen(false); }
    else { setListOpen(true); if (!desktop) { setWorklistOpen(false); setCasesOpen(false); } }
  }
  const searchControl = (id: string, side: "top" | "bottom") => <PlaceSearch id={id} side={side} onSelect={value => { if (!discardReview()) return; setPlace(value); const next = new URLSearchParams(params); next.delete("view"); navigate(`/dashboard?${next.toString()}`, { replace: true }); }} />;
  const filters = <MapLayers caseStatus={caseStatus} onCaseStatus={value => { if (!discardReview()) return; setCaseStatus(value); clearSelection(); setReportId(null); }} operations={operations} onOperations={setOperations} hours={hours} onRange={changeRange} feed={feed} publications={publications} hotspots={hotspots} onPublications={setPublications} onHotspots={setHotspots} />;
  const actions = <>{filters}{!feed && <><Button variant="ghost" aria-pressed={listOpen && (desktop || (!selected && !report && !caseId))} className={listOpen && (desktop || (!selected && !report && !caseId)) ? "bg-primary text-white shadow-sm hover:bg-forest hover:text-white" : undefined} data-worklist-trigger onClick={() => openList("results")}><List size={18} aria-hidden="true" />List</Button><Button variant="ghost" aria-pressed={worklistOpen && (desktop || (!selected && !report && !caseId))} className={worklistOpen && (desktop || (!selected && !report && !caseId)) ? "bg-primary text-white shadow-sm hover:bg-forest hover:text-white" : undefined} data-worklist-trigger onClick={() => openList("reports")}><ShieldCheck size={18} aria-hidden="true" />Worklist</Button><Button variant="ghost" aria-pressed={casesOpen && (desktop || (!selected && !report && !caseId))} className={casesOpen && (desktop || (!selected && !report && !caseId)) ? "bg-primary text-white shadow-sm hover:bg-forest hover:text-white" : undefined} data-worklist-trigger onClick={() => openList("cases")}><FolderOpen size={18} aria-hidden="true" />Cases</Button></>}</>;
  const detailOpen = !!selected || !!report || !!caseId;
  const mobileControls = <div className="space-y-2"><div className="flex h-10 items-center rounded-full bg-secondary/50 px-1.5 shadow-inner">{searchControl("mobile-observation-search", "bottom")}</div><div className="grid grid-cols-4 gap-1"><span className="flex min-w-0 justify-center">{filters}</span>{!feed && <><button type="button" aria-pressed={listOpen && !detailOpen} data-worklist-trigger onClick={() => openList("results")} className={`flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-[10px] font-extrabold ${listOpen && !detailOpen ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}><List size={15} aria-hidden="true" />List</button><button type="button" aria-pressed={worklistOpen && !detailOpen} data-worklist-trigger onClick={() => openList("reports")} className={`flex min-h-9 items-center justify-center gap-1 rounded-full px-1 text-[10px] font-extrabold ${worklistOpen && !detailOpen ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}><ShieldCheck size={15} aria-hidden="true" />Worklist</button><button type="button" aria-pressed={casesOpen && !detailOpen} data-worklist-trigger onClick={() => openList("cases")} className={`flex min-h-9 items-center justify-center gap-1 rounded-full px-1 text-[10px] font-extrabold ${casesOpen && !detailOpen ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}><FolderOpen size={15} aria-hidden="true" />Cases</button></>}</div></div>;
  const observations = <div className="p-4">
    {availability && (loaded.failed || showInitialAvailability) && <p role={loaded.failed ? "alert" : "status"} className="mb-4 text-xs text-amber-950">{availability}</p>}
    {loaded.initialLoading && <ObservationListSkeleton />}
    <ul className="space-y-2">{items.slice(0, limit).map(item => <li key={item.id}><button type="button" onClick={() => select(item.id)} className="flex w-full items-start gap-3 rounded-xl border border-primary/10 bg-white p-4 text-left hover:bg-secondary">{item.kind === "hotspot" ? <img src="/icons8-satellite.png" alt="" width={40} height={40} className="size-10 shrink-0" /> : <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-secondary text-primary"><FileText size={24} aria-hidden="true" /></span>}<span className="min-w-0 flex-1"><span className="block font-extrabold">{item.title}</span><span className="mt-2 block text-xs text-muted-foreground">{item.kind === "hotspot" ? "Satellite detection" : "Published report"} · {formatTime(item.time)}</span></span></button></li>)}</ul>
    {data && !items.length && <p className="py-8 text-sm">No matching observations.</p>}
    {items.length > limit && <Button variant="outline" className="mt-4 w-full" onClick={() => setLimit(value => value + 40)}>Show more</Button>}
    {data?.limited && <p className="mt-3 text-xs">Results are limited. Narrow the time range.</p>}
  </div>;
  const reportDrawing = perimeterDraft?.caseId === `report:${report?.id}`;
  const detail = caseId ? <CasePanel key={caseId} user={user} id={caseId} draft={perimeterDraft} setDraft={setPerimeterDraft} canDraw={!feed} onWind={setWind} onDraft={onCaseDraft} /> : report ? (reportDetail.initialLoading ? <GovernmentReportDetailSkeleton /> : <>{reportDetail.failed && <div role="alert" className="space-y-3 p-4 text-sm"><p>Report details could not refresh.</p><Button variant="outline" onClick={reportDetail.retry}>Retry</Button></div>}<div aria-busy={reportDetail.refreshing}><ReportReview key={report.id} user={user} report={report} reviewUnavailable={reportDetail.failed || reportDetail.data?.id !== report.id} caseEvidence={reportCase.data?.fieldUpdates ?? []} caseAssignments={reportCase.data?.assignments ?? []} caseVersion={reportCase.data?.version} onDraft={onDraft} perimeterDraft={reportDrawing ? perimeterDraft : null} setPerimeterDraft={setPerimeterDraft} canDraw={!feed && (!perimeterDraft || !!reportDrawing)} /></div></>) : selected ? <ItemDetail item={selected} /> : null;
  return <IncidentPointContext.Provider value={{ start: setIncidentPick, available: !feed && !associationPick && !caseReportPick && !reviewDraft.pending && !caseDraft.pending }}><ReportAssociationContext.Provider value={{ activeSourceId: associationPick?.sourceId ?? null, available: !feed && !incidentPick && !perimeterDraft && !caseReportPick && !reviewDraft.pending && !caseDraft.pending, start: pick => { setListOpen(false); setWorklistOpen(false); setCasesOpen(false); setAssociationPick(pick); }, cancel: () => setAssociationPick(null), caseId: caseReportPick, selectedIds: caseReportIds, selectedReports: (data?.privateReports ?? []).filter(item => caseReportIds.has(item.id)).map(item => ({ id: item.id, number: item.number })), toggleCaseReport: reportId => setCaseReportDraft(current => { if (!caseId) return current; const next = new Set(current?.caseId === caseId ? current.ids : []); if (next.has(reportId)) next.delete(reportId); else next.add(reportId); return { caseId, ids: next }; }), startCase: id => { if (id !== caseId || selectedCase.failed || selectedCase.loading || loaded.failed || incidentPick || perimeterDraft || caseDraft.pending) return; setListOpen(false); setWorklistOpen(false); setCasesOpen(false); setCaseReportPick(id); }, finishCase: () => setCaseReportPick(null), clearCase: () => { setCaseReportPick(null); setCaseReportDraft(null); }, validateCaseSelection: async reportIds => { for (const reportId of reportIds) { const current = await getGovernmentReport(reportId, AbortSignal.timeout(20000)); if (current.case || current.reviewStatus !== "REVIEWED" || current.locationMode !== "INCIDENT_ESTIMATE" || !hasPoint(current)) throw new Error("A selected report changed. Clear it and review the report pins again before saving."); } } }}><main className="relative isolate h-dvh overflow-hidden bg-secondary/40 text-forest">
    <DraftGuard dashboard dirty={!!perimeterDraft || caseDraft.dirty || caseReportIds.size > 0} pending={!!perimeterDraft?.pending || caseDraft.pending} />
    {feed && newsCaseId && <DraftGuard dirty={newsDraft.dirty} pending={newsDraft.pending} />}
    <h1 className="sr-only">Coordination map</h1>
    <div inert={!!perimeterDraft || (!desktop && detailOpen)}><WorkspaceNav user={user}>{mobileControls}</WorkspaceNav></div>
    {!feed && <section aria-label="Situation map" className="absolute inset-0">{loaded.initialLoading && !loaded.data ? <MapSkeleton /> : <Suspense fallback={<MapSkeleton />}><SituationMap place={place} focusPoint={focusPoint} items={caseReportPick ? [] : items} selected={caseReportPick ? null : selected} onSelect={select} privateReports={loaded.failed ? [] : mapReports} selectingReport={!!associationPick || !!caseReportPick} selectedReport={caseReportPick ? null : report} selectedReportIds={caseReportPick ? caseReportIds : undefined} onSelectReport={selectReport} privateCases={caseReportPick ? [] : privateCases} selectedCaseId={caseReportPick ? null : caseId} onSelectCase={caseReportPick ? undefined : selectCase} draftLocation={incidentPick} onPick={incidentPick ? (latitude, longitude) => setIncidentPick(current => updateIncidentPick(current, latitude, longitude)) : undefined} perimeterDraft={incidentPick ? null : perimeterDraft} onPerimeterDraft={setPerimeterDraft} wind={caseReportPick ? null : wind} operationalFeatures={caseReportPick ? [] : operations ? data?.operationalFeatures ?? [] : []} /></Suspense>}</section>}
    {!feed && params.get("publication") && publication.isPending && !publication.item && <PublishedLocationSkeleton />}
    {!feed && params.get("publication") && publication.isError && !publication.item && <div role="alert" className="absolute left-4 top-56 z-20 rounded-sm border bg-white p-4 text-sm sm:top-28">Approved map location unavailable.<Button variant="outline" onClick={() => void publication.refetch()}>Retry</Button></div>}
    {feed && newsCaseId && <section aria-label="Case News editor" className="absolute inset-0 overflow-y-auto bg-white px-4 pb-32 pt-56 sm:px-6 sm:pt-28"><div className="mx-auto max-w-2xl"><Button type="button" variant="ghost" onClick={() => setParams(current => { const next = new URLSearchParams(current); next.delete("news-case"); return next; }, { replace: true })}>Back to Feed</Button>{newsCase.failed && <p role="alert" className="mt-4 text-sm">Case details could not refresh. <Button type="button" variant="outline" onClick={newsCase.retry}>Retry</Button></p>}{newsCase.initialLoading && <p role="status" className="mt-4 text-sm">Loading case…</p>}{newsCase.data && <><h2 className="mt-5 text-xl font-extrabold">{newsCase.data.title}</h2><p className="mt-2 text-sm text-muted-foreground">{newsCase.data.number} · {newsCase.data.verification === "CONFIRMED_FIRE" ? "Confirmed fire" : "Not confirmed"}</p>{newsCase.data.verification === "CONFIRMED_FIRE" && <CompletionNewsEditor key={newsCaseId} user={user} caseId={newsCaseId} onDraft={onNewsDraft} />}</>}</div></section>}
    {feed && !newsCaseId && feedReportId && <GovernmentFeedDetail user={user} report={feedReport} loading={feedReportDetail.initialLoading} failed={feedReportDetail.failed} retry={feedReportDetail.retry} caseEvidence={feedReportCase.data?.fieldUpdates ?? []} caseAssignments={feedReportCase.data?.assignments ?? []} onBack={closeFeedReport} onLocate={() => { if (feedReport) viewReport(feedReport); }} onDraft={onDraft} perimeterDraft={perimeterDraft} setPerimeterDraft={setPerimeterDraft} />}
    {feed && !feedReportId && !newsCaseId && <section ref={feedScrollRef} aria-label="Citizen reports feed" className="absolute inset-0 overflow-y-auto overscroll-contain bg-white px-4 pb-32 pt-56 sm:pt-28">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 h-[38vh] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000)]"><img src={foreground} alt="" className="absolute bottom-0 left-0 w-[42vw] max-w-lg opacity-20" /><img src={foreground} alt="" className="absolute bottom-0 right-0 w-[38vw] max-w-md -scale-x-100 opacity-15" /></div>
      <div className="relative mx-auto max-w-2xl">
        <div>
          <header className="mb-5 flex items-end justify-between border-b border-primary/10 pb-3"><h2 className="text-2xl font-extrabold">Citizen reports</h2><Button variant="outline" size="icon" className="rounded-full border-white/40 bg-white text-forest" aria-label="Refresh citizen reports" aria-busy={internalFeed.loading} disabled={internalFeed.loading} onClick={internalFeed.retry}><RefreshCw size={17} aria-hidden="true" /></Button></header>
          <div className="space-y-5"><p className="text-xs text-muted-foreground">Authorized reports ordered by effective priority, then newest first.</p>{internalFeed.initialLoading && <FeedRowsSkeleton />}{internalFeed.failed && <p role="alert">Internal reports unavailable. Refresh before reviewing.</p>}{internalFeed.data?.data.length === 0 && <FeedEmpty>No citizen reports for the selected review status.</FeedEmpty>}{authorizedReports.map(item => <FeedRow key={item.id} title={item.description} status={`Review priority: ${triageAppearance[effectiveReportPriority(item)].label}`} time={formatTime(item.observedAt)} location={!hasPoint(item) ? "Location unavailable" : item.locationMode === "OBSERVER_POSITION" ? "Observer position, not incident location" : item.locationDescription || "Estimated incident location"} thumbnail={item.coverAttachment ? <FeedThumbnail user={user} access="private" attachment={item.coverAttachment} label={`Private report photo: ${item.description}`} /> : undefined} onOpen={() => openFeedReport(item)} />)}{internalFeed.loadingMore && <FeedRowsSkeleton />}<FeedSentinel enabled={internalFeed.hasMore && !internalFeed.loading && !internalFeed.failed} onLoad={internalFeed.showMore} />{internalFeed.failed && <Button variant="outline" disabled={internalFeed.loading} onClick={internalFeed.retry}>Refresh</Button>}</div>
        </div>
      </div>
    </section>}
    <MapPanel title="List" count={`${items.length} observations`} side="left" desktop={desktop} open={!feed && !perimeterDraft && listOpen && (desktop || !detailOpen)} keepMounted disabled={!!perimeterDraft} onClose={() => setListOpen(false)}>{observations}</MapPanel>
    <MapPanel title="Worklist" count={internalFeed.data ? `${reportTotal} reports` : undefined} side="center" desktop={desktop} open={!feed && !perimeterDraft && worklistOpen && (desktop || !detailOpen)} keepMounted disabled={!!perimeterDraft} onClose={() => setWorklistOpen(false)}>
      <GovernmentWorklist reports={internalFeed} status={reportStatus} setStatus={setReportStatus} onSelectReport={selectReport} onViewReport={viewReport} />
    </MapPanel>
    <MapPanel title="Cases" side="center" desktop={desktop} open={!feed && !perimeterDraft && casesOpen && (desktop || !detailOpen)} keepMounted disabled={!!perimeterDraft} onClose={() => setCasesOpen(false)}>
      <CaseQueue user={user} onSelect={selectCase} />
    </MapPanel>
    <MapPanel title={caseId ? "Internal case details" : report ? `Review ${report.number}` : selected?.title ?? "Observation details"} count={!report && detailOpen ? "1 selected" : undefined} desktop={desktop} keepMounted open={!feed && detailOpen && !incidentPick && !associationPick && !caseReportPick} drawing={!!perimeterDraft} disabled={reviewDraft.pending || caseDraft.pending || !!perimeterDraft} onClose={closeDetail}><fieldset disabled={!!incidentPick}>{detail}</fieldset></MapPanel>
    {caseReportPick && <section aria-labelledby="case-report-pick-title" className="absolute left-1/2 top-28 z-50 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-primary/15 bg-white p-4 shadow-xl"><h2 id="case-report-pick-title" className="font-extrabold">Select related reports</h2>{loaded.failed && <div role="alert" className="mt-3 text-sm">Report pins could not refresh. Your selections are unchanged.<Button type="button" variant="outline" className="mt-2" onClick={loaded.retry}>Retry map data</Button></div>}<p className="mt-1 text-sm text-muted-foreground">Only unlinked, reviewed report pins are shown. Select more than one if they describe this case. Nothing is linked until you save {selectedCase.data?.verification === "CONFIRMED_FIRE" ? "a boundary revision" : "the fire confirmation and boundary"}.</p><p role="status" className="mt-2 text-sm font-bold">{caseReportIds.size} selected</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" onClick={() => setCaseReportPick(null)}>Done selecting</Button><Button type="button" variant="outline" onClick={() => { setCaseReportPick(null); setCaseReportDraft(null); }}>Clear selection</Button></div></section>}
    {associationPick && <section aria-labelledby="association-pick-title" className="absolute left-1/2 top-28 z-50 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-primary/15 bg-white p-4 shadow-xl"><h2 id="association-pick-title" className="font-extrabold">Select a related report</h2><p className="mt-1 text-sm text-muted-foreground">Click a private report document pin. Hotspots, published information, cases, access points, and water sources are not selectable.</p><Button type="button" variant="outline" className="mt-3" onClick={() => setAssociationPick(null)}>Cancel selection</Button></section>}
    {incidentPick && <section aria-label="Choose fire location" className="absolute left-1/2 top-24 z-50 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 space-y-3 rounded-xl border border-primary/15 bg-white p-4 shadow-xl"><h2 className="font-extrabold">Choose the observed fire location</h2><p className="text-sm text-muted-foreground">Click the map to place the pin where the team saw fire, then confirm it here. This is a point, not the fire boundary.</p><p role="status" className="text-xs font-bold">{incidentPick.latitude && incidentPick.longitude ? `Selected: ${incidentPick.latitude}, ${incidentPick.longitude}` : "No point selected yet"}</p><div className="flex flex-wrap gap-2"><Button type="button" disabled={!incidentPick.latitude || !incidentPick.longitude} onClick={() => { incidentPick.apply(incidentPick); setIncidentPick(null); }}>Use this location</Button><Button type="button" variant="outline" onClick={() => setIncidentPick(null)}>Cancel</Button></div></section>}
    <div inert={!!perimeterDraft || (!desktop && detailOpen)} className="absolute bottom-6 left-1/2 z-30 hidden w-[calc(100%-160px)] max-w-3xl -translate-x-1/2 items-center gap-1 rounded-full border bg-white p-2 shadow-xl sm:flex">{searchControl("observation-search", "top")}{actions}</div>
  </main></ReportAssociationContext.Provider></IncidentPointContext.Provider>;
}

export function ErrorBoundary() {
  return <main className="grid min-h-dvh place-items-center bg-white p-6"><div className="max-w-md"><h1 className="text-2xl font-extrabold">Unable to open the dashboard</h1><p className="mt-3 text-muted-foreground">Your session could not be checked. No private dashboard data has been loaded.</p><div className="mt-5 flex gap-3"><Button onClick={() => window.location.reload()}>Retry</Button><Button asChild variant="outline"><Link to={dashboardLogin("ADMIN")}>Government Login</Link></Button></div></div></main>;
}
