import { ArrowRight, ClipboardList, Package, Route, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { PageIntro, panelClass } from "./MonitoringComponents";

const sections = [
  { title: "Teams", description: "Manage response teams and record their current operational condition.", href: "/monitoring/operations/teams", icon: UsersRound },
  { title: "Equipment", description: "Maintain equipment inventory, ownership, and current condition.", href: "/monitoring/operations/equipment", icon: Package },
  { title: "Assignments", description: "Assign available teams to open cases and update response status.", href: "/monitoring/operations/assignments", icon: ClipboardList },
  { title: "Access & Water", description: "Review verified access routes and water-source availability.", href: "/monitoring/operations/access-water", icon: Route },
] as const;

export default function OperationsPage() {
  return <>
    <PageIntro eyebrow="Operations" title="Choose an operational workspace." description="Open one resource area at a time to manage teams, equipment, assignments, or verified access and water conditions." icon={ClipboardList} />
    <nav aria-label="Operation workspaces" className="mt-7 grid gap-4 sm:grid-cols-2">
      {sections.map(({ title, description, href, icon: Icon }) => <Link key={href} to={href} className={`group flex min-h-44 flex-col justify-between p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6 ${panelClass}`}><span className="flex items-start justify-between gap-4"><span><span className="block text-lg font-extrabold tracking-[-0.025em]">{title}</span><span className="mt-2 block max-w-[48ch] text-sm leading-6 text-muted-foreground">{description}</span></span><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon size={21} aria-hidden="true" /></span></span><span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-primary">Open {title}<ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></span></Link>)}
    </nav>
  </>;
}
