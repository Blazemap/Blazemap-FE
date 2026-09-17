import { useEffect } from "react";
import { useAccount } from "@/hooks/useAccount";
import { dashboardLogin, sameDashboardAccount } from "@/lib";
import { workspacePath } from "@/lib/dashboard";
import { clearDashboardQueries } from "./session";
import type { DashboardUser } from "@/types";

export function useDashboardSession(user: DashboardUser) {
  const session = useAccount();
  const current = session.data;
  const signingOut = session.isSuccess && (!current || !sameDashboardAccount(user, current));
  useEffect(() => {
    if (!signingOut) return;
    clearDashboardQueries();
    window.location.replace(current ? workspacePath(current.role) : dashboardLogin(user.role));
  }, [signingOut, current, user.role]);
  return { signingOut };
}
