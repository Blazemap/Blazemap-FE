import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { CheckCircle, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { useAuth, useMotionPreference } from "@/hooks";
import type { AuthField, AuthMode, AuthPortal } from "@/lib";

function AuthInput({ name, label, type = "text", autoComplete, error, attempt, helper, onChange }: {
  name: AuthField;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  error?: string;
  attempt: number;
  helper?: string;
  onChange: (field: AuthField) => void;
}) {
  const [isVisible, setVisible] = useState(false);
  const controls = useAnimationControls();
  const isReducedMotion = useMotionPreference();
  const id = `auth-${name}`;

  useEffect(() => {
    if (error && !isReducedMotion) void controls.start({ x: [0, -5, 4, -3, 2, 0], transition: { duration: 0.32 } });
    else controls.set({ x: 0 });
  }, [attempt, error, isReducedMotion, controls]);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold leading-5">{label}</label>
      <motion.div animate={controls} className="relative">
        <input
          id={id}
          name={name}
          type={type === "password" && isVisible ? "text" : type}
          autoComplete={autoComplete}
          autoCapitalize={type === "password" || type === "email" ? "none" : undefined}
          spellCheck={type === "password" || type === "email" ? false : undefined}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error || helper ? `${id}-message` : undefined}
          onInput={() => onChange(name)}
          className={`h-11 w-full rounded-lg border bg-card px-3.5 text-base outline-offset-2 transition-colors disabled:opacity-60 ${type === "password" ? "pr-12" : ""} ${error ? "border-red-700 bg-red-50/40 focus-visible:outline-red-700" : "border-primary/25 hover:border-primary/50 focus-visible:border-primary"}`}
        />
        {type === "password" && (
          <button type="button" aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-controls={id} onClick={() => setVisible((visible) => !visible)} className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-primary disabled:opacity-50">
            {isVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </motion.div>
      {(error || helper) && <p id={`${id}-message`} aria-live="polite" className={`mt-1 text-xs leading-4 ${error ? "text-red-700" : "text-muted-foreground"}`}>{error || helper}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.07v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.94a6 6 0 0 1 0-3.88V7.47H3.07a10 10 0 0 0 0 9.06l3.34-2.59Z" />
      <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.34 2.59C7.2 7.71 9.4 5.96 12 5.96Z" />
    </svg>
  );
}

export function AuthForm({ mode, portal = "citizen" }: { mode: AuthMode; portal?: AuthPortal }) {
  const { phase, isPending, error, notice, fieldErrors, attempt, googleState, submit, startGoogle, resend, reset, clearFieldError, verificationEmail } = useAuth(mode, portal);
  const [params] = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const previousPhase = useRef(phase);
  const focusCycle = useRef({ attempt: 0, wasPending: false });
  const isRegister = mode === "register";
  const isGovernment = portal === "government";
  const loginPath = isGovernment ? "/login?portal=government" : "/login";
  const heading = phase === "checking" ? "Confirming your login" : phase === "success" ? "You’re logged in" : phase === "verification" ? "Check your email" : isRegister ? "Create an account" : isGovernment ? "Government Login" : "Welcome back";
  const verificationError = params.has("error") && params.get("oauth") !== "google"
    ? "The verification link is invalid or expired. Login to request a new one."
    : "";
  const verificationNotice = !isRegister && params.get("verified") === "1" && !params.has("error") ? "If you have verified your email, you can log in below." : "";

  useEffect(() => {
    if (previousPhase.current !== phase) headingRef.current?.focus({ preventScroll: true });
    previousPhase.current = phase;
  }, [phase]);

  useEffect(() => {
    const shouldFocus = attempt !== focusCycle.current.attempt || focusCycle.current.wasPending;
    focusCycle.current = { attempt, wasPending: isPending };
    if (isPending || !shouldFocus) return;
    const firstInvalid = formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
    else if (error) errorRef.current?.focus();
  }, [attempt, fieldErrors, error, isPending]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submit({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
    });
  }

  function handleFieldChange(field: AuthField) {
    clearFieldError(field);
    if (field === "password") clearFieldError("confirmPassword");
  }

  return (
    <section aria-labelledby="auth-heading" className="auth-form">
      {phase === "success" && <CheckCircle aria-hidden="true" className="mb-4 size-11 text-primary" strokeWidth={1.5} />}
      <h1 id="auth-heading" ref={headingRef} tabIndex={-1} className="text-[clamp(28px,3vw,38px)] font-extrabold leading-[1.12] tracking-[-0.035em]">{heading}</h1>
      {phase === "form" && <p className="mt-2 text-sm leading-6 text-muted-foreground">{isGovernment ? "For authorized government accounts only." : isRegister ? "Register as a citizen to get started." : "Login to your Blazemap account."}</p>}
      {phase === "success" && <p className="mt-3 text-sm leading-6 text-muted-foreground">{isGovernment ? "Your government account is authenticated." : "Your citizen account is authenticated."}</p>}
      {phase === "checking" && <div role="status" className="mt-6 flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle size={20} aria-hidden="true" className="motion-safe:animate-spin" />Verifying your account and access.</div>}
      {phase === "verification" && <><p className="mt-4 break-words text-sm font-bold">{verificationEmail}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{isRegister ? "If this address can be registered, check your inbox and spam folder for a verification link. Verify your email before logging in." : "Verify your email before logging in. Check your inbox and spam folder, or request a new link."}</p></>}
      {phase === "form" && (verificationError || verificationNotice) && <p className={`mt-3 text-xs leading-5 ${verificationError ? "text-red-700" : "text-muted-foreground"}`}>{verificationError || verificationNotice}</p>}
      <p ref={errorRef} role="alert" tabIndex={-1} className={error ? "mt-3 rounded-lg border border-red-700/20 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800" : "sr-only"}>{error}</p>
      <p role="status" className={notice ? "mt-3 text-sm leading-6 text-primary" : "sr-only"}>{notice}</p>
      {phase === "form" && (
        <>
          <Button type="button" variant="outline" onClick={() => { void startGoogle(); }} disabled={isPending || googleState !== "available"} aria-describedby={googleState !== "available" ? "google-availability" : undefined} className="mt-5 h-11 w-full rounded-lg bg-card font-bold">
            <GoogleMark />Continue with Google
          </Button>
          {googleState !== "available" && <p id="google-availability" className="mt-1 text-center text-xs leading-4 text-muted-foreground">{googleState === "checking" ? "Checking Google availability…" : "Google login is unavailable. Use email below."}</p>}
          <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>or continue with email</span><span className="h-px flex-1 bg-border" /></div>
          <form ref={formRef} method="post" noValidate onSubmit={handleSubmit}>
            <fieldset disabled={isPending} className="min-w-0 space-y-2">
              <legend className="sr-only">{isRegister ? "Registration details" : "Login details"}</legend>
              {isRegister && <AuthInput name="name" label="Full name" autoComplete="name" error={fieldErrors.name} attempt={attempt} onChange={handleFieldChange} />}
              <AuthInput name="email" label="Email" type="email" autoComplete="email" error={fieldErrors.email} attempt={attempt} onChange={handleFieldChange} />
              <AuthInput name="password" label="Password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} error={fieldErrors.password} attempt={attempt} helper={isRegister ? "12–128 characters" : undefined} onChange={handleFieldChange} />
              {isRegister && <AuthInput name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" error={fieldErrors.confirmPassword} attempt={attempt} onChange={handleFieldChange} />}
              <Button type="submit" className="mt-1 h-11 w-full rounded-lg font-bold">
                {isPending && <LoaderCircle size={18} aria-hidden="true" className="motion-safe:animate-spin" />}
                {isPending ? "Please wait…" : isRegister ? "Register" : "Login"}
              </Button>
            </fieldset>
          </form>
          <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">
            {isGovernment ? <Link to="/login" className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">Citizen Login</Link> : <>{isRegister ? "Have an account?" : "New here?"}{" "}<Link to={isRegister ? "/login" : "/register"} className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">{isRegister ? "Login" : "Register"}</Link></>}
          </p>
        </>
      )}
      {phase === "verification" && <><fieldset disabled={isPending} className="mt-6 min-w-0 space-y-3"><legend className="sr-only">Email verification</legend><Button type="button" onClick={() => { void resend(); }} className="min-h-11 w-full font-bold">{isPending ? "Requesting link…" : "Resend verification email"}</Button><Button type="button" variant="outline" onClick={reset} className="min-h-11 w-full font-bold">Change details</Button></fieldset><Link to={loginPath} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4">Login</Link></>}
      {phase === "success" && <Button asChild className="mt-6 min-h-12 w-full font-bold"><a href="/">Back to home</a></Button>}
    </section>
  );
}

export default AuthForm;
