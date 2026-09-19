import type { PublicPerimeter } from "./perimeter";

export type Publication = {
  id: string; slug: string; title: string; summary: string; body: string;
  outcome: "CONFIRMED" | "DECLINED" | null; status: "PUBLISHED" | "SUPERSEDED" | "WITHDRAWN";
  publishedAt: string; updatedAt: string; validUntil: string | null; expired: boolean;
  regions: { name: string }[]; sources: { title: string; url: string }[];
  attachments: { id: string; filename: string; contentType: string }[];
  authorityReference: string | null; withdrawalReason: string | null;
  supersedesId: string | null; replacements: { id: string; slug: string; status: string }[];
  latitude: number | null; longitude: number | null; publicPerimeter?: PublicPerimeter;
  caseNumber?: string; handlingStatus?: import("../types/dashboard").Handling; windContext?: import("./wind").WindContext | null;
};
export type CitizenFeedItem = ({ kind: "OWN_REPORT"; occurredAt: string } & import("../types/reports").OwnReport) | ({ kind: "PUBLICATION"; occurredAt: string } & Publication);
export type FeedPage<T> = { data: T[]; meta: { total: number; page: number; pageSize: number } };
export const feedPageSize = 10;
export function nextFeedPage<T>(last: FeedPage<T>) {
  return last.data.length > 0 && last.meta.page * last.meta.pageSize < last.meta.total ? last.meta.page + 1 : undefined;
}
export function uniqueFeedItems<T extends { id: string }>(pages: FeedPage<T>[]) {
  return Array.from(new Map(pages.flatMap(page => page.data).map(item => [item.id, item])).values());
}
export function publicationPath(slug: string, origin: "feed" | "news") {
  return `/publications/${encodeURIComponent(slug)}?from=${origin}`;
}
export function publicationHasMap(item: Publication) {
  return item.status === "PUBLISHED" && !item.expired && item.outcome !== "DECLINED" && (!!item.publicPerimeter || (typeof item.latitude === "number" && Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 && typeof item.longitude === "number" && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180));
}
