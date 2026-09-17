import { useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui";
import type { DashboardUser } from "@/types";
import type { CaseDetail } from "@/types/government";
import { drawingFrom, drawingPolygon, editDraft, polygonArea, type PerimeterDraft } from "@/lib/perimeter";
import { savePerimeter } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { formatTime } from "@/pages/dashboard/utils";

export type PerimeterEditorProps = { draft: PerimeterDraft | null; setDraft: Dispatch<SetStateAction<PerimeterDraft | null>> };
const control = "mt-1 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";
const localTime = (value: string | null) => value ? new Date(Date.parse(value) - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
export default function CasePerimeter({ user, detail, draft, setDraft, refresh, canDraw }: PerimeterEditorProps & { user: DashboardUser; detail: CaseDetail; refresh: () => void; canDraw: boolean }) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [coordinateError, setCoordinateError] = useState("");
  const mutation = useGovernmentMutation(user, async (input: PerimeterDraft) => {
    const observed = new Date(input.observedAt);
    if (!Number.isFinite(observed.getTime()) || observed.getTime() > Date.now()) throw new Error("Enter the actual perimeter observation time, not a future time.");
    await savePerimeter(detail.id, { version: input.version, perimeter: drawingPolygon(input.drawing), perimeterObservedAt: observed.toISOString(), perimeterSource: input.source.trim(), reason: input.reason.trim(), authorityReference: input.authority.trim() });
  }, "canConfirmIncidents");
  const active = draft?.caseId === detail.id ? draft : null;
  let validation = "", hectares: number | null = null;
  if (active) {
    try { hectares = polygonArea(drawingPolygon(active.drawing)); }
    catch (error) { validation = error instanceof Error ? error.message : "Invalid polygon"; }
  }
  const ring = active?.drawing.rings[active.drawing.active] ?? [];
  function change(fields: Partial<PerimeterDraft>) { setDraft(current => current && !current.pending ? { ...current, ...fields } : current); }
  function addVertex() {
    const lat = Number(latitude), lng = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) { setCoordinateError("Enter valid latitude and longitude."); return; }
    setCoordinateError("");
    setDraft(current => current ? editDraft(current, { type: "add", point: [lng, lat] }) : current);
  }
  return <section className="mt-5 space-y-3 border-t pt-4" aria-label="Private incident perimeter"><h4 className="font-extrabold">Private incident perimeter</h4>
    {detail.perimeter ? <p className="text-xs">{detail.areaHectares?.toLocaleString("en", { maximumFractionDigits: 2 })} ha · Revision {detail.perimeterRevision}<br />Source: {detail.perimeterSource}<br />Observed {detail.perimeterObservedAt ? formatTime(detail.perimeterObservedAt) : "time unavailable"}</p> : <p className="text-xs">No audited perimeter recorded.</p>}
    {!active && user.canConfirmIncidents && <Button variant="outline" disabled={detail.verification !== "CONFIRMED_FIRE" || !!draft || !canDraw} onClick={() => { mutation.reset(); setDraft({ caseId: detail.id, version: detail.version, drawing: drawingFrom(detail.perimeter), history: [], observedAt: localTime(detail.perimeterObservedAt), source: detail.perimeterSource ?? "", reason: "", authority: "", pending: false, fit: 1 }); }}>{detail.perimeter ? "Edit perimeter" : "Draw perimeter"}</Button>}
    {!canDraw && !active && <p className="text-xs">Open this case on the map to draw its perimeter.</p>}
    {detail.verification !== "CONFIRMED_FIRE" && <p className="text-xs">A confirmed fire is required before recording a perimeter.</p>}
    {active && <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      if (validation || active.version !== detail.version || active.pending) return;
      const snapshot = active;
      setDraft(current => current ? { ...current, pending: true } : current);
      mutation.mutate(snapshot, { onSuccess: () => setDraft(null), onSettled: () => setDraft(current => current ? { ...current, pending: false } : current) });
    }}><fieldset disabled={active.pending} className="space-y-3"><legend className="text-sm font-bold">Unsaved drawing</legend>
      <p className="text-xs">Click the map to add vertices. Click the first vertex after at least three distinct vertices to close. Drag a vertex to move it, or use coordinate inputs below. No changes are saved until Save perimeter.</p>
      <label className="block text-xs font-bold">Ring<select className={control} value={active.drawing.active} onChange={event => setDraft(current => current ? editDraft(current, { type: "ring", index: Number(event.target.value) }) : current)}>{active.drawing.rings.map((_, i) => <option value={i} key={i}>{i === 0 ? "Outer boundary" : `Hole ${i}`}</option>)}</select></label>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!active.history.length} onClick={() => setDraft(current => current ? editDraft(current, { type: "undo" }) : current)}>Undo</Button><Button type="button" variant="outline" onClick={() => setDraft(current => current ? editDraft(current, { type: current.drawing.closed[current.drawing.active] ? "reopen" : "close" }) : current)}>{active.drawing.closed[active.drawing.active] ? "Add more vertices" : "Close ring"}</Button><Button type="button" variant="outline" disabled={!active.drawing.closed.every(Boolean)} onClick={() => setDraft(current => current ? editDraft(current, { type: "hole" }) : current)}>Add hole</Button>{active.drawing.active > 0 && <Button type="button" variant="outline" onClick={() => setDraft(current => current ? editDraft(current, { type: "delete-hole" }) : current)}>Delete hole</Button>}<Button type="button" variant="outline" disabled={!ring.length} onClick={() => change({ fit: active.fit + 1 })}>Fit drawing</Button></div>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold">New latitude<input className={control} type="number" step="any" min={-90} max={90} value={latitude} onChange={event => setLatitude(event.target.value)} /></label><label className="text-xs font-bold">New longitude<input className={control} type="number" step="any" min={-180} max={180} value={longitude} onChange={event => setLongitude(event.target.value)} /></label></div>
      <Button type="button" variant="outline" disabled={active.drawing.closed[active.drawing.active] || active.drawing.rings.reduce((n, r) => n + r.length + 1, 0) >= 1000} onClick={addVertex}>Add vertex</Button>
      {coordinateError && <p role="alert" className="text-xs">{coordinateError}</p>}
      <ol className="max-h-64 space-y-3 overflow-y-auto">{ring.map((point, index) => <li key={index} className="rounded-lg border bg-white p-2"><span className="text-xs font-bold">Vertex {index + 1}</span><div className="grid grid-cols-2 gap-2">{([1, 0] as const).map(axis => <label key={axis} className="text-xs">{axis === 1 ? "Latitude" : "Longitude"}<input aria-label={`Vertex ${index + 1} ${axis === 1 ? "latitude" : "longitude"}`} className={control} type="number" step="any" min={axis === 1 ? -90 : -180} max={axis === 1 ? 90 : 180} key={`${axis}:${point[axis]}`} required defaultValue={point[axis]} onBlur={event => { if (event.target.value === "" || !event.target.validity.valid) return; const next: [number, number] = [...point]; next[axis] = Number(event.target.value); setDraft(current => current ? editDraft(current, { type: "move", index, point: next }) : current); }} /></label>)}</div><Button type="button" variant="ghost" aria-label={`Delete vertex ${index + 1}`} onClick={() => setDraft(current => current ? editDraft(current, { type: "delete", index }) : current)}>Delete vertex</Button></li>)}</ol>
      <p role="status" className="text-xs">{validation || `Valid draft · ${hectares?.toLocaleString("en", { maximumFractionDigits: 2 })} ha (approximate)`} · {active.drawing.rings.reduce((n, r) => n + r.length + 1, 0)}/1,000 positions including closures. Server validation is definitive.</p>
      <label className="block text-xs font-bold">Perimeter observed at (local time)<input required type="datetime-local" className={control} value={active.observedAt} onChange={event => change({ observedAt: event.target.value })} /></label><label className="block text-xs font-bold">Perimeter source<input required minLength={3} maxLength={300} className={control} value={active.source} onChange={event => change({ source: event.target.value })} /></label><label className="block text-xs font-bold">Change reason<textarea required minLength={5} maxLength={2000} className={`${control} py-2`} value={active.reason} onChange={event => change({ reason: event.target.value })} /></label><label className="block text-xs font-bold">Authority reference<input required minLength={3} maxLength={500} className={control} value={active.authority} onChange={event => change({ authority: event.target.value })} /></label>
      {active.version !== detail.version && <div role="alert" className="text-sm"><p>Case changed from version {active.version} to {detail.version}. Draft retained. Review the current case before using its new version.</p><Button type="button" variant="outline" onClick={() => change({ version: detail.version })}>Use reviewed version {detail.version}</Button></div>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!!validation || active.version !== detail.version || detail.verification !== "CONFIRMED_FIRE"}>{active.pending ? "Saving…" : "Save perimeter"}</Button><Button type="button" variant="outline" onClick={() => { if (window.confirm("Discard the unsaved perimeter drawing and metadata?")) setDraft(null); }}>Cancel drawing</Button></div>
    </fieldset>{mutation.error && <div role="alert" className="text-sm"><p>{mutation.error.message}</p><Button type="button" variant="outline" onClick={refresh}>Refresh case; retain draft</Button></div>}</form>}
    {mutation.isSuccess && !active && <p role="status" className="text-xs">Perimeter saved privately. Publishing requires a separate privacy review and explicit publication.</p>}
  </section>;
}
