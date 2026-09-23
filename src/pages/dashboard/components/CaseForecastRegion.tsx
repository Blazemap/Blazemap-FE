import { weatherSummary } from "@/lib/bmkg";
import { formatTime } from "@/pages/dashboard/utils";
import type { CaseDetail } from "@/types/government";

export default function CaseForecastRegion({ detail }: { detail: CaseDetail }) {
  const resolution = detail.weatherResolution;
  const summary = weatherSummary(resolution);
  return <section aria-labelledby="case-weather-heading" className="mt-5 space-y-3 border-t pt-4">
    <div className="flex items-start justify-between gap-3"><div><h4 id="case-weather-heading" className="font-bold">Current weather</h4><p className="mt-1 text-xs text-muted-foreground">Conditions at case coordinates, not an on-site measurement or incident confirmation.</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">{summary.availability}</span></div>
    {!resolution.forecast && <p className="text-sm">Current weather at the case coordinates is unavailable.</p>}
    {resolution.forecast && <><p className="text-xs text-muted-foreground">{resolution.provenance?.attribution ?? resolution.forecast.attribution}</p><dl className="grid grid-cols-3 gap-2 text-xs"><div><dt className="font-bold">Temperature</dt><dd>{summary.temperature === null ? "—" : `${summary.temperature} °C`}</dd></div><div><dt className="font-bold">Humidity</dt><dd>{summary.humidity === null ? "—" : `${summary.humidity}%`}</dd></div><div><dt className="font-bold">Wind</dt><dd>{summary.windSpeed === null ? "—" : `${summary.windSpeed} km/h`}</dd></div></dl>
      <details><summary className="min-h-11 cursor-pointer text-xs font-bold">Weather source details</summary><dl className="grid gap-2 text-xs sm:grid-cols-2"><div><dt className="font-bold">Source</dt><dd>{resolution.provenance?.attribution ?? resolution.forecast.attribution}</dd></div><div><dt className="font-bold">Location basis</dt><dd>{summary.basis}</dd></div><div><dt className="font-bold">Observed</dt><dd>{summary.validAt ? formatTime(summary.validAt) : "—"}</dd></div><div><dt className="font-bold">Fetched</dt><dd>{summary.fetchedAt ? formatTime(summary.fetchedAt) : "—"}</dd></div><div><dt className="font-bold">Usable until</dt><dd>{summary.usableUntil ? formatTime(summary.usableUntil) : "—"}</dd></div></dl></details></>}
  </section>;
}
