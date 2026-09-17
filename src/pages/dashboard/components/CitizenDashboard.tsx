import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Popover } from "radix-ui";
import { Check, Crosshair, Flame, ListFilter, Plus, RefreshCw, Search, Satellite, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { WorkspaceNav } from "@/components/common";
import { rainforestSmall } from "@/assets";
import { Button, FieldSelect } from "@/components/ui";
import { verificationLabels, handlingLabels } from "@/constants";
import { useMobileSheetResize } from "@/hooks";
import { useQueryGetMap } from "@/hooks/dashboard";
import ReportPage from "@/pages/report";
import ReportsPage from "@/pages/reports";
import { LayerPreview } from "@/pages/dashboard/components/LayerPreview";
import { ageMap, filterMap, formatTime, hasPoint, mapAvailability } from "@/pages/dashboard/utils";
import type { DashboardUser, MapItem, ReportDraft } from "@/types";

const SituationMap = lazy(() => import("@/pages/dashboard/components/SituationMap"));
const reportsSpring = { type: "spring" as const, stiffness: 300, damping: 30 };
const detailSpring = { type: "spring" as const, stiffness: 360, damping: 34 };

export function CitizenDashboard({ user }: { user: DashboardUser }) {
  const reducedMotion = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const feed = params.get("view") === "feed";
  const reportOpen = params.get("panel") === "report";
  const myReportsOpen = params.get("panel") === "my-reports" || params.get("my-reports") === "true";
  const [reportPending, setReportPending] = useState(false);
  const [reportDraft, setReportDraft] = useState({ dirty: false, pending: false });
  const [detailDraft, setDetailDraft] = useState({ dirty: false, pending: false });
  const [pick, setPick] = useState<{ latitude: string; longitude: string; locationMode: ReportDraft["locationMode"]; receive: (latitude: string, longitude: string) => void } | null>(null);
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const [hours, setHours] = useState(48);
  const [search, setSearch] = useState("");
  const [publications, setPublications] = useState(true);
  const [hotspots, setHotspots] = useState(true);
  const reportOpener = useRef<HTMLElement | null>(null);
  const reportsOpener = useRef<HTMLElement | null>(null);
  const handleReportDraft = useCallback((dirty: boolean, pending: boolean) => setReportDraft({ dirty, pending }), []);
  const handleDetailDraft = useCallback((dirty: boolean, pending: boolean) => setDetailDraft({ dirty, pending }), []);
  const loaded = useQueryGetMap(user, hours);
  const data = useMemo(() => loaded.data ? ageMap(loaded.data, loaded.now) : null, [loaded.data, loaded.now]);
  const mapItems = useMemo(() => filterMap(data?.items ?? [], search, publications, hotspots), [data?.items, hotspots, publications, search]);
  const feedItems = useMemo(() => filterMap(data?.items ?? [], search, true, false), [data?.items, search]);
  const items = feed ? feedItems : mapItems;
  const selected = items.find(item => item.id === params.get("observation")) ?? null;
  const availability = mapAvailability(data, loaded.failed);

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
    if (reportPending || pick) return;
    updateParams(next => next.set("observation", id));
  }
  function closeItem() { updateParams(next => next.delete("observation")); }

  const reportSheet = useMobileSheetResize({ enabled: !desktop, resetWhen: myReportsOpen && !desktop, maxHeight: 82 });
  const detailSheet = useMobileSheetResize({ enabled: !desktop, resetWhen: !!selected && !desktop, initialHeight: 68, minHeight: 34, maxHeight: 86, snapPoints: [48, 68, 86], closeHeight: 40, onClose: closeItem });
  const reportsTransition = reducedMotion ? { duration: 0.01 } : reportsSpring;
  const detailTransition = reducedMotion ? { duration: 0.01 } : detailSpring;

  const filterControl = <Popover.Root><Popover.Trigger asChild><button type="button" aria-label="Map filters" className="flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-extrabold text-muted-foreground transition-colors hover:bg-secondary hover:text-forest"><SlidersHorizontal size={16} aria-hidden="true" /><span className="hidden sm:inline">Filters</span></button></Popover.Trigger><Popover.Portal><Popover.Content side="top" sideOffset={12} collisionPadding={16} className="z-[80] w-72 rounded-sm border border-primary/10 bg-white p-5 text-forest shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-extrabold">Map layers</h2><Popover.Close asChild><button type="button" aria-label="Close map layers" className="grid size-10 place-items-center rounded-full hover:bg-secondary"><X size={17} aria-hidden="true" /></button></Popover.Close></div><label htmlFor="map-window" className="mt-4 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Time range<FieldSelect id="map-window" value={String(hours)} onValueChange={value => setHours(Number(value))} options={[{ value: "24", label: "Last 24 hours" }, { value: "48", label: "Last 48 hours" }, { value: "168", label: "Last 7 days" }]} /></label>{!feed && <fieldset className="mt-5"><legend className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Visible data</legend><div className="mt-3 grid grid-cols-2 gap-3">{([{ label: "Published", checked: publications, change: setPublications, hotspot: false }, { label: "Hotspots", checked: hotspots, change: setHotspots, hotspot: true }]).map(layer => <label key={layer.label} className={`rounded-sm border p-1.5 focus-within:outline-2 focus-within:outline-primary ${layer.checked ? "border-primary bg-secondary/50" : "border-primary/10 bg-white"}`}><LayerPreview hotspot={layer.hotspot} /><span className="flex min-h-11 items-center gap-2 px-1 py-2 text-xs font-extrabold"><input type="checkbox" className="size-4 accent-primary" checked={layer.checked} onChange={event => layer.change(event.target.checked)} />{layer.label}</span></label>)}</div></fieldset>}</Popover.Content></Popover.Portal></Popover.Root>;

  const searchControl = (id: string) => <div className="relative min-w-0 flex-1"><Search size={15} strokeWidth={2.5} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" aria-hidden="true" /><label htmlFor={id} className="sr-only">Search {feed ? "published updates" : "map observations"}</label><input id={id} type="search" maxLength={200} value={search} onChange={event => setSearch(event.target.value)} placeholder={feed ? "Search published updates" : "Search observations or region"} className="h-10 w-full rounded-full border border-primary/15 bg-secondary/45 pl-10 pr-3 text-xs font-bold outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10" /></div>;
  const controls = <><div className="h-5 w-px shrink-0 bg-primary/10" />{filterControl}<div className="h-5 w-px shrink-0 bg-primary/10" /><button type="button" data-reports-trigger aria-pressed={myReportsOpen} onClick={toggleMyReports} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-extrabold transition-colors ${myReportsOpen ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-forest"}`}><ListFilter size={16} aria-hidden="true" /><span className="hidden sm:inline">My reports</span></button><div className="h-5 w-px shrink-0 bg-primary/10" /><button type="button" data-report-trigger aria-pressed={reportOpen} disabled={reportPending} onClick={openReport} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-extrabold text-white shadow-sm transition-colors disabled:opacity-50 ${reportOpen ? "bg-forest" : "bg-primary hover:bg-forest"}`}>{reportOpen ? <X size={16} aria-hidden="true" /> : <Plus size={16} strokeWidth={2.5} aria-hidden="true" />}<span className="hidden sm:inline">{reportOpen ? "Close" : "Report"}</span></button></>;
  const mobileControls = <div className="space-y-2"><div className="flex h-10 items-center rounded-full bg-secondary/50 px-1.5 shadow-inner">{searchControl("mobile-dashboard-search")}</div><div className="grid grid-cols-3 gap-1.5"><span className="flex min-w-0 justify-center">{filterControl}</span><button type="button" data-reports-trigger aria-pressed={myReportsOpen} onClick={toggleMyReports} className={`flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-[10px] font-extrabold ${myReportsOpen ? "bg-primary text-white" : "border border-primary/10 bg-white text-muted-foreground"}`}><ListFilter size={15} aria-hidden="true" />Reports</button><button type="button" data-report-trigger aria-pressed={reportOpen} disabled={reportPending} onClick={openReport} className={`flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-[10px] font-extrabold text-white ${reportOpen ? "bg-forest" : "bg-primary"}`}>{reportOpen ? <X size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}{reportOpen ? "Close" : "Report"}</button></div></div>;

  return <main className="relative isolate h-dvh overflow-hidden bg-secondary/40 text-forest">
    <h1 className="sr-only">{feed ? "Published updates" : "Blazemap dashboard"}</h1>
    <WorkspaceNav user={user}>{mobileControls}</WorkspaceNav>

    {!feed && <section aria-label="Situation map" className="absolute inset-0"><Suspense fallback={<p role="status" className="px-6 pt-56 sm:pt-28">Loading map…</p>}><SituationMap items={items} selected={selected} pick={pick} onSelect={selectItem} onPick={pick ? (latitude, longitude) => setPick(current => current ? { ...current, latitude, longitude } : null) : undefined} /></Suspense></section>}

    {feed && <section aria-label="Published update feed" className="absolute inset-0 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#ffffff_0%,#eef3e9_52%,#ffffff_100%)] px-4 pb-32 pt-56 sm:px-6 sm:pt-28"><img src={rainforestSmall} alt="" aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 h-[46vh] w-full object-cover object-top opacity-[0.07] [mask-image:linear-gradient(to_bottom,transparent,#000)]" decoding="async" /><div className="relative mx-auto max-w-2xl"><header className="mb-5 flex items-end justify-between gap-4 border-b border-primary/10 pb-3 text-forest"><div><h2 className="text-2xl font-extrabold tracking-tight">Published updates</h2><p className="mt-1 text-sm text-muted-foreground">Privacy-reviewed summaries from the last {hours === 168 ? "7 days" : `${hours} hours`}</p></div><Button variant="outline" size="icon" className="rounded-full border-white/40 bg-white text-forest" aria-label="Refresh published updates" disabled={loaded.loading} onClick={loaded.retry}><RefreshCw size={17} className={loaded.loading ? "motion-safe:animate-spin" : ""} aria-hidden="true" /></Button></header>{availability && <p role={loaded.failed ? "alert" : "status"} className="mb-4 rounded-sm bg-amber-50 p-4 text-sm text-amber-950">{availability}</p>}{loaded.loading && !data && <FeedSkeleton />}{data && !items.length && <p className="px-2 py-14 text-center text-sm font-bold text-muted-foreground">No published updates match your search.</p>}<div className="space-y-5">{items.map(item => <article key={item.id} className="overflow-hidden rounded-sm border border-primary/10 bg-white shadow-sm"><header className="flex items-center gap-3 border-b border-primary/10 px-5 py-4"><ItemIcon item={item} /><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">Published case update</p><time dateTime={item.time} className="mt-1 block text-xs text-muted-foreground">{formatTime(item.time)}</time></div></header><div className="px-5 py-6"><h3 className="text-xl font-extrabold leading-snug">{item.title}</h3><dl className="mt-5 divide-y divide-primary/10 border-y border-primary/10"><div className="py-4"><dt className="text-xs font-bold text-muted-foreground">Published location</dt><dd className="mt-1.5 text-sm font-bold">{item.location}</dd></div><div className="py-4"><dt className="text-xs font-bold text-muted-foreground">Handling status</dt><dd className="mt-1.5 text-sm font-bold">{item.handling && handlingLabels[item.handling]}</dd></div></dl></div><footer className="border-t border-primary/10 px-5 py-3 text-xs leading-5 text-muted-foreground">Approved summary. Private reports and original evidence are not shared.</footer></article>)}</div></div></section>}

    {!feed && availability && <p role={loaded.failed ? "alert" : "status"} className="absolute left-4 top-56 z-10 max-w-xs rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950 sm:left-6 sm:top-28">{availability}</p>}
    <div className="absolute bottom-5 left-1/2 z-30 hidden w-full max-w-[520px] -translate-x-1/2 md:max-w-[700px] items-center gap-1 rounded-full border border-primary/10 bg-white px-2 py-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] sm:flex">{searchControl("dashboard-search")}{controls}</div>

    <AnimatePresence>
      {myReportsOpen && <motion.aside initial={reducedMotion ? { opacity: 0 } : desktop ? { x: "-100%", opacity: 0 } : { y: "100%", opacity: 0 }} animate={desktop ? { x: 0, y: 0, opacity: 1 } : { y: 0, x: 0, opacity: 1 }} exit={reducedMotion ? { opacity: 0 } : desktop ? { x: "-100%", opacity: 0 } : { y: "100%", opacity: 0 }} transition={reportsTransition} drag={desktop} dragMomentum={false} style={desktop ? undefined : { height: `${reportSheet.height}dvh` }} className={`absolute z-40 flex flex-col overflow-hidden bg-white shadow-2xl ${desktop ? "left-6 top-24 h-[calc(100vh-120px)] min-h-[400px] w-[380px] min-w-[320px] max-w-[600px] resize rounded-sm border border-primary/10" : "inset-x-0 bottom-0 max-h-[82dvh] rounded-t-2xl"}`}>
        {!desktop && <button type="button" aria-label={reportSheet.height > 78 ? "Reduce My reports" : "Expand My reports"} onPointerDown={reportSheet.startResize} onClick={() => { if (!reportSheet.resizeMovedRef.current) reportSheet.setHeight(value => value > 78 ? 72 : 82); }} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); reportSheet.setHeight(value => Math.max(44, Math.min(82, value + (event.key === "ArrowUp" ? 5 : -5)))); } }} className="flex min-h-11 shrink-0 touch-none items-center justify-center bg-white"><span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-primary/20" /></button>}
        <ReportsPage user={user} id={params.get("report")} onDraft={handleDetailDraft} onClose={closeMyReports} />
      </motion.aside>}
    </AnimatePresence>

    <AnimatePresence>
      {selected && <><motion.button type="button" aria-label="Close observation details" initial={{ opacity: 0 }} animate={{ opacity: desktop ? 0 : 1 }} exit={{ opacity: 0 }} onClick={closeItem} className={`absolute inset-0 z-40 bg-forest/35 backdrop-blur-[2px] ${desktop ? "pointer-events-none" : ""}`} /><motion.aside initial={reducedMotion ? { opacity: 0 } : desktop ? { scale: 0.96, opacity: 0 } : { y: "100%", opacity: 0 }} animate={desktop ? { scale: 1, y: 0, opacity: 1 } : { y: 0, scale: 1, opacity: 1 }} exit={reducedMotion ? { opacity: 0 } : desktop ? { scale: 0.96, opacity: 0 } : { y: "100%", opacity: 0 }} transition={detailTransition} style={desktop ? undefined : { height: `${detailSheet.height}dvh` }} className={`absolute z-50 flex flex-col overflow-hidden bg-white ${desktop ? "left-1/2 top-24 max-h-[calc(100vh-120px)] w-[420px] max-w-[calc(100vw-48px)] -translate-x-1/2 rounded-sm border border-primary/10 shadow-2xl" : "inset-x-0 bottom-0 rounded-t-2xl shadow-[0_-20px_48px_rgba(15,23,42,0.24)]"}`}>
        {!desktop && <button type="button" aria-label={detailSheet.height > 78 ? "Reduce observation details" : "Expand observation details"} onPointerDown={detailSheet.startResize} onClick={() => { if (!detailSheet.resizeMovedRef.current) detailSheet.setHeight(value => value > 78 ? 68 : 86); }} className="flex min-h-11 shrink-0 touch-none items-center justify-center"><span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-primary/20" /></button>}
        <ItemDetail item={selected} onClose={closeItem} />
      </motion.aside></>}
    </AnimatePresence>

    <ReportPage open={reportOpen && !pick && !feed} onClose={closeReport} onPending={setReportPending} onDraft={handleReportDraft} detailDirty={detailDraft.dirty} detailPending={detailDraft.pending} onRestoreFocus={() => restoreFocus(reportOpener.current, "[data-report-trigger]")} desktop={desktop} onPick={({ latitude, longitude, locationMode, receive }) => { if (!reportPending) setPick({ latitude, longitude, locationMode, receive }); }} />

    {pick && <section aria-labelledby="pick-title" className="absolute left-1/2 top-56 z-[70] w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-sm border border-primary/15 bg-white p-4 shadow-2xl sm:top-28"><div className="flex items-start gap-3"><Crosshair className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" /><div><h2 id="pick-title" className="font-extrabold">Choose the {pick.locationMode === "OBSERVER_POSITION" ? "observer position" : "estimated incident location"}</h2><p role="status" className="mt-1 text-sm text-muted-foreground">Tap the map to place the pin, then drag it to adjust.</p></div></div>{pick.latitude && pick.longitude ? <p className="mt-3 rounded-sm bg-secondary/60 px-3 py-2 text-xs font-bold tabular-nums">Selected: {Number(pick.latitude).toFixed(6)}, {Number(pick.longitude).toFixed(6)}</p> : <p className="mt-3 text-xs font-bold text-amber-900">No location selected yet.</p>}<div className="mt-3 flex gap-2"><Button disabled={!pick.latitude || !pick.longitude} className="rounded-sm" onClick={() => { pick.receive(pick.latitude, pick.longitude); setPick(null); }}><Check size={16} aria-hidden="true" />Confirm location</Button><Button variant="outline" className="rounded-sm" onClick={() => setPick(null)}>Cancel</Button></div></section>}
  </main>;
}

function FeedSkeleton() {
  return <div role="status" aria-label="Loading published updates" className="space-y-5"><span className="sr-only">Loading published updates</span>{Array.from({ length: 3 }, (_, index) => <div key={index} className="animate-pulse overflow-hidden rounded-sm bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-primary/10 px-5 py-4"><span className="size-10 rounded-sm bg-secondary" /><span className="h-3 w-36 rounded-full bg-secondary" /></div><div className="space-y-4 px-5 py-6"><span className="block h-5 w-3/4 rounded-full bg-secondary" /><span className="block h-14 w-full rounded-sm bg-secondary/70" /></div></div>)}</div>;
}

function ItemIcon({ item }: { item: MapItem }) {
  const confirmed = item.kind === "publication" && item.verification === "CONFIRMED_FIRE";
  const Icon = item.kind === "hotspot" ? Satellite : confirmed ? Flame : ShieldCheck;
  return <span className={`grid size-10 shrink-0 place-items-center rounded-sm ${item.kind === "hotspot" ? "bg-amber-50 text-amber-800" : confirmed ? "bg-orange-50 text-orange-800" : "bg-secondary text-primary"}`}><Icon size={20} aria-hidden="true" /></span>;
}

function ItemDetail({ item, onClose }: { item: MapItem; onClose: () => void }) {
  return <section aria-label="Selected observation" className="min-h-0 overflow-y-auto p-5"><div className="flex items-start justify-between gap-3"><ItemIcon item={item} /><button type="button" onClick={onClose} aria-label="Close observation details" className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-secondary"><X size={19} aria-hidden="true" /></button></div><p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">{item.kind === "hotspot" ? "Satellite observation" : "Privacy-reviewed published summary"}</p><h2 className="mt-2 text-xl font-extrabold">{item.title}</h2><p className="mt-4 rounded-sm bg-secondary/60 p-3 text-sm font-bold">{item.verification ? verificationLabels[item.verification] : "Hotspot — not a confirmed fire"}</p><dl className="mt-5 divide-y divide-primary/10 border-y border-primary/10 text-sm">{item.handling && <div className="py-4"><dt className="text-muted-foreground">Handling status</dt><dd className="mt-1 font-bold">{handlingLabels[item.handling]}</dd></div>}<div className="py-4"><dt className="text-muted-foreground">Location</dt><dd className="mt-1 font-bold">{item.location}{hasPoint(item) && <span className="block tabular-nums">{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</span>}</dd></div><div className="py-4"><dt className="text-muted-foreground">{item.kind === "hotspot" ? "Detected" : "Published"}</dt><dd className="mt-1 font-bold">{formatTime(item.time)}</dd></div>{item.kind === "hotspot" && <><div className="py-4"><dt className="text-muted-foreground">Satellite / instrument</dt><dd className="mt-1 font-bold">{item.instrument || "Not supplied"}</dd></div><div className="py-4"><dt className="text-muted-foreground">Detection confidence</dt><dd className="mt-1 font-bold">{item.confidence}</dd></div></>}</dl>{item.stale && <p className="mt-4 text-sm text-amber-900">Updates are delayed; this observation may be out of date.</p>}<p className="mt-5 text-xs leading-5 text-muted-foreground">{item.kind === "publication" ? "Approved point only, not a live private case or perimeter." : "Satellite detection is not human verification or a fire perimeter."}</p></section>;
}
