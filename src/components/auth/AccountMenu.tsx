import { useRef, useState } from "react";
import { AlertDialog, DropdownMenu } from "radix-ui";
import { ChevronDown, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { useLogout } from "@/hooks";
import { useAvatar } from "@/hooks/profile";
import type { DashboardUser } from "@/types";
import { workspacePath } from "@/lib/dashboard";

const menuItem = "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-secondary data-[disabled]:cursor-default data-[disabled]:text-muted-foreground";

export function AccountMenu({ user }: { user: DashboardUser }) {
  const [isOpen, setOpen] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const avatar = useAvatar(user);
  const [failedImage, setFailedImage] = useState<string>();
  const trigger = useRef<HTMLButtonElement>(null);
  const { logout, isPending, error, resetError } = useLogout();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] ?? "").join("").toLocaleUpperCase("en") || "?";
  async function handleLogout() {
    if (!await logout()) return;
    setConfirmOpen(false);
    if (["/dashboard", "/monitoring", "/feed", "/account", "/profile", "/my-reports", "/report"].some(path => pathname.startsWith(path))) navigate("/", { replace: true });
    requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>('header a[href="/login"]')?.focus());
  }
  return <>
    <DropdownMenu.Root open={isOpen} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild><Button ref={trigger} variant="ghost" className="min-h-11 min-w-0 shrink rounded-full border-0 bg-transparent px-1 py-1 shadow-none hover:bg-transparent focus-visible:bg-transparent data-[state=open]:bg-transparent" aria-label={`Account menu for ${user.name || "Account"}, ${user.email}`}><span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-forest text-sm font-extrabold text-white">{avatar.url && failedImage !== avatar.url ? <img src={avatar.url} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailedImage(avatar.url)} /> : initials}</span><span className="hidden min-w-0 max-w-24 text-left sm:block sm:max-w-32 lg:max-w-40"><span className="block truncate text-xs font-extrabold sm:text-sm">{user.name || "Account"}</span><span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span></span><ChevronDown size={15} aria-hidden="true" /></Button></DropdownMenu.Trigger>
      <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={8} collisionPadding={12} data-lenis-prevent className="z-[70] w-72 max-w-[calc(100vw-24px)] rounded-xl border bg-white p-2 text-forest shadow-xl" onCloseAutoFocus={(event) => { if (isConfirmOpen) event.preventDefault(); }}>
        <DropdownMenu.Label className="block px-3 py-3"><span className="block break-words text-sm font-extrabold">{user.name || "Account"}</span><span className="mt-1 block break-all text-xs font-normal text-muted-foreground">{user.email}</span></DropdownMenu.Label>
        <DropdownMenu.Separator className="my-1 h-px bg-border" />
        <DropdownMenu.Item asChild className={menuItem}><Link to={workspacePath(user.role)}><LayoutDashboard size={17} aria-hidden="true" />{user.role === "ADMIN" ? "Monitoring" : "Dashboard"}</Link></DropdownMenu.Item>
        <DropdownMenu.Item asChild className={menuItem}><Link to="/account"><UserRound size={17} aria-hidden="true" />Profile</Link></DropdownMenu.Item>
        <DropdownMenu.Separator className="my-1 h-px bg-border" />
        <DropdownMenu.Item className={menuItem} onSelect={() => { resetError(); setConfirmOpen(true); }}><LogOut size={17} aria-hidden="true" />Logout</DropdownMenu.Item>
      </DropdownMenu.Content></DropdownMenu.Portal>
    </DropdownMenu.Root>
    <AlertDialog.Root open={isConfirmOpen} onOpenChange={(open) => { if (!isPending) setConfirmOpen(open); }}>
      <AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-[80] bg-forest/40" /><AlertDialog.Content data-lenis-prevent className="fixed left-1/2 top-1/2 z-[90] w-[calc(100%_-_32px)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 text-forest shadow-2xl" onEscapeKeyDown={(event) => { if (isPending) event.preventDefault(); }} onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}>
        <AlertDialog.Title className="text-xl font-extrabold">Logout?</AlertDialog.Title>
        <AlertDialog.Description className="mt-2 break-words text-sm leading-6 text-muted-foreground">Log out of {user.email}? You can log in again anytime.</AlertDialog.Description>
        {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex justify-end gap-2"><AlertDialog.Cancel asChild><Button variant="outline" disabled={isPending}>Cancel</Button></AlertDialog.Cancel><AlertDialog.Action asChild><Button disabled={isPending} aria-busy={isPending} onClick={(event) => { event.preventDefault(); void handleLogout(); }}>{isPending ? "Logging out…" : "Logout"}</Button></AlertDialog.Action></div>
      </AlertDialog.Content></AlertDialog.Portal>
    </AlertDialog.Root>
  </>;
}
