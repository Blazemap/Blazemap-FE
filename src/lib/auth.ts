import type { PasswordValues } from "@/types";

export function validatePasswordChange(values: PasswordValues): Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>> {
  const errors: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>> = {};
  if (!values.currentPassword || values.currentPassword.length > 128) errors.currentPassword = "Enter your current password (up to 128 characters).";
  if (values.newPassword.length < 12 || values.newPassword.length > 128) errors.newPassword = "Use a password between 12 and 128 characters.";
  else if (values.newPassword === values.currentPassword) errors.newPassword = "Choose a different password.";
  if (!values.confirmPassword || values.newPassword !== values.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

export function passwordError(error: unknown): string {
  if (error instanceof AuthError) {
    if (error.code === "INVALID_PASSWORD") return "Your current password is incorrect.";
    if (error.code === "CREDENTIAL_ACCOUNT_NOT_FOUND") return "This account has no password. Manage your password with your sign-in provider.";
    if (error.code === "ACCOUNT_CHANGED" || error.status === 401 || error.code === "SESSION_NOT_FRESH") return "Sign in again with the same account before changing your password.";
    if (error.status === 429) return "Too many requests. Wait before trying again.";
    if (["PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG"].includes(error.code)) return "Use a password between 12 and 128 characters.";
  }
  return "The password change could not be confirmed. Try signing in with the new password before retrying.";
}

export type AuthMode = "login" | "register";
export type AuthPortal = "citizen" | "government";

export type AuthValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthField = keyof AuthValues;
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

export function sessionRetryDelay(value: string | null, now = Date.now()): number {
  const seconds = value && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) * 1000 : NaN;
  const delay = Number.isFinite(seconds) ? seconds : value ? Date.parse(value) - now : NaN;
  return Number.isFinite(delay) ? Math.max(1000, Math.min(300000, delay)) : 60000;
}

export class AuthError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status = 0) {
    super("Authentication request failed.");
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

export function validateAuth(values: AuthValues, mode: AuthMode): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const email = values.email.trim();
  if (mode === "register" && !values.name.trim()) errors.name = "Enter your name.";
  if (email.length > 254 || !/^(?!\.)(?!.*\.\.)[a-z0-9.!#$%&'*+/=?^_`{|}~-]+(?<!\.)@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.password) errors.password = "Enter your password.";
  if (mode === "register") {
    if (values.password && (values.password.length < 12 || values.password.length > 128)) {
      errors.password = "Use a password between 12 and 128 characters.";
    }
    if (!values.confirmPassword) errors.confirmPassword = "Confirm your password.";
    else if (values.password !== values.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    if (error.code === "SWITCH_ACCOUNT_FAILED") {
      return "Unable to clear the current session. You may still be signed in. Use another account and try logging in again.";
    }
    if (error.status === 429) return "Too many requests. Please wait before trying again.";
    if (error.status >= 500 && error.status <= 599) return "Authentication is temporarily unavailable. Please try again later.";
    if (error.status === 408) return "The request timed out. Please try again.";
    switch (error.code) {
      case "INVALID_EMAIL":
        return "Enter a valid email address.";
      case "VALIDATION_ERROR":
        return "Check your name, email address, and password, then try again.";
      case "INVALID_PASSWORD":
        return "Enter a valid password.";
      case "PASSWORD_TOO_SHORT":
      case "PASSWORD_TOO_LONG":
        return "Use a password between 12 and 128 characters.";
      case "INVALID_EMAIL_OR_PASSWORD":
        return "The email or password is incorrect.";
      case "EMAIL_NOT_VERIFIED":
        return "Verify your email before logging in.";
      case "ACCOUNT_UNAVAILABLE":
        return "This account is unavailable. Please contact support.";
      case "SESSION_REQUIRED":
        return "Login could not be confirmed. Allow cookies and try again.";
      case "GOVERNMENT_PORTAL_REQUIRED":
        return "This account belongs to the Government portal. Use Government Login, or use another account for Citizen Login.";
      case "CITIZEN_PORTAL_REQUIRED":
        return "This account belongs to Citizen Login. Use the public Login entry, or use an authorized account for the Government portal.";
      case "GOVERNMENT_REGISTRATION_DISABLED":
        return "Government accounts cannot register here. Use Government Login with an authorized account.";
      case "PROVIDER_NOT_FOUND":
      case "GOOGLE_UNAVAILABLE":
        return "Google login is currently unavailable. Use email and password instead.";
      case "INVALID_ORIGIN":
        return "Authentication is not available from this site. Please contact support.";
      case "CONFIGURATION_ERROR":
        return "Authentication is not configured correctly. Please contact support.";
      case "NETWORK_ERROR":
        return "Unable to connect. Check your connection and try again.";
      case "TIMEOUT":
        return "The request timed out. Please try again.";
      case "ABORTED":
        return "The request was cancelled. Please try again.";
    }
  }
  return "Unable to complete the request. Please try again.";
}

export function getOAuthErrorMessage(code: unknown): string {
  switch (typeof code === "string" ? code.toLowerCase() : "") {
    case "access_denied":
      return "Google login was cancelled. Try again or use email and password.";
    case "account_not_linked":
    case "unable_to_link_account":
    case "account_already_linked_to_different_user":
    case "email_does_not_match":
      return "Google is not linked to this account. Use the login method you registered with.";
    case "signup_disabled":
      return "No linked Google account is available for login. Register through Citizen Register, or use an existing account for Government Login.";
    case "email_not_verified":
      return "Google login requires a verified email address. Verify it with Google, or use email and password.";
    case "state_mismatch":
    case "state_not_found":
    case "state_invalid":
    case "state_security_mismatch":
    case "state_generation_error":
    case "state_expired":
    case "invalid_state":
    case "nonce_binding_missing":
    case "issuer_missing":
    case "issuer_mismatch":
      return "Google login could not be verified or has expired. Allow cookies and start again.";
    case "oauth_provider_not_found":
    case "provider_not_found":
      return "Google login is currently unavailable. Use email and password instead.";
    case "account_unavailable":
      return "This account is unavailable. Please contact support.";
    default:
      return "Unable to complete Google login. Try again or use email and password.";
  }
}
