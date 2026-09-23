import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { useMonitoringAssignments } from "@/hooks/dashboard";
import { assignmentActionLabel, eligibleTeams } from "@/lib/assignments";
import type { DashboardUser } from "@/types";
import type { CaseDetail } from "@/types/government";
import { AssignmentAction, AssignmentForm, OperationsDialog, StatusPill } from "@/pages/monitoring/OperationsShared";
import { AssignmentFormSkeleton } from "@/pages/monitoring/MonitoringSkeletons";

type Draft = { dirty: boolean; pending: boolean };
export default function CaseAssignments({ user, detail, disabled = false, onDraft }: { user: DashboardUser; detail: CaseDetail; disabled?: boolean; onDraft?: (state: Draft) => void }) {
  const resource = useMonitoringAssignments(user);
  const client = useQueryClient();
  const [formDraft, setFormDraft] = useState<Draft>({ dirty: false, pending: false });
  useEffect(() => { onDraft?.(formDraft); }, [formDraft, onDraft]);
  useEffect(() => () => onDraft?.({ dirty: false, pending: false }), [onDraft]);
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["dashboard", user.id, user.role] }); };
  const assignments = resource.data?.assignments.filter(item => item.caseId === detail.id) ?? [];
  const availableTeams = resource.data ? eligibleTeams(resource.data.teams) : [];
  return <section aria-label="Case assignments" className="my-5 space-y-4 border-t border-primary/10 pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-extrabold">Assignments</h3>{resource.data && availableTeams.length > 0 && <OperationsDialog title={`${assignmentActionLabel(assignments.length)} — ${detail.number}`} action="Create" triggerLabel={assignmentActionLabel(assignments.length)} disabled={disabled || resource.failed || formDraft.pending || detail.handling === "CLOSED" || detail.verification === "NOT_FIRE"}>{close => <AssignmentForm user={user} detail={detail} operations={resource.data!} refresh={refresh} disabled={disabled || resource.failed || resource.loading} onDraft={setFormDraft} onSaved={close} />}</OperationsDialog>}</div>
    {resource.failed && <div role="alert"><p>Assignments could not refresh. Refresh before making changes.</p><Button type="button" variant="outline" onClick={resource.retry}>Refresh assignments</Button></div>}
    {resource.initialLoading ? <AssignmentFormSkeleton /> : resource.data && <>
      {availableTeams.length === 0 && detail.handling !== "CLOSED" && detail.verification !== "NOT_FIRE" && <div role="status" className="rounded-lg border border-dashed border-primary/20 bg-secondary/20 p-4 text-sm"><p className="font-bold">No available teams to assign.</p><p className="mt-2 text-muted-foreground">A team needs a current AVAILABLE update, no active assignment, and an active non-sample record. Open Teams, choose a real active team, and record an AVAILABLE observation. Then refresh this panel.</p><Button type="button" variant="outline" className="mt-3" disabled={resource.loading} onClick={resource.retry}>Refresh teams</Button></div>}
      {!assignments.length && <p className="rounded-lg border border-dashed border-primary/15 bg-secondary/20 px-4 py-5 text-center text-sm text-muted-foreground">No team assigned yet.</p>}
       <ul className="space-y-4">{assignments.map(item => <li key={item.id} className="rounded-lg border border-primary/15 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold">{item.teamName}</p><div className="mt-1"><StatusPill>{item.status.toLowerCase().replaceAll("_", " ")}</StatusPill></div></div>{["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(item.status) && detail.handling !== "CLOSED" && <OperationsDialog title={`Update ${item.teamName} assignment`} action="Edit" triggerLabel={item.status === "ASSIGNED" ? "Accept assignment" : item.status === "ACCEPTED" ? "Start field work" : "Update assignment"} disabled={disabled || resource.failed || formDraft.pending}>{close => <AssignmentAction key={`${item.id}:${item.version}`} user={user} item={item} refresh={refresh} initialStatus={item.status === "ASSIGNED" ? "ACCEPTED" : item.status === "ACCEPTED" ? "IN_PROGRESS" : ""} onDraft={setFormDraft} onSaved={close} />}</OperationsDialog>}</div><p className="mt-3 text-sm leading-5">{item.notes || "No task description recorded"}</p>{item.status === "IN_PROGRESS" && !item.result && <p className="mt-2 text-xs text-muted-foreground">Record the team's field observation below before completing this assignment.</p>}{item.result && <p className="mt-2 text-xs text-muted-foreground">Field result: {item.result.findings.toLowerCase().replaceAll("_", " ")}</p>}</li>)}</ul>
    </>}
    <Link to="/monitoring/operations/teams" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4">{availableTeams.length ? "Teams and availability" : "Record team availability in Teams"}</Link>
  </section>;
}
