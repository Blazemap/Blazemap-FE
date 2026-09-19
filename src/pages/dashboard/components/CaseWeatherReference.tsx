import { useState } from "react";
import { governmentRequest } from "@/api/dashboard/government";
import { Button } from "@/components/ui";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import type { DashboardUser } from "@/types";
import type { CaseDetail } from "@/types/government";
import { apiEndpoints } from "@/constants";

import type { WeatherReference } from "@/types/government";
import { parseWeatherReference } from "@/api/dashboard/government";

export default function CaseWeatherReference({ user, detail, refresh }: { user: DashboardUser; detail: CaseDetail; refresh: () => void }) {
  const [adm4, setAdm4] = useState("");
  const [preview, setPreview] = useState<WeatherReference | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [reason, setReason] = useState("");
  const previewMutation = useGovernmentMutation(user, async () => {
    const result = await governmentRequest(`${apiEndpoints.cases.replace(/\/cases$/, "")}/weather-reference/preview`, "post", { adm4 });
    setPreview(parseWeatherReference((result as { data: unknown }).data));
    setReviewed(false);
  });
  const saveMutation = useGovernmentMutation(user, async () => {
    if (!preview || preview.adm4 !== adm4 || !reviewed) return;
    await governmentRequest(`${apiEndpoints.cases}/${encodeURIComponent(detail.id)}/weather-reference`, "patch", { version: detail.version, adm4, locationFingerprint: preview.locationFingerprint, reviewed, reason });
    setPreview(null);
    setReviewed(false);
    refresh();
  });
  const reference = preview ?? detail.weatherReference;
  return <section aria-label="BMKG weather reference" className="mt-5 space-y-3 border-t pt-4">
    <h4 className="font-bold">BMKG weather reference</h4>
    <p className="text-xs">Provider representative point, NOT a legal boundary. This does not place the case inside a village or change its administrative region.</p>
    <form onSubmit={event => { event.preventDefault(); previewMutation.mutate(); }} className="space-y-3">
      <label className="block text-xs font-bold">Official ADM4 code<input required pattern="[0-9]{2}\.[0-9]{2}\.[0-9]{2}\.[0-9]{4}" value={adm4} disabled={previewMutation.isPending || saveMutation.isPending} onChange={event => { setAdm4(event.target.value); setPreview(null); setReviewed(false); }} className="mt-2 min-h-11 w-full rounded-sm border px-3 text-sm" /></label>
      <Button type="submit" variant="outline" disabled={previewMutation.isPending || saveMutation.isPending}>{previewMutation.isPending ? "Loading…" : "Preview BMKG forecast"}</Button>
    </form>
    {(previewMutation.isError || saveMutation.isError) && <p role="alert" className="text-xs text-red-800">The reference could not be confirmed. Review the official code and preview again.</p>}
    {reference && <div className="space-y-2 text-xs">
      <p className="font-bold">{preview ? "Preview — not saved" : "Saved weather reference"}: {reference.adm4}</p>
      <p>{reference.location.desa}, {reference.location.kecamatan}, {reference.location.kotkab}, {reference.location.provinsi}</p>
      <p>Representative point: {reference.location.lat}, {reference.location.lon}</p>
      <p>Source: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika). Fetched {new Date(reference.fetchedAt).toLocaleString()}.</p>
      <p>Forecast, not an on-site measurement. Stored snapshot; preview again to refresh.</p>
      <div className="max-h-64 overflow-auto"><table className="w-full text-left"><caption className="sr-only">BMKG source forecasts</caption><thead><tr><th>Valid time</th><th>Issued</th><th>Weather</th><th>°C</th><th>Humidity %</th><th>Wind km/h</th></tr></thead><tbody>{reference.forecasts.map(row => <tr key={`${row.issuedAt}-${row.validAt}`}><td>{new Date(row.validAt).toLocaleString()}</td><td>{new Date(row.issuedAt).toLocaleString()}</td><td>{row.weatherDescriptionEn ?? "Unavailable"}</td><td>{row.temperature ?? "Unavailable"}</td><td>{row.humidity ?? "Unavailable"}</td><td>{row.windSpeed ?? "Unavailable"}</td></tr>)}</tbody></table></div>
    </div>}
    {preview && <form className="space-y-3" onSubmit={event => { event.preventDefault(); saveMutation.mutate(); }}>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" required checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I reviewed these names and representative point as a weather reference for this case, not a boundary or containment claim.</label>
      <label className="block text-xs font-bold">Review reason<textarea required minLength={5} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 w-full rounded-sm border p-3 text-sm" /></label>
      <Button type="submit" disabled={!reviewed || reason.trim().length < 5 || saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : "Save weather reference"}</Button>
    </form>}
  </section>;
}
