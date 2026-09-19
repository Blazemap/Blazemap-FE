import { useState, type ComponentType } from "react";
import { Dialog } from "radix-ui";
import { ClipboardList, LayoutDashboard, ListChecks, Menu, ShieldAlert, UsersRound, X } from "lucide-react";
import { Link, NavLink, Outlet, useLoaderData, useOutletContext } from "react-router-dom";
import { fernLayer, foreground } from "@/assets";
import { AccountMenu } from "@/components/auth";
import { Brand } from "@/components/common";
import { Button } from "@/components/ui";
import { useDashboardSession } from "@/hooks/dashboard";
import type { DashboardUser } from "@/types";

type NavigationItem = { label: string; href: string; icon: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }> };
const navigation: NavigationItem[] = [
  { label: "Overview", href: "/monitoring", icon: LayoutDashboard },
  { label: "Reports", href: "/monitoring/reports", icon: ListChecks },
  { label: "Cases", href: "/monitoring/cases", icon: ShieldAlert },
  { label: "Operations", href: "/monitoring/operations", icon: ClipboardList },
  { label: "Warnings", href: "/monitoring/warnings", icon: ShieldAlert },
  { label: "Users", href: "/monitoring/users", icon: UsersRound },
];

type MonitoringContext = { user: DashboardUser };
export const useMonitoringContext = () => useOutletContext<MonitoringContext>();

function Navigation({ onSelect }: { onSelect?: () => void }) {
  return <nav aria-label="Monitoring navigation" className="relative z-10 flex-1 px-3 py-6"><ul className="space-y-1">{navigation.map(({ label, href, icon: Icon }) => <li key={href}><NavLink to={href} end={href === "/monitoring"} onClick={onSelect} className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold ${isActive ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-forest"}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" />{label}</NavLink></li>)}</ul></nav>;
}

function SidebarContent({ onSelect }: { onSelect?: () => void }) {
  return <><div className="relative border-b border-primary/10 px-6 py-5"><Link to="/" aria-label="Blazemap home" onClick={onSelect} className="inline-flex"><Brand /></Link><p className="mt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-primary/60">Government monitoring</p></div><div className="relative px-3 pt-6"><p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Dashboard pages</p></div><Navigation onSelect={onSelect} /></>;
}

export default function MonitoringPage() {
  const user = useLoaderData() as DashboardUser;
  const { signingOut } = useDashboardSession(user);
  const [menuOpen, setMenuOpen] = useState(false);
  if (signingOut) return <main className="grid h-dvh place-items-center bg-white"><p role="status">Checking your session…</p></main>;
  return <main className="flex h-dvh min-h-0 overflow-hidden bg-white text-forest">
    <aside className="relative hidden w-64 shrink-0 overflow-hidden border-r border-primary/10 bg-white lg:flex lg:flex-col"><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-secondary via-secondary/35 to-transparent" /><img src={fernLayer} alt="" aria-hidden="true" width={900} height={600} className="pointer-events-none absolute -bottom-10 -left-24 w-80 rotate-12 opacity-[0.07]" /><SidebarContent /></aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="z-20 flex min-h-20 shrink-0 items-center justify-between gap-4 border-b border-primary/10 bg-white px-4 sm:px-6 xl:px-8"><div className="flex min-w-0 items-center gap-3"><Button type="button" variant="ghost" size="icon" aria-label="Open monitoring menu" aria-controls="monitoring-mobile-menu" aria-expanded={menuOpen} className="lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={20} aria-hidden="true" /></Button><Link to="/" aria-label="Blazemap home" className="lg:hidden"><Brand iconOnly /></Link><div className="min-w-0"><h1 className="truncate text-lg font-extrabold tracking-[-0.025em] sm:text-xl">Monitoring</h1><p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">Government data console</p></div></div><AccountMenu user={user} /></header>
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"><img src={foreground} alt="" aria-hidden="true" width={1000} height={667} className="pointer-events-none fixed -bottom-20 -right-32 z-0 w-[min(48vw,560px)] -scale-x-100 opacity-[0.045]" /><div className="relative z-10 mx-auto max-w-[1680px] px-4 py-6 sm:px-6 xl:px-8 xl:py-8"><Outlet context={{ user } satisfies MonitoringContext} /></div></div>
    </div>
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[80] bg-forest/35 lg:hidden" /><Dialog.Content id="monitoring-mobile-menu" aria-describedby={undefined} className="fixed inset-y-0 left-0 z-[90] flex w-[min(86vw,320px)] flex-col overflow-hidden border-r border-primary/10 bg-white text-forest shadow-2xl lg:hidden"><Dialog.Title className="sr-only">Monitoring navigation</Dialog.Title><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-secondary via-secondary/35 to-transparent" /><img src={fernLayer} alt="" aria-hidden="true" width={900} height={600} className="pointer-events-none absolute -bottom-10 -left-24 w-80 rotate-12 opacity-[0.07]" /><Button type="button" variant="ghost" size="icon" aria-label="Close monitoring menu" className="absolute right-3 top-3 z-10" onClick={() => setMenuOpen(false)}><X size={20} aria-hidden="true" /></Button><SidebarContent onSelect={() => setMenuOpen(false)} /></Dialog.Content></Dialog.Portal></Dialog.Root>
  </main>;
}
