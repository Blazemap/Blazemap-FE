import { Link, useLocation } from "react-router-dom";
import { ListFilter, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { AccountMenu } from "@/components/auth";
import type { DashboardUser } from "@/types";
import { workspacePath } from "@/lib/dashboard";

export function WorkspaceNav({ user, children }: { user: DashboardUser; children?: ReactNode }) {
  const { pathname, search } = useLocation();
  const home = workspacePath(user.role);
  const dashboard = pathname === home;
  const feed = pathname === "/feed" || new URLSearchParams(search).get("view") === "feed";
  const destination = (view: "map" | "feed") => {
    const params = new URLSearchParams(search);
    params.delete("panel");
    params.delete("report");
    params.delete("observation");
    params.delete("my-reports");
    if (view === "feed") params.set("view", "feed");
    else params.delete("view");
    const query = params.toString();
    return `${home}${query ? `?${query}` : ""}`;
  };

  return <header className="absolute left-1/2 top-3 z-50 flex w-[94%] max-w-5xl -translate-x-1/2 flex-col gap-2 rounded-[26px] bg-white px-3 py-2 shadow-lg sm:top-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-full sm:px-4 sm:py-2.5">
    <div className="flex min-w-0 items-center justify-between gap-2 sm:flex-1">
      <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
        <Link to="/" aria-label="Blazemap home" className="min-w-0 shrink-0 transition-opacity hover:opacity-80"><Brand iconOnly /></Link>
        <nav aria-label="Dashboard views" className="flex rounded-full border border-primary/10 bg-secondary/60 p-0.5 shadow-inner sm:p-1">
          {([[
            "map",
            "Map",
            MapPin,
          ], ["feed", "Feed", ListFilter]] as const).map(([view, label, Icon]) => {
            const active = view === "feed" ? feed : dashboard && !feed;
            return <Link key={view} to={destination(view)} aria-current={active ? "page" : undefined} className={`flex h-8 min-w-[52px] items-center justify-center gap-1 rounded-full px-2 text-[10px] font-extrabold transition-colors sm:min-w-[74px] sm:gap-1.5 sm:px-3 sm:text-[11px] ${active ? "bg-forest text-white shadow-sm" : "text-muted-foreground hover:bg-white hover:text-forest"}`}><Icon size={14} strokeWidth={2.5} aria-hidden="true" /><span>{label}</span></Link>;
          })}
        </nav>
      </div>
      <div className="ml-auto min-w-0 shrink"><AccountMenu user={user} /></div>
    </div>
    {children && <div className="w-full border-t border-primary/10 pt-2 sm:hidden">{children}</div>}
  </header>;
}
