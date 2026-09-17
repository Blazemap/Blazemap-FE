import { AuthError } from "@/lib";
import { sessionRetryDelay } from "@/lib/auth";
import { googleAvatar, uploadedAvatar } from "@/lib/avatar";
import { queryKeys } from "@/api/queryKeys";
import { apiEndpoints } from "@/constants";
import type { DashboardUser } from "@/types";
import { queryClient } from "@/config/react-query";

let sessionBlockedUntil = 0;

export async function getDashboardUser(signal: AbortSignal): Promise<DashboardUser> {
  if (Date.now() < sessionBlockedUntil) throw new AuthError("TOO_MANY_REQUESTS", 429);
  const configured: unknown = import.meta.env?.VITE_AUTH_URL;
  let base = "/api/auth";
  if (configured) {
    try {
      if (typeof configured !== "string" || /[\s\\?#]/.test(configured)) throw new Error();
      const url = new URL(configured);
      if (url.username || url.password || !["/", "/api/auth", "/api/auth/"].includes(url.pathname) ||
        (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) throw new Error();
      base = `${url.origin}/api/auth`;
    } catch { throw new AuthError("CONFIGURATION_ERROR"); }
  }
  let response: Response;
  try {
    response = await fetch(`${base}${apiEndpoints.session}`, { credentials: "include", cache: "no-store", redirect: "error", headers: { Accept: "application/json" }, signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
  } catch { throw new AuthError("NETWORK_ERROR"); }
  if (response.status === 429) {
    sessionBlockedUntil = Date.now() + sessionRetryDelay(response.headers.get("Retry-After") ?? response.headers.get("X-Retry-After"));
    throw new AuthError("TOO_MANY_REQUESTS", 429);
  }
  if (!response.ok) throw new AuthError("SESSION_REQUIRED", response.status);
  const data: unknown = await response.json();
  if (data === null) throw new AuthError("SESSION_REQUIRED", 401);
  if (!isRecord(data) || !isRecord(data.user) || !isRecord(data.session)) throw new AuthError("INVALID_RESPONSE", 502);
  const { user, session } = data;
  if (typeof user.id !== "string" || !user.id || typeof user.name !== "string" || typeof user.email !== "string" ||
    typeof user.active !== "boolean" || typeof user.emailVerified !== "boolean" || !["USER", "ADMIN"].includes(String(user.role)) ||
    typeof session.id !== "string" || !session.id || session.userId !== user.id ||
    typeof session.expiresAt !== "string" || !Number.isFinite(Date.parse(session.expiresAt))) throw new AuthError("INVALID_RESPONSE", 502);
  if (!user.active || Date.parse(session.expiresAt) <= Date.now()) throw new AuthError("SESSION_REQUIRED", 401);
  if (!user.emailVerified) throw new AuthError("EMAIL_NOT_VERIFIED", 403);
  const image = uploadedAvatar(user.image) ? user.image : googleAvatar(user.image);
  return { id: user.id, name: user.name, email: user.email, image, role: user.role as DashboardUser["role"], canConfirmIncidents: user.canConfirmIncidents === true, canPublishInformation: user.canPublishInformation === true };
}
export async function getSharedAccount(fresh = false): Promise<DashboardUser> {
  const current = await queryClient.fetchQuery(fresh ? { ...accountQueryOptions, staleTime: 0 } : accountQueryOptions);
  if (!current) throw new AuthError("SESSION_REQUIRED", 401);
  return current;
}

export const accountQueryOptions = {
  queryKey: queryKeys.account,
  staleTime: 60000,
  gcTime: 300000,
  retry: false,
  retryOnMount: false,
  refetchInterval: 60000,
  refetchIntervalInBackground: false,
  queryFn: async ({ signal }: { signal: AbortSignal }) => {
    try { return await getDashboardUser(signal); }
    catch (error) {
      if (error instanceof AuthError && (error.status === 401 || error.code === "EMAIL_NOT_VERIFIED")) return null;
      throw error;
    }
  },
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
