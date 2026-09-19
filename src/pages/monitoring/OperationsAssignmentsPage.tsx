import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FieldSelect } from "@/components/ui";
import { control } from "./OperationsShared";
import { useMonitoringAssignments } from "@/hooks/dashboard";
import { useMonitoringContext } from "./MonitoringPage";
import { activeAssignments, AssignmentAction, AssignmentCreate, EmptyPanel, Freshness, InventoryHeader, OperationsDialog, OperationsSectionPage, OperationsSnapshot, panelClass, SampleMark, StatusPill } from "./OperationsShared";

export default function OperationsAssignmentsPage() {
  const { user } = useMonitoringContext();
  const resource = useMonitoringAssignments(user);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const matches = (item: NonNullable<typeof resource.data>["assignments"][number]) => (!status || item.status === status) && `${item.caseNumber} ${item.caseTitle} ${item.teamName} ${item.notes ?? ""}`.toLowerCase().includes(search.toLowerCase());
  return <OperationsSectionPage title="Assignments" description="Assign currently available teams to open cases and record response progress." icon={ClipboardList} resource={resource} section="assignments">{(data, refresh) => <>
    <section aria-labelledby="assignments-inventory-title" className={`overflow-hidden ${panelClass}`}>
      <div id="assignments-inventory-title"><InventoryHeader title="Assignments inventory" detail={`${data.counts.activeAssignments} active assignments, excluding sample records`} icon={ClipboardList} action={<fieldset disabled={resource.failed || resource.loading}><OperationsDialog title="Create assignment" action="Create"><fieldset disabled={resource.failed || resource.loading}><AssignmentCreate operations={data} refresh={refresh} /></fieldset></OperationsDialog></fieldset>} /></div>
      <div className="grid gap-4 border-b p-5 sm:grid-cols-2"><label htmlFor="assignment-filter" className="text-xs font-bold">Search case or team<input id="assignment-filter" type="search" value={search} onChange={event => setSearch(event.target.value)} className={control} /></label><label htmlFor="assignment-status-filter" className="text-xs font-bold">Status<FieldSelect id="assignment-status-filter" value={status} onValueChange={setStatus} placeholder="All statuses" options={["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(value => ({ value, label: value.toLowerCase().replaceAll("_", " ") }))} /></label><Link to="/monitoring/operations/teams" className="text-sm font-bold text-primary underline">Teams and availability</Link></div>
      {!data.assignments.filter(matches).length ? <EmptyPanel>No matching assignments.</EmptyPanel> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-secondary/45 text-xs text-muted-foreground"><tr><th scope="col" className="px-5 py-3">Case</th><th scope="col" className="px-4 py-3">Team</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Freshness</th><th scope="col" className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-primary/10">{data.assignments.filter(matches).map(item => <tr key={item.id}><td className="px-5 py-4"><Link to={`/monitoring/cases/${encodeURIComponent(item.caseId)}`} className="font-extrabold text-primary underline">{item.caseNumber} · {item.caseTitle}</Link><p className="mt-1 text-xs">{item.caseVerification.toLowerCase().replaceAll("_", " ")} · {item.caseHandling.toLowerCase().replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{item.notes || "No notes"}</p></td><td className="px-4 py-4"><p className="font-bold">{item.teamName}</p>{item.sample && <p className="mt-2"><SampleMark /></p>}</td><td className="px-4 py-4"><StatusPill tone={activeAssignments.has(item.status) ? "info" : item.status === "COMPLETED" ? "success" : "neutral"}>{item.status.toLowerCase().replaceAll("_", " ")}</StatusPill></td><td className="px-4 py-4"><Freshness observedAt={null} updatedAt={item.updatedAt} /></td><td className="px-5 py-4"><OperationsDialog title={`Edit assignment: ${item.caseNumber} · ${item.teamName}`} action="Edit"><AssignmentAction user={user} item={item} refresh={refresh} /></OperationsDialog></td></tr>)}</tbody></table></div>}
    </section>
    <OperationsSnapshot data={data} />
  </>}</OperationsSectionPage>;
}
