import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { apiClient } from "@/config/api-client";
import { parsePlaces, type Place } from "@/lib/places";

export function PlaceSearch({ id, side, onSelect }: { id: string; side: "top" | "bottom"; onSelect: (place: Place) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ query: string; items: Place[]; error: boolean }>({ query: "", items: [], error: false });
  const generation = useRef(0);
  const eligible = query.trim().length >= 3;
  const loading = eligible && result.query !== query;
  const items = loading ? [] : result.items;
  useEffect(() => {
    const controller = new AbortController();
    const version = ++generation.current;
    if (!eligible || !open) return () => controller.abort();
    const timer = setTimeout(() => {
      void apiClient.get<{ data: unknown }>("/api/places", { params: { q: query.trim() }, signal: controller.signal }).then(response => {
        const places = parsePlaces(response.data.data);
        if (!controller.signal.aborted && generation.current === version) setResult({ query, items: places, error: false });
      }).catch(() => {
        if (!controller.signal.aborted && generation.current === version) setResult({ query, items: [], error: true });
      });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, eligible, open]);
  function select(place: Place) { setOpen(false); onSelect(place); }
  return <div className="relative min-w-0 flex-1" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <Search size={15} className="pointer-events-none absolute left-3 top-3 text-primary" aria-hidden="true" />
    <label htmlFor={id} className="sr-only">Search places in Indonesia</label>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open && eligible} aria-controls={open && eligible ? `${id}-results` : undefined} aria-activedescendant={open && eligible && items[active] ? `${id}-${active}` : undefined} autoComplete="off" maxLength={120} value={query} placeholder="Search places in Indonesia" onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); }} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(value => Math.max(0, Math.min(items.length - 1, value + (event.key === "ArrowDown" ? 1 : -1)))); }
      if (event.key === "Enter" && open && eligible && items[active < 0 ? 0 : active]) { event.preventDefault(); select(items[active < 0 ? 0 : active]); }
    }} className="h-11 w-full rounded-full border border-primary/15 bg-secondary/45 pl-9 pr-3 text-xs font-bold focus:outline-2 focus:outline-primary" />
    {open && eligible && <div className={`absolute left-0 z-[90] w-full min-w-[min(22rem,calc(100vw-2rem))] rounded-sm border bg-white p-2 shadow-2xl ${side === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}>
      <div id={`${id}-results`} role="listbox" aria-label="Places in Indonesia" aria-busy={loading} className="max-h-72 overflow-y-auto">{loading && <div role="status" aria-label="Searching places" className="space-y-2 p-2 motion-safe:animate-pulse"><span className="sr-only">Searching places</span><div aria-hidden="true" className="space-y-2">{Array.from({ length: 3 }, (_, index) => <span key={index} className="block rounded p-2"><span className="block h-4 w-2/5 rounded bg-secondary" /><span className="mt-2 block h-3 w-4/5 rounded bg-secondary/80" /></span>)}</div></div>}{items.map((place, index) => <button key={`${place.label}:${place.longitude}:${place.latitude}`} id={`${id}-${index}`} type="button" role="option" aria-selected={index === active} tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => select(place)} className="block min-h-11 w-full rounded p-3 text-left hover:bg-secondary aria-selected:bg-secondary"><span className="block text-sm font-bold">{place.name}</span><span className="block text-xs">{place.label}</span></button>)}</div>
      {!loading && <p role="status" className="text-xs">{result.error ? "Place search unavailable. Edit the place name to retry." : !items.length ? "No places found in Indonesia." : `${items.length} places found`}</p>}

    </div>}
  </div>;
}
