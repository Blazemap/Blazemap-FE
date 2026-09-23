import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { FileText, Inbox, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { foreground } from "@/assets";

export const feedRowClass = "overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-[0_18px_50px_-36px_rgba(67,25,31,0.55)]";
export function FeedRow({ title, status, time, location, onOpen, onMap, citizen = false, thumbnail }: { title: string; status: string; time: string; location: string; onOpen: () => void; onMap?: () => void; citizen?: boolean; thumbnail?: ReactNode }) {
  const content = <><div className="flex items-start justify-between gap-3 text-xs"><span className="rounded-full border border-primary/15 bg-secondary px-3 py-1 font-extrabold text-primary">{status}</span><span className="font-semibold text-muted-foreground">{time}</span></div><h3 className="mt-4 line-clamp-2 text-xl font-extrabold tracking-tight">{title}</h3><p className="mt-3 flex items-start gap-2 text-sm leading-5 text-muted-foreground"><MapPin size={17} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /><span>{location}</span></p></>;
  return <article className={`${feedRowClass} relative focus-within:ring-2 focus-within:ring-primary`}><div className="p-5">{content}</div>{thumbnail}<div className="p-4"><Button className="w-full rounded-xl bg-forest font-extrabold hover:bg-primary after:absolute after:inset-0 after:content-[''] focus-visible:outline-none" onClick={onOpen}><FileText size={16} aria-hidden="true" />View details</Button>{citizen && onMap && <Button variant="outline" className="relative z-10 mt-2 w-full rounded-xl" onClick={onMap}><MapPin size={16} aria-hidden="true" />View on map</Button>}</div></article>;
}
export function FeedRowsSkeleton({ citizen = false }: { citizen?: boolean }) {
  return <div role="status" aria-label="Loading feed" className="space-y-5 motion-safe:animate-pulse">{Array.from({ length: 3 }, (_, i) => <article key={i} className={feedRowClass}><div className="p-5"><div className="flex justify-between gap-3"><span className="h-6 w-32 rounded-sm bg-secondary" /><span className="h-4 w-24 bg-secondary" /></div><span className="mt-3 block h-7 w-3/4 bg-secondary" /><span className="mt-3 block h-5 w-1/2 bg-secondary" /><div className="mt-4 flex justify-between border-t border-primary/10 pt-3"><span className={`${citizen ? "h-10" : "h-5"} block w-28 bg-secondary`} />{citizen && <span className="block h-10 w-28 bg-secondary" />}</div></div></article>)}</div>;
}
export function FeedEmpty({ children }: { children: string }) {
  return <div role="status" className="flex flex-col items-center gap-3 px-2 py-14 text-center text-gray-500"><Inbox size={40} strokeWidth={1.5} aria-hidden="true" /><p className="text-sm font-semibold">{children}</p></div>;
}
export function FeedFoliage() {
  return <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 h-[38vh] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000)]"><img src={foreground} alt="" className="absolute bottom-0 left-0 w-[42vw] max-w-lg object-contain object-left-bottom opacity-20 sm:w-[32vw]" decoding="async" /><img src={foreground} alt="" className="absolute bottom-0 right-0 w-[38vw] max-w-md -scale-x-100 object-contain object-left-bottom opacity-15 sm:w-[28vw]" decoding="async" /></div>;
}
export function FeedShell({ title, description, refreshing, onRefresh, children, scrollRef }: { title: string; description?: string; refreshing: boolean; onRefresh: () => void; children: ReactNode; scrollRef?: RefObject<HTMLElement | null> }) {
  return <section ref={scrollRef} aria-label={title} className="absolute inset-0 overflow-y-auto overscroll-contain bg-white px-4 pb-32 pt-56 sm:px-6 sm:pt-28"><FeedFoliage /><div className="relative mx-auto max-w-2xl"><header className="mb-5 flex items-end justify-between gap-4 border-b border-primary/10 pb-3 text-forest"><div><h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div><Button variant="outline" size="icon" className="rounded-full border-white/40 bg-white text-forest" aria-label={`Refresh ${title.toLowerCase()}`} aria-busy={refreshing} disabled={refreshing} onClick={onRefresh}><RefreshCw size={17} aria-hidden="true" /></Button></header><div className="space-y-5">{children}</div></div></section>;
}
export function FeedSentinel({ enabled, onLoad }: { enabled: boolean; onLoad: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) onLoad(); }, { root: element.closest("section"), rootMargin: "240px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, onLoad]);
  return <div ref={ref} aria-hidden="true" className="h-px" />;
}
