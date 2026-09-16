import { AuthError } from "@/lib";
import type { AuthMode, AuthPortal } from "@/lib";

function authURL(): string {
  const configured: unknown = import.meta.env?.VITE_AUTH_URL;
  if (configured === undefined || configured === "") return "/api/auth";
  try {
    if (
      typeof configured !== "string" ||
      /[\s\\?#]/.test(configured) ||
      !/^https?:\/\/[^/]+(?:\/|\/api\/auth\/?)?$/i.test(configured)
    ) throw new Error();
    const url = new URL(configured);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username || url.password || url.search || url.hash ||
      !["/", "/api/auth", "/api/auth/"].includes(url.pathname)
    ) throw new Error();
    return `${url.origin}/api/auth`;
  } catch {
    throw new AuthError("CONFIGURATION_ERROR");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type AuthUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  emailVerified: boolean;
  role: "USER" | "ADMIN";
};

function isUser(value: unknown): value is AuthUser {
  return isRecord(value) && isId(value.id) && typeof value.name === "string" &&
    isId(value.email) && typeof value.active === "boolean" &&
    typeof value.emailVerified === "boolean" && (value.role === "USER" || value.role === "ADMIN");
}

function requireAvailableUser(user: AuthUser): void {
  if (!user.active) throw new AuthError("ACCOUNT_UNAVAILABLE", 401);
  if (!user.emailVerified) throw new AuthError("EMAIL_NOT_VERIFIED", 403);
}

function errorCode(body: unknown, status: number): string {
  if (status === 429) return "TOO_MANY_REQUESTS";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  const code = isRecord(body) && typeof body.code === "string" ? body.code.toUpperCase() : "";
  if ((status === 401 || status === 403) && code === "EMAIL_NOT_VERIFIED") return code;
  if (status === 401 && code === "ACCOUNT_UNAVAILABLE") return code;
  if (status === 401 && ["INVALID_EMAIL_OR_PASSWORD", "EMAIL_OR_PASSWORD"].includes(code)) {
    return "INVALID_EMAIL_OR_PASSWORD";
  }
  if (status === 403 && code === "INVALID_ORIGIN") return code;
  if (status === 404 && code === "PROVIDER_NOT_FOUND") return code;
  if (status === 400 && ["INVALID_EMAIL", "INVALID_PASSWORD", "VALIDATION_ERROR", "PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG"].includes(code)) return code;
  return "REQUEST_FAILED";
}

function requestSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(20_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function request(url: string, body: Record<string, string | boolean> | undefined, signal: AbortSignal): Promise<unknown> {
  try {
    signal.throwIfAborted();
    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      credentials: "include",
      redirect: "error",
      cache: "no-store",
      headers: body ? { Accept: "application/json", "Content-Type": "application/json" } : { Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      signal.throwIfAborted();
      if (response.ok) throw new AuthError("INVALID_RESPONSE", 502);
    }
    signal.throwIfAborted();
    if (!response.ok) throw new AuthError(errorCode(data, response.status), response.status);
    return data;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (signal.aborted) {
      throw new AuthError(signal.reason instanceof DOMException && signal.reason.name === "TimeoutError" ? "TIMEOUT" : "ABORTED");
    }
    throw new AuthError("NETWORK_ERROR");
  }
}

function loginURL(query: string, portal: AuthPortal): string {
  return new URL(`/login?${query}${portal === "government" ? "&portal=government" : ""}`, window.location.origin).href;
}

export async function signOut(signal?: AbortSignal): Promise<void> {
  try {
    const combined = requestSignal(signal);
    const result = await request(`${authURL()}/sign-out`, { disableRedirect: true }, combined);
    if (!isRecord(result) || result.success !== true) throw new AuthError("INVALID_RESPONSE", 502);
    const current = await request(`${authURL()}/get-session`, undefined, combined);
    if (current !== null) throw new AuthError("SESSION_REQUIRED", 401);
  } catch (error) {
    throw new AuthError("SWITCH_ACCOUNT_FAILED", error instanceof AuthError ? error.status : 0);
  }
}

async function requirePortal(user: AuthUser, portal: AuthPortal, signal: AbortSignal, shouldClearSession = false): Promise<void> {
  if (user.role === (portal === "government" ? "ADMIN" : "USER")) return;
  if (shouldClearSession) await signOut(signal);
  throw new AuthError(user.role === "ADMIN" ? "GOVERNMENT_PORTAL_REQUIRED" : "CITIZEN_PORTAL_REQUIRED", 403);
}

async function verifySession(portal: AuthPortal, signal: AbortSignal, expectedId?: string): Promise<void> {
  const current = await request(`${authURL()}/get-session`, undefined, signal);
  if (current === null) throw new AuthError("SESSION_REQUIRED", 401);
  if (
    !isRecord(current) || !isRecord(current.session) || !isId(current.session.id) ||
    !isUser(current.user) || current.session.userId !== current.user.id ||
    (expectedId !== undefined && current.user.id !== expectedId)
  ) throw new AuthError("INVALID_RESPONSE", 502);
  requireAvailableUser(current.user);
  await requirePortal(current.user, portal, signal);
}

export async function getSession(portal: AuthPortal, signal?: AbortSignal): Promise<void> {
  await verifySession(portal, requestSignal(signal));
}

export async function completeOAuth(portal: AuthPortal, signal?: AbortSignal): Promise<void> {
  await getSession(portal, signal);
}

export async function signIn(email: string, password: string, portal: AuthPortal, signal?: AbortSignal): Promise<void> {
  const combined = requestSignal(signal);
  const callbackURL = loginURL("verified=1", portal);
  const result = await request(`${authURL()}/sign-in/email`, { email, password, callbackURL }, combined);
  if (!isRecord(result) || !isId(result.token) || typeof result.redirect !== "boolean" || !isUser(result.user)) {
    throw new AuthError("INVALID_RESPONSE", 502);
  }
  requireAvailableUser(result.user);
  await requirePortal(result.user, portal, combined, true);
  await verifySession(portal, combined, result.user.id);
}

export async function signUp(name: string, email: string, password: string, signal?: AbortSignal): Promise<void> {
  const callbackURL = loginURL("verified=1", "citizen");
  const result = await request(`${authURL()}/sign-up/email`, { name, email, password, callbackURL }, requestSignal(signal));
  if (!isRecord(result) || result.token !== null || !isUser(result.user) || result.user.role !== "USER") {
    throw new AuthError("INVALID_RESPONSE", 502);
  }
}

export async function resendVerification(email: string, portal: AuthPortal, signal?: AbortSignal): Promise<void> {
  const callbackURL = loginURL("verified=1", portal);
  const result = await request(`${authURL()}/send-verification-email`, { email, callbackURL }, requestSignal(signal));
  if (!isRecord(result) || result.status !== true) throw new AuthError("INVALID_RESPONSE", 502);
}

export async function getAuthCapabilities(signal?: AbortSignal): Promise<{ googleAvailable: boolean }> {
  const authOrigin = authURL().slice(0, -"/api/auth".length);
  const result = await request(`${authOrigin}/api/public/status`, undefined, requestSignal(signal));
  if (!isRecord(result) || !isRecord(result.data) || typeof result.data.googleAvailable !== "boolean") {
    throw new AuthError("INVALID_RESPONSE", 502);
  }
  return { googleAvailable: result.data.googleAvailable };
}

export async function startOAuth(mode: AuthMode, portal: AuthPortal, signal?: AbortSignal): Promise<string> {
  if (mode === "register" && portal === "government") throw new AuthError("GOVERNMENT_REGISTRATION_DISABLED", 403);
  const callbackURL = loginURL("oauth=google&complete=1", portal);
  const result = await request(`${authURL()}/sign-in/social`, {
    provider: "google",
    disableRedirect: true,
    requestSignUp: mode === "register" && portal === "citizen",
    callbackURL,
    newUserCallbackURL: callbackURL,
    errorCallbackURL: loginURL("oauth=google", portal),
  }, requestSignal(signal));
  if (!isRecord(result) || result.redirect !== false || typeof result.url !== "string" || /[\s\\#]/.test(result.url)) {
    throw new AuthError("INVALID_RESPONSE", 502);
  }
  try {
    const url = new URL(result.url);
    if (
      url.origin !== "https://accounts.google.com" || url.username || url.password || url.hash ||
      !["/o/oauth2/auth", "/o/oauth2/v2/auth"].includes(url.pathname) ||
      !isId(url.searchParams.get("client_id")) || !isId(url.searchParams.get("state")) ||
      url.searchParams.getAll("client_id").length !== 1 || url.searchParams.getAll("state").length !== 1
    ) throw new Error();
    return url.href;
  } catch {
    throw new AuthError("INVALID_RESPONSE", 502);
  }
}
