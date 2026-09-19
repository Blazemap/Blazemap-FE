import { Package } from "lucide-react";
import { useMonitoringEquipment } from "@/hooks/dashboard";
import { useMonitoringContext } from "./MonitoringPage";
import { ActiveAction, Condition, ConditionCreate, EmptyPanel, EquipmentCreate, Freshness, InventoryHeader, OperationsDialog, OperationsSectionPage, OperationsSnapshot, panelClass, StatusPill } from "./OperationsShared";

export default function OperationsEquipmentPage() {
  const { user } = useMonitoringContext();
  const resource = useMonitoringEquipment(user);
  return <OperationsSectionPage title="Equipment" description="Maintain equipment inventory, team ownership, and explicit operational condition." icon={Package} resource={resource} section="equipment">{(data, refresh) => <>
    <section aria-labelledby="equipment-inventory-title" className={`overflow-hidden ${panelClass}`}>
      <div id="equipment-inventory-title"><InventoryHeader title="Equipment inventory" detail={`${data.counts.equipment} total · ${data.counts.availableEquipment} currently available, excluding sample records`} icon={Package} action={<OperationsDialog title="Create equipment" action="Create"><EquipmentCreate teams={data.teams} refresh={refresh} /></OperationsDialog>} /></div>
      {!data.equipment.length ? <EmptyPanel>No equipment is recorded.</EmptyPanel> : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-secondary/45 text-xs text-muted-foreground"><tr><th scope="col" className="px-5 py-3">Equipment</th><th scope="col" className="px-4 py-3">Condition</th><th scope="col" className="px-4 py-3">Freshness</th><th scope="col" className="px-4 py-3">State</th><th scope="col" className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-primary/10">{data.equipment.map(item => <tr key={item.id}><td className="px-5 py-4"><p className="font-extrabold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.kind}{item.teamId ? ` · ${data.teams.find(team => team.id === item.teamId)?.name ?? "Assigned team"}` : " · Shared inventory"}</p></td><td className="px-4 py-4"><Condition condition={item.latestCondition} sample={item.sample} /></td><td className="px-4 py-4"><Freshness observedAt={item.latestObservedAt} updatedAt={item.updatedAt} /></td><td className="px-4 py-4"><StatusPill tone={item.active ? "success" : "neutral"}>{item.active ? "Active" : "Inactive"}</StatusPill></td><td className="px-5 py-4"><OperationsDialog title={`Edit equipment: ${item.name}`} action="Edit"><ConditionCreate operations={data} subjectType="EQUIPMENT" initialSubjectId={item.id} refresh={refresh} />{item.sample ? <p className="text-xs text-muted-foreground">Sample equipment details are read-only.</p> : <ActiveAction kind="equipment" id={item.id} version={item.version} active={item.active} refresh={refresh} />}</OperationsDialog></td></tr>)}</tbody></table></div>}
    </section>
    <OperationsSnapshot data={data} />
  </>}</OperationsSectionPage>;
}
