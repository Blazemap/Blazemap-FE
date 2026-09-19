import CaseWeatherReference from "./CaseWeatherReference";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getForecastRegions, updateCaseForecastRegion } from "@/api/dashboard/government";
import { Button } from "@/components/ui";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import type { DashboardUser } from "@/types";
import type { CaseDetail } from "@/types/government";

export default function CaseForecastRegion({ user, detail, refresh }: { user: DashboardUser; detail: CaseDetail; refresh: () => void }) {
  const regions = useQuery({ queryKey: ["dashboard", user.id, user.role, "bmkg-regions"], queryFn: ({ signal }) => getForecastRegions(signal), retry: false, gcTime: 0 });
  const [regionId, setRegionId] = useState(detail.regionId ?? "");
  const [reason, setReason] = useState("");
  const mutation = useGovernmentMutation(user, async () => {
    await updateCaseForecastRegion(detail.id, { version: detail.version, regionId: regionId || null, reason: reason.trim() });
    setReason("");
    refresh();
  });
  const changed = regionId !== (detail.regionId ?? "");
  return <section aria-label="Forecast region mapping" className="mt-5 space-y-3 border-t pt-4">
    <h4 className="font-bold">BMKG forecast region</h4>
    <p className="text-xs">Operator-selected mapping only. Coordinates are not matched to an administrative area because no verified boundary dataset is available.</p>
    {regions.isPending && <p role="status" className="text-xs">Loading verified BMKG mappings…</p>}
    {regions.isError && <div role="alert" className="text-xs"><p>Verified BMKG mappings could not be loaded.</p><Button type="button" variant="outline" className="mt-2" onClick={() => void regions.refetch()}>Retry mappings</Button></div>}
    {regions.data?.length === 0 && <p role="status" className="text-xs">No verified administrative level IV BMKG mappings are available. Import and verify an actual boundary dataset and ADM4 mapping before selection.</p>}
    {regions.data && <form onSubmit={event => { event.preventDefault(); if (changed && reason.trim()) mutation.mutate(); }}>
      <label htmlFor="case-forecast-region" className="block text-xs font-bold">Verified mapping<select id="case-forecast-region" className="mt-2 min-h-11 w-full rounded-sm border bg-white px-3 text-sm" value={regionId} onChange={event => setRegionId(event.target.value)}><option value="">No forecast region</option>{regions.data.map(region => <option key={region.id} value={region.id}>{region.name} · {region.code}</option>)}</select></label>
      <label htmlFor="case-forecast-region-reason" className="mt-3 block text-xs font-bold">Change reason <span aria-hidden="true">*</span><textarea id="case-forecast-region-reason" required aria-required="true" minLength={5} maxLength={2000} rows={2} className="mt-2 w-full rounded-sm border p-3 text-sm" value={reason} onChange={event => setReason(event.target.value)} /></label>
      {mutation.isError && <p role="alert" className="mt-2 text-xs text-red-800">The forecast region was not changed. Refresh and review the verified mapping before retrying.</p>}
      <Button type="submit" variant="outline" className="mt-3" disabled={!changed || reason.trim().length < 5 || mutation.isPending}>{mutation.isPending ? "Saving…" : "Save forecast region"}</Button>
    </form>}
    <CaseWeatherReference key={`${detail.id}-${detail.version}`} user={user} detail={detail} refresh={refresh} />
  </section>;
}
