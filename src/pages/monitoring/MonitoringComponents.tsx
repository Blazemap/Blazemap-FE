import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CircleAlert, RefreshCw } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { fernLayer } from "@/assets";
import { Button } from "@/components/ui";
import { isMonitoringDetailPath } from "@/lib/page-title";
import type { DashboardUser } from "@/types";

export const panelClass = "rounded-xl border border-primary/10 bg-white shadow-[0_18px_50px_-42px_rgba(67,25,31,0.9)]";
export type ChartPart = { label: string; value: number; color: string };

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="relative isolate overflow-hidden rounded-2xl border border-primary/10 bg-linear-120 from-background via-secondary via-54% to-sage px-5 py-7 sm:px-8 sm:py-8"><img src={fernLayer} alt="" aria-hidden="true" width={900} height={600} className="pointer-events-none absolute -right-20 -top-24 -z-10 w-[min(58vw,520px)] -scale-x-100 opacity-[0.13]" /><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary/65">{eyebrow}</p><h2 className="mt-3 max-w-[22ch] text-[clamp(30px,3vw,44px)] font-extrabold leading-[1.05] tracking-[-0.04em]">{title}</h2><p className="mt-3 max-w-[68ch] text-sm leading-7 text-muted-foreground">{description}</p></div></section>;
}

export function SectionHeading({ title, description, aside }: { title: string; description: string; aside?: React.ReactNode }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-lg font-extrabold tracking-[-0.025em]">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{aside}</div>;
}

export function StatCard({ label, value, detail, icon: Icon, attention = false }: { label: string; value: number; detail: string; icon: LucideIcon; attention?: boolean }) {
  return <article className={`min-w-0 rounded-xl border bg-white p-5 ${attention && value > 0 ? "border-amber-300" : "border-primary/10"}`}><div className="flex items-start justify-between gap-4"><p className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${attention && value > 0 ? "bg-amber-100 text-amber-900" : "bg-secondary text-primary"}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span></div><p className="mt-5 text-4xl font-extrabold tracking-[-0.045em] tabular-nums">{value.toLocaleString("en")}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></article>;
}

export function DonutChart({ title, subtitle, total, parts, href }: { title: string; subtitle: string; total: number; parts: ChartPart[]; href?: string }) {
  let offset = 0;
  const stops = total > 0 ? parts.map(part => { const start = offset; offset += part.value / total * 100; return `${part.color} ${start}% ${offset}%`; }).join(",") : "var(--color-secondary) 0% 100%";
  return <section aria-label={title} className={`${panelClass} flex flex-col p-5 sm:p-6`}><h2 className="text-base font-extrabold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p><div className="mt-6 grid flex-1 items-center gap-6 sm:grid-cols-[150px_1fr] xl:grid-cols-1 2xl:grid-cols-[150px_1fr]"><div className="relative mx-auto size-36 rounded-full" style={{ background: `conic-gradient(${stops})` }} aria-hidden="true"><div className="absolute inset-5 grid place-items-center rounded-full bg-white text-center"><span><strong className="block text-3xl font-extrabold tabular-nums">{total}</strong><span className="text-[11px] font-bold text-muted-foreground">total records</span></span></div></div><ul className="space-y-3">{parts.map(part => <li key={part.label} className="flex items-center justify-between gap-4 text-sm"><span className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-sm" style={{ background: part.color }} aria-hidden="true" /><span className="truncate font-semibold">{part.label}</span></span><span className="font-extrabold tabular-nums">{part.value}</span></li>)}</ul></div>{href && <Link to={href} className="mt-5 inline-flex min-h-11 items-center justify-end gap-2 border-t border-primary/10 pt-4 text-xs font-extrabold text-primary hover:underline">View details <ArrowUpRight size={14} aria-hidden="true" /></Link>}</section>;
}

export function BarChart({ title, subtitle, parts, href }: { title: string; subtitle: string; parts: ChartPart[]; href?: string }) {
  const maximum = Math.max(1, ...parts.map(part => part.value));
  return <section aria-label={title} className={`${panelClass} flex flex-col p-5 sm:p-6`}><h2 className="text-base font-extrabold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p><div className="mt-6 flex-1 space-y-4">{parts.map(part => <div key={part.label}><div className="mb-2 flex items-center justify-between gap-4 text-xs"><span className="font-bold">{part.label}</span><span className="font-extrabold tabular-nums">{part.value}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full transition-[width]" style={{ width: `${part.value ? Math.max(5, part.value / maximum * 100) : 0}%`, background: part.color }} /></div></div>)}</div>{href && <Link to={href} className="mt-5 inline-flex min-h-11 items-center justify-end gap-2 border-t border-primary/10 pt-4 text-xs font-extrabold text-primary hover:underline">View details <ArrowUpRight size={14} aria-hidden="true" /></Link>}</section>;
}

export function ErrorPanel({ message, loading, retry }: { message: string; loading: boolean; retry: () => void }) {
  return <div role="alert" className="flex flex-col items-start justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950 sm:flex-row sm:items-center"><span className="flex items-center gap-3"><CircleAlert size={20} aria-hidden="true" />{message}</span><Button variant="outline" disabled={loading} onClick={retry}><RefreshCw size={16} aria-hidden="true" />Retry</Button></div>;
}

export function EmptyPanel({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-muted-foreground">{children}</div>;
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "success" | "warning" | "danger" | "neutral" | "info" }) {
  const tones = { success: "bg-emerald-50 text-emerald-800", warning: "bg-amber-50 text-amber-900", danger: "bg-red-50 text-red-800", neutral: "bg-slate-100 text-slate-700", info: "bg-blue-50 text-blue-800" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

export function MasterDetail({ user, children }: { user: DashboardUser; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const detailOpen = isMonitoringDetailPath(pathname);
  return <div className="min-w-0">{detailOpen ? <Outlet context={{ user }} /> : children}</div>;
}
