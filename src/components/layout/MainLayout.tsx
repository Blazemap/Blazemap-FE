import { useEffect, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { Building2, LogIn, Menu, X } from "lucide-react";
import { Brand } from "@/components/common";
import { Outlet, useLocation } from "react-router-dom";
import type { DashboardUser } from "@/types";
import { dashboardLogin, sameDashboardAccount } from "@/lib";
import { workspacePath } from "@/lib/dashboard";
import SmoothScroll from "./SmoothScroll";
import { Button } from "@/components/ui";
import { useAccount, useMotionPreference } from "@/hooks";
import { AccountMenu } from "@/components/auth";

const links = [
  { label: "Home", href: "/" },
  { label: "Contact", href: "/contact" },
];

export default function MainLayout({ accountUser }: { accountUser?: DashboardUser } = {}) {
  const { pathname } = useLocation();
  const account = useAccount();
  const user = accountUser ?? (account.isError ? null : account.data);
  const isGuest = !accountUser && account.isSuccess && account.data === null;
  useEffect(() => {
    if (!accountUser || account.isPending || account.isError) return;
    const current = account.data;
    if (!current || !sameDashboardAccount(accountUser, current)) window.location.replace(current ? workspacePath(current.role) : dashboardLogin(accountUser.role));
  }, [account.data, account.isError, account.isPending, accountUser]);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const isReducedMotion = useMotionPreference();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const activePath = pathname.replace(/\/+$/, "") || "/";

  useEffect(() => {
    const title = accountUser ? "Account settings — Blazemap" : activePath === "/contact" ? "Contact — Blazemap" : "Blazemap — Forest & land fire awareness";
    const description = activePath === "/contact"
      ? "Contact information for Blazemap, public channel availability, and guidance for forest and land fire observations in Kalimantan."
      : "Get to know Blazemap: forest and land fire awareness for Kalimantan, community observations, human verification, and guidance for staying safe.";
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }, [activePath, accountUser]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || headerRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  const handleCloseMenu = () => {
    setMenuOpen(false);
  };

  const handleToggleMenu = () => {
    setMenuOpen((isOpen) => !isOpen);
  };

  return (
    <MotionConfig reducedMotion={isReducedMotion ? "always" : "never"}>
      {!accountUser && <SmoothScroll />}
      <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
        <a href="#main-content" className="sr-only z-50 rounded-md bg-forest px-5 py-3 font-bold text-background focus:not-sr-only focus:fixed focus:left-6 focus:top-4">
          Skip to content
        </a>
        <header ref={headerRef} className="relative z-30 bg-background">
          <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-3 px-[clamp(24px,5vw,80px)] sm:gap-8 lg:h-[88px]">
            <a href="/" aria-label="Blazemap home" onClick={handleCloseMenu} className="inline-flex shrink-0"><Brand compact /></a>
            <nav aria-label="Main navigation" className="hidden lg:block">
              <ul className="flex items-center gap-5 xl:gap-8">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <a href={href} aria-current={activePath === href ? "page" : undefined} className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-8 hover:underline aria-[current=page]:font-extrabold aria-[current=page]:underline">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {user ? <AccountMenu key={user.id} user={user} /> : isGuest ? <div className="hidden items-center gap-3 lg:flex">
              <Button asChild variant="ghost" className="min-h-11 px-3 font-bold">
                <a href="/login?portal=government"><Building2 aria-hidden="true" className="size-4" />Government Login</a>
              </Button>
              <Button asChild className="min-h-11 rounded-full px-5 font-bold">
                <a href="/login"><LogIn aria-hidden="true" className="size-4" />Login</a>
              </Button>
            </div> : <span role="status" className="text-xs text-muted-foreground">{account.isError ? <button type="button" className="min-h-11 underline" onClick={() => void account.refetch()}>Retry account check</button> : "Checking account…"}</span>}
            <Button
              ref={menuButtonRef}
              type="button"
              variant="ghost"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              onClick={handleToggleMenu}
              className="size-11 shrink-0 rounded-full lg:hidden"
            >
              {isMenuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
              <span className="sr-only">{isMenuOpen ? "Close menu" : "Open menu"}</span>
            </Button>
            </div>
          </div>
          <nav id="mobile-navigation" aria-label="Mobile navigation" hidden={!isMenuOpen} data-lenis-prevent className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-80px)] overflow-y-auto overscroll-contain border border-border bg-background px-[clamp(24px,5vw,80px)] py-4 shadow-lg lg:hidden">
            <ul className="flex flex-col gap-1">
              {links.map(({ label, href }) => (
                <li key={href}>
                  <a href={href} onClick={handleCloseMenu} aria-current={activePath === href ? "page" : undefined} className="flex min-h-12 items-center rounded-md px-3 font-semibold hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:font-extrabold">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            {isGuest && <div className="mt-3 flex flex-row items-stretch gap-2">
              <Button asChild variant="outline" className="min-w-0 flex-[1.5] gap-1.5 px-2 text-xs font-bold">
                <a href="/login?portal=government" onClick={handleCloseMenu}><Building2 aria-hidden="true" className="size-3.5" />Government Login</a>
              </Button>
              <Button asChild className="min-w-0 flex-1 gap-1.5 px-2 text-xs font-bold">
                <a href="/login" onClick={handleCloseMenu}><LogIn aria-hidden="true" className="size-3.5" />Login</a>
              </Button>
            </div>}
          </nav>
        </header>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          <Outlet context={accountUser} />
        </main>
        {!accountUser && activePath !== "/contact" && <footer className="bg-forest text-background">
          <div className="mx-auto max-w-[1440px] px-[clamp(24px,5vw,80px)] pb-12 pt-12 md:pt-16">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:gap-16">
              <div className="max-w-sm">
                <a href="/" aria-label="Blazemap home" className="inline-flex"><Brand /></a>
                <p className="mt-3 max-w-72 text-sm leading-7 text-sage">
                  Forest and land fire information for Kalimantan.
                </p>
              </div>
              <nav aria-label="Footer navigation">
                <ul className="grid grid-cols-2 gap-x-8 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-8">
                  {links.map(({ label, href }) => (
                    <li key={href}>
                      <a href={href} aria-current={activePath === href ? "page" : undefined} className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-8 hover:underline aria-[current=page]:font-extrabold aria-[current=page]:underline">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="mt-10 flex flex-col justify-between gap-3 border-t border-sage/25 pt-6 text-xs leading-6 text-sage sm:flex-row">
              <p>© {new Date().getFullYear()} blazemap</p>
              <p>Forest illustrations and stock photography.</p>
            </div>
          </div>
        </footer>}
      </div>
    </MotionConfig>
  );
}
