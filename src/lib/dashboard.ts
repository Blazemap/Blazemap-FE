import type { DashboardUser } from "@/types";

export function workspacePath(role: DashboardUser["role"]): string {
  void role;
  return "/dashboard";
}
export function dashboardLogin(role: DashboardUser["role"]): string {
  return `/login?next=${encodeURIComponent(workspacePath(role))}${role === "ADMIN" ? "&portal=government" : ""}`;
}
export function reportDestination(search: string): string {
  const params = new URLSearchParams(search);
  params.set("panel", "report");
  params.delete("view");
  return `/dashboard?${params.toString()}`;
}
export function safeWorkspaceDestination(next: string, role: DashboardUser["role"] = "USER"): string {
  const home = workspacePath(role);
  if (!/^\/(?:dashboard|monitoring|feed|report|account|profile|my-reports(?:\/[a-zA-Z0-9_-]+)?)(?:\?[^#\\\s]*)?$/.test(next)) return home;
  const index = next.indexOf("?");
  const path = index < 0 ? next : next.slice(0, index);
  const search = index < 0 ? "" : next.slice(index + 1);
  if (path === "/monitoring" && role !== "ADMIN") return home;
  if (role === "ADMIN" && (path === "/report" || path.startsWith("/my-reports") || ["report", "my-reports"].includes(new URLSearchParams(search).get("panel") ?? ""))) return home;
  if (path === "/dashboard" || path === "/monitoring") return `${path}${search ? `?${search}` : ""}`;
  if (path === "/report") return reportDestination(search).replace("/dashboard", home);
  return next;
}
export function boundPanel(box: { x: number; y: number; width: number; height: number }, viewport: { width: number; height: number }) {
  const maxWidth = Math.max(1, Math.min(600, viewport.width - 48));
  const maxHeight = Math.max(1, viewport.height - 120);
  const width = Math.min(maxWidth, Math.max(Math.min(320, maxWidth), box.width));
  const height = Math.min(maxHeight, Math.max(Math.min(400, maxHeight), box.height));
  return { width, height, x: Math.max(24, Math.min(box.x, viewport.width - width - 24)), y: Math.max(96, Math.min(box.y, viewport.height - height - 24)) };
}
export function sameDashboardAccount(previous: Pick<DashboardUser, "id" | "role">, current: Pick<DashboardUser, "id" | "role">): boolean {
  return previous.id === current.id && previous.role === current.role;
}
