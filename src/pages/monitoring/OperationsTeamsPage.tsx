import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Save, UsersRound } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { updateMonitoringTeam } from "@/api/dashboard";
import { DraftGuard } from "@/components/common";
import { Button } from "@/components/ui";
import { useMonitoringTeam, useMonitoringTeams } from "@/hooks/dashboard";
import { formatTime } from "@/pages/dashboard/utils";
import type { MonitoringOperations } from "@/types";
import { MasterDetail } from "./MonitoringComponents";
import { DetailDrawer } from "./MonitoringDetails";
import { useMonitoringContext } from "./MonitoringPage";
import { OperationsDetailSkeleton } from "./MonitoringSkeletons";
import { Condition, ConditionCreate, ConditionHistory, EmptyPanel, Freshness, InventoryHeader, OperationsDialog, OperationsSectionPage, OperationsSnapshot, control, panelClass, StatusPill, TeamCreate } from "./OperationsShared";

function TeamPerformance({ item }: { item: MonitoringOperations["teams"][number] }) {
  return <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Assignments</dt><dd className="font-extrabold">{item.performance.totalAssignments}</dd></div><div><dt className="text-xs text-muted-foreground">Completed</dt><dd className="font-extrabold">{item.performance.completedAssignments}</dd></div><div><dt className="text-xs text-muted-foreground">Cancelled</dt><dd className="font-extrabold">{item.performance.cancelledAssignments}</dd></div><div><dt className="text-xs text-muted-foreground">Field results</dt><dd className="font-extrabold">{item.performance.fieldResults}</dd></div><div className="col-span-2"><dt className="text-xs text-muted-foreground">Average field completion</dt><dd className="font-extrabold">{item.performance.averageCompletionMinutes === null ? "Not enough timestamped results" : `${item.performance.averageCompletionMinutes} minutes`}</dd></div></dl>;
}

export default function OperationsTeamsPage() {
  const { user } = useMonitoringContext();
  const resource = useMonitoringTeams(user);
  return <MasterDetail user={user}><OperationsSectionPage title="Teams" description="Manage real response teams, availability, and assignment performance." resource={resource} section="teams">{(data, refresh) => <>
    <section aria-labelledby="teams-inventory-title" className={`overflow-hidden ${panelClass}`}>
      <div id="teams-inventory-title"><InventoryHeader title="Teams" detail={`${data.counts.teams} teams · ${data.counts.availableTeams} currently available`} icon={UsersRound} action={<OperationsDialog title="Create team" action="Create"><TeamCreate refresh={refresh} /></OperationsDialog>} /></div>
      {!data.teams.length ? <EmptyPanel>No production teams are recorded.</EmptyPanel> : <ul className="divide-y divide-primary/10">{data.teams.map(item => <li key={item.id} className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr_auto]">
        <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{item.name}</h3><StatusPill tone={item.active ? "success" : "neutral"}>{item.active ? "Active" : "Inactive"}</StatusPill></div><p className="mt-1 text-sm text-muted-foreground">{item.organization || "No organization"}</p><div className="mt-3"><Condition condition={item.latestCondition} /></div><Freshness observedAt={item.latestObservedAt} updatedAt={item.updatedAt} /></div>
        <TeamPerformance item={item} />
        <div><Button asChild variant="outline"><Link to={encodeURIComponent(item.id)}>View details</Link></Button></div>
      </li>)}</ul>}
    </section>
    <OperationsSnapshot data={data} />
  </>}</OperationsSectionPage></MasterDetail>;
}

function TeamDetailContent({ item, updates, refresh }: { item: MonitoringOperations["teams"][number]; updates: MonitoringOperations["updates"]; refresh: () => Promise<void> }) {
  const { state } = useLocation();
  const [editing, setEditing] = useState(state?.edit === true);
  const [conditionDraft, setConditionDraft] = useState({ dirty: false, pending: false });
  const [name, setName] = useState(item.name);
  const [organization, setOrganization] = useState(item.organization ?? "");
  const [active, setActive] = useState(item.active);
  const [reason, setReason] = useState("");
  const changed = name.trim() !== item.name || organization.trim() !== (item.organization ?? "") || active !== item.active;
  const dirty = editing && (changed || !!reason);
  const mutation = useMutation({
    mutationFn: () => updateMonitoringTeam(item.id, { version: item.version, ...(name.trim() !== item.name ? { name: name.trim() } : {}), ...(organization.trim() !== (item.organization ?? "") ? { organization: organization.trim() || null } : {}), ...(active !== item.active ? { active } : {}), reason: reason.trim() }),
    onSuccess: async () => { setReason(""); setEditing(false); await refresh(); },
  });
  function reset() {
    setName(item.name);
    setOrganization(item.organization ?? "");
    setActive(item.active);
    setReason("");
    mutation.reset();
  }
  return <div className="mt-7 space-y-5"><DraftGuard dirty={dirty || conditionDraft.dirty} pending={mutation.isPending || conditionDraft.pending} dashboard />
    {!editing ? <>
      <section className={`${panelClass} p-5 sm:p-6`}>
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{item.name}</h2><StatusPill tone={item.active ? "success" : "danger"}>{item.active ? "Active" : "Inactive"}</StatusPill></div><p className="mt-2 text-sm text-muted-foreground">{item.organization || "No organization recorded"}</p></div><Button type="button" onClick={() => { reset(); setEditing(true); }}><Pencil size={16} aria-hidden="true" />Edit team</Button></header>
        <div className="mt-6 border-t border-primary/10 pt-6"><Condition condition={item.latestCondition} /><Freshness observedAt={item.latestObservedAt} updatedAt={item.updatedAt} /></div>
        <dl className="mt-6 grid gap-5 border-t border-primary/10 pt-6 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold text-muted-foreground">Created</dt><dd className="mt-1">{formatTime(item.createdAt)}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Last updated</dt><dd className="mt-1">{formatTime(item.updatedAt)}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Active assignments</dt><dd className="mt-1 font-extrabold">{item.activeAssignmentCount}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Record version</dt><dd className="mt-1 font-extrabold">{item.version}</dd></div></dl>
      </section>
      <section className={`${panelClass} p-5 sm:p-6`}><header className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-extrabold">Assignment performance</h2><p className="mt-1 text-xs text-muted-foreground">Recorded outcomes for this response team.</p></div></header><div className="mt-5"><TeamPerformance item={item} /></div></section>
             <ConditionHistory updates={updates} />
    </> : <div className="space-y-5"><section className={`${panelClass} p-5 sm:p-6`}>
      <header><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary/70">Edit mode</p><h2 className="mt-2 text-xl font-extrabold">Edit team details</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">Changes are audited. Deactivation is blocked while this team has active assignments.</p></header>
      <form className="mt-6 space-y-5" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
        <fieldset disabled={mutation.isPending} className="space-y-5" aria-busy={mutation.isPending}>
          <div className="grid gap-5 sm:grid-cols-2"><label htmlFor="monitoring-team-name" className="block text-sm font-bold">Team name<input id="monitoring-team-name" required aria-required="true" minLength={2} maxLength={200} value={name} onChange={event => { setName(event.target.value); mutation.reset(); }} className={control} /></label><label htmlFor="monitoring-team-organization" className="block text-sm font-bold">Organization<input id="monitoring-team-organization" maxLength={200} value={organization} onChange={event => { setOrganization(event.target.value); mutation.reset(); }} className={control} /></label></div>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-input px-3 text-sm font-bold"><input type="checkbox" checked={active} onChange={event => { setActive(event.target.checked); mutation.reset(); }} />Active team</label>
          <label htmlFor="monitoring-team-reason" className="block text-sm font-bold">Audit reason<textarea id="monitoring-team-reason" required aria-required="true" minLength={5} maxLength={2000} value={reason} onChange={event => { setReason(event.target.value); mutation.reset(); }} className={`${control} min-h-24 py-3`} /><span className="mt-2 block text-xs font-normal text-muted-foreground">Required for every saved change.</span></label>
        </fieldset>
        {mutation.error && <p role="alert" className="text-sm text-red-800">{mutation.error.message}</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-primary/10 pt-5"><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { reset(); setEditing(false); }}>Cancel</Button><Button type="submit" disabled={mutation.isPending || conditionDraft.dirty || !changed || name.trim().length < 2 || reason.trim().length < 5}><Save size={16} aria-hidden="true" />{mutation.isPending ? "Saving…" : "Save team"}</Button></div>
       </form>
    </section><section className={`${panelClass} p-5 sm:p-6`}><ConditionCreate subjectType="TEAM" initialSubjectId={item.id} initialSubject={item} refresh={refresh} onDraft={setConditionDraft} /></section></div>}
  </div>;
}

export function OperationsTeamDetailPage() {
  const { user } = useMonitoringContext();
  const { id = "" } = useParams();
  const resource = useMonitoringTeam(user, id);
  const queryClient = useQueryClient();
  const item = resource.data?.item;
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ["dashboard", user.id, user.role] }); };
  return <DetailDrawer title={item?.name ?? "Team detail"} closeTo="/monitoring/operations/teams">
    {resource.failed && <section role="alert" className={`${panelClass} p-5 text-sm`}>Team details could not refresh.<Button type="button" variant="outline" className="mt-4" disabled={resource.loading} onClick={resource.retry}>Retry</Button></section>}
    {resource.initialLoading && !resource.data && <OperationsDetailSkeleton label="Loading team details" />}
    {resource.data && !item && <section className={panelClass}><EmptyPanel>Team record was not found.</EmptyPanel></section>}
    {resource.data && item && <TeamDetailContent key={`${item.id}:${item.version}:${item.updatedAt}`} item={item} updates={resource.data.updates} refresh={refresh} />}
  </DetailDrawer>;
}
