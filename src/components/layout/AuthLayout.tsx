import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brand } from "@/components/common";
import { Link, useLocation, useOutlet } from "react-router-dom";
import { governmentForest, loginForest, registerForest } from "@/assets";
import { useMotionPreference } from "@/hooks";

export default function AuthLayout() {
  const { pathname, search } = useLocation();
  const outlet = useOutlet();
  const isRegister = pathname.replace(/\/+$/, "") === "/register";
  const isGovernment = !isRegister && new URLSearchParams(search).get("portal") === "government";
  const isReducedMotion = useMotionPreference();
  const pageKey = `${pathname}:${isGovernment ? "government" : "citizen"}`;

  useEffect(() => {
    const title = isRegister ? "Register — Blazemap" : isGovernment ? "Government Login — Blazemap" : "Login — Blazemap";
    const description = isRegister ? "Create a citizen Blazemap account using email or Google." : isGovernment ? "Login for authorized government Blazemap accounts." : "Login to your Blazemap account using email or Google.";
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }, [isGovernment, isRegister]);

  return (
    <main className="grid h-dvh min-h-0 overflow-hidden bg-background text-foreground lg:grid-cols-2">
      <div className={`auth-form-panel flex min-h-0 min-w-0 flex-col overflow-y-auto overscroll-contain px-[clamp(24px,6vw,88px)] py-4 ${isRegister ? "lg:order-2" : "lg:order-1"}`}>
        <Link to="/" aria-label="Blazemap home" className="inline-flex w-fit shrink-0"><Brand /></Link>
        <div className="flex flex-1 flex-col justify-center py-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pageKey} initial={isReducedMotion ? false : { opacity: 0, x: isRegister ? 16 : -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isReducedMotion ? 0 : isRegister ? 10 : -10 }} transition={{ duration: isReducedMotion ? 0 : 0.22, ease: "easeOut" }} className="mx-auto w-full max-w-[400px]">
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div aria-hidden="true" className={`relative hidden min-h-0 min-w-0 overflow-hidden bg-forest lg:block ${isRegister ? "lg:order-1" : "lg:order-2"}`}>
        <AnimatePresence initial={false}>
          <motion.img key={pageKey} src={isRegister ? registerForest : isGovernment ? governmentForest : loginForest} alt="" width={900} height={1350} fetchPriority="high" initial={isReducedMotion ? false : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: isReducedMotion ? 0 : 0.55, ease: "easeOut" }} className="absolute inset-0 h-full w-full object-cover" />
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-950/25 via-[#a3b89b]/15 to-[#fff4dc]/55" />
      </div>
    </main>
  );
}
