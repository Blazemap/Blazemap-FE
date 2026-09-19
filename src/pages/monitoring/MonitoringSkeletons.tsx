import type { ReactNode } from "react";

type Column = { label: string; width: number; shape?: "identity" | "record" | "condition" | "freshness" | "pill" | "icons" | "action" | "assignment" | "link"; padding?: string };
const edge = "px-5 sm:px-6";
const action: Column = { label: "Action", width: 104, shape: "link", padding: `${edge} text-right` };
const condition: Column = { label: "Condition", width: 210, shape: "condition" };
const freshness: Column = { label: "Freshness", width: 190, shape: "freshness" };
const state: Column = { label: "State", width: 80, shape: "pill" };
const activeAction: Column = { label: "Action", width: 224, shape: "action", padding: "px-5" };
export const monitoringTableShapes: Record<string, { minWidth: string; columns: Column[] }> = {
  teams: { minWidth: "min-w-[820px]", columns: [{ label: "Team", width: 160, shape: "record", padding: "px-5" }, condition, freshness, state, activeAction] },
  equipment: { minWidth: "min-w-[860px]", columns: [{ label: "Equipment", width: 180, shape: "record", padding: "px-5" }, condition, freshness, state, activeAction] },
  assignments: { minWidth: "min-w-[820px]", columns: [{ label: "Case", width: 160, shape: "record", padding: "px-5" }, { label: "Team", width: 140 }, { label: "Status", width: 100, shape: "pill" }, freshness, { label: "Action", width: 256, shape: "assignment", padding: "px-5" }] },
  reports: { minWidth: "min-w-[980px]", columns: [{ label: "Report", width: 220, shape: "identity", padding: edge }, { label: "Observations", width: 88, shape: "icons" }, { label: "Priority", width: 80 }, { label: "Workflow", width: 110 }, { label: "Location", width: 160 }, { label: "Observed", width: 130, padding: edge }, action] },
  cases: { minWidth: "min-w-[900px]", columns: [{ label: "Case", width: 220, shape: "identity", padding: edge }, { label: "Verification", width: 135 }, { label: "Handling", width: 130 }, { label: "Priority", width: 90 }, { label: "Context updated", width: 140, padding: edge }, action] },
  users: { minWidth: "min-w-[900px]", columns: [{ label: "User", width: 220, shape: "identity", padding: edge }, { label: "Role", width: 80, shape: "pill" }, { label: "Account", width: 80, shape: "pill" }, { label: "Email", width: 90, shape: "pill" }, { label: "Created", width: 140, padding: edge }, action] },
};
const panel = "rounded-xl border border-primary/10 bg-white shadow-[0_18px_50px_-42px_rgba(23,59,43,0.9)]";
function Mark({ className = "h-4 w-3/4" }: { className?: string }) {
  return <span className={`block max-w-full rounded bg-secondary ${className}`} />;
}
function Loading({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <div role="status" aria-label={label} className={className}><span className="sr-only">{label}</span><div aria-hidden="true" className="motion-safe:animate-pulse">{children}</div></div>;
}
function Cell({ shape }: { shape?: Column["shape"] }) {
  if (shape === "action" || shape === "assignment") return <div className={shape === "assignment" ? "min-w-64" : "min-w-56"}>{shape === "assignment" && <Mark className="mt-2 h-11 w-full rounded-lg" />}<Mark className={`${shape === "assignment" ? "mt-2 " : ""}h-10 w-full rounded-lg`} /><Mark className="mt-2 h-11 w-full rounded-full" /></div>;
  if (shape === "icons") return <div className="flex gap-1"><Mark className="size-6" /><Mark className="size-6" /></div>;
  if (shape === "pill") return <Mark className="h-6 w-20 rounded-full" />;
  if (shape === "link") return <div className="flex min-h-11 items-center justify-end"><Mark className="h-3 w-20" /></div>;
  if (shape === "condition") return <><Mark className="h-6 w-24 rounded-full" /><div className="mt-2 space-y-2"><Mark className="h-3 w-full" /><Mark className="h-3 w-4/5" /></div></>;
  if (shape === "freshness") return <><Mark className="h-3 w-full" /><Mark className="mt-1 h-3 w-4/5" /></>;
  if (shape === "identity" || shape === "record") return <><div className={shape === "identity" ? "flex min-h-11 items-center" : "flex h-5 items-center"}><Mark className="h-4 w-3/4" /></div><Mark className="mt-1 h-4 w-full" /></>;
  return <Mark />;
}
export function TableSkeleton({ columns, minWidth, count = 6 }: { columns: Column[]; minWidth: string; count?: number }) {
  return <div className="overflow-x-auto"><table className={`w-full ${minWidth} text-left text-sm`}><thead className="bg-secondary/45 text-xs text-muted-foreground"><tr>{columns.map(column => <th scope="col" key={column.label} className={`${column.padding ?? "px-4"} py-3`}>{column.label}</th>)}</tr></thead><tbody className="divide-y divide-primary/10">{Array.from({ length: count }, (_, row) => <tr key={row}>{columns.map(column => <td key={column.label} className={`${column.padding ?? "px-4"} py-4`}><div style={{ width: column.width, maxWidth: "100%" }}><Cell shape={column.shape} /></div></td>)}</tr>)}</tbody></table></div>;
}
export function InventorySkeleton({ section }: { section: "reports" | "cases" | "users" }) {
  return <Loading label={`Loading ${section}`}><TableSkeleton {...monitoringTableShapes[section]} count={8} /></Loading>;
}
export function OperationsSkeleton({ section }: { section: "teams" | "equipment" | "assignments" | "access-water" }) {
  if (section === "assignments") return <Loading label="Loading assignments inventory"><section className={`overflow-hidden ${panel}`}><header className="flex justify-between gap-4 border-b px-5 py-4"><div><Mark className="h-6 w-48" /><Mark className="mt-1 h-4 w-64" /></div><Mark className="h-11 w-24 rounded-full" /></header><div className="grid gap-4 border-b p-5 sm:grid-cols-2"><FormField /><FormField /><Mark className="h-5 w-40" /></div><TableSkeleton minWidth="min-w-[820px]" columns={monitoringTableShapes.assignments.columns.map(column => column.shape === "assignment" ? { ...column, width: 100, shape: "link" } : column)} /></section><Mark className="mt-5 h-4 w-full" /></Loading>;
  const summaries = section === "teams" || section === "equipment" ? 2 : 1;
  return <Loading label={`Loading ${section} inventory`}><section className={`overflow-hidden ${panel}`}><header className="flex items-start justify-between gap-4 border-b border-primary/10 px-5 py-4 sm:px-6"><div className="flex-1"><Mark className="h-6 w-48" /><Mark className="mt-1 h-4 w-96" /></div><Mark className="size-[19px]" /></header>{Array.from({ length: summaries }, (_, index) => <div key={index} data-skeleton="collapsed-form" className="border-b border-primary/10 bg-secondary/20 p-5"><div className="flex min-h-11 items-start gap-2"><Mark className="mt-1 size-3" /><Mark className="h-5 w-44" /></div></div>)}{section === "access-water" ? <div className="grid gap-0 xl:grid-cols-2">{["Access", "Water"].map((title, index) => <section key={title} className={index === 0 ? "border-b border-primary/10 xl:border-b-0 xl:border-r" : ""}><h3 className="px-5 py-4 text-sm font-extrabold">{title}</h3><ul className="divide-y divide-primary/10">{Array.from({ length: 3 }, (_, row) => <li key={row} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]"><div><Mark className="h-6 w-40" /><Mark className="mt-1 h-4 w-64" /><div className="mt-2"><Cell shape="condition" /></div></div><Mark className="h-4 w-32" /></li>)}</ul></section>)}</div> : <TableSkeleton {...monitoringTableShapes[section]} />}</section><Mark className="mt-5 h-4 w-full" /></Loading>;
}
export function AssignmentFormSkeleton() {
  return <Loading label="Loading assignment form"><div className="grid gap-4">{[0, 1, 2, 3].map(index => <FormField key={index} height={index === 2 ? "h-24" : "h-11"} />)}<Mark className="h-11 w-full rounded-full" /></div></Loading>;
}
export function StatSkeletons() {
  return <Loading label="Loading attention counts"><div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <article key={index} className="min-w-0 rounded-xl border border-primary/10 bg-white p-5"><div className="flex items-start justify-between gap-4"><Mark className="h-4 w-36" /><Mark className="size-9 shrink-0 rounded-lg" /></div><Mark className="mt-5 h-10 w-16" /><Mark className="mt-2 h-5 w-full" /></article>)}</div></Loading>;
}
export function DistributionSkeleton() {
  return <Loading label="Loading operational distribution"><div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">{[3, 4, 6, 5].map((count, index) => <section key={index} className={`${panel} flex flex-col p-5 sm:p-6`}><Mark className="h-6 w-40" /><Mark className="mt-1 h-4 w-32" />{index === 0 ? <div className="mt-6 grid flex-1 items-center gap-6 sm:grid-cols-[150px_1fr] xl:grid-cols-1 2xl:grid-cols-[150px_1fr]"><div className="relative mx-auto size-36 rounded-full bg-secondary"><div className="absolute inset-5 grid place-items-center rounded-full bg-white"><Mark className="h-9 w-12" /></div></div><div className="space-y-3">{Array.from({ length: count }, (_, row) => <div key={row} className="flex items-center justify-between gap-4"><Mark className="h-5 w-28" /><Mark className="h-5 w-5" /></div>)}</div></div> : <div className="mt-6 flex-1 space-y-4">{Array.from({ length: count }, (_, row) => <div key={row}><div className="mb-2 flex justify-between gap-4"><Mark className="h-4 w-24" /><Mark className="h-4 w-5" /></div><Mark className="h-2.5 w-full rounded-full" /></div>)}</div>}<div className="mt-5 flex min-h-11 justify-end border-t border-primary/10 pt-4"><Mark className="h-4 w-24" /></div></section>)}</div></Loading>;
}
export function QueueSkeleton() {
  return <Loading label="Loading priority report queue"><ol className="divide-y divide-primary/10">{Array.from({ length: 5 }, (_, row) => <li key={row} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:px-6"><div><div className="flex flex-wrap items-center gap-2"><Mark className="h-5 w-24" /><Mark className="h-5 w-20 rounded-full" /><Mark className="h-4 w-24" /></div><Mark className="mt-2 h-6 w-full" /><Mark className="mt-2 h-4 w-4/5" /></div><Cell shape="icons" /></li>)}</ol></Loading>;
}
export function HealthSkeleton() {
  return <Loading label="Loading source health"><ul className="mt-5 divide-y divide-primary/10">{Array.from({ length: 4 }, (_, row) => <li key={row} className="flex items-center justify-between gap-4 py-4"><Mark className="h-5 w-24" /><Cell shape="pill" /></li>)}</ul></Loading>;
}
function Fields({ count }: { count: number }) {
  return <div className="mt-6 grid gap-4 sm:grid-cols-2">{Array.from({ length: count }, (_, index) => <div key={index}><Mark className="h-4 w-24" /><Mark className="mt-1 h-5 w-40" /></div>)}</div>;
}
function FormField({ height = "h-11" }: { height?: string }) {
  return <div><Mark className="h-5 w-24" /><Mark className={`mt-2 ${height} w-full rounded-lg`} /></div>;
}
export function MonitoringDetailSkeleton({ section }: { section: "report" | "case" | "user" }) {
  return <Loading label={`Loading ${section} details`} className={section === "user" ? "mt-7" : ""}><div className={section === "user" ? "grid items-start gap-5 xl:grid-cols-[1.1fr_0.9fr]" : "space-y-5"}><div className="space-y-5"><section className={`${panel} p-5 sm:p-6`}><div className="flex flex-wrap gap-2">{Array.from({ length: section === "report" ? 2 : 3 }, (_, index) => <Cell key={index} shape="pill" />)}</div>{section !== "user" && <Mark className="mt-5 h-7 w-64" />}{section === "report" && <Mark className="mt-2 h-7 w-full" />}<Fields count={section === "report" ? 4 : 6} />{section === "report" && <div className="mt-5 flex gap-3"><Mark className="h-9 w-28 rounded-full" /><Mark className="h-9 w-28 rounded-full" /></div>}</section>{section !== "user" && <section className={`${panel} p-5 sm:p-6`}><Mark className="h-7 w-40" /><Mark className="mt-3 h-7 w-full" /><Mark className="mt-2 h-6 w-4/5" /></section>}{section === "report" && <section className={`${panel} p-5 sm:p-6`}><Mark className="h-7 w-32" /><div className="mt-4 space-y-5 border-l border-primary/10 pl-5">{[0, 1].map(index => <div key={index}><Mark className="h-5 w-32" /><Mark className="mt-2 h-4 w-48" /></div>)}</div></section>}</div><aside className={`${panel} p-5 sm:p-6`}><Mark className="h-7 w-48" /><Mark className="mt-2 h-6 w-full" /><div className="mt-5 space-y-4"><FormField />{section === "report" && <FormField height="h-28" />}{section === "user" && <><FormField /><div className="flex min-h-11 items-center gap-3 rounded-lg border border-input px-3"><Mark className="size-4" /><Mark className="h-5 w-28" /></div><FormField height="h-24" /></>}{section !== "case" && <Mark className="h-11 w-full rounded-full" />}</div>{section === "case" && <section className="mt-7 border-t border-primary/10 pt-5"><Mark className="h-6 w-32" /><Mark className="mt-3 h-5 w-64" /></section>}</aside></div></Loading>;
}
