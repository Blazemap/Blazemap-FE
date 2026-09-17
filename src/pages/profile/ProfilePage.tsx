import { useCallback, useState } from "react";
import { AvatarEditor } from "./components";
import { useOutletContext } from "react-router-dom";
import { Check, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { DraftGuard } from "@/components/common";
import { Button } from "@/components/ui";
import { useMutationUpdateProfile, usePassword } from "@/hooks/profile";
import { privateError } from "@/lib";
import { validatePasswordChange } from "@/lib/auth";
import { rainforest, rainforestSmall } from "@/assets";
import type { DashboardUser, PasswordValues } from "@/types";

const empty: PasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "", revokeOtherSessions: true };
const input = "mt-2 min-h-12 w-full rounded-xl border border-input bg-white px-4 text-sm";

function PasswordSkeleton() {
  return <div role="status" aria-label="Checking sign-in method" className="space-y-5 motion-safe:animate-pulse"><span className="sr-only">Checking sign-in method</span>{Array.from({ length: 3 }, (_, index) => <div key={index}><span className="block h-3 w-32 rounded-full bg-secondary" /><span className="mt-2 block h-12 w-full rounded-xl border border-input bg-secondary/70" /></div>)}<span className="block h-11 w-72 max-w-full rounded-xl bg-secondary" /><div className="flex justify-end gap-3 border-t pt-5"><span className="h-11 w-20 rounded-lg bg-secondary" /><span className="h-11 w-36 rounded-lg bg-secondary" /></div></div>;
}

export default function ProfilePage() {
  const initial = useOutletContext<DashboardUser>();
  return <Profile key={initial.id} initial={initial} />;
}

function Profile({ initial }: { initial: DashboardUser }) {
  const [user, setUser] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [section, setSection] = useState<"profile" | "password">("profile");
  const [values, setValues] = useState(empty);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutationUpdateProfile(user);
  const password = usePassword(user, section === "password");
  const dirtyName = name.trim() !== user.name;
  const dirtyPassword = !!(values.currentPassword || values.newPassword || values.confirmPassword);
  const [photo, setPhoto] = useState({ dirty: false, pending: false });
  const handlePhotoState = useCallback((dirty: boolean, pending: boolean) => setPhoto({ dirty, pending }), []);
  const pending = mutation.isPending || password.pending || photo.pending;
  const valid = name.trim().length > 0 && name.trim().length <= 100;
  const errors = validatePasswordChange(values);
  return <><DraftGuard dirty={dirtyName || dirtyPassword || photo.dirty} pending={pending} />
    <div className="relative isolate min-h-[calc(100dvh-80px)] overflow-hidden bg-white lg:min-h-[calc(100dvh-88px)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-forest"><picture className="absolute inset-0 block"><source media="(max-width: 640px)" srcSet={rainforestSmall} /><img src={rainforest} alt="" className="size-full object-cover object-[50%_58%] opacity-70" decoding="async" /></picture><div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-background from-30% to-transparent sm:h-56" /></div>
      <div className="relative mx-auto min-h-[calc(100dvh-80px)] w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:min-h-[calc(100dvh-88px)]">
      <h1 className="mb-7 text-3xl font-extrabold tracking-tight text-forest">Account settings</h1>
      <div className="grid items-start gap-4 sm:gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Account sections" className="grid grid-cols-2 gap-2 rounded-2xl border border-primary/10 bg-white p-2 shadow-sm md:flex md:flex-col">{([['profile', 'Profile', UserRound], ['password', 'Change password', KeyRound]] as const).map(([value, label, Icon]) => <button key={value} type="button" disabled={pending} aria-pressed={section === value} aria-controls="account-settings" onClick={() => setSection(value)} className={`flex min-h-12 flex-1 items-center gap-3 rounded-xl px-4 text-left text-sm font-bold ${section === value ? "bg-primary text-white" : "hover:bg-secondary"}`}><Icon size={18} aria-hidden="true" />{label}</button>)}</nav>
        <section id="account-settings" aria-labelledby="settings-title" className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
          <header className="border-b border-primary/10 px-6 py-5"><h2 id="settings-title" className="text-xl font-extrabold">{section === "profile" ? "Profile details" : "Change password"}</h2></header>
          <div hidden={section !== "profile"}><AvatarEditor user={user} disabled={pending} onSaved={setUser} onState={handlePhotoState} /></div>
          {section === "profile" ? <form className="space-y-6 p-6" onSubmit={event => { event.preventDefault(); if (!valid || !dirtyName || pending) return; mutation.mutate(name, { onSuccess: updated => { setUser(updated); setName(updated.name); } }); }}>
            <div><label htmlFor="profile-name" className="text-sm font-bold">Full name</label><input id="profile-name" autoComplete="name" required maxLength={100} value={name} disabled={pending} aria-invalid={!valid} aria-describedby="profile-status" className={input} onChange={event => { setName(event.target.value); mutation.reset(); }} /></div>
            <div><label htmlFor="profile-email" className="text-sm font-bold">Email address</label><input id="profile-email" type="email" readOnly value={user.email} aria-describedby="email-help" className={`${input} text-muted-foreground`} /><p id="email-help" className="mt-2 text-xs text-muted-foreground">Email changes are not enabled for this service.</p></div>
            <p id="profile-status" role={mutation.isError ? "alert" : "status"} className="flex items-start gap-2 text-sm">{mutation.isSuccess && <Check size={18} aria-hidden="true" />}{mutation.isError ? privateError(mutation.error) : mutation.isSuccess ? "Profile saved and confirmed with your session." : !valid ? "Enter a name between 1 and 100 characters." : dirtyName ? "You have unsaved changes." : "Your profile is up to date."}</p>
            <div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" disabled={!dirtyName || pending} onClick={() => { setName(user.name); mutation.reset(); }}>Cancel</Button><Button type="submit" disabled={!valid || !dirtyName || pending}>{mutation.isPending ? "Saving…" : "Save changes"}</Button></div>
          </form> : <div className="p-6">
            {password.account.isPending ? <PasswordSkeleton /> : password.account.isError ? <div role="alert"><p>Unable to check your sign-in method.</p><Button variant="outline" className="mt-4" onClick={() => void password.account.refetch()}>Retry</Button></div> : !password.account.data ? <p className="text-sm leading-6">This account uses a sign-in provider and has no Blazemap password. Manage your password with that provider.</p> : <form noValidate className="space-y-5" onSubmit={async event => { event.preventDefault(); setSubmitted(true); if (pending || Object.keys(errors).length) return; if (await password.submit(values)) { setValues(empty); setVisible({}); setSubmitted(false); } }}>
              <fieldset disabled={pending} className="space-y-5">
                {([['currentPassword', 'Current password', 'current-password'], ['newPassword', 'New password', 'new-password'], ['confirmPassword', 'Confirm new password', 'new-password']] as const).map(([field, label, autocomplete]) => <div key={field}><label htmlFor={field} className="text-sm font-bold">{label}</label><div className="relative"><input id={field} name={field} type={visible[field] ? "text" : "password"} autoComplete={autocomplete} required minLength={field === "currentPassword" ? 1 : 12} maxLength={128} value={values[field]} aria-invalid={submitted && !!errors[field]} aria-describedby={`${field}-help`} className={`${input} pr-14`} onChange={event => { setValues(current => ({ ...current, [field]: event.target.value })); password.reset(); }} /><button type="button" aria-label={`${visible[field] ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={!!visible[field]} aria-controls={field} onClick={() => setVisible(current => ({ ...current, [field]: !current[field] }))} className="absolute right-1 top-3 grid size-11 place-items-center rounded-lg hover:bg-secondary">{visible[field] ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div><p id={`${field}-help`} role={submitted && errors[field] ? "alert" : undefined} className="mt-2 text-xs text-muted-foreground">{submitted && errors[field] ? errors[field] : field === "newPassword" ? "Use 12–128 characters." : ""}</p></div>)}
                <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={values.revokeOtherSessions} onChange={event => setValues(current => ({ ...current, revokeOtherSessions: event.target.checked }))} />Sign out other sessions after changing the password</label>
              </fieldset>
              {password.error && <p role="alert" className="text-sm text-red-800">{password.error}</p>}{password.success && <p role="status" className="text-sm text-primary">Password changed successfully.</p>}
              <div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" disabled={pending || !dirtyPassword} onClick={() => { setValues(empty); setVisible({}); setSubmitted(false); password.reset(); }}>Cancel</Button><Button type="submit" disabled={pending || !dirtyPassword}>{password.pending ? "Changing…" : "Change password"}</Button></div>
            </form>}
          </div>}
        </section>
      </div>
      </div>
    </div>
  </>;
}
