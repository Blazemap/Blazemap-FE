import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { queryClient } from "@/config/react-query";
import { queryKeys } from "@/api/queryKeys";
import { completeOAuth, getAuthCapabilities, resendVerification, signIn, signUp, startOAuth } from "@/api";
import { AuthError, getAuthErrorMessage, getOAuthErrorMessage, validateAuth } from "@/lib";
import type { AuthField, AuthFieldErrors, AuthMode, AuthPortal, AuthValues } from "@/lib";

export function useAuth(mode: AuthMode, portal: AuthPortal = "citizen") {
  const [params] = useSearchParams();
  const [oauth] = useState(() => ({
    complete: mode === "login" && params.get("oauth") === "google" && params.get("complete") === "1" && !params.has("error"),
    error: mode === "login" && params.get("oauth") === "google" && params.has("error") ? getOAuthErrorMessage(params.get("error")) : "",
  }));
  const [role, setRole] = useState<"USER" | "ADMIN" | null>(null);
  const [phase, setPhase] = useState<"form" | "checking" | "verification" | "success">(oauth.complete ? "checking" : "form");
  const [isPending, setIsPending] = useState(oauth.complete);
  const [error, setError] = useState(oauth.error);
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [googleState, setGoogleState] = useState<"checking" | "available" | "unavailable">("checking");
  const [verificationEmail, setVerificationEmail] = useState("");
  const request = useRef<AbortController | null>(null);
  const redirecting = useRef(false);

  useEffect(() => {
    const statusController = new AbortController();
    void getAuthCapabilities(statusController.signal).then((capabilities) => {
      if (!statusController.signal.aborted) setGoogleState(capabilities.googleAvailable ? "available" : "unavailable");
    }).catch(() => {
      if (!statusController.signal.aborted) setGoogleState("unavailable");
    });

    if (oauth.complete) {
      const controller = new AbortController();
      request.current = controller;
      void completeOAuth(portal, controller.signal).then(verifiedRole => {
        if (request.current === controller) { queryClient.removeQueries({ queryKey: queryKeys.account }); setRole(verifiedRole); setPhase("success"); }
      }).catch((cause: unknown) => {
        if (request.current !== controller) return;
        setPhase("form");
        setError(getAuthErrorMessage(cause));
      }).finally(() => {
        if (request.current === controller) {
          request.current = null;
          setIsPending(false);
        }
      });
    }

    function handlePageShow(event: PageTransitionEvent): void {
      if (!event.persisted || !redirecting.current) return;
      request.current?.abort();
      request.current = null;
      redirecting.current = false;
      setIsPending(false);
      setNotice("Google login was not completed. Try again or use email and password.");
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      statusController.abort();
      request.current?.abort();
      request.current = null;
      redirecting.current = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [oauth.complete, portal]);

  function reset(): void {
    request.current?.abort();
    request.current = null;
    redirecting.current = false;
    setPhase("form");
    setIsPending(false);
    setError("");
    setNotice("");
    setFieldErrors({});
    setAttempt(0);
    setVerificationEmail("");
  }

  function clearFieldError(field: AuthField): void {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function submit(values: AuthValues): Promise<void> {
    if (request.current || phase !== "form") return;
    setAttempt((current) => current + 1);
    setError("");
    setNotice("");
    const validation = validateAuth(values, mode);
    setFieldErrors(validation);
    if (mode === "register" && portal === "government") {
      setError(getAuthErrorMessage(new AuthError("GOVERNMENT_REGISTRATION_DISABLED")));
      return;
    }
    if (Object.keys(validation).length) return;

    const controller = new AbortController();
    request.current = controller;
    setIsPending(true);
    const email = values.email.trim();
    setVerificationEmail(email);
    try {
      if (mode === "register") {
        await signUp(values.name.trim(), email, values.password, controller.signal);
      } else {
        const verifiedRole = await signIn(email, values.password, portal, controller.signal);
        if (request.current !== controller) return;
        queryClient.removeQueries({ queryKey: queryKeys.account });
        setRole(verifiedRole);
      }
      if (request.current !== controller) return;
      setPhase(mode === "register" ? "verification" : "success");
    } catch (cause) {
      if (request.current !== controller) return;
      const message = getAuthErrorMessage(cause);
      if (cause instanceof AuthError && cause.code === "EMAIL_NOT_VERIFIED" && (cause.status === 401 || cause.status === 403)) {
        setPhase("verification");
      } else if (cause instanceof AuthError && cause.status !== 408 && cause.status !== 429 && cause.status < 500) {
        if (cause.code === "INVALID_EMAIL") setFieldErrors({ email: message });
        else if (["INVALID_EMAIL_OR_PASSWORD", "INVALID_PASSWORD", "PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG"].includes(cause.code)) {
          setFieldErrors({ password: message });
        } else setError(message);
      } else setError(message);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setIsPending(false);
      }
    }
  }

  async function startGoogle(): Promise<void> {
    if (request.current || phase !== "form") return;
    setError("");
    setNotice("");
    setFieldErrors({});
    if (mode === "register" && portal === "government") {
      setError(getAuthErrorMessage(new AuthError("GOVERNMENT_REGISTRATION_DISABLED")));
      return;
    }
    if (googleState !== "available") {
      setError(getAuthErrorMessage(new AuthError("GOOGLE_UNAVAILABLE")));
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setIsPending(true);
    try {
      const url = await startOAuth(mode, portal, controller.signal);
      if (request.current !== controller) return;
      redirecting.current = true;
      window.location.assign(url);
    } catch (cause) {
      if (request.current !== controller) return;
      redirecting.current = false;
      setError(getAuthErrorMessage(cause));
    } finally {
      if (request.current === controller && !redirecting.current) {
        request.current = null;
        setIsPending(false);
      }
    }
  }

  async function resend(): Promise<void> {
    if (request.current || phase !== "verification" || !verificationEmail) return;
    const controller = new AbortController();
    request.current = controller;
    setIsPending(true);
    setError("");
    setNotice("");
    try {
      await resendVerification(verificationEmail, portal, controller.signal);
      if (request.current !== controller) return;
      setNotice("If this address needs verification, a new link has been requested. Check your inbox and spam folder.");
    } catch (cause) {
      if (request.current !== controller) return;
      setError(getAuthErrorMessage(cause));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setIsPending(false);
      }
    }
  }

  return { role, phase, isPending, error, notice, fieldErrors, attempt, googleState, submit, startGoogle, resend, reset, clearFieldError, verificationEmail };
}
