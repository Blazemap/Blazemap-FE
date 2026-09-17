import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { signOut } from "@/api";
import { accountQueryOptions } from "@/api/dashboard";
import { queryKeys } from "@/api/queryKeys";
import { queryClient } from "@/config/react-query";
import { clearDashboardQueries } from "@/hooks/dashboard/session";

export function useAccount() {
  return useQuery(accountQueryOptions);
}

export function useLogout() {
  const pending = useRef(false);
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout(): Promise<boolean> {
    if (pending.current) return false;
    if (!window.dispatchEvent(new Event("draft-before-logout", { cancelable: true }))) return false;
    pending.current = true;
    setPending(true);
    setError("");
    try {
      await signOut();
      await queryClient.cancelQueries({ queryKey: queryKeys.account });
      window.dispatchEvent(new Event("draft-logout-complete"));
      clearDashboardQueries();
      queryClient.setQueryData(queryKeys.account, null);
      return true;
    } catch {
      setError("Logout could not be confirmed. Please try again.");
      return false;
    } finally {
      pending.current = false;
      setPending(false);
    }
  }
  return { logout, isPending, error, resetError: () => setError("") };
}
