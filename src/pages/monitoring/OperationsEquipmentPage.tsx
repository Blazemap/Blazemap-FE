import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Save } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { updateMonitoringEquipment } from "@/api/dashboard";
import { DraftGuard } from "@/components/common";
import { Button, FieldSelect } from "@/components/ui";
import { useMonitoringEquipment, useMonitoringEquipmentDetail } from "@/hooks/dashboard";
import { formatTime } from "@/pages/dashboard/utils";
import type { MonitoringEquipment, MonitoringOperationalUpdate } from "@/types";
import { MasterDetail } from "./MonitoringComponents";
import { DetailDrawer } from "./MonitoringDetails";
import { useMonitoringContext } from "./MonitoringPage";
import { OperationsDetailSkeleton } from "./MonitoringSkeletons";
import { Condition, ConditionCreate, ConditionHistory, EmptyPanel, EquipmentCreate, Freshness, InventoryHeader, OperationsDialog, OperationsSectionPage, OperationsSnapshot, control, panelClass, StatusPill } from "./OperationsShared";

export default function OperationsEquipmentPage() {
  const { user } = useMonitoringContext();
  const resource = useMonitoringEquipment(user);
  return <MasterDetail user={user}><OperationsSectionPage title="Equipment" description="Track equipment ownership, current condition, and the active case using its owning team." resource={resource} section="equipment">{(data, refresh) => <>
    <section aria-labelledby="equipment-inventory-title" className={`overflow-hidden ${panelClass}`}>
      <div id="equipment-inventory-title"><InventoryHeader title="Equipment" detail={`${data.counts.equipment} records · ${data.counts.availableEquipment} currently available`} icon={Package} action={<OperationsDialog title="Create equipment" action="Create"><EquipmentCreate teams={data.teams} refresh={refresh} /></OperationsDialog>} /></div>
      {!data.equipment.length ? <EmptyPanel>No production equipment is recorded.</EmptyPanel> : <ul className="divide-y divide-primary/10">{data.equipment.map(item => {
        const team = data.teams.find(value => value.id === item.teamId);
        return <li key={item.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{item.name}</h3><StatusPill tone={item.active ? "success" : "neutral"}>{item.active ? "Active" : "Inactive"}</StatusPill></div><p className="mt-1 text-sm">{item.kind}</p><p className="mt-1 text-xs text-muted-foreground">Owner: {team?.name ?? "Shared inventory"}</p></div><div><Condition condition={item.latestCondition} /><Freshness observedAt={item.latestObservedAt} updatedAt={item.updatedAt} />{item.currentAssignment ? <p className="mt-3 text-sm"><strong>Currently used by:</strong> <Link className="text-primary underline" to={`/monitoring/cases/${encodeURIComponent(item.currentAssignment.caseId)}`}>{item.currentAssignment.caseNumber} · {item.currentAssignment.caseTitle}</Link></p> : <p className="mt-3 text-sm text-muted-foreground">No active case use recorded.</p>}</div><Button asChild variant="outline" className="self-start"><Link to={encodeURIComponent(item.id)}>View details</Link></Button></li>;
      })}</ul>}
    </section>
    <OperationsSnapshot data={data} />
  </>}</OperationsSectionPage></MasterDetail>;
}

function EquipmentDetailContent({ item, teams, updates, refresh }: { item: MonitoringEquipment; teams: { id: string; name: string; active: boolean }[]; updates: MonitoringOperationalUpdate[]; refresh: () => Promise<void> }) {
  const { state } = useLocation();
  const [editing, setEditing] = useState(state?.edit === true);
  const [name, setName] = useState(item.name);
  const [kind, setKind] = useState(item.kind);
  const [teamId, setTeamId] = useState(item.teamId ?? "");
  const [active, setActive] = useState(item.active);
  const [reason, setReason] = useState("");
  const [conditionDraft, setConditionDraft] = useState({ dirty: false, pending: false });
  const owner = teams.find(team => team.id === item.teamId);
  const changed = name.trim() !== item.name || kind.trim() !== item.kind || teamId !== (item.teamId ?? "") || active !== item.active;
  const mutation = useMutation({ mutationFn: () => updateMonitoringEquipment(item.id, { version: item.version, ...(name.trim() !== item.name ? { name: name.trim() } : {}), ...(kind.trim() !== item.kind ? { kind: kind.trim() } : {}), ...(teamId !== (item.teamId ?? "") ? { teamId: teamId || null } : {}), ...(active !== item.active ? { active } : {}), reason: reason.trim() }), onSuccess: async () => { setReason(""); setEditing(false); await refresh(); } });
  function reset() { setName(item.name); setKind(item.kind); setTeamId(item.teamId ?? ""); setActive(item.active); setReason(""); mutation.reset(); }
  const dirty = editing && (changed || !!reason || conditionDraft.dirty);
  const pending = mutation.isPending || conditionDraft.pending;
  return <div className="mt-7 space-y-5"><DraftGuard dirty={dirty} pending={pending} dashboard />
    {!editing ? <><section className={`${panelClass} p-5 sm:p-6`}><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{item.name}</h2><StatusPill tone={item.active ? "success" : "danger"}>{item.active ? "Active" : "Inactive"}</StatusPill></div><p className="mt-2 text-sm text-muted-foreground">{item.kind} · {owner?.name ?? "Shared inventory"}</p></div><Button type="button" onClick={() => { reset(); setEditing(true); }}><Pencil size={16} aria-hidden="true" />Edit equipment</Button></header><div className="mt-6 border-t border-primary/10 pt-6"><Condition condition={item.latestCondition} /><Freshness observedAt={item.latestObservedAt} updatedAt={item.updatedAt} /></div><dl className="mt-6 grid gap-5 border-t border-primary/10 pt-6 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold text-muted-foreground">Created</dt><dd className="mt-1">{formatTime(item.createdAt)}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Record version</dt><dd className="mt-1 font-extrabold">{item.version}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Current assignment</dt><dd className="mt-1">{item.currentAssignment ? <Link className="font-bold text-primary underline" to={`/monitoring/cases/${encodeURIComponent(item.currentAssignment.caseId)}`}>{item.currentAssignment.caseNumber} · {item.currentAssignment.caseTitle}</Link> : "None"}</dd></div></dl></section><ConditionHistory updates={updates} /></> : <div className="space-y-5"><section className={`${panelClass} p-5 sm:p-6`}><header><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary/70">Edit mode</p><h2 className="mt-2 text-xl font-extrabold">Edit equipment details</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">Metadata and activation changes are versioned and audited.</p></header><form className="mt-6 space-y-5" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}><fieldset disabled={pending} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label htmlFor="equipment-detail-name" className="text-sm font-bold">Name<input id="equipment-detail-name" required minLength={2} maxLength={200} value={name} onChange={event => setName(event.target.value)} className={control} /></label><label htmlFor="equipment-detail-kind" className="text-sm font-bold">Type<input id="equipment-detail-kind" required minLength={2} maxLength={100} value={kind} onChange={event => setKind(event.target.value)} className={control} /></label><label htmlFor="equipment-detail-team" className="text-sm font-bold">Owning team<FieldSelect id="equipment-detail-team" value={teamId} onValueChange={setTeamId} placeholder="Shared inventory" options={teams.map(team => ({ value: team.id, label: team.name, disabled: !team.active }))} /></label><label className="mt-2 flex min-h-11 items-center gap-3 rounded-lg border border-input px-3 text-sm font-bold sm:self-end"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />Active equipment</label></div><label htmlFor="equipment-detail-reason" className="block text-sm font-bold">Audit reason<textarea id="equipment-detail-reason" required minLength={5} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className={`${control} min-h-24 py-3`} /></label></fieldset>{mutation.error && <p role="alert" className="text-sm text-red-800">{mutation.error.message}</p>}<div className="flex justify-end gap-3 border-t border-primary/10 pt-5"><Button type="button" variant="outline" disabled={pending} onClick={() => { reset(); setEditing(false); }}>Cancel</Button><Button disabled={pending || conditionDraft.dirty || !changed || name.trim().length < 2 || kind.trim().length < 2 || reason.trim().length < 5}><Save size={16} aria-hidden="true" />{mutation.isPending ? "Saving…" : "Save equipment"}</Button></div></form></section><section className={`${panelClass} p-5 sm:p-6`}><ConditionCreate subjectType="EQUIPMENT" initialSubjectId={item.id} initialSubject={item} refresh={refresh} onDraft={setConditionDraft} /></section></div>}
  </div>;
}

export function OperationsEquipmentDetailPage() {
  const { user } = useMonitoringContext();
  const { id = "" } = useParams();
  const resource = useMonitoringEquipmentDetail(user, id);
  const queryClient = useQueryClient();
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ["dashboard", user.id, user.role] }); };
  return <DetailDrawer title={resource.data?.item.name ?? "Equipment detail"} closeTo="/monitoring/operations/equipment">{resource.failed && <section role="alert" className={`${panelClass} p-5 text-sm`}>Equipment details could not refresh.<Button variant="outline" className="mt-4" onClick={resource.retry}>Retry</Button></section>}{resource.initialLoading && !resource.data && <OperationsDetailSkeleton label="Loading equipment details" />}{resource.data && <EquipmentDetailContent key={`${resource.data.item.id}:${resource.data.item.version}:${resource.data.item.updatedAt}`} item={resource.data.item} teams={resource.data.teams} updates={resource.data.updates} refresh={refresh} />}</DetailDrawer>;
}
