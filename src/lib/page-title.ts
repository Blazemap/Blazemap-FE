const publicTitles: Record<string, string> = {
  "/": "Blazemap — Forest & land fire awareness",
  "/vision-mission": "Vision & Mission — Blazemap",
  "/faq": "Frequently Asked Questions — Blazemap",
  "/contact": "Contact — Blazemap",
  "/privacy": "Privacy Policy — Blazemap",
  "/terms": "Terms of Use — Blazemap",
  "/login": "Login — Blazemap",
  "/register": "Register — Blazemap",
  "/account": "Account settings — Blazemap",
  "/profile": "Account settings — Blazemap",
  "/monitoring": "Monitoring overview — Blazemap",
  "/monitoring/reports": "Report review — Blazemap",
  "/monitoring/reports/group": "Group reports — Blazemap",
  "/monitoring/cases": "Cases — Blazemap",
  "/monitoring/operations": "Operations — Blazemap",
  "/monitoring/operations/teams": "Teams — Blazemap",
  "/monitoring/operations/equipment": "Equipment — Blazemap",
  "/monitoring/operations/assignments": "Assignments — Blazemap",
  "/monitoring/operations/access-water": "Access & Water — Blazemap",
  "/monitoring/users": "Users — Blazemap",
};

export function isMonitoringDetailPath(pathname: string) {
  return /\/monitoring\/(?:(?:reports|cases|users)|operations\/(?:teams|equipment|assignments|access-water))\/[^/]+$/.test(pathname);
}

export function pageTitle(pathname: string, search = "") {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/publications/")) return "Published information — Blazemap";
  if (path === "/monitoring/reports/group") return publicTitles[path];
  if (/^\/monitoring\/reports\//.test(path)) return "Report detail — Blazemap";
  if (/^\/monitoring\/cases\//.test(path)) return "Case detail — Blazemap";
  if (/^\/monitoring\/users\//.test(path)) return "User detail — Blazemap";
  if (/^\/monitoring\/operations\/teams\//.test(path)) return "Team detail — Blazemap";
  if (/^\/monitoring\/operations\/equipment\//.test(path)) return "Equipment detail — Blazemap";
  if (/^\/monitoring\/operations\/assignments\//.test(path)) return "Assignment detail — Blazemap";
  if (/^\/monitoring\/operations\/access-water\//.test(path)) return "Access & Water detail — Blazemap";
  if (path === "/dashboard") {
    const params = new URLSearchParams(search);
    if (params.get("panel") === "report") return "New report — Blazemap";
    if (params.get("panel") === "my-reports" || params.has("report")) return "My reports — Blazemap";
    if (params.get("view") === "feed") return "Feed — Blazemap";
    if (params.get("view") === "news") return "News — Blazemap";
    if (params.has("case")) return "Case map — Blazemap";
    return "Situation map — Blazemap";
  }
  return publicTitles[path] ?? "Blazemap";
}
