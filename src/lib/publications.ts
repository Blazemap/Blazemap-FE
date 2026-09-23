import type { PublicPerimeter } from "./perimeter";
import type { RichTextDocument } from "./rich-text";

export type Publication = {
  id: string; slug: string; title: string; summary: string; body: string; bodyRich?: RichTextDocument | null;
  type?: "UPDATE" | "ANNOUNCEMENT" | "WARNING" | "EDUCATION";
  advisory?: { kind: "INFORMATIONAL_ADVISORY"; operationalReferences: WarningReference[] };
  outcome: "CONFIRMED" | "DECLINED" | null; status: "PUBLISHED" | "SUPERSEDED" | "WITHDRAWN";
  publishedAt: string; updatedAt: string; validUntil: string | null; expired: boolean;
  regions: { name: string }[]; sources: { title: string; url: string }[];
  attachments: { id: string; filename: string; contentType: string }[];
  authorityReference: string | null; withdrawalReason: string | null;
  supersedesId: string | null; replacements: { id: string; slug: string; status: string }[];
  latitude: number | null; longitude: number | null; publicPerimeter?: PublicPerimeter;
  activeMapEligible?: boolean;
  caseNumber?: string; handlingStatus?: import("../types/dashboard").Handling; windContext?: import("./wind").WindContext | null;
};
export type WarningReference = { featureId: string; updateId: string; name: string; kind: "ROAD" | "DESIGNATED_LOCATION"; condition: string; source: string; observedAt: string; provider: string };
export type CitizenFeedItem = ({ kind: "OWN_REPORT"; occurredAt: string } & import("../types/reports").OwnReport) | ({ kind: "PUBLICATION"; occurredAt: string } & Publication);
export type FeedPage<T> = { data: T[]; meta: { total: number; page: number; pageSize: number } };
export const feedPageSize = 10;
export function nextFeedPage<T>(last: FeedPage<T>) {
  return last.data.length > 0 && last.meta.page * last.meta.pageSize < last.meta.total ? last.meta.page + 1 : undefined;
}
export function uniqueFeedItems<T extends { id: string }>(pages: FeedPage<T>[]) {
  return Array.from(new Map(pages.flatMap(page => page.data).map(item => [item.id, item])).values());
}
export function publicationRevisionLabel(item: Pick<Publication, "supersedesId" | "status">) {
  if (item.status === "SUPERSEDED") return "Superseded";
  return item.status === "PUBLISHED" && item.supersedesId ? "Updated" : null;
}
export function activeIncidentPublicationState(item: { verification: string; handling: string; publication: { status: "DRAFT" | "PUBLISHED" } | null }) {
  if (item.handling === "CLOSED") return { available: false, label: "Use Completion News" } as const;
  if (item.verification !== "CONFIRMED_FIRE") return { available: false, label: "Confirm the case first" } as const;
  return { available: true, label: item.publication?.status === "PUBLISHED" ? "Published" : item.publication?.status === "DRAFT" ? "Draft" : "Not published" } as const;
}
export function publicationPath(slug: string, origin: "feed" | "news") {
  return `/publications/${encodeURIComponent(slug)}?from=${origin}`;
}
export function publicationHasMap(item: Publication) {
  return item.activeMapEligible !== false && item.handlingStatus !== "CLOSED" && item.status === "PUBLISHED" && !item.expired && item.outcome !== "DECLINED" && (!!item.publicPerimeter || (typeof item.latitude === "number" && Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 && typeof item.longitude === "number" && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180));
}
export function ownReportHasActiveMap(item: import("../types/reports").OwnReport) {
  return item.case?.handlingStatus !== "CLOSED" && (!!item.case?.perimeter || (typeof item.latitude === "number" && Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 && typeof item.longitude === "number" && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180));
}
