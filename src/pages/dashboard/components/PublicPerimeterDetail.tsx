import type { MapItem } from "@/types";
import { handlingLabels } from "@/constants";
import { formatTime } from "@/pages/dashboard/utils";

export default function PublicPerimeterDetail({ item }: { item: MapItem }) {
  const perimeter = item.publicPerimeter;
  if (!perimeter || item.publicLocationMode !== "APPROVED_INCIDENT_PERIMETER") return null;
  const wind = item.windContext;
  return <section aria-label="Approved incident perimeter" className="mt-5 rounded-lg border border-orange-800/25 bg-orange-50/50 p-4"><h3 className="text-sm font-bold">Approved incident perimeter</h3><dl className="mt-3 space-y-2 text-sm">{item.caseNumber && <div><dt className="text-muted-foreground">Case</dt><dd>{item.caseNumber}</dd></div>}{item.handling && <div><dt className="text-muted-foreground">Handling status</dt><dd>{handlingLabels[item.handling]}</dd></div>}<div><dt className="text-muted-foreground">Area</dt><dd>{perimeter.areaHectares.toLocaleString("en", { maximumFractionDigits: 2 })} ha</dd></div><div><dt className="text-muted-foreground">Source</dt><dd>{perimeter.source}</dd></div><div><dt className="text-muted-foreground">Observed</dt><dd>{formatTime(perimeter.observedAt)}</dd></div><div><dt className="text-muted-foreground">Approved revision</dt><dd>{perimeter.revision}</dd></div><div><dt className="text-muted-foreground">Downwind attention</dt><dd>{wind?.summary ?? "No approved current wind context is available."}</dd></div></dl><p className="mt-3 text-xs">Published snapshot and regional wind context only, not a live perimeter, physical spread prediction, or guarantee of safety outside the boundary.</p></section>;
}
