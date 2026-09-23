import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Pencil } from "lucide-react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { DraftGuard } from "@/components/common";
import { Button, FieldSelect } from "@/components/ui";
import { useMonitoringAssignment, useMonitoringAssignments } from "@/hooks/dashboard";
import { formatTime } from "@/pages/dashboard/utils";
import type { MonitoringAssignment } from "@/types";
import { MasterDetail } from "./MonitoringComponents";
import { DetailDrawer } from "./MonitoringDetails";
import { useMonitoringContext } from "./MonitoringPage";
import { OperationsDetailSkeleton } from "./MonitoringSkeletons";
import { activeAssignments, AssignmentAction, AssignmentCreate, EmptyPanel, Freshness, InventoryHeader, OperationsDialog, OperationsSectionPage, OperationsSnapshot, control, panelClass, StatusPill } from "./OperationsShared";

export default function OperationsAssignmentsPage() {
  const { user } = useMonitoringContext();
  const resource = useMonitoringAssignments(user);
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const status = params.get("status") ?? "";
  const matches = (item: MonitoringAssignment) => (!status || item.status === status) && `${item.caseNumber} ${item.caseTitle} ${item.teamName} ${item.notes ?? ""}`.toLowerCase().includes(search.toLowerCase());
  return <MasterDetail user={user}><OperationsSectionPage title="Assignments" description="Assign available teams to cases and require a recorded field result before completion." resource={resource} section="assignments">{(data, refresh) => <>
    <section aria-labelledby="assignments-inventory-title" className={`overflow-hidden ${panelClass}`}>
      <div id="assignments-inventory-title"><InventoryHeader title="Assignments" detail={`${data.counts.activeAssignments} active assignments`} icon={ClipboardList} action={<fieldset disabled={resource.failed || resource.loading}><OperationsDialog title="Create assignment" action="Create"><AssignmentCreate operations={data} refresh={refresh} /></OperationsDialog></fieldset>} /></div>
      <div className="grid gap-4 border-b p-5 sm:grid-cols-2"><label htmlFor="assignment-filter" className="text-xs font-bold">Search case or team<input id="assignment-filter" type="search" value={search} onChange={event => setParams(current => { const next = new URLSearchParams(current); if (event.target.value) next.set("search", event.target.value); else next.delete("search"); return next; }, { replace: true })} className={control} /></label><label htmlFor="assignment-status-filter" className="text-xs font-bold">Status<FieldSelect id="assignment-status-filter" value={status} onValueChange={value => setParams(current => { const next = new URLSearchParams(current); if (value) next.set("status", value); else next.delete("status"); return next; }, { replace: true })} placeholder="All statuses" options={["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(value => ({ value, label: value.toLowerCase().replaceAll("_", " ") }))} /></label><Link to="/monitoring/operations/teams" className="text-sm font-bold text-primary underline">Teams and availability</Link></div>
      {!data.assignments.filter(matches).length ? <EmptyPanel>No matching assignments.</EmptyPanel> : <ul className="divide-y divide-primary/10">{data.assignments.filter(matches).map(item => <li key={item.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_0.8fr_auto]"><div><Link to={`/monitoring/cases/${encodeURIComponent(item.caseId)}`} className="font-extrabold text-primary underline">{item.caseNumber} · {item.caseTitle}</Link><p className="mt-1 text-xs">{item.caseVerification.toLowerCase().replaceAll("_", " ")} · {item.caseHandling.toLowerCase().replaceAll("_", " ")}</p><p className="mt-2 text-sm text-muted-foreground">{item.notes || "No task description"}</p></div><div><p className="font-bold">{item.teamName}</p><div className="mt-2"><StatusPill tone={activeAssignments.has(item.status) ? "info" : item.status === "COMPLETED" ? "success" : "neutral"}>{item.status.toLowerCase().replaceAll("_", " ")}</StatusPill></div><Freshness observedAt={null} updatedAt={item.updatedAt} /></div><Button asChild variant="outline" className="h-11 justify-self-start lg:justify-self-end"><Link to={`${encodeURIComponent(item.id)}${params.toString() ? `?${params}` : ""}`}>View details</Link></Button></li>)}</ul>}
    </section><OperationsSnapshot data={data} />
  </>}</OperationsSectionPage></MasterDetail>;
}

function AssignmentDetailContent({ user, item, refresh }: { user: ReturnType<typeof useMonitoringContext>["user"]; item: MonitoringAssignment; refresh: () => Promise<void> }) {
  const { state } = useLocation();
  const [editing, setEditing] = useState(state?.edit === true);
  const [draft, setDraft] = useState({ dirty: false, pending: false });
  const final = !["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(item.status) || item.caseHandling === "CLOSED";
  return <div className="mt-7 space-y-5"><DraftGuard dirty={editing && draft.dirty} pending={draft.pending} dashboard />
    {!editing ? <section className={`${panelClass} p-5 sm:p-6`}><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{item.caseNumber} · {item.teamName}</h2><StatusPill tone={activeAssignments.has(item.status) ? "info" : item.status === "COMPLETED" ? "success" : "neutral"}>{item.status.toLowerCase().replaceAll("_", " ")}</StatusPill></div><p className="mt-2 text-sm text-muted-foreground">{item.caseTitle}</p></div>{!final && <Button type="button" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" />Edit assignment</Button>}</header><dl className="mt-6 grid gap-5 border-t border-primary/10 pt-6 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold text-muted-foreground">Case</dt><dd className="mt-1"><Link className="font-bold text-primary underline" to={`/monitoring/cases/${encodeURIComponent(item.caseId)}`}>{item.caseNumber}</Link></dd></div><div><dt className="text-xs font-bold text-muted-foreground">Team</dt><dd className="mt-1 font-bold">{item.teamName}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Task description</dt><dd className="mt-1">{item.notes || "No task description"}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Record version</dt><dd className="mt-1 font-bold">{item.version}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Created</dt><dd className="mt-1">{formatTime(item.createdAt)}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Last updated</dt><dd className="mt-1">{formatTime(item.updatedAt)}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Accepted</dt><dd className="mt-1">{item.acceptedAt ? formatTime(item.acceptedAt) : "Not yet"}</dd></div><div><dt className="text-xs font-bold text-muted-foreground">Started</dt><dd className="mt-1">{item.startedAt ? formatTime(item.startedAt) : "Not yet"}</dd></div></dl>{item.result && <div className="mt-6 border-t border-primary/10 pt-5"><h3 className="font-extrabold">Latest field result</h3><p className="mt-2 text-sm">{item.result.findings.toLowerCase().replaceAll("_", " ")} · {formatTime(item.result.observedAt)}</p></div>}{final && <p className="mt-6 rounded-lg bg-secondary p-3 text-sm">This assignment is final or its case is closed, so it cannot be edited.</p>}</section> : <section className={`${panelClass} p-5 sm:p-6`}><header><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary/70">Edit mode</p><h2 className="mt-2 text-xl font-extrabold">Update assignment status</h2><p className="mt-2 text-xs text-muted-foreground">Case, team, and task description remain read-only. Only the next permitted status can be recorded.</p></header><div className="mt-6"><AssignmentAction user={user} item={item} refresh={refresh} onDraft={setDraft} onSaved={() => setEditing(false)} /></div><div className="mt-5 flex justify-end border-t border-primary/10 pt-5"><Button type="button" variant="outline" disabled={draft.pending} onClick={() => setEditing(false)}>Cancel</Button></div></section>}
  </div>;
}

export function OperationsAssignmentDetailPage() {
  const { user } = useMonitoringContext();
  const { id = "" } = useParams();
  const resource = useMonitoringAssignment(user, id);
  const queryClient = useQueryClient();
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ["dashboard", user.id, user.role] }); };
  return <DetailDrawer title={resource.data ? `${resource.data.caseNumber} · ${resource.data.teamName}` : "Assignment detail"} closeTo="/monitoring/operations/assignments">{resource.failed && <section role="alert" className={`${panelClass} p-5 text-sm`}>Assignment details could not refresh.<Button variant="outline" className="mt-4" onClick={resource.retry}>Retry</Button></section>}{resource.initialLoading && !resource.data && <OperationsDetailSkeleton label="Loading assignment details" />}{resource.data && <AssignmentDetailContent key={`${resource.data.id}:${resource.data.version}:${resource.data.updatedAt}`} user={user} item={resource.data} refresh={refresh} />}</DetailDrawer>;
}
