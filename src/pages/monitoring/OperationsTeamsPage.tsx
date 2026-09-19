import { UsersRound } from "lucide-react";
import { useMonitoringTeams } from "@/hooks/dashboard";
import { useMonitoringContext } from "./MonitoringPage";
import { ActiveAction, Condition, ConditionCreate, EmptyPanel, Freshness, InventoryHeader, OperationsDialog, OperationsSectionPage, OperationsSnapshot, panelClass, StatusPill, TeamCreate } from "./OperationsShared";

export default function OperationsTeamsPage() {
  const { user } = useMonitoringContext();
  const resource = useMonitoringTeams(user);
  return <OperationsSectionPage title="Teams" description="Manage response teams and explicit, time-stamped availability updates." icon={UsersRound} resource={resource} section="teams">{(data, refresh) => <>
    <section aria-labelledby="teams-inventory-title" className={`overflow-hidden ${panelClass}`}>
      <div id="teams-inventory-title"><InventoryHeader title="Teams inventory" detail={`${data.counts.teams} total · ${data.counts.availableTeams} currently available, excluding sample records`} icon={UsersRound} action={<OperationsDialog title="Create team" action="Create"><TeamCreate refresh={refresh} /></OperationsDialog>} /></div>
      {!data.teams.length ? <EmptyPanel>No teams are recorded.</EmptyPanel> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-secondary/45 text-xs text-muted-foreground"><tr><th scope="col" className="px-5 py-3">Team</th><th scope="col" className="px-4 py-3">Condition</th><th scope="col" className="px-4 py-3">Freshness</th><th scope="col" className="px-4 py-3">State</th><th scope="col" className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-primary/10">{data.teams.map(item => <tr key={item.id}><td className="px-5 py-4"><p className="font-extrabold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.organization || "No organization"}</p></td><td className="px-4 py-4"><Condition condition={item.latestCondition} sample={item.sample} /></td><td className="px-4 py-4"><Freshness observedAt={item.latestObservedAt} updatedAt={item.updatedAt} /></td><td className="px-4 py-4"><StatusPill tone={item.active ? "success" : "neutral"}>{item.active ? "Active" : "Inactive"}</StatusPill></td><td className="px-5 py-4"><OperationsDialog title={`Edit team: ${item.name}`} action="Edit"><ConditionCreate operations={data} subjectType="TEAM" initialSubjectId={item.id} refresh={refresh} />{item.sample ? <p className="text-xs text-muted-foreground">Sample team details are read-only.</p> : <ActiveAction kind="team" id={item.id} version={item.version} active={item.active} refresh={refresh} />}</OperationsDialog></td></tr>)}</tbody></table></div>}
    </section>
    <OperationsSnapshot data={data} />
  </>}</OperationsSectionPage>;
}
