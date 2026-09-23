import type { OwnReport } from "@/types";

export const reportStatusLabels = { REVIEWED: "Reviewed", IN_PROGRESS: "In progress", CONFIRMED: "Confirmed", DECLINED: "Declined" } as const;
export type ReportStatus = keyof typeof reportStatusLabels;
export function reportStatus(report: Pick<OwnReport, "reviewStatus" | "case">): ReportStatus | null {
  if (report.reviewStatus === "DECLINED") return "DECLINED";
  if (report.case?.verificationStatus === "CONFIRMED_FIRE") return "CONFIRMED";
  if (report.reviewStatus === "UNDER_REVIEW" || report.reviewStatus === "NEEDS_DETAILS") return "IN_PROGRESS";
  if (report.reviewStatus === "REVIEWED") return "REVIEWED";
  return null;
}
export function reportStatusLabel(report: Pick<OwnReport, "reviewStatus" | "case">) {
  const status = reportStatus(report);
  return status ? reportStatusLabels[status] : "Awaiting review";
}
export function reportEditingLocation(caseItem: { handlingStatus: string } | null, reportCount: number) {
  return caseItem && (caseItem.handlingStatus === "CLOSED" || reportCount > 1) ? "CASE" : "REPORT";
}
