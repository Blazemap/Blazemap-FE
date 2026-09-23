import { useContext } from "react";
import { Button } from "@/components/ui";
import { IncidentPointContext } from "@/lib/incident-point";

export default function IncidentPointInput({ latitude, longitude, onChange, disabled = false }: { latitude: string; longitude: string; onChange: (latitude: string, longitude: string) => void; disabled?: boolean }) {
  const picker = useContext(IncidentPointContext);
  return <section className="space-y-2" aria-label="Observed fire location">
    <p className="text-sm font-bold">Where did the team see the fire? <span aria-hidden="true">*</span></p>
    <p className="text-xs text-muted-foreground">Select the actual fire location, not the team's position or the center of the boundary.</p>
    <Button type="button" variant="outline" className="w-full" disabled={disabled || !picker.available} onClick={() => picker.start({ latitude, longitude, apply: point => onChange(point.latitude, point.longitude) })}>{latitude && longitude ? "Change fire pin on map" : "Choose fire pin on map"}</Button>
    <p role="status" className="text-xs">{latitude && longitude ? `Fire pin: ${latitude}, ${longitude}` : "No fire pin selected yet."}</p>
    <details><summary className="min-h-11 cursor-pointer text-xs font-bold">Advanced: enter coordinates</summary><div className="grid grid-cols-2 gap-2">
      <label className="text-xs">Latitude<input disabled={disabled} type="number" min={-90} max={90} step="any" value={latitude} onChange={event => onChange(event.target.value, longitude)} className="mt-1 min-h-11 w-full rounded border px-3" /></label>
      <label className="text-xs">Longitude<input disabled={disabled} type="number" min={-180} max={180} step="any" value={longitude} onChange={event => onChange(latitude, event.target.value)} className="mt-1 min-h-11 w-full rounded border px-3" /></label>
    </div></details>
  </section>;
}
