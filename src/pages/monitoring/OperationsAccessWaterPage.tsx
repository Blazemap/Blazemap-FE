import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Route } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { DraftGuard } from "@/components/common";
import { Button } from "@/components/ui";
import { useMonitoringAccessWater, useMonitoringFeature } from "@/hooks/dashboard";
import { formatTime } from "@/pages/dashboard/utils";
import type { MonitoringFeature, MonitoringOperationalUpdate } from "@/types";
import { MasterDetail } from "./MonitoringComponents";
import { DetailDrawer } from "./MonitoringDetails";
import { useMonitoringContext } from "./MonitoringPage";
import { OperationsDetailSkeleton } from "./MonitoringSkeletons";
import { Condition, ConditionCreate, ConditionHistory, EmptyPanel, Freshness, InventoryHeader, OperationalFeatureCreate, OperationsDialog, OperationsSectionPage, OperationsSnapshot, panelClass, StatusPill } from "./OperationsShared";

function FeatureRow({ item }: { item: MonitoringFeature }) {
  return <li className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-extrabold">{item.name || "Unnamed operational feature"}</p><p className="mt-1 text-xs text-muted-foreground">{item.provider} · {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} · {item.authoritative ? "Verified source" : "Not authoritative"}</p><div className="mt-2"><Condition condition={item.latestCondition} /></div><Freshness observedAt={item.latestObservedAt} /></div><Button asChild variant="outline" className="h-11 justify-self-start sm:justify-self-end"><Link to={encodeURIComponent(item.id)}>View details</Link></Button></li>;
}

export default function OperationsAccessWaterPage() {
  const { user } = useMonitoringContext();
  const resource = useMonitoringAccessWater(user);
  return <MasterDetail user={user}><OperationsSectionPage title="Access & Water" description="Review verified route and water-source conditions without inferred availability." resource={resource} section="access-water">{(data, refresh) => {
    const access = data.features.filter(item => item.kind === "ROAD");
    const water = data.features.filter(item => ["RIVER", "WATER_SOURCE"].includes(item.kind));
    const designated = data.features.filter(item => item.kind === "DESIGNATED_LOCATION");
    return <><section aria-labelledby="access-water-inventory-title" className={`overflow-hidden ${panelClass}`}><div id="access-water-inventory-title"><InventoryHeader title="Access and water inventory" detail={`${data.counts.passableAccess}/${data.counts.access} verified access passable · ${data.counts.availableWater}/${data.counts.water} verified water available`} icon={Route} action={<OperationsDialog title="Create access or water point" action="Create"><OperationalFeatureCreate refresh={refresh} /></OperationsDialog>} /></div><div className="grid gap-0 xl:grid-cols-2"><section aria-labelledby="access-title" className="border-b border-primary/10 xl:border-b-0 xl:border-r"><h3 id="access-title" className="px-5 py-4 text-sm font-extrabold">Access</h3>{!access.length ? <EmptyPanel>No access features are recorded.</EmptyPanel> : <ul className="divide-y divide-primary/10">{access.map(item => <FeatureRow key={item.id} item={item} />)}</ul>}</section><section aria-labelledby="water-title"><h3 id="water-title" className="px-5 py-4 text-sm font-extrabold">Water</h3>{!water.length ? <EmptyPanel>No water features are recorded.</EmptyPanel> : <ul className="divide-y divide-primary/10">{water.map(item => <FeatureRow key={item.id} item={item} />)}</ul>}</section></div></section><section aria-label="Authority-designated locations" className={`${panelClass} mt-5 p-5`}><h2 className="font-extrabold">Authority-designated locations</h2><p className="mt-2 text-sm">Recorded locations are not guaranteed safe points. Current field or official-source conditions are required before operational use.</p>{!designated.length ? <EmptyPanel>No designated locations are recorded.</EmptyPanel> : <ul className="mt-4 divide-y">{designated.map(item => <FeatureRow key={item.id} item={item} />)}</ul>}</section><OperationsSnapshot data={data} /></>;
  }}</OperationsSectionPage></MasterDetail>;
}

function FeatureDetailContent({ item, updates, refresh }: { item: MonitoringFeature; updates: MonitoringOperationalUpdate[]; refresh: () => Promise<void> }) {
  const { state } = useLocation();
  const [editing, setEditing] = useState(state?.edit === true);
  const [draft, setDraft] = useState({ dirty: false, pending: false });
  return <div className="mt-7 space-y-5"><DraftGuard dirty={editing && draft.dirty} pending={draft.pending} dashboard />
    {!editing ? <><section className={`${panelClass} p-5 sm:p-6`}><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{item.name || "Unnamed operational feature"}</h2><StatusPill tone={item.authoritative ? "success" : "warning"}>{item.authoritative ? "Verified source" : "Not authoritative"}</StatusPill></div><p className="mt-2 text-sm text-muted-foreground">{item.kind.toLowerCase().replaceAll("_", " ")} · {item.provider}</p></div><Button type="button" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" />Edit condition</Button></header><div className="mt-6 border-t border-primary/10 pt-6"><Condition condition={item.latestCondition} /><Freshness observedAt={item.latestObservedAt} /></div><dl className="mt-6 grid gap-5 border-t border-primary/10 pt-6 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold text-muted-foreground">Latitude</dt><dd className="mt-1">{item.latitude.toFixed(6)}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Longitude</dt><dd className="mt-1">{item.longitude.toFixed(6)}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Provider</dt><dd className="mt-1">{item.provider}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Verified</dt><dd className="mt-1">{item.verifiedAt ? formatTime(item.verifiedAt) : "Not verified"}</dd></div></dl></section><ConditionHistory updates={updates} /></> : <section className={`${panelClass} p-5 sm:p-6`}><header><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary/70">Edit mode</p><h2 className="mt-2 text-xl font-extrabold">Record condition update</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">Feature metadata and coordinates remain read-only. This appends a timestamped operational observation.</p></header><div className="mt-6"><ConditionCreate subjectType="FEATURE" initialSubjectId={item.id} initialSubject={item} refresh={refresh} onDraft={setDraft} onSaved={() => setEditing(false)} /></div><div className="mt-5 flex justify-end border-t border-primary/10 pt-5"><Button type="button" variant="outline" disabled={draft.pending} onClick={() => setEditing(false)}>Cancel</Button></div></section>}
  </div>;
}

export function OperationsFeatureDetailPage() {
  const { user } = useMonitoringContext();
  const { id = "" } = useParams();
  const resource = useMonitoringFeature(user, id);
  const queryClient = useQueryClient();
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ["dashboard", user.id, user.role] }); };
  return <DetailDrawer title={resource.data?.item.name || "Access & Water detail"} closeTo="/monitoring/operations/access-water">{resource.failed && <section role="alert" className={`${panelClass} p-5 text-sm`}>Operational feature details could not refresh.<Button variant="outline" className="mt-4" onClick={resource.retry}>Retry</Button></section>}{resource.initialLoading && !resource.data && <OperationsDetailSkeleton label="Loading access and water details" />}{resource.data && <FeatureDetailContent key={`${resource.data.item.id}:${resource.data.item.latestObservedAt ?? "none"}`} item={resource.data.item} updates={resource.data.updates} refresh={refresh} />}</DetailDrawer>;
}
