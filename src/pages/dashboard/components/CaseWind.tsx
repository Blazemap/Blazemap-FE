import { useEffect, useState } from "react";
import type { CaseDetail } from "@/types/government";
import { windArrow, type WindArrow } from "@/lib/wind";
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
  return <section className="mt-5 space-y-3 border-t pt-4" aria-label="Case wind context">
    <h4 className="font-bold">Wind and potential impact</h4>
    <p className="text-sm">{failed ? "Wind unavailable until case access and data refresh succeed." : !w ? "Wind context unavailable." : expired && w.status === "READY" ? "Forecast expired; no current downwind arrow." : w.summary}</p>
    {w?.forecast && <dl className="space-y-1 text-xs"><div><dt className="inline font-bold">Source: </dt><dd className="inline">BMKG regional forecast · {w.forecast.regionName}</dd></div><div><dt className="inline font-bold">Issued: </dt><dd className="inline">{formatTime(w.forecast.issuedAt)}</dd></div><div><dt className="inline font-bold">Valid from: </dt><dd className="inline">{formatTime(w.forecast.validAt)}</dd></div><div><dt className="inline font-bold">Fetched: </dt><dd className="inline">{formatTime(w.forecast.fetchedAt)}</dd></div><div><dt className="inline font-bold">Wind speed: </dt><dd className="inline">{w.windSpeedKmh === null ? "Unavailable" : `${w.windSpeedKmh} km/h`}</dd></div><div><dt className="inline font-bold">Forecast direction: </dt><dd className="inline">{w.windFromDegrees === null ? "Unavailable" : `From ${w.windFromDegrees}° toward ${w.windToDegrees}° (clockwise from north)`}</dd></div><div><dt className="inline font-bold">Freshness: </dt><dd className="inline">{expired ? "Expired" : w.status.replaceAll("_", " ")}{w.usableUntil && ` · usable before ${formatTime(w.usableUntil)}`}</dd></div></dl>}
    <p className="text-xs">Downwind attention, not predicted perimeter. Arrow length is fixed on screen, not a distance or spread forecast. No physical fire-spread model is available here; arrival times, spread speed, and affected areas cannot be predicted.</p>
    <p className="text-xs">Settlement exposure unavailable: no verified geospatial downwind calculation. Shared administrative region is not exposure evidence.</p>
    {detail.verification !== "CONFIRMED_FIRE" && <p className="text-xs">Map attention requires a human-confirmed case and recorded location.</p>}
  </section>;
}
