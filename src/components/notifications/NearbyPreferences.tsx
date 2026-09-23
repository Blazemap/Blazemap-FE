import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/config/api-client";
import { checkDashboardAccount } from "@/hooks/dashboard/session";
import { Button } from "@/components/ui";
import type { DashboardUser } from "@/types";

export default function NearbyPreferences({ user }: { user: DashboardUser }) {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [emailPreference, setEmailPreference] = useState<boolean | null>(null);
  const key = ["dashboard", user.id, user.role, "nearby-preferences"];
  const preferences = useQuery({ queryKey: key, gcTime: 0, retry: false, queryFn: async ({ signal }) => {
    await checkDashboardAccount(user, signal);
    const response = await apiClient.get<{ data: { enabled: boolean; location: { expiresAt: string; emailEnabled: boolean } | null } }>("/api/notifications/preferences", { signal });
    await checkDashboardAccount(user, signal);
    return response.data.data;
  } });
  const emailEnabled = emailPreference ?? preferences.data?.location?.emailEnabled ?? false;
  const save = useMutation({ retry: false, mutationFn: async (enabled: boolean) => {
    setError("");
    const signal = AbortSignal.timeout(30000);
    await checkDashboardAccount(user, signal);
    let body: Record<string, unknown> = { enabled: false };
    if (enabled) {
      if (!navigator.geolocation) throw new Error("Location is unavailable in this browser.");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }));
      if (position.coords.accuracy > 1000) throw new Error("Location accuracy must be within 1,000 metres. Try again outdoors or later.");
      body = { enabled: true, emailEnabled, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() };
    }
    await checkDashboardAccount(user, signal);
    await apiClient.post("/api/notifications/location", body, { signal });
    await checkDashboardAccount(user, signal);
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ["dashboard", user.id, user.role] }); }, onError: error => setError(error instanceof Error ? error.message : "Location could not be saved. Check browser permission and try again.") });
  return <section className="space-y-3 border-b bg-white p-4" aria-label="Nearby alert settings">
    <h3 className="text-sm font-extrabold">Nearby fire alerts</h3>
    <p className="text-xs leading-5">Off by default. Your latest location is stored for 24 hours only. A confirmed boundary within 2 km creates a navbar notification; this is not spread prediction or evacuation advice.</p>
    <label className="flex min-h-11 items-center gap-3 text-xs font-bold"><input type="checkbox" checked={emailEnabled} onChange={event => setEmailPreference(event.target.checked)} className="size-4 accent-primary" />Also send email when delivery is configured</label>
    {preferences.isPending && !preferences.data && <div role="status" aria-label="Loading nearby alert preferences" className="space-y-2 motion-safe:animate-pulse"><span className="sr-only">Loading nearby alert preferences</span><div aria-hidden="true"><span className="block h-3 w-28 rounded bg-secondary" /><span className="mt-2 block h-11 w-full rounded-full bg-secondary" /></div></div>}
    {preferences.isError && !preferences.data && <Button variant="outline" onClick={() => void preferences.refetch()}>Retry preferences</Button>}
    {preferences.data && <><p className="text-xs">{preferences.data.enabled ? `Enabled until ${new Date(preferences.data.location!.expiresAt).toLocaleString()}${preferences.data.location?.emailEnabled ? " · email on" : " · email off"}` : "Disabled"}</p><div className="flex flex-wrap gap-2"><Button disabled={save.isPending} onClick={() => save.mutate(true)}>{preferences.data.enabled ? "Refresh location" : "Enable using my location"}</Button>{preferences.data.enabled && <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(false)}>Turn off and delete location</Button>}</div></>}
    {save.isPending && <p role="status" className="text-xs">Updating preference…</p>}{error && <p role="alert" className="text-xs text-red-800">{error}</p>}
  </section>;
}
