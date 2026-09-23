import { useId } from "react";
import { Popover } from "radix-ui";
import { SlidersHorizontal, X } from "lucide-react";
import { FieldSelect } from "@/components/ui";
import { LayerPreview } from "./LayerPreview";

type Props = { caseStatus?: "active" | "closed" | "all"; onCaseStatus?: (value: "active" | "closed" | "all") => void; operations?: boolean; onOperations?: (value: boolean) => void; hours: number; onRange: (value: string) => void; feed: boolean; publications: boolean; hotspots: boolean; onPublications: (value: boolean) => void; onHotspots: (value: boolean) => void };

export default function MapLayers({ caseStatus, onCaseStatus, operations = false, onOperations, hours, onRange, feed, publications, hotspots, onPublications, onHotspots }: Props) {
  const id = useId();
  const layers = [
    { label: "Published", checked: publications, change: onPublications, hotspot: false, operations: false },
    { label: "Hotspots", checked: hotspots, change: onHotspots, hotspot: true, operations: false },
    ...(onOperations ? [{ label: "Access & water", checked: operations, change: onOperations, hotspot: false, operations: true }] : []),
  ];
  return <Popover.Root><Popover.Trigger asChild><button type="button" aria-label="Map filters" className="flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-extrabold text-muted-foreground transition-colors hover:bg-secondary hover:text-forest"><SlidersHorizontal size={16} aria-hidden="true" /><span className="hidden sm:inline">Filters</span></button></Popover.Trigger><Popover.Portal><Popover.Content side="top" sideOffset={12} collisionPadding={16} className="z-[80] w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-primary/10 bg-white p-5 text-forest shadow-2xl">
    <div className="flex items-center justify-between"><h2 className="font-extrabold">Map layers</h2><Popover.Close asChild><button type="button" aria-label="Close map layers" className="grid size-10 place-items-center rounded-full hover:bg-secondary"><X size={17} aria-hidden="true" /></button></Popover.Close></div>
    <div className={`mt-4 grid gap-3 ${onCaseStatus ? "grid-cols-2" : ""}`}><label htmlFor={id} className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Time range<FieldSelect id={id} value={String(hours)} onValueChange={onRange} options={[{ value: "24", label: "Last 24 hours" }, { value: "48", label: "Last 48 hours" }, { value: "168", label: "Last 7 days" }]} /></label>{onCaseStatus && <label htmlFor={`${id}-status`} className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Case status<FieldSelect id={`${id}-status`} value={caseStatus ?? "active"} onValueChange={value => onCaseStatus(value as "active" | "closed" | "all")} options={[{ value: "active", label: "Active" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" }]} /></label>}</div>
    {!feed && <fieldset className="mt-5"><legend className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Visible data</legend><div className={`mt-3 grid gap-3 ${layers.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>{layers.map(layer => <label key={layer.label} className={`min-w-0 rounded-lg border p-1.5 focus-within:outline-2 focus-within:outline-primary ${layer.checked ? "border-primary bg-secondary/50" : "border-primary/10 bg-white"}`}><LayerPreview hotspot={layer.hotspot} operations={layer.operations} /><span className="flex min-h-11 items-center gap-2 px-1 py-2 text-xs font-extrabold"><input type="checkbox" checked={layer.checked} onChange={event => layer.change(event.target.checked)} className="size-4 shrink-0 accent-primary" /><span className="min-w-0 leading-4">{layer.label}</span></span></label>)}</div></fieldset>}
  </Popover.Content></Popover.Portal></Popover.Root>;
}
