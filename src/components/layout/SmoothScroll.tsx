import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useMotionPreference } from "@/hooks";
import { resolveAnchor } from "@/lib";

export default function SmoothScroll() {
  const isReducedMotion = useMotionPreference();

  useEffect(() => {
    const lenis = isReducedMotion ? null : new Lenis({ autoRaf: true, lerp: 0.085, smoothWheel: true, syncTouch: false });
    let frame = 0;

    const focusAnchor = (target: HTMLElement) => {
      if (!target.isConnected) return;
      const hasTabIndex = target.hasAttribute("tabindex");
      if (!hasTabIndex) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      if (!hasTabIndex) target.removeAttribute("tabindex");
    };

    const handleHashChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = resolveAnchor(window.location.hash);
        if (!target) return;
        if (lenis) lenis.scrollTo(target, { immediate: true, offset: -32 });
        else target.scrollIntoView({ behavior: "instant" });
        focusAnchor(target);
      });
    };

    const handleAnchorClick = (event: MouseEvent) => {
      if (!lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
      if (!link?.href || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href);
      const current = window.location;
      if (url.origin !== current.origin || url.pathname !== current.pathname || url.search !== current.search) return;
      const target = resolveAnchor(url.hash);
      if (!target) return;
      event.preventDefault();
      if (url.hash !== current.hash) window.history.pushState(null, "", url.hash);
      lenis.scrollTo(target, { offset: -32, onComplete: () => focusAnchor(target) });
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("click", handleAnchorClick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("click", handleAnchorClick);
      lenis?.destroy();
    };
  }, [isReducedMotion]);

  return null;
}
