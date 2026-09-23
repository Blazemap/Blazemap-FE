import { useEffect, useState } from "react";
import type { CaseDetail } from "@/types/government";
import { windArrow, windSource, type WindArrow } from "@/lib/wind";
import { formatTime } from "@/pages/dashboard/utils";

export default function CaseWind({ detail, failed, onWind }: { detail: CaseDetail; failed: boolean; onWind: (value: WindArrow | null) => void }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const w = detail.windContext;
  const expired = !!w?.usableUntil && now >= Date.parse(w.usableUntil);
  useEffect(() => {
    onWind(failed || expired ? null : windArrow(detail, Date.now()));
    return () => onWind(null);
  }, [detail, failed, expired, onWind]);
  if (!w?.forecast) return null;
  return <section className="mt-5 space-y-3 border-t pt-4" aria-label="Case wind context">
    <h4 className="font-bold">Wind context</h4>
    <p className="text-sm">{failed ? "Wind unavailable until case access and data refresh succeed." : !w ? "Wind context unavailable." : expired && w.status === "READY" ? "Conditions expired; no current downwind arrow." : w.summary}</p>
    {w?.forecast && <details><summary className="min-h-11 cursor-pointer text-xs font-bold">Wind source details</summary><dl className="space-y-1 text-xs"><div><dt className="inline font-bold">Source: </dt><dd className="inline">{windSource(w.forecast)}</dd></div>{w.forecast.issuedAt && <div><dt className="inline font-bold">Issued: </dt><dd className="inline">{formatTime(w.forecast.issuedAt)}</dd></div>}<div><dt className="inline font-bold">Valid from: </dt><dd className="inline">{formatTime(w.forecast.validAt)}</dd></div><div><dt className="inline font-bold">Fetched: </dt><dd className="inline">{formatTime(w.forecast.fetchedAt)}</dd></div><div><dt className="inline font-bold">Wind speed: </dt><dd className="inline">{w.windSpeedKmh === null ? "Unavailable" : `${w.windSpeedKmh} km/h`}</dd></div><div><dt className="inline font-bold">Wind direction: </dt><dd className="inline">{w.windFromDegrees === null ? "Unavailable" : `From ${w.windFromDegrees}° toward ${w.windToDegrees}°`}</dd></div><div><dt className="inline font-bold">Freshness: </dt><dd className="inline">{expired ? "Expired" : w.status.replaceAll("_", " ")}{w.usableUntil && ` · usable before ${formatTime(w.usableUntil)}`}</dd></div></dl></details>}
    <p className="text-xs">Directional attention only—not a spread perimeter, distance, speed, or arrival-time forecast.</p>
    {detail.verification !== "CONFIRMED_FIRE" && <p className="text-xs">Map attention requires a human-confirmed case and recorded location.</p>}
  </section>;
}
