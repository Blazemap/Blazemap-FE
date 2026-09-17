import type { ReactNode } from "react";
import { WorkspaceNav } from "./WorkspaceNav";
import type { DashboardUser } from "@/types";

export function WorkspacePage({ user, title, children }: { user: DashboardUser; title: string; children: ReactNode }) {
  return <main className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-linear-to-br from-secondary/70 via-background to-emerald-50 text-forest"><WorkspaceNav user={user} /><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-24 sm:pt-28"><h1 className="sr-only">{title}</h1>{children}</div></main>;
}
