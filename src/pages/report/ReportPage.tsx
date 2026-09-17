import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, Check, Clock3, Crosshair, Flame, ImagePlus, LoaderCircle, MapPin, Navigation, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { Link, useLoaderData } from "react-router-dom";
import { uploadPhoto } from "@/api/reports";
import { DraftGuard } from "@/components/common";
import { Button } from "@/components/ui";
import { useMobileSheetResize } from "@/hooks";
import { useMutationCreateReport, useQueryGetRegions } from "@/hooks/reports";
import { privateError, reportPayload, validatePhoto } from "@/lib";
import type { DashboardUser, ObservationType, OwnReport, ReportDraft, ReportPayload, ReportPhoto } from "@/types";

type ReportPanelProps = {
  style?: CSSProperties;
  handle?: ReactNode;
  resizeHandle?: ReactNode;
  desktop?: boolean;
  open?: boolean;
  onClose?: () => void;
  onRestoreFocus?: () => void;
  onPick?: (pick: { latitude: string; longitude: string; locationMode: ReportDraft["locationMode"]; receive: (latitude: string, longitude: string) => void }) => void;
  onPending?: (pending: boolean) => void;
  onDraft?: (dirty: boolean, pending: boolean) => void;
  detailDirty?: boolean;
  detailPending?: boolean;
};

const input = "mt-2 min-h-12 w-full rounded-sm border border-input bg-white px-4 py-3 text-sm font-semibold text-forest outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const initial: ReportDraft = { observationTypes: [], observedLocal: "", offset: "+07:00", locationMode: "INCIDENT_ESTIMATE", latitude: "", longitude: "", confirmed: false, accuracyMeters: null, regionId: "", locationDescription: "", description: "" };
const spring = { type: "spring" as const, stiffness: 360, damping: 34 };

export default function ReportPage({ open = true, onClose, onRestoreFocus, onPick, onPending, onDraft, style, handle, resizeHandle, desktop = false, detailDirty = false, detailPending = false }: ReportPanelProps) {
  const user = useLoaderData() as DashboardUser;
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState(initial);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const photoRef = useRef(photos);
  const [regionSearch, setRegionSearch] = useState("");
  const [regionQuery, setRegionQuery] = useState("");
  const regions = useQueryGetRegions(regionQuery);
  const mutation = useMutationCreateReport(user);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [review, setReview] = useState<ReportPayload | null>(null);
  const [receipt, setReceipt] = useState<OwnReport | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [gps, setGps] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const submissionKey = useRef(crypto.randomUUID());
  const locationRequest = useRef(0);
  const hasCoordinates = !!draft.latitude.trim() && !!draft.longitude.trim();

  function cancelLocation() { locationRequest.current++; setGps(""); }
  function close() {
    if (pending.current) return;
    cancelLocation();
    onClose?.();
  }

  const sheet = useMobileSheetResize({ enabled: !desktop, resetWhen: open && !desktop, initialHeight: 68, minHeight: 34, maxHeight: 86, snapPoints: [68, 86], closeHeight: 40, closeVelocity: 0.65, onClose: close });

  useEffect(() => () => { locationRequest.current++; }, [open]);
  useEffect(() => { photoRef.current = photos; }, [photos]);
  useEffect(() => () => { for (const photo of photoRef.current) URL.revokeObjectURL(photo.preview); }, []);
  useEffect(() => { onPending?.(busy); }, [busy, onPending]);
  useEffect(() => { onDraft?.(dirty && !receipt, busy); }, [busy, dirty, onDraft, receipt]);
  useEffect(() => () => onDraft?.(false, false), [onDraft]);

  function newReport() {
    if (!receipt || pending.current) return;
    cancelLocation();
    for (const photo of photoRef.current) URL.revokeObjectURL(photo.preview);
    photoRef.current = [];
    setPhotos([]); setDraft(initial); setRegionSearch(""); setRegionQuery("");
    setReview(null); setReceipt(null); setAttempted(false); setDirty(false); setError("");
    submissionKey.current = crypto.randomUUID();
    mutation.reset();
  }
  function change(values: Partial<ReportDraft>, location = false) {
    if (pending.current || review || receipt) return;
    if (location || "confirmed" in values) cancelLocation();
    setDraft(current => ({ ...current, ...values, ...(location ? { confirmed: false } : {}) }));
    setDirty(true); setError("");
  }
  function fail(message: string) { setError(message); requestAnimationFrame(() => errorRef.current?.focus()); }
  function photoUpdate(index: number, values: Partial<ReportPhoto>) { setPhotos(current => current.map((photo, position) => position === index ? { ...photo, ...values } : photo)); }
  function addPhotos(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (photos.length + selected.length > 5) return fail("Choose up to five photos.");
    const invalid = selected.map(validatePhoto).find(Boolean);
    if (invalid) return fail(invalid);
    setPhotos(current => [...current, ...selected.map(file => ({ file, preview: URL.createObjectURL(file), progress: 0 }))]);
    setDirty(true); setError("");
  }
  function handlePhotos(event: ChangeEvent<HTMLInputElement>) { addPhotos(event.target.files); event.target.value = ""; }
  async function prepare() {
    if (pending.current) return;
    let payload: ReportPayload;
    try { payload = reportPayload(draft, [], submissionKey.current); }
    catch (caught) { return fail(caught instanceof Error ? caught.message : "Check your observation."); }
    cancelLocation(); pending.current = true; setBusy(true); setError("");
    try {
      const ids: string[] = [];
      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];
        try { ids.push(photo.id || await uploadPhoto(user, photo, values => photoUpdate(index, values))); }
        catch (caught) { photoUpdate(index, { error: "Upload not confirmed. Retry or remove this photo." }); throw caught; }
      }
      setReview({ ...payload, attachmentIds: ids });
    } catch (caught) { fail(`${privateError(caught)} You can remove failed photos and continue without them.`); }
    finally { pending.current = false; setBusy(false); }
  }
  async function submit() {
    if (!review || pending.current) return;
    cancelLocation(); pending.current = true; setAttempted(true); setBusy(true); setError("");
    try { const result = await mutation.mutateAsync(review); setReceipt(result); setDirty(false); }
    catch (caught) { fail(privateError(caught)); }
    finally { pending.current = false; setBusy(false); }
  }
  function locate() {
    if (pending.current || review) return;
    if (!navigator.geolocation) { setGps("Location is not supported. Pick a point or select a region."); return; }
    const request = ++locationRequest.current;
    setGps("Finding your location…");
    navigator.geolocation.getCurrentPosition(position => {
      if (request !== locationRequest.current || pending.current) return;
      change({ latitude: String(position.coords.latitude), longitude: String(position.coords.longitude), accuracyMeters: position.coords.accuracy, locationMode: "OBSERVER_POSITION" }, true);
      setGps(`Observer position found · about ${Math.round(position.coords.accuracy)} m accuracy.`);
    }, () => {
      if (request !== locationRequest.current || pending.current) return;
      setGps("Location unavailable. Pick a point or use a verified region.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  const panelMotion = reducedMotion ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } } : { initial: desktop ? { x: "100%", opacity: 0 } : { y: "100%", opacity: 0 }, animate: desktop ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 }, exit: desktop ? { x: "100%", opacity: 0 } : { y: "100%", opacity: 0 }, transition: spring };

  return <>
    <DraftGuard dirty={(dirty && !receipt) || detailDirty} pending={busy || detailPending} dashboard />
    <Dialog.Root modal={!desktop} open={open} onOpenChange={value => { if (!value) close(); }}>
      <AnimatePresence>
        {open && <Dialog.Portal forceMount>
          {!desktop && <Dialog.Overlay asChild forceMount><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0.01 : 0.18 }} className="fixed inset-0 z-40 bg-forest/45 backdrop-blur-[2px]" /></Dialog.Overlay>}
          <Dialog.Content asChild forceMount onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (pending.current) event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus?.(); }}>
            <motion.section {...panelMotion} drag={desktop} dragMomentum={false} style={desktop ? style : { height: `${sheet.height}dvh` }} className={`fixed z-60 flex flex-col overflow-hidden bg-white text-forest ${desktop ? `${style ? "" : "right-6"} top-24 h-[calc(100vh-120px)] min-h-[400px] w-[400px] min-w-[320px] max-w-[600px] resize rounded-sm border border-primary/10 shadow-2xl` : "inset-x-0 bottom-0 w-full rounded-t-2xl shadow-[0_-20px_48px_rgba(15,23,42,0.24)]"}`}>
              {handle}
              {!desktop && <button type="button" aria-label={sheet.height > 78 ? "Reduce report panel" : "Expand report panel"} onPointerDown={sheet.startResize} onClick={() => { if (!sheet.resizeMovedRef.current) sheet.setHeight(value => value > 78 ? 68 : 86); }} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); sheet.setHeight(value => Math.max(34, Math.min(86, value + (event.key === "ArrowUp" ? 5 : -5)))); } }} className="flex min-h-11 w-full touch-none items-center justify-center bg-white"><span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-primary/20" /></button>}
              <header className={`flex shrink-0 items-center justify-between gap-4 bg-white px-7 ${desktop ? "cursor-move py-6 active:cursor-grabbing" : "pb-4"}`}>
                <div><Dialog.Title className="text-xl font-extrabold tracking-tight sm:text-2xl">New report</Dialog.Title><p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Share what you observed</p></div>
                <button type="button" onPointerDown={event => event.stopPropagation()} onClick={close} disabled={busy} aria-label="Close new report" className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-forest disabled:opacity-50"><X size={20} strokeWidth={2.5} aria-hidden="true" /></button>
              </header>
              <Dialog.Description className="sr-only">Private fire observation form. Photos are optional. Closing hides the panel and keeps the draft while you remain on this dashboard.</Dialog.Description>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
                {error && <p id="report-error" ref={errorRef} tabIndex={-1} role="alert" className="mx-7 mb-4 rounded-sm bg-red-50 p-4 text-sm text-red-900">{error}</p>}
                {receipt ? <section className="px-7 py-8"><div className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check size={26} strokeWidth={3} aria-hidden="true" /></div><h2 className="mt-5 text-2xl font-extrabold">Report received</h2><p className="mt-2 break-all font-bold">{receipt.number}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Receipt confirms submission only, not a fire or dispatch.</p><Button asChild className="mt-6 w-full rounded-sm"><Link to={`/dashboard?panel=my-reports&report=${encodeURIComponent(receipt.id)}`}>View report</Link></Button><Button type="button" variant="outline" className="mt-3 w-full rounded-sm" disabled={busy} onClick={newReport}>New report</Button></section> : review ? <ReviewReport review={review} regionName={regions.data?.find(region => region.id === review.regionId)?.name} attempted={attempted} /> : <form id="new-report-form" onSubmit={event => { event.preventDefault(); void prepare(); }} aria-describedby={error ? "report-error" : undefined}>
                  <fieldset disabled={busy} className="min-w-0">
                    <section className="border-t border-primary/10 px-7 py-6" aria-labelledby="observation-heading">
                      <SectionLabel icon={Flame} color="bg-orange-50 text-orange-700" title="Observation" id="observation-heading" />
                      <fieldset className="mt-5"><legend className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">What did you notice?</legend><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">{([['SMOKE', 'Smoke'], ['FLAME', 'Flame'], ['BURNING_SMELL', 'Burning smell']] as const).map(([type, label]) => <label key={type} className={`flex min-h-11 items-center gap-2 rounded-sm border px-3 text-xs font-extrabold transition-colors ${draft.observationTypes.includes(type) ? "border-primary bg-secondary text-primary" : "border-input bg-white text-muted-foreground hover:bg-secondary/40"}`}><input type="checkbox" className="size-4 accent-primary" checked={draft.observationTypes.includes(type)} onChange={event => change({ observationTypes: event.target.checked ? [...draft.observationTypes, type as ObservationType] : draft.observationTypes.filter(value => value !== type) })} />{label}</label>)}</div></fieldset>
                      <label htmlFor="observed-at" className="mt-5 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Date and time<span className="text-accent" aria-hidden="true"> *</span><input id="observed-at" type="datetime-local" required value={draft.observedLocal} className={input} onChange={event => change({ observedLocal: event.target.value })} /></label>
                      <label htmlFor="observed-zone" className="mt-4 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Timezone<select id="observed-zone" value={draft.offset} className={input} onChange={event => change({ offset: event.target.value as ReportDraft["offset"] })}><option value="+07:00">WIB · UTC+7</option><option value="+08:00">WITA · UTC+8</option></select></label>
                      <label htmlFor="description" className="mt-4 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">What happened?<span className="text-accent" aria-hidden="true"> *</span><textarea id="description" required minLength={5} maxLength={2000} rows={5} value={draft.description} className={`${input} resize-none leading-6`} placeholder="Describe what you saw or smelled…" onChange={event => change({ description: event.target.value })} /></label>
                    </section>

                    <section className="border-t border-primary/10 px-7 py-6" aria-labelledby="location-heading">
                      <SectionLabel icon={MapPin} color="bg-sky-50 text-sky-700" title="Location" id="location-heading" />
                      <label htmlFor="location-mode" className="mt-5 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Point represents<select id="location-mode" className={input} value={draft.locationMode} onChange={event => change({ locationMode: event.target.value as ReportDraft["locationMode"] }, true)}><option value="INCIDENT_ESTIMATE">Estimated incident location</option><option value="OBSERVER_POSITION">Observer position</option></select></label>
                      <div className="mt-4 flex items-center justify-between gap-3 py-2"><div className="flex min-w-0 items-center gap-3"><MapPin className="shrink-0 text-primary" size={22} strokeWidth={2.5} aria-hidden="true" /><div className="min-w-0"><p className="text-xs font-bold text-muted-foreground">Selected location</p><p className="mt-0.5 truncate font-mono text-xs font-bold text-forest">{hasCoordinates ? `${Number(draft.latitude).toFixed(5)}, ${Number(draft.longitude).toFixed(5)}` : "No precise point selected"}</p></div></div><button type="button" disabled={!onPick} onClick={() => { cancelLocation(); onPick?.({ latitude: draft.latitude, longitude: draft.longitude, locationMode: draft.locationMode, receive: (latitude, longitude) => change({ latitude, longitude, accuracyMeters: null }, true) }); }} className="min-h-11 shrink-0 px-2 text-xs font-extrabold uppercase tracking-wide text-primary hover:text-forest disabled:opacity-50">{hasCoordinates ? "Change" : "Choose"}</button></div>
                      <button type="button" aria-describedby={gps ? "gps-status" : undefined} onClick={locate} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border-2 border-primary text-xs font-extrabold uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white"><Navigation size={16} strokeWidth={2.5} aria-hidden="true" />Use my GPS location</button>
                      {gps && <p id="gps-status" role="status" className="mt-2 text-xs leading-5 text-muted-foreground">{gps}</p>}
                      <label htmlFor="region-search" className="mt-5 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Verified region<input id="region-search" value={regionSearch} maxLength={200} className={input} placeholder="Search a region…" onChange={event => setRegionSearch(event.target.value)} /></label>
                      <Button type="button" variant="outline" className="mt-2 min-h-10 rounded-sm px-4 text-xs" onClick={() => { setRegionQuery(regionSearch.trim()); if (regionSearch.trim() === regionQuery) void regions.refetch(); }}>Search regions</Button>
                      <label htmlFor="region" className="mt-4 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Region {hasCoordinates ? "(optional)" : "(required without a point)"}<select id="region" className={input} value={draft.regionId} onChange={event => change({ regionId: event.target.value }, true)}><option value="">Select a verified region</option>{regions.data?.map(region => <option key={region.id} value={region.id}>{region.name} · {region.code}</option>)}</select></label>
                      {regions.isError ? <p role="alert" className="mt-2 text-sm text-red-800">Regions could not load. Retry or use coordinates.</p> : regions.data?.length === 0 ? <p role="status" className="mt-2 text-sm text-muted-foreground">No verified regions match.</p> : null}
                      <label htmlFor="landmark" className="mt-4 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Landmark, direction and uncertainty<span className="text-accent" aria-hidden="true"> *</span><textarea id="landmark" required minLength={5} maxLength={1000} rows={3} className={`${input} resize-none leading-6`} value={draft.locationDescription} onChange={event => change({ locationDescription: event.target.value }, true)} /></label>
                      <label className="mt-4 flex min-h-11 items-start gap-3 text-sm font-semibold"><input type="checkbox" required checked={draft.confirmed} className="mt-1 size-4 shrink-0 accent-primary" onChange={event => change({ confirmed: event.target.checked })} />I confirm this location and described any uncertainty.</label>
                    </section>

                    <section className="border-t border-primary/10 px-7 py-6" aria-labelledby="photo-heading">
                      <SectionLabel icon={Camera} color="bg-violet-50 text-violet-700" title="Photos" id="photo-heading" suffix="Optional" />
                      <p id="photo-help" className="mt-3 text-xs leading-5 text-muted-foreground">Up to five JPEG, PNG or WebP images, 5 MiB each. Photos remain private.</p>
                      {!!photos.length && <ul className="mt-4 grid grid-cols-3 gap-2">{photos.map((photo, index) => <li key={photo.preview} className="group relative h-20 overflow-hidden rounded-sm bg-secondary"><img src={photo.preview} alt={`Selected photo ${index + 1}`} className="size-full object-cover" /><button type="button" onClick={() => { URL.revokeObjectURL(photo.preview); setPhotos(current => current.filter((_, position) => position !== index)); setDirty(true); }} aria-label={`Remove selected photo ${index + 1}`} className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-forest/80 text-white"><Trash2 size={14} aria-hidden="true" /></button>{(busy || photo.error) && <span role="status" className="absolute inset-x-0 bottom-0 bg-forest/85 px-1.5 py-1 text-[9px] font-bold text-white">{photo.error || `${photo.progress}%`}</span>}</li>)}</ul>}
                      <label htmlFor="photos" className="mt-4 flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-input bg-secondary/35 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary/60"><ImagePlus size={24} aria-hidden="true" /><span className="mt-2 text-xs font-extrabold uppercase tracking-widest">Add photos</span><input id="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help" className="sr-only" onChange={handlePhotos} /></label>
                    </section>

                    <section className="border-t border-primary/10 px-7 py-5"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" /><p className="text-xs leading-5 text-muted-foreground">Your identity, precise location and original photos are not published on the situation map.</p></div></section>
                  </fieldset>
                </form>}
              </div>

              {!receipt && <footer className="shrink-0 border-t border-primary/10 bg-white px-7 py-5">
                {review ? <div className="flex gap-3"><Button type="button" variant="outline" disabled={busy || attempted} onClick={() => setReview(null)} className="flex-1 rounded-sm">Edit</Button><Button type="button" disabled={busy} onClick={() => void submit()} className="flex-1 rounded-sm">{busy ? <><LoaderCircle className="animate-spin" size={17} aria-hidden="true" />Submitting…</> : attempted ? "Retry" : "Submit report"}</Button></div> : <Button type="submit" form="new-report-form" disabled={busy} className="h-12 w-full rounded-sm text-sm font-extrabold uppercase tracking-widest">{busy ? <><LoaderCircle className="animate-spin" size={18} aria-hidden="true" />Preparing…</> : "Review report"}</Button>}
              </footer>}
              {resizeHandle}
            </motion.section>
          </Dialog.Content>
        </Dialog.Portal>}
      </AnimatePresence>
    </Dialog.Root>
  </>;
}

function SectionLabel({ icon: Icon, color, title, id, suffix }: { icon: typeof Flame; color: string; title: string; id: string; suffix?: string }) {
  return <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-sm ${color}`}><Icon size={20} strokeWidth={2.4} aria-hidden="true" /></span><h2 id={id} className="text-base font-extrabold">{title}</h2></div>{suffix && <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{suffix}</span>}</div>;
}

function ReviewReport({ review, regionName, attempted }: { review: ReportPayload; regionName?: string; attempted: boolean }) {
  return <section className="divide-y divide-primary/10 border-t border-primary/10"><div className="px-7 py-6"><SectionLabel icon={Check} color="bg-emerald-50 text-emerald-700" title="Review your report" id="review-heading" /></div><dl className="divide-y divide-primary/10 text-sm"><div className="px-7 py-5"><dt className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground"><Clock3 size={15} aria-hidden="true" />Observed</dt><dd className="mt-2 font-semibold">{review.observationTypes.map(type => type.replaceAll("_", " ").toLowerCase()).join(", ")} · {review.observedAt}</dd></div><div className="px-7 py-5"><dt className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground"><Crosshair size={15} aria-hidden="true" />Location</dt><dd className="mt-2 font-semibold">{review.locationMode === "OBSERVER_POSITION" ? "Observer position" : "Estimated incident location"}{review.latitude !== null ? ` · ${review.latitude}, ${review.longitude}` : " · Region only"}</dd>{regionName && <dd className="mt-1">{regionName}</dd>}<dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{review.locationDescription}</dd></div><div className="px-7 py-5"><dt className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Description</dt><dd className="mt-2 whitespace-pre-wrap leading-6">{review.description}</dd></div><div className="px-7 py-5"><dt className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Private photos</dt><dd className="mt-2">{review.attachmentIds.length} attached</dd></div></dl>{attempted && <p className="mx-7 mb-5 rounded-sm bg-amber-50 p-3 text-xs leading-5 text-amber-950">Retry this unchanged report if the response was lost. The submission key prevents duplicates.</p>}</section>;
}
