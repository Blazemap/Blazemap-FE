import { usePublication } from "@/pages/dashboard/components/PublicationPage";
import { publicationHasMap } from "@/lib/publications";
import type { DashboardUser, MapItem } from "@/types";

export function usePublicationMap(user: DashboardUser, slug: string | null) {
  const query = usePublication(user, slug);
  const publication = query.isError ? null : query.data;
  const item: MapItem | null = publication && publicationHasMap(publication) ? {
    id: `publication:${publication.id}`, kind: "publication", title: publication.title,
    latitude: publication.latitude, longitude: publication.longitude, time: publication.publishedAt,
    source: "Published case summary", location: publication.regions.map(region => region.name).join(", ") || "Approved incident location",
    publicLocationMode: publication.publicPerimeter ? "APPROVED_INCIDENT_PERIMETER" : "APPROVED_INCIDENT_POINT",
    publicPerimeter: publication.publicPerimeter, caseNumber: publication.caseNumber, handling: publication.handlingStatus, windContext: publication.windContext, verification: publication.outcome === "CONFIRMED" ? "CONFIRMED_FIRE" : undefined, stale: false,
  } : null;
  return { ...query, item };
}
