export type WindContext = {
  status: "READY" | "CALM" | "MISSING_WIND" | "STALE" | "NOT_YET_VALID" | "INVALID" | "NO_FORECAST" | "NO_VERIFIED_REGION";
  evaluatedAt: string; usableUntil: string | null;
  forecast: { id: string; provider: "BMKG"; regionId: string; regionName: string; issuedAt: string; validAt: string; fetchedAt: string } | null;
  windSpeedKmh: number | null; windFromDegrees: number | null; windToDegrees: number | null;
  summary: string; disclaimer: "Downwind attention, not predicted perimeter"; spatialExtent: null; settlementExposure: "UNAVAILABLE"; ruleVersion: string;
};
export type WindArrow = { caseId: string; title: string; latitude: number; longitude: number; degrees: number; usableUntil: string; evaluatedAt: string };
export function parseWindContext(value: unknown): WindContext | null {
  if (value == null) return null;
  const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid wind context"); return v as Record<string, unknown>; };
  const text = (v: unknown) => { if (typeof v !== "string" || !v.trim()) throw new Error("Invalid wind text"); return v; };
  const time = (v: unknown) => { const s = text(v); if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(s) || !Number.isFinite(Date.parse(s))) throw new Error("Invalid wind time"); return s; };
  const number = (v: unknown, max = Infinity) => { if (v === null) return null; if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v >= max) throw new Error("Invalid wind number"); return v; };
  const v = object(value);
  const status = text(v.status);
  if (!["READY", "CALM", "MISSING_WIND", "STALE", "NOT_YET_VALID", "INVALID", "NO_FORECAST", "NO_VERIFIED_REGION"].includes(status) || v.disclaimer !== "Downwind attention, not predicted perimeter" || v.spatialExtent !== null || v.settlementExposure !== "UNAVAILABLE") throw new Error("Unsupported wind contract");
  const f = v.forecast === null ? null : object(v.forecast);
  if (f && f.provider !== "BMKG") throw new Error("Invalid wind provider");
  const result: WindContext = { status: status as WindContext["status"], evaluatedAt: time(v.evaluatedAt), usableUntil: v.usableUntil === null ? null : time(v.usableUntil), forecast: f ? { id: text(f.id), provider: "BMKG", regionId: text(f.regionId), regionName: text(f.regionName), issuedAt: time(f.issuedAt), validAt: time(f.validAt), fetchedAt: time(f.fetchedAt) } : null, windSpeedKmh: number(v.windSpeedKmh), windFromDegrees: number(v.windFromDegrees, 360), windToDegrees: number(v.windToDegrees, 360), summary: text(v.summary), disclaimer: v.disclaimer, spatialExtent: null, settlementExposure: v.settlementExposure, ruleVersion: text(v.ruleVersion) };
  if ((result.windFromDegrees === null) !== (result.windToDegrees === null) || (result.windFromDegrees !== null && result.windToDegrees !== (result.windFromDegrees + 180) % 360)) throw new Error("Inconsistent wind directions");
  if (result.status === "CALM" && (result.windSpeedKmh !== 0 || result.windFromDegrees !== null)) throw new Error("Invalid calm wind");
  if (result.status === "READY") {
    const f = result.forecast, at = Date.parse(result.evaluatedAt);
    if (!f || !result.usableUntil || !result.windSpeedKmh || result.windFromDegrees === null) throw new Error("Incomplete usable wind");
    const issued = Date.parse(f.issuedAt), valid = Date.parse(f.validAt), fetched = Date.parse(f.fetchedAt);
    if (issued > fetched || issued > valid || fetched > at || valid > at || Date.parse(result.usableUntil) !== Math.min(valid + 10800000, issued + 86400000, fetched + 86400000) || at >= Date.parse(result.usableUntil)) throw new Error("Invalid usable wind times");
  }
  return result;
}
export function windArrow(detail: { id: string; title: string; verification: string; latitude: number | null; longitude: number | null; windContext: WindContext | null }, now: number): WindArrow | null {
  const w = detail.windContext;
  if (detail.verification !== "CONFIRMED_FIRE" || detail.latitude === null || detail.longitude === null || !Number.isFinite(detail.latitude) || Math.abs(detail.latitude) > 90 || !Number.isFinite(detail.longitude) || Math.abs(detail.longitude) > 180 || !w || w.status !== "READY" || w.windToDegrees === null || !w.usableUntil || now < Date.parse(w.evaluatedAt) || now >= Date.parse(w.usableUntil)) return null;
  return { caseId: detail.id, title: detail.title, latitude: detail.latitude, longitude: detail.longitude, degrees: w.windToDegrees, usableUntil: w.usableUntil, evaluatedAt: w.evaluatedAt };
}
