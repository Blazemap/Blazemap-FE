import { useEffect, useRef, type ReactNode } from "react";
import { FileText, Inbox, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { foreground } from "@/assets";

export const feedRowClass = "overflow-hidden rounded-sm border border-primary/10 bg-white shadow-sm";
export function FeedRow({ title, status, time, location, onOpen, onMap, citizen = false }: { title: string; status: string; time: string; location: string; onOpen: () => void; onMap?: () => void; citizen?: boolean }) {
  const content = <><div className="flex items-start justify-between gap-3 text-xs"><span className="rounded-sm bg-secondary px-2.5 py-1 font-bold">{status}</span><span className="text-muted-foreground">{time}</span></div><h3 className="mt-3 line-clamp-2 text-lg font-extrabold">{title}</h3><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={16} aria-hidden="true" />{location}</p></>;
  return <article className={feedRowClass}>{citizen ? <><div className="p-5">{content}</div><div className="mx-5 flex items-center justify-between gap-2 border-t border-primary/10 py-2"><Button variant="ghost" onClick={onOpen}><FileText size={16} aria-hidden="true" />View details</Button><Button variant="ghost" disabled={!onMap} title={!onMap ? "No approved map location published" : undefined} onClick={onMap}><MapPin size={16} aria-hidden="true" />View on map</Button></div></> : <button type="button" onClick={onOpen} className="block w-full p-5 text-left hover:bg-secondary/30">{content}<span className="mt-4 block border-t border-primary/10 pt-3 text-sm font-bold">Open details</span></button>}</article>;
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
export function FeedShell({ title, description, refreshing, onRefresh, children }: { title: string; description?: string; refreshing: boolean; onRefresh: () => void; children: ReactNode }) {
  return <section aria-label={title} className="absolute inset-0 overflow-y-auto overscroll-contain bg-white px-4 pb-32 pt-56 sm:px-6 sm:pt-28"><FeedFoliage /><div className="relative mx-auto max-w-2xl"><header className="mb-5 flex items-end justify-between gap-4 border-b border-primary/10 pb-3 text-forest"><div><h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div><Button variant="outline" size="icon" className="rounded-full border-white/40 bg-white text-forest" aria-label={`Refresh ${title.toLowerCase()}`} aria-busy={refreshing} disabled={refreshing} onClick={onRefresh}><RefreshCw size={17} aria-hidden="true" /></Button></header><div className="space-y-5">{children}</div></div></section>;
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
