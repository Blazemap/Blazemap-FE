export type CaseFromReportsInput = { reportIds: string[]; title: string; reason: string };

export function caseFromReportsPayload(reportIds: string[], title: string, reason: string): CaseFromReportsInput {
  const uniqueIds = [...new Set(reportIds)].sort();
  const normalizedTitle = title.trim();
  const normalizedReason = reason.trim();
  if (uniqueIds.length < 2) throw new Error("Select at least two reports.");
  if (normalizedTitle.length < 3) throw new Error("Enter a case title.");
  if (normalizedReason.length < 5) throw new Error("Enter a grouping rationale.");
  return { reportIds: uniqueIds, title: normalizedTitle, reason: normalizedReason };
}

export function reportAssociationAction(sourceId: string, related: { id: string; case: { id: string } | null }) {
  if (related.id === sourceId) throw new Error("Select a different report.");
  return related.case ? { kind: "LINK" as const, caseId: related.case.id } : { kind: "CREATE" as const, reportIds: [sourceId, related.id].sort() };
}

export function parseReportCount(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error("Invalid case report count");
  return value;
}
