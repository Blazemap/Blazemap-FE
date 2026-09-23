import type { GovernmentReport, Triage } from "@/types/government";

export const triageAppearance = {
  CRITICAL: { label: "Critical", color: "#b91c1c", symbol: "!" },
  HIGH: { label: "High", color: "#9a3412", symbol: "!" },
  MEDIUM: { label: "Medium", color: "#1d4ed8", symbol: "M" },
  LOW: { label: "Low", color: "#4b5563", symbol: "L" },
  UNASSESSED: { label: "Needs assessment", color: "#4b5563", symbol: "?" },
  UNKNOWN: { label: "Needs assessment", color: "#4b5563", symbol: "?" },
} as const;
export const observationAppearance = {
  SMOKE: { label: "Smoke", icon: "smoke" },
  FLAME: { label: "Flames", icon: "flame" },
  BURNING_SMELL: { label: "Burning smell", icon: "smell" },
} as const;
export const reportFilters = [
  { value: "", label: "All" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "DECLINED", label: "Ended" },
] as const;
const reasons: Record<string, string> = {
  POLICY_NOT_CONFIGURED: "Review-priority distance or time thresholds are not configured.",
  DEMO_EXCLUDED: "This simulated report is excluded from operational priority assessment.",
  INCIDENT_LOCATION_UNKNOWN: "An incident location is needed; an observer position cannot locate the fire.",
  OBSERVATION_TIME_INVALID: "The observation time cannot be used for priority assessment.",
  SATELLITE_SPATIOTEMPORAL_MATCH: "A nearby satellite detection matches the report's observation time under the configured policy.",
  SETTLEMENT_NEARBY: "A verified settlement is nearby under the configured distance policy.",
  COVERED_NO_NEARBY_MATCH: "Satellite and settlement coverage was available, with no nearby match under the configured policy.",
  INSUFFICIENT_COVERAGE: "Available source coverage is insufficient to assign a priority.",
};
const missing: Record<string, string> = {
  TRIAGE_HOTSPOT_RADIUS_METERS: "Satellite matching distance is not configured",
  TRIAGE_HOTSPOT_WINDOW_HOURS: "Satellite matching time window is not configured",
  TRIAGE_SETTLEMENT_RADIUS_METERS: "Settlement matching distance is not configured",
  INCIDENT_COORDINATES: "Incident coordinates are unavailable",
  OBSERVATION_TIME: "A valid observation time is unavailable",
  SATELLITE_COVERAGE: "Complete, current satellite coverage is unavailable",
  SETTLEMENT_COVERAGE: "Complete, verified settlement coverage is unavailable",
  SETTLEMENT_GEOMETRY: "Some settlement boundaries could not be evaluated",
  TRUNCATED_CONTEXT: "Source results were limited; coverage cannot be treated as complete",
};
export function effectiveReportPriority(report: GovernmentReport) {
  return report.case?.priority && report.case.priority !== "UNASSESSED" ? report.case.priority : report.triage.level;
}
export function triageReasons(triage: Triage): string {
  return triage.reasonCodes.length ? [...new Set(triage.reasonCodes.map(code => reasons[code] ?? "An additional server assessment reason has no readable explanation yet."))].join(" ") : "The server did not supply a priority explanation. Further assessment is needed.";
}
export function triageMissing(triage: Triage): string {
  return triage.missingData.length ? [...new Set(triage.missingData.map(code => missing[code] ?? "An additional source requirement is unavailable"))].join(". ") + "." : "No missing data was reported.";
}
export function satelliteTimeDifference(report: Pick<GovernmentReport, "observedAt" | "triage">): string {
  const acquired = report.triage.satelliteMatch?.acquiredAt;
  if (!acquired) return "Acquisition time unavailable";
  const minutes = Math.round(Math.abs(Date.parse(acquired) - Date.parse(report.observedAt)) / 60000);
  const interval = minutes < 60 ? `${minutes} min` : `${(minutes / 60).toFixed(1)} h`;
  return `${interval} ${Date.parse(acquired) < Date.parse(report.observedAt) ? "before" : "after"} the reported observation`;
}
