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
  if (!/^\/(?:dashboard|monitoring|feed|news|publications\/[a-zA-Z0-9_-]+|report|account|profile|my-reports(?:\/[a-zA-Z0-9_-]+)?)(?:\?[^#\\\s]*)?$/.test(next)) return home;
  const index = next.indexOf("?");
  const path = index < 0 ? next : next.slice(0, index);
  const search = index < 0 ? "" : next.slice(index + 1);
  if (path === "/monitoring" && role !== "ADMIN") return home;
  if (role === "ADMIN" && (path === "/report" || path === "/news" || path.startsWith("/my-reports") || new URLSearchParams(search).get("view") === "news" || ["report", "my-reports"].includes(new URLSearchParams(search).get("panel") ?? ""))) return home;
  if (path === "/dashboard" || path === "/monitoring") return `${path}${search ? `?${search}` : ""}`;
  if (path === "/report") return reportDestination(search).replace("/dashboard", home);
  return next;
}
export function boundPanel(box: { x: number; y: number; width: number; height: number }, viewport: { width: number; height: number }) {
  const maxWidth = Math.max(1, Math.min(600, viewport.width - 48));
  const maxHeight = Math.max(1, viewport.height - 120);
  const width = Math.min(maxWidth, Math.max(Math.min(320, maxWidth), box.width));
  const height = Math.min(maxHeight, Math.max(Math.min(400, maxHeight), box.height));
  return { width, height, x: Math.max(0, Math.min(box.x, viewport.width - width)), y: Math.max(0, Math.min(box.y, viewport.height - height)) };
}
export function mapPanelPadding() {
  const width = window.innerWidth, height = window.innerHeight;
  const padding = { left: 24, right: 48, top: 96, bottom: 100 };
  for (const panel of document.querySelectorAll<HTMLElement>("[data-map-panel]")) {
    if (!panel.getClientRects().length) continue;
    const rect = panel.getBoundingClientRect();
    if (width < 768) padding.bottom = Math.max(padding.bottom, height - rect.top + 16);
    else if (rect.left + rect.width / 2 < width / 2) padding.left = Math.max(padding.left, rect.right + 16);
    else padding.right = Math.max(padding.right, width - rect.left + 16);
  }
  const horizontal = Math.min(1, Math.max(0, width - 160) / (padding.left + padding.right));
  const vertical = Math.min(1, Math.max(0, height - 160) / (padding.top + padding.bottom));
  return { left: padding.left * horizontal, right: padding.right * horizontal, top: padding.top * vertical, bottom: padding.bottom * vertical };
}
export function privateReportMarkers<T extends { case: { id: string } | null }>(reports: T[], cases: { id: string; perimeter: unknown | null }[]): T[] {
  const polygonCases = new Set(cases.filter(item => item.perimeter).map(item => item.id));
  return reports.filter(report => !report.case?.id || !polygonCases.has(report.case.id));
}
export function governmentPublicItems<T extends { kind: string; caseNumber?: string }>(items: T[], cases: { number: string }[]): T[] {
  const privateCaseNumbers = new Set(cases.map(item => item.number));
  return items.filter(item => item.kind !== "publication" || !item.caseNumber || !privateCaseNumbers.has(item.caseNumber));
}
export function sameDashboardAccount(previous: Pick<DashboardUser, "id" | "role">, current: Pick<DashboardUser, "id" | "role">): boolean {
  return previous.id === current.id && previous.role === current.role;
}
