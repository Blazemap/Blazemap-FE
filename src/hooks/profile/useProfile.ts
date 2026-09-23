import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, hasPassword, updateProfile } from "@/api/profile";
import { passwordError } from "@/lib/auth";
import { notifyToast } from "@/components/ui/toast";
import type { PasswordValues } from "@/types";

export function usePassword(user: DashboardUser, enabled: boolean) {
  const client = useQueryClient();
  const account = useQuery({ queryKey: queryKeys.dashboard.password(user), queryFn: () => hasPassword(user), enabled, retry: false, gcTime: 0, staleTime: 0 });
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const reset = () => { setError(""); setSuccess(false); };
  async function submit(values: PasswordValues) {
    if (lock.current) return false;
    lock.current = true; setPending(true); reset();
    try {
       await changePassword(user, values);
       setSuccess(true);
       notifyToast({ title: "Password changed", tone: "success" });
      void client.invalidateQueries({ queryKey: queryKeys.account });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard.session(user) });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard.guard(user) });
      return true;
    } catch (failure) { setError(passwordError(failure)); return false; }
    finally { lock.current = false; setPending(false); }
  }
  return { account, pending, error, success, submit, reset };
}
import { queryKeys } from "@/api/queryKeys";
import type { DashboardUser } from "@/types";

export function useMutationUpdateProfile(user: DashboardUser) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (name: string) => updateProfile(user, name), retry: false, gcTime: 0, onSuccess: updated => {
    client.setQueryData(queryKeys.account, updated);
    client.setQueryData(queryKeys.dashboard.session(user), updated);
    client.setQueryData(queryKeys.dashboard.guard(user), updated);
  } });
}
