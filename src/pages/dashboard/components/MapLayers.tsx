import { useId } from "react";
import { Popover } from "radix-ui";
import { SlidersHorizontal, X } from "lucide-react";
import { FieldSelect } from "@/components/ui";
import { LayerPreview } from "./LayerPreview";

type Props = { hours: number; onRange: (value: string) => void; feed: boolean; publications: boolean; hotspots: boolean; onPublications: (value: boolean) => void; onHotspots: (value: boolean) => void };

export default function MapLayers({ hours, onRange, feed, publications, hotspots, onPublications, onHotspots }: Props) {
  const id = useId();
  return <Popover.Root><Popover.Trigger asChild><button type="button" aria-label="Map filters" className="flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-extrabold text-muted-foreground transition-colors hover:bg-secondary hover:text-forest"><SlidersHorizontal size={16} aria-hidden="true" /><span className="hidden sm:inline">Filters</span></button></Popover.Trigger><Popover.Portal><Popover.Content side="top" sideOffset={12} collisionPadding={16} className="z-[80] w-72 rounded-sm border border-primary/10 bg-white p-5 text-forest shadow-2xl">
    <div className="flex items-center justify-between"><h2 className="font-extrabold">Map layers</h2><Popover.Close asChild><button type="button" aria-label="Close map layers" className="grid size-10 place-items-center rounded-full hover:bg-secondary"><X size={17} aria-hidden="true" /></button></Popover.Close></div>
    <label htmlFor={id} className="mt-4 block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Time range<FieldSelect id={id} value={String(hours)} onValueChange={onRange} options={[{ value: "24", label: "Last 24 hours" }, { value: "48", label: "Last 48 hours" }, { value: "168", label: "Last 7 days" }]} /></label>
    {!feed && <fieldset className="mt-5"><legend className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Visible data</legend><div className="mt-3 grid grid-cols-2 gap-3">{[{ label: "Published", checked: publications, change: onPublications, hotspot: false }, { label: "Hotspots", checked: hotspots, change: onHotspots, hotspot: true }].map(layer => <label key={layer.label} className={`rounded-sm border p-1.5 focus-within:outline-2 focus-within:outline-primary ${layer.checked ? "border-primary bg-secondary/50" : "border-primary/10 bg-white"}`}><LayerPreview hotspot={layer.hotspot} /><span className="flex min-h-11 items-center gap-2 px-1 py-2 text-xs font-extrabold"><input type="checkbox" checked={layer.checked} onChange={event => layer.change(event.target.checked)} className="size-4 accent-primary" />{layer.label}</span></label>)}</div></fieldset>}
    </Popover.Content></Popover.Portal></Popover.Root>;
}
