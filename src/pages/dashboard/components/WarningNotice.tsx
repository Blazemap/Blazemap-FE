import { useEffect, useState } from "react";
import { formatTime } from "@/pages/dashboard/utils";
import type { Publication } from "@/lib/publications";

export default function WarningNotice({ item }: { item: Pick<Publication, "advisory" | "validUntil" | "status" | "expired"> }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  return <section aria-label="Warning advisory" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-extrabold">Informational advisory — not an evacuation order</p>
    <p>Valid until {item.validUntil ? formatTime(item.validUntil) : "unavailable"}. {item.expired || !item.validUntil || Date.parse(item.validUntil) <= now || item.status !== "PUBLISHED" ? "Not an active public warning." : "Conditions can change; follow current instructions from local authorities."}</p>
    <h2 className="font-bold">Reviewed access and designated locations</h2>
    {!item.advisory?.operationalReferences.length ? <p>No verified route or designated-location information published. No safe route is inferred from map roads.</p> : <ul className="space-y-3">{item.advisory.operationalReferences.map(ref => <li key={ref.featureId}><p className="font-bold">{ref.name} · {ref.kind === "ROAD" ? "Access" : "Authority-designated location"} · {ref.condition.toLowerCase()}</p><p>Observed {formatTime(ref.observedAt)} · {now - Date.parse(ref.observedAt) > 86400000 ? "Stale observation" : "Time-limited observation"}</p><p>Source: {ref.source} · {ref.provider}</p></li>)}</ul>}
    <p>These are published observations, not navigation instructions or a guarantee of present safety.</p>
  </section>;
}
