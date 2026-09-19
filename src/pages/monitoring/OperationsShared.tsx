import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { DraftGuard } from "@/components/common";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { createMonitoringAssignment, createMonitoringEquipment, createMonitoringOperationalUpdate, createMonitoringTeam, updateMonitoringAssignment, updateMonitoringEquipment, updateMonitoringTeam } from "@/api/dashboard";
import { Button, FieldSelect } from "@/components/ui";
import { useQueryGetCases } from "@/hooks/dashboard";
import { useGovernmentCase, useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { assignmentTransitions, eligibleTeams } from "@/lib/assignments";
import type { CaseDetail } from "@/types/government";
import type { DashboardUser } from "@/types";
import { AssignmentFormSkeleton } from "./MonitoringSkeletons";
import { formatTime } from "@/pages/dashboard/utils";
import type { MonitoringOperations } from "@/types";
import { EmptyPanel, ErrorPanel, PageIntro, panelClass, StatusPill } from "./MonitoringComponents";
import { useMonitoringContext } from "./MonitoringPage";
import { OperationsSkeleton } from "./MonitoringSkeletons";

export type OperationsSection = "teams" | "equipment" | "assignments" | "access-water";
type OperationsResource = { data: MonitoringOperations | null; loading: boolean; initialLoading: boolean; failed: boolean; retry: () => void };

export const control = "mt-2 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary";
const reasonPlaceholder = "Reason for this audited change";
const activeAssignments = new Set(["ASSIGNED", "ACCEPTED", "IN_PROGRESS"]);
const nowIso = () => new Date().toISOString();
const key = () => crypto.randomUUID();
export const fresh = (value: string | null) => value ? Date.now() - Date.parse(value) <= 86_400_000 : false;
export const conditionDescriptions: Record<string, string> = {
  AVAILABLE: "Confirmed ready for operational use within the observation period.",
  DEPLOYED: "Team is currently assigned away from general availability.",
  UNAVAILABLE: "Not available for operational use.",
  IN_USE: "Equipment is currently being used.",
  DAMAGED: "Equipment requires inspection or repair.",
  PASSABLE: "Verified access was reported passable at the observation time.",
  RESTRICTED: "Verified access has limitations at the observation time.",
  IMPASSABLE: "Verified access was reported impassable at the observation time.",
  WATER_AVAILABLE: "Verified source was reported usable at the observation time.",
  WATER_UNAVAILABLE: "Verified source was reported unusable at the observation time.",
  UNKNOWN: "No current authoritative availability claim is made.",
};
const conditionLabels: Record<string, string> = { AVAILABLE: "Available", DEPLOYED: "Deployed", UNAVAILABLE: "Unavailable", UNKNOWN: "Unknown", IN_USE: "In use", DAMAGED: "Damaged", PASSABLE: "Passable", RESTRICTED: "Restricted", IMPASSABLE: "Impassable", WATER_AVAILABLE: "Water available", WATER_UNAVAILABLE: "Water unavailable" };

function Required() {
  return <span aria-hidden="true"> *</span>;
}

function Feedback({ mutation }: { mutation: { isPending: boolean; isSuccess: boolean; error: Error | null } }) {
  return <>{mutation.error && <p role="alert" className="mt-3 text-xs text-red-800">{mutation.error.message}</p>}{mutation.isSuccess && <p role="status" className="mt-3 text-xs text-emerald-800">Change saved.</p>}</>;
}

export function SampleMark() {
  return <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-amber-800">Sample operational data</span>;
}

export function Freshness({ observedAt, updatedAt }: { observedAt: string | null; updatedAt?: string }) {
  return <div className="text-xs text-muted-foreground"><p>{observedAt ? `${fresh(observedAt) ? "Current" : "Stale"} · observed ${formatTime(observedAt)}` : "No status update"}</p>{updatedAt && <p className="mt-1">Record updated {formatTime(updatedAt)}</p>}</div>;
}

export function Condition({ condition, sample }: { condition: string | null; sample: boolean }) {
  const tone = condition === "AVAILABLE" || condition === "PASSABLE" || condition === "WATER_AVAILABLE" ? "success" : condition === "UNAVAILABLE" || condition === "DAMAGED" || condition === "IMPASSABLE" || condition === "WATER_UNAVAILABLE" ? "danger" : condition === "UNKNOWN" || !condition ? "neutral" : "warning";
  return <div><StatusPill tone={tone}>{conditionLabels[condition ?? "UNKNOWN"] ?? condition}</StatusPill><p className="mt-2 max-w-[32ch] text-xs leading-5 text-muted-foreground">{conditionDescriptions[condition ?? "UNKNOWN"]}</p>{sample && <p className="mt-2"><SampleMark /></p>}</div>;
}

const OperationsDialogContext = createContext<((id: string, state: { dirty: boolean; pending: boolean } | null) => void) | null>(null);

function useOperationsDraft(dirty: boolean, pending: boolean) {
  const register = useContext(OperationsDialogContext);
  const id = useId();
  useEffect(() => {
    register?.(id, { dirty, pending });
    return () => register?.(id, null);
  }, [register, id, dirty, pending]);
}

export function OperationsDialog({ title, action, children, initialOpen = false, dirty: externalDirty = false, pending: externalPending = false, onClose, disabled = false }: { title: string; action: "Create" | "Edit"; children: ReactNode; initialOpen?: boolean; dirty?: boolean; pending?: boolean; onClose?: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [drafts, setDrafts] = useState<Record<string, { dirty: boolean; pending: boolean }>>({});
  const register = useCallback((id: string, state: { dirty: boolean; pending: boolean } | null) => {
    setDrafts(current => {
      const next = { ...current };
      if (state) next[id] = state;
      else delete next[id];
      return next;
    });
  }, []);
  const dirty = externalDirty || Object.values(drafts).some(state => state.dirty);
  const pending = externalPending || Object.values(drafts).some(state => state.pending);
  const changeOpen = (next: boolean) => {
    if (!next && (pending || dirty && !window.confirm("Discard unsaved changes?"))) return;
    setOpen(next);
    if (!next) onClose?.();
  };
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><Button type="button" disabled={disabled} variant={action === "Create" ? "default" : "outline"} aria-label={`${action}: ${title}`}>{action}</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-80 bg-forest/40" /><Dialog.Content aria-describedby={undefined} onInteractOutside={event => event.preventDefault()} className="fixed left-1/2 top-1/2 z-90 max-h-[calc(100dvh-2rem)] w-[calc(100%-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 text-forest shadow-xl sm:p-6">
      <Dialog.Title className="text-xl font-extrabold">{title}</Dialog.Title>
      <OperationsDialogContext.Provider value={register}><DraftGuard dirty={dirty} pending={pending} /><fieldset disabled={pending} aria-busy={pending} className="mt-5 min-w-0 space-y-6">{children}</fieldset></OperationsDialogContext.Provider>
      <div className="mt-6 flex justify-end"><Dialog.Close asChild><Button type="button" variant="outline" disabled={pending}>Close</Button></Dialog.Close></div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}

export function InventoryHeader({ title, detail, icon: Icon, action }: { title: string; detail: string; icon: LucideIcon; action?: ReactNode }) {
  return <header className="flex flex-wrap items-start justify-between gap-4 border-b border-primary/10 px-5 py-4 sm:px-6"><div className="min-w-0 flex-1"><h2 className="text-base font-extrabold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>{action ?? <Icon size={19} aria-hidden="true" className="text-primary" />}</header>;
}

export function OperationsSectionPage({ title, description, icon, resource, section, children }: { title: string; description: string; icon: LucideIcon; resource: OperationsResource; section: OperationsSection; children: (data: MonitoringOperations, refresh: () => Promise<void>) => ReactNode }) {
  const { user } = useMonitoringContext();
  const queryClient = useQueryClient();
  const queryKey = ["dashboard", user.id, user.role, "monitoring-operations", section] as const;
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey }); };
  return <>
    <nav aria-label="Breadcrumb" className="mb-4"><ol className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground"><li><Link to="/monitoring/operations" className="inline-flex min-h-11 items-center gap-2 text-primary hover:underline"><ArrowLeft size={15} aria-hidden="true" />Operations</Link></li><li aria-hidden="true">/</li><li aria-current="page">{title}</li></ol></nav>
    <PageIntro eyebrow="Operations" title={title} description={description} icon={icon} />
    <OperationsDataState resource={resource} section={section}>{data => children(data, refresh)}</OperationsDataState>
  </>;
}

function OperationsDataState({ resource, section, children }: { resource: OperationsResource; section: OperationsSection; children: (data: MonitoringOperations) => ReactNode }) {
  return <>
    {resource.failed && <div className="mt-5"><ErrorPanel message="Operational records could not refresh." loading={resource.loading} retry={resource.retry} /></div>}
    {resource.initialLoading && !resource.data ? <div className="mt-7"><OperationsSkeleton section={section} /></div> : resource.data && <div className="mt-7">{children(resource.data)}</div>}
  </>;
}

export function TeamCreate({ refresh }: { refresh: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [reason, setReason] = useState("");
  const idempotencyKey = useRef(key());
  const mutation = useMutation({ mutationFn: () => createMonitoringTeam({ name, organization: organization.trim() || null, reason, idempotencyKey: idempotencyKey.current }), onSuccess: async () => { setName(""); setOrganization(""); setReason(""); idempotencyKey.current = key(); await refresh(); } });
  useOperationsDraft(!!(name || organization || reason), mutation.isPending);
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate(); };
  return <div><form onSubmit={submit} className="grid gap-4"><label htmlFor="team-name" className="text-xs font-bold">Name<Required /><input id="team-name" required aria-required="true" minLength={2} maxLength={200} value={name} onChange={event => setName(event.target.value)} className={control} /></label><label htmlFor="team-organization" className="text-xs font-bold">Organization<input id="team-organization" maxLength={200} value={organization} onChange={event => setOrganization(event.target.value)} className={control} /></label><label htmlFor="team-reason" className="text-xs font-bold">Reason<Required /><input id="team-reason" required aria-required="true" minLength={5} maxLength={2000} placeholder={reasonPlaceholder} value={reason} onChange={event => setReason(event.target.value)} className={control} /></label><Button disabled={mutation.isPending || name.trim().length < 2 || reason.trim().length < 5}>{mutation.isPending ? "Saving" : "Add team"}</Button></form><Feedback mutation={mutation} /></div>;
}

export function EquipmentCreate({ teams, refresh }: { teams: MonitoringOperations["teams"]; refresh: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [teamId, setTeamId] = useState("");
  const [reason, setReason] = useState("");
  const idempotencyKey = useRef(key());
  const mutation = useMutation({ mutationFn: () => createMonitoringEquipment({ name, kind, teamId: teamId || null, reason, idempotencyKey: idempotencyKey.current }), onSuccess: async () => { setName(""); setKind(""); setTeamId(""); setReason(""); idempotencyKey.current = key(); await refresh(); } });
  useOperationsDraft(!!(name || kind || teamId || reason), mutation.isPending);
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate(); };
  return <div><form onSubmit={submit} className="grid gap-4"><label htmlFor="equipment-name" className="text-xs font-bold">Name<Required /><input id="equipment-name" required aria-required="true" minLength={2} maxLength={200} value={name} onChange={event => setName(event.target.value)} className={control} /></label><label htmlFor="equipment-kind" className="text-xs font-bold">Type<Required /><input id="equipment-kind" required aria-required="true" minLength={2} maxLength={100} value={kind} onChange={event => setKind(event.target.value)} className={control} /></label><label htmlFor="equipment-team" className="text-xs font-bold">Team<FieldSelect disabled={mutation.isPending} id="equipment-team" value={teamId} onValueChange={setTeamId} placeholder="Shared inventory" options={teams.map(team => ({ value: team.id, label: team.name, disabled: !team.active }))} /></label><label htmlFor="equipment-reason" className="text-xs font-bold">Reason<Required /><input id="equipment-reason" required aria-required="true" minLength={5} maxLength={2000} placeholder={reasonPlaceholder} value={reason} onChange={event => setReason(event.target.value)} className={control} /></label><Button disabled={mutation.isPending || name.trim().length < 2 || kind.trim().length < 2 || reason.trim().length < 5}>{mutation.isPending ? "Saving" : "Add equipment"}</Button></form><Feedback mutation={mutation} /></div>;
}

export function ActiveAction({ kind, id, version, active, refresh }: { kind: "team" | "equipment"; id: string; version: number; active: boolean; refresh: () => Promise<void> }) {
  const [reason, setReason] = useState("");
  const mutation = useMutation({ mutationFn: () => kind === "team" ? updateMonitoringTeam(id, { version, active: !active, reason }) : updateMonitoringEquipment(id, { version, active: !active, reason }), onSuccess: async () => { setReason(""); await refresh(); } });
  useOperationsDraft(!!reason, mutation.isPending);
  return <form onSubmit={event => { event.preventDefault(); mutation.mutate(); }} className="min-w-0 border-t border-primary/10 pt-5"><h3 className="mb-3 text-sm font-extrabold">{active ? "Deactivate" : "Activate"} {kind}</h3><label htmlFor={`${kind}-${id}-reason`} className="mb-2 block text-xs font-bold">Reason<Required /></label><input id={`${kind}-${id}-reason`} required aria-required="true" minLength={5} maxLength={2000} placeholder={reasonPlaceholder} value={reason} onChange={event => setReason(event.target.value)} className="min-h-10 w-full rounded-lg border border-input px-3 text-xs" /><Button type="submit" variant="outline" className="mt-2 w-full" disabled={mutation.isPending || reason.trim().length < 5}>{mutation.isPending ? "Saving" : active ? "Deactivate" : "Activate"}</Button><Feedback mutation={mutation} /></form>;
}

export function AssignmentCreate({ operations, refresh }: { operations: MonitoringOperations; refresh: () => Promise<void> }) {
  const { user } = useMonitoringContext();
  const [search, setSearch] = useState("");
  const [caseId, setCaseId] = useState("");
  const cases = useQueryGetCases(user, { query: search, verification: "", handling: "", priority: "", page: 1, all: true });
  const selected = useGovernmentCase(user, caseId);
  useOperationsDraft(!!(search || caseId), false);
  const valid = cases.data?.items.some(item => item.id === caseId && item.handling !== "CLOSED" && item.verification !== "NOT_FIRE");
  return <div className="space-y-4"><label htmlFor="assignment-search" className="block text-xs font-bold">Search cases<input id="assignment-search" type="search" maxLength={200} value={search} onChange={event => { setSearch(event.target.value); setCaseId(""); }} className={control} /></label>{cases.initialLoading && !cases.data ? <AssignmentFormSkeleton stage="cases" /> : <label htmlFor="assignment-case" className="block text-xs font-bold">Open case<Required /><FieldSelect id="assignment-case" required disabled={cases.failed || cases.loading} value={caseId} onValueChange={setCaseId} placeholder="Select case" options={(cases.data?.items ?? []).filter(item => item.handling !== "CLOSED" && item.verification !== "NOT_FIRE").map(item => ({ value: item.id, label: `${item.number} · ${item.title} · ${item.verification} · ${item.handling}` }))} /></label>}{cases.failed && <div role="alert">Cases could not be loaded.<Button type="button" variant="outline" onClick={cases.retry}>Retry cases</Button></div>}{caseId && selected.initialLoading && !selected.data && <AssignmentFormSkeleton stage="details" />}{selected.failed && <div role="alert">Case details could not refresh.<Button type="button" variant="outline" onClick={selected.retry}>Refresh case</Button></div>}{valid && selected.data && <AssignmentForm key={caseId} user={user} detail={selected.data} operations={operations} disabled={cases.failed || cases.loading || selected.failed || selected.loading} refresh={refresh} />}</div>;
}

export function AssignmentForm({ user, detail, operations, refresh, disabled = false, onDraft }: { user: DashboardUser; detail: CaseDetail; operations: MonitoringOperations; refresh: () => Promise<void>; disabled?: boolean; onDraft?: (state: { dirty: boolean; pending: boolean }) => void }) {
  const id = useId();
  const [teamId, setTeamId] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const request = useRef<{ payload: string; key: string } | null>(null);
  const busy = useRef(false);
  const candidates = eligibleTeams(operations.teams);
  const selected = candidates.find(team => team.id === teamId);
  const errors = { team: selected ? "" : "Select an eligible available team.", notes: notes.trim().length >= 5 ? "" : "Enter a task description of at least 5 characters.", reason: reason.trim().length >= 5 ? "" : "Enter a reason of at least 5 characters." };
  const mutation = useGovernmentMutation(user, async () => {
    const body = { version: detail.version, teamId, notes: notes.trim(), reason: reason.trim() };
    const payload = JSON.stringify(body);
    if (!request.current || request.current.payload !== payload) request.current = { payload, key: key() };
    await createMonitoringAssignment(detail.id, { ...body, idempotencyKey: request.current.key });
    request.current = null; setTeamId(""); setNotes(""); setReason(""); setSubmitted(false);
    await refresh();
  });
  const dirty = !!(teamId || notes || reason);
  useOperationsDraft(dirty, mutation.isPending);
  useEffect(() => { onDraft?.({ dirty, pending: mutation.isPending }); }, [dirty, mutation.isPending, onDraft]);
  useEffect(() => () => onDraft?.({ dirty: false, pending: false }), [onDraft]);
  if (detail.handling === "CLOSED" || detail.verification === "NOT_FIRE") return <p>Reopen or correct this case before assigning a team.</p>;
  return <div className="space-y-4"><p className="text-xs">{detail.verification === "UNVERIFIED" ? "Assign a ground check. This does not confirm a fire." : "Assign response work."} No automatic dispatch or public report is created.</p><Link to="/monitoring/operations/teams" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline">Manage teams and availability</Link>{!candidates.length && <p role="status" className="text-sm">No eligible teams. Record a real active team’s availability in Teams. Sample, unknown, stale and already assigned teams cannot be selected.</p>}<form noValidate onSubmit={async event => { event.preventDefault(); setSubmitted(true); if (disabled || busy.current || Object.values(errors).some(Boolean)) return; busy.current = true; try { await mutation.mutateAsync(); } catch { return; } finally { busy.current = false; } }}><fieldset disabled={disabled || mutation.isPending} className="grid gap-4" aria-busy={mutation.isPending}><div><label htmlFor={`${id}-team`} className="text-xs font-bold">Available team<Required /></label><FieldSelect id={`${id}-team`} required value={teamId} onValueChange={setTeamId} placeholder="Select team" invalid={submitted && !!errors.team} describedBy={`${id}-team-error`} options={candidates.map(team => ({ value: team.id, label: `${team.name} · Available · observed ${formatTime(team.latestObservedAt!)}` }))} />{submitted && errors.team && <p id={`${id}-team-error`} role="alert">{errors.team}</p>}{selected && <Freshness observedAt={selected.latestObservedAt} updatedAt={selected.updatedAt} />}</div><div><label htmlFor={`${id}-notes`} className="text-xs font-bold">Task description<Required /></label><textarea id={`${id}-notes`} required aria-required="true" minLength={5} maxLength={2000} aria-invalid={submitted && !!errors.notes} aria-describedby={`${id}-notes-error`} value={notes} onChange={event => setNotes(event.target.value)} className={`${control} min-h-24 py-3`} />{submitted && errors.notes && <p id={`${id}-notes-error`} role="alert">{errors.notes}</p>}</div><div><label htmlFor={`${id}-reason`} className="text-xs font-bold">Reason<Required /></label><input id={`${id}-reason`} required aria-required="true" minLength={5} maxLength={2000} aria-invalid={submitted && !!errors.reason} aria-describedby={`${id}-reason-error`} value={reason} onChange={event => setReason(event.target.value)} className={control} />{submitted && errors.reason && <p id={`${id}-reason-error`} role="alert">{errors.reason}</p>}</div><Button disabled={!candidates.length}>{mutation.isPending ? "Saving" : "Assign team"}</Button></fieldset><Feedback mutation={mutation} /></form></div>;
}

export function AssignmentAction({ user, item, refresh, onDraft }: { user: DashboardUser; item: MonitoringOperations["assignments"][number]; refresh: () => Promise<void>; onDraft?: (state: { dirty: boolean; pending: boolean }) => void }) {
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const busy = useRef(false);
  const allowed = assignmentTransitions[item.status];
  const validStatus = allowed.includes(status as typeof item.status);
  const mutation = useGovernmentMutation(user, async () => { await updateMonitoringAssignment(item.id, { version: item.version, status: status as typeof item.status, reason: reason.trim() }); setReason(""); setStatus(""); setSubmitted(false); await refresh(); });
  const dirty = !!(status || reason);
  useOperationsDraft(dirty, mutation.isPending);
  useEffect(() => { onDraft?.({ dirty, pending: mutation.isPending }); }, [dirty, mutation.isPending, onDraft]);
  useEffect(() => () => onDraft?.({ dirty: false, pending: false }), [onDraft]);
  if (!allowed.length || item.sample) return <><p className="text-xs text-muted-foreground">{item.sample ? "Sample assignments are read-only" : "Final status"}</p><Feedback mutation={mutation} /></>;
  return <form noValidate onSubmit={async event => { event.preventDefault(); setSubmitted(true); if (busy.current || !validStatus || reason.trim().length < 5) return; busy.current = true; try { await mutation.mutateAsync(); } catch { return; } finally { busy.current = false; } }} className="min-w-0"><fieldset disabled={mutation.isPending} aria-busy={mutation.isPending}><label htmlFor={`assignment-${item.id}-status`} className="text-xs font-bold">Next status<Required /></label><FieldSelect id={`assignment-${item.id}-status`} required value={validStatus ? status : ""} onValueChange={setStatus} placeholder="Select next status" invalid={submitted && !validStatus} describedBy={`assignment-${item.id}-error`} options={allowed.map(value => ({ value, label: value.toLowerCase().replaceAll("_", " ") }))} /><label htmlFor={`assignment-${item.id}-reason`} className="mt-2 block text-xs font-bold">Reason<Required /></label><input id={`assignment-${item.id}-reason`} required aria-required="true" minLength={5} maxLength={2000} aria-invalid={submitted && reason.trim().length < 5} aria-describedby={`assignment-${item.id}-error`} placeholder={reasonPlaceholder} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 min-h-10 w-full rounded-lg border border-input px-3 text-xs" />{submitted && (!validStatus || reason.trim().length < 5) && <p id={`assignment-${item.id}-error`} role="alert">Select the next permitted status and enter a reason of at least 5 characters.</p>}<Button type="submit" variant="outline" className="mt-2 w-full">{mutation.isPending ? "Saving" : "Update status"}</Button></fieldset><Feedback mutation={mutation} /></form>;
}

export function ConditionCreate({ operations, subjectType, initialSubjectId = "", refresh }: { operations: MonitoringOperations; subjectType: "TEAM" | "EQUIPMENT" | "FEATURE"; initialSubjectId?: string; refresh: () => Promise<void> }) {
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [condition, setCondition] = useState("");
  const [source, setSource] = useState("");
  const [initialObservedAt, setInitialObservedAt] = useState(() => nowIso().slice(0, 16));
  const [observedAt, setObservedAt] = useState(initialObservedAt);
  const [reason, setReason] = useState("");
  const idempotencyKey = useRef(key());
  const subjects = subjectType === "TEAM" ? operations.teams : subjectType === "EQUIPMENT" ? operations.equipment : operations.features;
  const selected = subjects.find(item => item.id === subjectId);
  const sample = selected?.sample === true;
  const authoritative = subjectType !== "FEATURE" || selected && "authoritative" in selected && selected.authoritative;
  const options = sample || !authoritative ? ["UNKNOWN"] : subjectType === "TEAM" ? ["AVAILABLE", "DEPLOYED", "UNAVAILABLE", "UNKNOWN"] : subjectType === "EQUIPMENT" ? ["AVAILABLE", "IN_USE", "DAMAGED", "UNAVAILABLE", "UNKNOWN"] : selected && "kind" in selected && selected.kind === "ROAD" ? ["PASSABLE", "RESTRICTED", "IMPASSABLE", "UNKNOWN"] : selected && "kind" in selected && selected.kind === "DESIGNATED_LOCATION" ? ["AVAILABLE", "UNAVAILABLE", "UNKNOWN"] : ["WATER_AVAILABLE", "WATER_UNAVAILABLE", "UNKNOWN"];
  const mutation = useMutation({ mutationFn: () => createMonitoringOperationalUpdate({ subjectType, subjectId, condition, source: sample ? "Sample operational data" : source, observedAt: new Date(observedAt).toISOString(), notes: sample ? "Sample operational data; no real availability claim." : null, reason, idempotencyKey: idempotencyKey.current }), onSuccess: async () => { setSubjectId(initialSubjectId); setCondition(""); setSource(""); setReason(""); const observed = nowIso().slice(0, 16); setInitialObservedAt(observed); setObservedAt(observed); idempotencyKey.current = key(); await refresh(); } });
  useOperationsDraft(subjectId !== initialSubjectId || observedAt !== initialObservedAt || !!(condition || source || reason), mutation.isPending);
  return <div><h3 className="mb-3 text-sm font-extrabold">Record condition update</h3><form onSubmit={event => { event.preventDefault(); mutation.mutate(); }} className="grid gap-4"><label htmlFor={`status-${subjectType}-subject`} className="text-xs font-bold">Record<Required /><FieldSelect id={`status-${subjectType}-subject`} required disabled={!!initialSubjectId || mutation.isPending} value={subjectId} onValueChange={value => { setSubjectId(value); setCondition(""); }} placeholder="Select record" options={subjects.map(item => ({ value: item.id, label: item.name ?? item.id }))} /></label><label htmlFor={`status-${subjectType}-condition`} className="text-xs font-bold">Condition<Required /><FieldSelect disabled={mutation.isPending} id={`status-${subjectType}-condition`} required value={condition} onValueChange={setCondition} placeholder="Select condition" options={options.map(value => ({ value, label: conditionLabels[value] }))} /></label><label htmlFor={`status-${subjectType}-observed`} className="text-xs font-bold">Observed<Required /><input id={`status-${subjectType}-observed`} type="datetime-local" required aria-required="true" max={nowIso().slice(0, 16)} value={observedAt} onChange={event => setObservedAt(event.target.value)} className={control} /></label><label htmlFor={`status-${subjectType}-source`} className="text-xs font-bold">Source{!sample && <Required />}<input id={`status-${subjectType}-source`} required={!sample} aria-required={!sample} disabled={sample} minLength={3} maxLength={300} value={sample ? "Sample operational data" : source} onChange={event => setSource(event.target.value)} className={control} /></label><label htmlFor={`status-${subjectType}-reason`} className="text-xs font-bold">Reason<Required /><input id={`status-${subjectType}-reason`} required aria-required="true" minLength={5} maxLength={2000} placeholder={reasonPlaceholder} value={reason} onChange={event => setReason(event.target.value)} className={control} /></label><Button className="w-full" disabled={mutation.isPending || !subjectId || !condition || (!sample && source.trim().length < 3) || reason.trim().length < 5}>{mutation.isPending ? "Saving" : "Record update"}</Button></form>{condition && <p className="mt-3 text-xs text-muted-foreground">{conditionDescriptions[condition]}</p>}{(sample || !authoritative) && subjectId && <p className="mt-2 text-xs text-amber-900">{sample ? <SampleMark /> : "Unverified source"} · Only Unknown can be stored; this record cannot support routing or availability claims.</p>}<Feedback mutation={mutation} /></div>;
}

export function OperationsSnapshot({ data }: { data: MonitoringOperations }) {
  return <p className="mt-5 text-xs text-muted-foreground">Snapshot updated {formatTime(data.asOf)}. “Available” counts require a non-sample active record and a status observed within 24 hours. Access and water counts additionally require a verified non-sample map layer.</p>;
}

export { activeAssignments, EmptyPanel, panelClass, StatusPill };
