import { createAuthClient } from "better-auth/react";
import { authURL } from "@/api/auth";
import { getSharedAccount } from "@/api/dashboard";
import { AuthError } from "@/lib";
import type { DashboardUser, PasswordValues } from "@/types";
import { validatePasswordChange } from "@/lib/auth";

function passwordClient() {
  return createAuthClient({ baseURL: new URL(authURL(), window.location.origin).href, fetchOptions: { credentials: "include", cache: "no-store", redirect: "error", retry: 0, timeout: 20000 } });
}

async function requireAccount(user: DashboardUser) {
  const current = await getSharedAccount();
  if (current.id !== user.id || current.role !== user.role) throw new AuthError("ACCOUNT_CHANGED", 403);
}

export async function hasPassword(user: DashboardUser): Promise<boolean> {
  await requireAccount(user);
  const result = await passwordClient().listAccounts();
  if (result.error) throw new AuthError("ACCOUNTS_UNAVAILABLE", result.error.status);
  if (!Array.isArray(result.data) || !result.data.every(account => typeof account.providerId === "string")) throw new AuthError("INVALID_RESPONSE", 502);
  await requireAccount(user);
  return result.data.some(account => account.providerId === "credential");
}

export async function changePassword(user: DashboardUser, values: PasswordValues): Promise<void> {
  if (Object.keys(validatePasswordChange(values)).length) throw new AuthError("VALIDATION_ERROR", 400);
  await requireAccount(user);
  const result = await passwordClient().changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword, revokeOtherSessions: values.revokeOtherSessions });
  if (result.error) {
    const allowed = ["INVALID_PASSWORD", "CREDENTIAL_ACCOUNT_NOT_FOUND", "PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG", "SESSION_NOT_FRESH", "UNAUTHORIZED"];
    throw new AuthError(allowed.includes(result.error.code ?? "") ? result.error.code! : "PASSWORD_CHANGE_UNCONFIRMED", result.error.status);
  }
  if (!result.data || result.data.user.id !== user.id || (result.data.token !== null && typeof result.data.token !== "string")) throw new AuthError("PASSWORD_CHANGE_UNCONFIRMED", 502);
}

export async function updateProfile(user: DashboardUser, name: string): Promise<DashboardUser> {
  const value = name.trim();
  if (!value || value.length > 100) throw new AuthError("VALIDATION_ERROR", 400);
  const current = await getSharedAccount();
  if (current.id !== user.id || current.role !== user.role) throw new AuthError("ACCOUNT_CHANGED", 403);
  const client = createAuthClient({ baseURL: new URL(authURL(), window.location.origin).href });
  const result = await client.updateUser({ name: value });
  if (result.error) throw new AuthError("PROFILE_UPDATE_FAILED", result.error.status);
  if (result.data?.status !== true) throw new AuthError("INVALID_RESPONSE", 502);
  const confirmed = await getSharedAccount(true);
  if (confirmed.id !== user.id || confirmed.role !== user.role || confirmed.name !== value) throw new AuthError("PROFILE_NOT_CONFIRMED", 502);
  return confirmed;
}
