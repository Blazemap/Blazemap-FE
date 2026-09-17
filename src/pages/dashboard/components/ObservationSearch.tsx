import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Flame, Search, Satellite, ShieldCheck } from "lucide-react";
import { formatTime } from "@/pages/dashboard/utils";
import type { MapItem } from "@/types";

type ObservationSearchProps = {
  id: string;
  query: string;
  items: MapItem[];
  initialLoading: boolean;
  feed: boolean;
  side: "top" | "bottom";
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
};

export function ObservationSearch({ id, query, items, initialLoading, feed, side, onQueryChange, onSelect }: ObservationSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listId = `${id}-${generatedId.replaceAll(":", "")}-results`;
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const hasQuery = !!query.trim();
  const results = hasQuery && !initialLoading ? items.slice(0, 6) : [];
  const activeIndex = highlighted < 0 ? -1 : Math.min(highlighted, results.length - 1);
  const open = focused && hasQuery && !dismissed;

  useEffect(() => {
    const list = listRef.current;
    if (!open || activeIndex < 0 || !list) return;
    const option = list.querySelector<HTMLElement>(`[id="${listId}-${activeIndex}"]`);
    if (!option) return;
    const bounds = option.getBoundingClientRect();
    const top = list.getBoundingClientRect().top + list.clientTop;
    const bottom = top + list.clientHeight;
    if (bounds.top < top) list.scrollBy({ top: bounds.top - top, behavior: "instant" });
    else if (bounds.bottom > bottom) list.scrollBy({ top: bounds.bottom - bottom, behavior: "instant" });
  }, [open, activeIndex, listId]);

  function select(item: MapItem) {
    if (initialLoading) return;
    onSelect(item.id);
    setDismissed(true);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setDismissed(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!hasQuery) return;
      event.preventDefault();
      setDismissed(false);
      setHighlighted(current => event.key === "ArrowDown" ? Math.min(current + 1, Math.max(results.length - 1, 0)) : current < 0 ? Math.max(results.length - 1, 0) : Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && results[activeIndex]) {
      event.preventDefault();
      select(results[activeIndex]);
    }
  }

  return <div className="relative min-w-0 flex-1" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <Search size={15} strokeWidth={2.5} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" aria-hidden="true" />
    <label htmlFor={id} className="sr-only">Search {feed ? "published updates" : "map observations"}</label>
    <input ref={inputRef} id={id} type="search" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined} autoComplete="off" maxLength={200} value={query} onFocus={() => { setFocused(true); setDismissed(false); }} onKeyDown={handleKeyDown} onChange={event => { onQueryChange(event.target.value); setHighlighted(-1); setDismissed(false); }} placeholder={feed ? "Search published updates" : "Search observations or region"} className="h-10 w-full rounded-full border border-primary/15 bg-secondary/45 pl-10 pr-3 text-xs font-bold outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10" />
    {open && <div className={`absolute left-0 z-[90] w-full min-w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-sm border border-primary/10 bg-white shadow-2xl ${side === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}>
      <div ref={listRef} id={listId} role="listbox" aria-label="Matching observations" aria-busy={initialLoading} className="max-h-[min(24rem,60dvh)] overflow-y-auto p-1.5">
        {initialLoading ? <SearchResultsSkeleton /> : <>{results.map((item, index) => <button key={item.id} id={`${listId}-${index}`} type="button" role="option" aria-selected={index === activeIndex} tabIndex={-1} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setHighlighted(index)} onClick={() => select(item)} className="flex min-h-[76px] w-full items-center gap-3 rounded-sm px-3 py-2 text-left outline-none hover:bg-secondary/45 aria-selected:bg-secondary/70">
          <ObservationIcon item={item} />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{item.title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{item.location}</span><span className="mt-1 block text-[10px] font-semibold text-muted-foreground">{formatTime(item.time)}</span></span>
          <ArrowUpRight size={16} className="shrink-0 text-primary" aria-hidden="true" />
        </button>)}
        {!results.length && <p role="status" className="px-4 py-6 text-center text-xs font-bold text-muted-foreground">No loaded observations match.</p>}</>}
      </div>
    </div>}
  </div>;
}

function SearchResultsSkeleton() {
  return <div role="status" aria-label="Loading matching observations" className="motion-safe:animate-pulse"><span className="sr-only">Loading matching observations</span>{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex min-h-[76px] items-center gap-3 rounded-sm px-3 py-2"><span className="size-10 shrink-0 rounded-sm bg-secondary" /><span className="min-w-0 flex-1"><span className="block h-3 w-2/3 rounded-full bg-secondary" /><span className="mt-2 block h-2.5 w-4/5 rounded-full bg-secondary/80" /><span className="mt-2 block h-2 w-24 rounded-full bg-secondary/70" /></span><span className="size-4 shrink-0 rounded bg-secondary" /></div>)}</div>;
}

function ObservationIcon({ item }: { item: MapItem }) {
  const confirmed = item.kind === "publication" && item.verification === "CONFIRMED_FIRE";
  const Icon = item.kind === "hotspot" ? Satellite : confirmed ? Flame : ShieldCheck;
  return <span className={`grid size-10 shrink-0 place-items-center rounded-sm ${item.kind === "hotspot" ? "bg-amber-50 text-amber-800" : confirmed ? "bg-orange-50 text-orange-800" : "bg-secondary text-primary"}`}><Icon size={20} aria-hidden="true" /></span>;
}
