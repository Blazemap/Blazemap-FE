import type { CaseFilters, DashboardUser } from "@/types";

export const queryKeys = {
  account: ["account"] as const,
  dashboard: {
    all: ["dashboard"] as const,
    avatar: (user: DashboardUser) => ["dashboard", user.id, user.role, "avatar", user.image] as const,
    password: (user: DashboardUser) => ["dashboard", user.id, user.role, "password"] as const,
    reports: (user: DashboardUser, page: number) => ["dashboard", user.id, user.role, "reports", page] as const,
    report: (user: DashboardUser, id: string) => ["dashboard", user.id, user.role, "report", id] as const,
    guard: (user: DashboardUser) => ["dashboard", user.id, user.role, "guard"] as const,
    session: (user: DashboardUser) => ["dashboard", user.id, user.role, "session"] as const,
    map: (user: DashboardUser, hours: number) => ["dashboard", user.id, user.role, "map", hours] as const,
    case: (user: DashboardUser, id: string) => ["dashboard", user.id, user.role, "case", id] as const,
    cases: (user: DashboardUser, filters: CaseFilters) => ["dashboard", user.id, user.role, "cases", filters] as const,
  },
};
