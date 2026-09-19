import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { useMonitoringAssignments } from "@/hooks/dashboard";
import type { DashboardUser, MonitoringOperations } from "@/types";
import type { CaseDetail } from "@/types/government";
import { AssignmentAction, AssignmentForm, Freshness, StatusPill } from "@/pages/monitoring/OperationsShared";
import { AssignmentFormSkeleton } from "@/pages/monitoring/MonitoringSkeletons";

type Draft = { dirty: boolean; pending: boolean };
function CaseAssignmentAction({ user, item, refresh, register }: { user: DashboardUser; item: MonitoringOperations["assignments"][number]; refresh: () => Promise<void>; register: (id: string, state: Draft | null) => void }) {
  const onDraft = useCallback((state: Draft) => register(item.id, state), [register, item.id]);
  useEffect(() => () => register(item.id, null), [register, item.id]);
  return <AssignmentAction user={user} item={item} refresh={refresh} onDraft={onDraft} />;
}
export default function CaseAssignments({ user, detail, disabled = false, onDraft }: { user: DashboardUser; detail: CaseDetail; disabled?: boolean; onDraft?: (state: Draft) => void }) {
  const resource = useMonitoringAssignments(user);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const register = useCallback((id: string, state: Draft | null) => setDrafts(current => { const next = { ...current }; if (state) next[id] = state; else delete next[id]; return next; }), []);
  const setFormDraft = useCallback((value: Draft) => setDrafts(current => ({ ...current, form: value })), []);
  const dirty = Object.values(drafts).some(value => value.dirty);
  const pending = Object.values(drafts).some(value => value.pending);
  useEffect(() => { onDraft?.({ dirty, pending }); }, [dirty, pending, onDraft]);
  useEffect(() => () => onDraft?.({ dirty: false, pending: false }), [onDraft]);
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["dashboard", user.id, user.role] }); };
  const assignments = resource.data?.assignments.filter(item => item.caseId === detail.id) ?? [];
  return <section aria-label="Case assignments" className="my-5 space-y-4 border-t border-primary/10 pt-5"><h3 className="font-extrabold">Assignments</h3><Link to="/monitoring/operations/teams" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline">Teams and availability</Link>{resource.failed && <div role="alert"><p>Assignments could not refresh. Refresh before making changes.</p><Button variant="outline" onClick={resource.retry}>Refresh assignments</Button></div>}{resource.initialLoading ? <AssignmentFormSkeleton /> : resource.data && <><Button type="button" aria-expanded={open} disabled={disabled || resource.failed || pending || detail.handling === "CLOSED" || detail.verification === "NOT_FIRE"} onClick={() => setOpen(true)}>Assign team</Button>{open && <AssignmentForm user={user} detail={detail} operations={resource.data} refresh={refresh} disabled={disabled || resource.failed || resource.loading} onDraft={setFormDraft} />}{!assignments.length && <p className="text-sm text-muted-foreground">No teams assigned to this case.</p>}<ul className="space-y-4">{assignments.map(item => <li key={item.id} className="space-y-3 rounded-lg border border-primary/15 p-3"><p className="font-bold">{item.teamName}</p><StatusPill>{item.status.toLowerCase().replaceAll("_", " ")}</StatusPill><p className="text-sm">{item.notes || "No task description recorded"}</p><Freshness observedAt={null} updatedAt={item.updatedAt} /><fieldset disabled={disabled || resource.failed || resource.loading}><CaseAssignmentAction user={user} item={item} refresh={refresh} register={register} /></fieldset></li>)}</ul><p className="text-xs text-muted-foreground">Completion or cancellation releases the assignment reservation, not the recorded team condition. A current Available observation is still required for reassignment.</p></>}</section>;
}
