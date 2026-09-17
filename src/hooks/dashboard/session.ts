import { queryClient } from "@/config/react-query";
import { queryKeys } from "@/api/queryKeys";
import { accountQueryOptions } from "@/api/dashboard";
import { AuthError, dashboardLogin, sameDashboardAccount } from "@/lib";
import { workspacePath } from "@/lib/dashboard";
import type { DashboardUser } from "@/types";

export function clearDashboardQueries() {
  queryClient.setQueriesData({ queryKey: queryKeys.dashboard.all }, null);
  queryClient.removeQueries({ queryKey: queryKeys.dashboard.all });
}
export async function checkDashboardAccount(user: DashboardUser, signal: AbortSignal) {
  try {
    const current = await queryClient.fetchQuery(accountQueryOptions);
    signal.throwIfAborted();
    if (!current) throw new AuthError("SESSION_REQUIRED", 401);
    if (!sameDashboardAccount(user, current)) {
      clearDashboardQueries();
      window.location.replace(workspacePath(current.role));
      throw new AuthError("ACCOUNT_CHANGED", 401);
    }
    return current;
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof AuthError && (error.status === 401 || error.code === "EMAIL_NOT_VERIFIED")) {
      clearDashboardQueries();
      if (error.code !== "ACCOUNT_CHANGED") window.location.replace(dashboardLogin(user.role));
    }
    throw error;
  }
}
