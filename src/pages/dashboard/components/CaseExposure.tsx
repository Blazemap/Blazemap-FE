import type { CaseDetail } from "@/types/government";
import { formatTime } from "@/pages/dashboard/utils";

export default function CaseExposure({ detail }: { detail: CaseDetail }) {
  const exposure = detail.exposure;
  return <section aria-label="Spatial context and access options" className="mt-5 space-y-3 border-t pt-4">
    <h4 className="font-bold">Spatial context and access options</h4>
    <p className="text-xs">Options for authorized human assessment, not evacuation instructions or safe routes. Check current access, capacity and official designation before acting.</p>
    {!exposure ? <p>Verified spatial context unavailable.</p> : <><p className="text-xs">{exposure.limitation}</p><p className="text-xs">Evaluated {formatTime(exposure.evaluatedAt)} · {exposure.scope}{exposure.limited ? " · Results capped" : ""}</p>{!exposure.items.length && <p>No verified features available for this case region. Missing data is not evidence of safety.</p>}
      <ul className="space-y-3">{exposure.items.map(f => <li key={f.id} className="rounded border p-3 text-sm"><h5 className="font-bold">{f.name || f.kind} · {f.kind}</h5><p>{f.distanceMeters === null ? `Distance unavailable: ${f.unavailableReason || "Unknown"}` : `${f.distanceMeters.toFixed(0)} m from recorded incident point`}</p>{f.intersectsPoint && <p>Recorded point intersects this geometry; not a burned-area estimate.</p>}<p>{f.downwind === true ? "Within directional downwind advisory sector" : "Downwind relation unavailable or not established; no safety inference"}</p><p className="text-xs">{f.provider} · {f.attribution} · {f.license}<br />Source {formatTime(f.sourceDate)} · Verified {f.verifiedAt ? formatTime(f.verifiedAt) : "Not verified"}</p>
        {f.kind === "ROAD" && <p>{f.condition ? `${f.condition.condition} · ${f.condition.source} · ${formatTime(f.condition.observedAt)}${f.condition.stale ? " · Stale: recheck" : " · Operator report, verify before travel"}` : "Road condition unavailable; mapped road does not establish access."}</p>}
        {f.kind === "DESIGNATED_LOCATION" && <p>{f.designation ? `Designation reference: ${f.designation.reference} · ${f.designation.authority} · Verified ${formatTime(f.designation.verifiedAt)}. Capacity and current suitability require local confirmation.` : "Official designation not established; do not treat as an evacuation destination."}</p>}
      </li>)}</ul></>}
  </section>;
}
