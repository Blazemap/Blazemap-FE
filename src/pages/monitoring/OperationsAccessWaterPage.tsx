import { Route } from "lucide-react";
import { useMonitoringAccessWater } from "@/hooks/dashboard";
import { useMonitoringContext } from "./MonitoringPage";
import { Condition, ConditionCreate, EmptyPanel, Freshness, InventoryHeader, OperationsDialog, OperationsSectionPage, OperationsSnapshot, panelClass } from "./OperationsShared";

export default function OperationsAccessWaterPage() {
  const { user } = useMonitoringContext();
  const resource = useMonitoringAccessWater(user);
  return <OperationsSectionPage title="Access & Water" description="Review verified route and water-source conditions without inferred availability." icon={Route} resource={resource} section="access-water">{(data, refresh) => {
    const access = data.features.filter(item => item.kind === "ROAD");
    const water = data.features.filter(item => item.kind !== "ROAD");
    return <>
      <section aria-labelledby="access-water-inventory-title" className={`overflow-hidden ${panelClass}`}>
        <div id="access-water-inventory-title"><InventoryHeader title="Access and water inventory" detail={`${data.counts.passableAccess}/${data.counts.access} verified access passable · ${data.counts.availableWater}/${data.counts.water} verified water available`} icon={Route} action={<OperationsDialog title="Create condition update" action="Create"><ConditionCreate operations={data} subjectType="FEATURE" refresh={refresh} /></OperationsDialog>} /></div>
        <div className="grid gap-0 xl:grid-cols-2">
          <section aria-labelledby="access-title" className="border-b border-primary/10 xl:border-b-0 xl:border-r"><h3 id="access-title" className="px-5 py-4 text-sm font-extrabold">Access</h3>{!access.length ? <EmptyPanel>No access features are recorded.</EmptyPanel> : <ul className="divide-y divide-primary/10">{access.map(item => <li key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-extrabold">{item.name || "Unnamed access"}</p><p className="mt-1 text-xs text-muted-foreground">{item.provider} · {item.authoritative ? "Verified source" : "Not authoritative for routing"}</p><div className="mt-2"><Condition condition={item.latestCondition} sample={item.sample} /></div></div><div className="space-y-3"><Freshness observedAt={item.latestObservedAt} /><OperationsDialog title={`Edit condition: ${item.name || item.id}`} action="Edit"><ConditionCreate operations={data} subjectType="FEATURE" initialSubjectId={item.id} refresh={refresh} /></OperationsDialog></div></li>)}</ul>}</section>
          <section aria-labelledby="water-title"><h3 id="water-title" className="px-5 py-4 text-sm font-extrabold">Water</h3>{!water.length ? <EmptyPanel>No water features are recorded.</EmptyPanel> : <ul className="divide-y divide-primary/10">{water.map(item => <li key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]"><div><p className="font-extrabold">{item.name || "Unnamed water source"}</p><p className="mt-1 text-xs text-muted-foreground">{item.provider} · {item.authoritative ? "Verified source" : "Not authoritative for operational use"}</p><div className="mt-2"><Condition condition={item.latestCondition} sample={item.sample} /></div></div><div className="space-y-3"><Freshness observedAt={item.latestObservedAt} /><OperationsDialog title={`Edit condition: ${item.name || item.id}`} action="Edit"><ConditionCreate operations={data} subjectType="FEATURE" initialSubjectId={item.id} refresh={refresh} /></OperationsDialog></div></li>)}</ul>}</section>
        </div>
      </section>
      <OperationsSnapshot data={data} />
    </>;
  }}</OperationsSectionPage>;
}
