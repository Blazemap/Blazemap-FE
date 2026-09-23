import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import NewsFeed from "./NewsFeed";
import WarningBanner from "./WarningBanner";
import { usePublicationMap } from "@/hooks/dashboard/usePublicationMap";
import MapLayers from "./MapLayers";
import { Check, Crosshair, ListFilter, Plus, X } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import { pageTitle } from "@/lib/page-title";
import { WorkspaceNav } from "@/components/common";
import { hotspotConfidence, hotspotFrp } from "@/pages/dashboard/utils/map";
import PublicPerimeterDetail from "./PublicPerimeterDetail";
import MapPanel from "./MapPanel";
import { Button } from "@/components/ui";
import { verificationLabels, handlingLabels } from "@/constants";
import { useMobileSheetResize } from "@/hooks";
import { useQueryGetMap } from "@/hooks/dashboard";
import ReportPage from "@/pages/report";
import ReportsPage from "@/pages/reports";
import { MapSkeleton, PlaceSearch, PublishedLocationSkeleton } from "@/pages/dashboard/components";
import { ageMap, filterMap, formatTime, hasPoint, mapAvailability } from "@/pages/dashboard/utils";
import type { DashboardUser, MapItem, ReportDraft } from "@/types";

const SituationMap = lazy(() => import("@/pages/dashboard/components/SituationMap"));
const reportsSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

export function CitizenDashboard({ user }: { user: DashboardUser }) {
  const reducedMotion = useReducedMotion();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  useEffect(() => { document.title = pageTitle(location.pathname, location.search); }, [location.pathname, location.search]);
  const news = params.get("view") === "news";
  const feed = params.get("view") === "feed";
  const reportOpen = params.get("panel") === "report";
  const myReportsOpen = params.get("panel") === "my-reports" || params.get("my-reports") === "true";
  const [reportPending, setReportPending] = useState(false);
  const [reportDraft, setReportDraft] = useState({ dirty: false, pending: false });
  const [detailDraft, setDetailDraft] = useState({ dirty: false, pending: false });
  const [pick, setPick] = useState<{ latitude: string; longitude: string; locationMode: ReportDraft["locationMode"]; receive: (latitude: string, longitude: string) => void } | null>(null);
  const [reportLocation, setReportLocation] = useState<{ latitude: string; longitude: string; locationMode: ReportDraft["locationMode"] } | null>(null);
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const [hours, setHours] = useState(48);
  const [place, setPlace] = useState<import("@/lib/places").Place | null>(null);
  const [publications, setPublications] = useState(true);
  const [hotspots, setHotspots] = useState(true);
  const reportOpener = useRef<HTMLElement | null>(null);
  const reportsOpener = useRef<HTMLElement | null>(null);
  const handleReportDraft = useCallback((dirty: boolean, pending: boolean) => setReportDraft({ dirty, pending }), []);
  const handleDetailDraft = useCallback((dirty: boolean, pending: boolean) => setDetailDraft({ dirty, pending }), []);
  const handleReportLocation = useCallback((location: { latitude: string; longitude: string; locationMode: ReportDraft["locationMode"] } | null) => setReportLocation(location), []);
  const loaded = useQueryGetMap(user, hours);
  const data = useMemo(() => loaded.data ? ageMap(loaded.data, loaded.now) : null, [loaded.data, loaded.now]);
  const ownReports = data?.ownReports ?? [];
  const mapItems = useMemo(() => filterMap(data?.items ?? [], "", publications, hotspots), [data?.items, hotspots, publications]);
  const feedItems = useMemo(() => filterMap(data?.items ?? [], "", true, false), [data?.items]);
  const publication = usePublicationMap(user, params.get("publication"));
  const baseItems = feed ? feedItems : mapItems;
  const ownCaseNumbers = new Set(ownReports.flatMap(report => report.case ? [report.case.number] : []));
  const items = (publication.item && publications ? [...baseItems.filter(item => item.id !== publication.item!.id), publication.item] : baseItems).filter(item => !item.caseNumber || !ownCaseNumbers.has(item.caseNumber));
  const selected = items.find(item => item.id === (publications ? publication.item?.id : null)) ?? items.find(item => item.id === params.get("observation")) ?? null;
  const selectedOwnReport = ownReports.find(report => report.id === params.get("report")) ?? null;
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

  function restoreFocus(opener: HTMLElement | null, selector: string) {
    const visible = (element: HTMLElement) => element.isConnected && element.getClientRects().length > 0 && !element.closest('[inert], [aria-hidden="true"]');
    const target = opener && visible(opener) ? opener : Array.from(document.querySelectorAll<HTMLElement>(selector)).find(visible);
    target?.focus();
  }
  function updateParams(update: (next: URLSearchParams) => void) {
    setParams(current => { const next = new URLSearchParams(current); update(next); return next; }, { replace: true });
  }
  function openReport(event?: MouseEvent<HTMLButtonElement>) {
    if (reportPending) return;
    if (reportOpen) { closeReport(); return; }
    if (event) reportOpener.current = event.currentTarget;
    updateParams(next => {
      if (next.get("panel") === "my-reports") next.set("my-reports", "true");
      next.set("panel", "report");
      next.delete("view");
      next.delete("observation");
    });
  }
  function closeReport() {
    if (reportPending || reportDraft.pending) return;
    setPick(null);
    updateParams(next => next.delete("panel"));
  }
  function toggleMyReports(event?: MouseEvent<HTMLButtonElement>) {
    if (event) reportsOpener.current = event.currentTarget;
    updateParams(next => {
      if (myReportsOpen) {
        if (next.get("panel") === "my-reports") next.delete("panel");
        next.delete("my-reports");
      } else if (next.get("panel") === "report") next.set("my-reports", "true");
      else next.set("panel", "my-reports");
    });
  }
  function closeMyReports() {
    updateParams(next => {
      if (next.get("panel") === "my-reports") next.delete("panel");
      next.delete("my-reports");
      next.delete("report");
    });
    requestAnimationFrame(() => restoreFocus(reportsOpener.current, "[data-reports-trigger]"));
  }
  function selectItem(id: string) {
    if (reportPending || pick || (!desktop && (reportOpen || detailDraft.pending))) return;
    if (!desktop && detailDraft.dirty && !window.confirm("Discard unsaved report changes?")) return;
    updateParams(next => { next.set("observation", id); next.delete("publication"); if (!desktop) { if (next.get("panel") === "my-reports") next.delete("panel"); next.delete("my-reports"); } });
  }
  function selectOwnReport(id: string) {
    if (reportPending || pick || detailDraft.pending) return;
    updateParams(next => { next.set("panel", "my-reports"); next.set("report", id); next.delete("my-reports"); next.delete("observation"); next.delete("publication"); });
  }
  function closeItem() { updateParams(next => { next.delete("observation"); next.delete("publication"); }); }

  const reportSheet = useMobileSheetResize({ enabled: !desktop, resetWhen: myReportsOpen && !desktop, maxHeight: 82 });
  const reportsTransition = reducedMotion ? { duration: 0.01 } : reportsSpring;

  const filterControl = <MapLayers hours={hours} onRange={value => { setHours(Number(value)); closeItem(); }} feed={feed} publications={publications} hotspots={hotspots} onPublications={setPublications} onHotspots={setHotspots} />;

  const searchControl = (id: string, side: "top" | "bottom") => <PlaceSearch id={id} side={side} onSelect={value => { if (pick || reportPending) return; setPlace(value); updateParams(next => next.delete("view")); }} />;
  const controls = <><div className="h-5 w-px shrink-0 bg-primary/10" />{filterControl}<div className="h-5 w-px shrink-0 bg-primary/10" /><button type="button" data-reports-trigger aria-label="My reports" aria-pressed={myReportsOpen} onClick={toggleMyReports} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-extrabold transition-colors ${myReportsOpen ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-forest"}`}><ListFilter size={16} aria-hidden="true" /><span className="hidden sm:inline">My reports</span></button><div className="h-5 w-px shrink-0 bg-primary/10" /><button type="button" data-report-trigger aria-label={reportOpen ? "Close report" : "Create report"} aria-pressed={reportOpen} disabled={reportPending} onClick={openReport} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-extrabold text-white shadow-sm transition-colors disabled:opacity-50 ${reportOpen ? "bg-forest" : "bg-primary hover:bg-forest"}`}>{reportOpen ? <X size={16} aria-hidden="true" /> : <Plus size={16} strokeWidth={2.5} aria-hidden="true" />}<span className="hidden sm:inline">{reportOpen ? "Close" : "Report"}</span></button></>;
  const mobileControls = <div className="space-y-2"><div className="flex h-10 items-center rounded-full bg-secondary/50 px-1.5 shadow-inner">{searchControl("mobile-dashboard-search", "bottom")}</div><div className="grid grid-cols-3 gap-1.5"><span className="flex min-w-0 justify-center">{filterControl}</span><button type="button" data-reports-trigger aria-label="My reports" aria-pressed={myReportsOpen} onClick={toggleMyReports} className={`flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-[10px] font-extrabold ${myReportsOpen ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}><ListFilter size={15} aria-hidden="true" />Reports</button><button type="button" data-report-trigger aria-label={reportOpen ? "Close report" : "Create report"} aria-pressed={reportOpen} disabled={reportPending} onClick={openReport} className={`flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-[10px] font-extrabold text-white ${reportOpen ? "bg-forest" : "bg-primary"}`}>{reportOpen ? <X size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}{reportOpen ? "Close" : "Report"}</button></div></div>;

  if (news) return <main className="relative h-dvh overflow-hidden bg-white text-forest"><WorkspaceNav user={user} /><NewsFeed user={user} /></main>;
  return <main className="relative isolate h-dvh overflow-hidden bg-secondary/40 text-forest">
    <h1 className="sr-only">{feed ? "Published updates" : "Blazemap dashboard"}</h1>
    <WorkspaceNav user={user}>{mobileControls}</WorkspaceNav>

    {!feed && <section aria-label="Situation map" className="absolute inset-0">{loaded.initialLoading && !loaded.data ? <MapSkeleton /> : <Suspense fallback={<MapSkeleton />}><SituationMap place={place} items={items} selected={selected} draftLocation={pick ?? reportLocation} onSelect={selectItem} onPick={pick ? (latitude, longitude) => setPick(current => current ? { ...current, latitude, longitude } : null) : undefined} ownReports={publications ? ownReports : []} selectedOwnReport={selectedOwnReport} onSelectOwnReport={selectOwnReport} /></Suspense>}</section>}

    {feed && <NewsFeed key={hours} user={user} news={false} hours={hours} />}
    {!feed && !pick && !reportOpen && !myReportsOpen && !selected && <div className="absolute bottom-24 right-4 z-20 w-[min(360px,calc(100%-32px))]"><WarningBanner user={user} /></div>}

    {!feed && params.get("publication") && publication.isPending && !publication.item && <PublishedLocationSkeleton />}
    {!feed && params.get("publication") && publication.isError && !publication.item && <div role="alert" className="absolute left-4 top-56 z-20 rounded-sm border bg-white p-4 text-sm sm:top-28">Approved map location unavailable.<Button variant="outline" onClick={() => void publication.refetch()}>Retry</Button></div>}
    {!feed && availability && (loaded.failed || showInitialAvailability) && <p role={loaded.failed ? "alert" : "status"} className="absolute left-4 top-56 z-10 max-w-xs rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950 sm:left-6 sm:top-28">{availability}</p>}
    <div className="absolute bottom-5 left-1/2 z-30 hidden w-full max-w-[520px] -translate-x-1/2 md:max-w-[700px] items-center gap-1 rounded-full border border-primary/10 bg-white px-2 py-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] sm:flex">{searchControl("dashboard-search", "top")}{controls}</div>

    <AnimatePresence>
      {myReportsOpen && <motion.aside initial={reducedMotion ? { opacity: 0 } : desktop ? { x: "-100%", opacity: 0 } : { y: "100%", opacity: 0 }} animate={desktop ? { x: 0, y: 0, opacity: 1 } : { y: 0, x: 0, opacity: 1 }} exit={reducedMotion ? { opacity: 0 } : desktop ? { x: "-100%", opacity: 0 } : { y: "100%", opacity: 0 }} transition={reportsTransition} drag={desktop} dragMomentum={false} style={desktop ? undefined : { height: `${reportSheet.height}dvh` }} className={`absolute z-40 flex flex-col overflow-hidden bg-white shadow-2xl ${desktop ? "left-6 top-24 h-[calc(100vh-120px)] min-h-[400px] w-[380px] min-w-[320px] max-w-[600px] resize rounded-sm border border-primary/10" : "inset-x-0 bottom-0 max-h-[82dvh] rounded-t-2xl"}`}>
        {!desktop && <button type="button" aria-label={reportSheet.height > 78 ? "Reduce My reports" : "Expand My reports"} onPointerDown={reportSheet.startResize} onClick={() => { if (!reportSheet.resizeMovedRef.current) reportSheet.setHeight(value => value > 78 ? 72 : 82); }} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); reportSheet.setHeight(value => Math.max(44, Math.min(82, value + (event.key === "ArrowUp" ? 5 : -5)))); } }} className="flex min-h-11 shrink-0 touch-none items-center justify-center bg-white"><span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-primary/20" /></button>}
        <ReportsPage user={user} id={params.get("report")} onDraft={handleDetailDraft} onClose={closeMyReports} />
      </motion.aside>}
    </AnimatePresence>

    <MapPanel title={selected?.title ?? "Observation details"} desktop={desktop} open={!!selected} onClose={closeItem}>{selected && <ItemDetail item={selected} />}</MapPanel>

    <ReportPage open={reportOpen && !pick && !feed} onClose={closeReport} onPending={setReportPending} onDraft={handleReportDraft} onLocationChange={handleReportLocation} detailDirty={detailDraft.dirty} detailPending={detailDraft.pending} onRestoreFocus={() => restoreFocus(reportOpener.current, "[data-report-trigger]")} desktop={desktop} onPick={({ latitude, longitude, locationMode, receive }) => { if (!reportPending) setPick({ latitude, longitude, locationMode, receive }); }} />

    {pick && <section aria-labelledby="pick-title" className="absolute left-1/2 top-56 z-[70] w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-sm border border-primary/15 bg-white p-4 shadow-2xl sm:top-28"><div className="flex items-start gap-3"><Crosshair className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" /><div><h2 id="pick-title" className="font-extrabold">Choose the {pick.locationMode === "OBSERVER_POSITION" ? "observer position" : "estimated incident location"}</h2><p role="status" className="mt-1 text-sm text-muted-foreground">Tap the map to place the pin, then drag it to adjust.</p></div></div>{pick.latitude && pick.longitude ? <p className="mt-3 rounded-sm bg-secondary/60 px-3 py-2 text-xs font-bold tabular-nums">Selected: {Number(pick.latitude).toFixed(6)}, {Number(pick.longitude).toFixed(6)}</p> : <p className="mt-3 text-xs font-bold text-amber-900">No location selected yet.</p>}<div className="mt-3 flex gap-2"><Button disabled={!pick.latitude || !pick.longitude} className="rounded-sm" onClick={() => { const location = { latitude: pick.latitude, longitude: pick.longitude, locationMode: pick.locationMode }; pick.receive(pick.latitude, pick.longitude); setReportLocation(location); setPick(null); }}><Check size={16} aria-hidden="true" />Confirm location</Button><Button variant="outline" className="rounded-sm" onClick={() => setPick(null)}>Cancel</Button></div></section>}
  </main>;
}


export function ItemDetail({ item }: { item: MapItem }) {
  return <section aria-label="Selected observation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{item.kind === "hotspot" ? "Satellite observation" : "Privacy-reviewed published summary"}</p><p className="mt-4 rounded-sm bg-secondary/60 p-3 text-sm font-bold">{item.verification ? verificationLabels[item.verification] : "Hotspot — not a confirmed fire"}</p><dl className="mt-5 grid grid-cols-1 gap-x-8 border-t border-primary/10 text-sm md:grid-cols-2 [&>div]:min-w-0 [&>div]:border-b [&>div]:border-primary/10 [&_dd]:break-words">{item.handling && <div className="py-4"><dt className="text-muted-foreground">Handling status</dt><dd className="mt-1 font-bold">{handlingLabels[item.handling]}</dd></div>}<div className="py-4"><dt className="text-muted-foreground">Location</dt><dd className="mt-1 font-bold">{item.location}{hasPoint(item) && <span className="block tabular-nums">{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</span>}</dd></div><div className="py-4"><dt className="text-muted-foreground">{item.kind === "hotspot" ? "Detected" : "Published"}</dt><dd className="mt-1 font-bold">{formatTime(item.time)}</dd></div>{item.kind === "hotspot" && <><div className="py-4"><dt className="text-muted-foreground">Satellite / instrument</dt><dd className="mt-1 font-bold">{item.instrument || "Not supplied"}</dd></div><div className="py-4"><dt className="text-muted-foreground">Detection confidence</dt><dd className="mt-1 font-bold">{hotspotConfidence(item.confidence)}</dd></div><div className="py-4"><dt className="text-muted-foreground">Fire radiative power</dt><dd className="mt-1 font-bold">{hotspotFrp(item.frp)}</dd></div></>}</dl><PublicPerimeterDetail item={item} />{item.stale && <p className="mt-4 text-sm text-amber-900">Updates are delayed; this observation may be out of date.</p>}<p className="mt-5 text-xs leading-5 text-muted-foreground">{item.kind === "publication" ? "Approved snapshot, not a live private case or perimeter." : "Satellite detection is not human verification or a fire perimeter."}</p></section>;
}
