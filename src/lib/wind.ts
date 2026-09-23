export type WindForecast = { id: string; provider: "GOOGLE_WEATHER" | "BMKG"; regionId: string | null; regionName: string; selectionBasis: "CASE_COORDINATES" | "VERIFIED_ADMIN_REGION" | "REVIEWED_WEATHER_REFERENCE"; adm4?: string; issuedAt: string | null; validAt: string; fetchedAt: string; attribution?: string };
export type WindContext = {
  status: "READY" | "CALM" | "MISSING_WIND" | "STALE" | "INVALID" | "UNAVAILABLE" | "NOT_YET_VALID" | "NO_FORECAST" | "NO_VERIFIED_REGION";
  evaluatedAt: string; usableUntil: string | null;
  basis?: "CASE_COORDINATES" | "UNAVAILABLE";
  provenance?: { provider: "GOOGLE_WEATHER"; relationBasis: "CASE_COORDINATES"; containmentClaimed: false; attribution: string } | null;
  timestamps?: { issuedAt: null; validAt: string; fetchedAt: string; usableUntil: string } | null;
  stale?: boolean; unavailableReason?: string | null;
  forecast: WindForecast | null;
  windSpeedKmh: number | null; windFromDegrees: number | null; windToDegrees: number | null;
  summary: string; disclaimer: "Downwind attention, not predicted perimeter"; spatialExtent: null; settlementExposure: "UNAVAILABLE"; ruleVersion: string;
};
export const windSource = (forecast: WindForecast) => forecast.provider === "BMKG" ? `BMKG regional forecast · ${forecast.regionName}` : forecast.attribution ?? "Source: Includes weather data from Google";
export type WindArrow = { caseId: string; title: string; latitude: number; longitude: number; degrees: number; usableUntil: string; evaluatedAt: string };
export function parseWindContext(value: unknown): WindContext | null {
  if (value == null) return null;
  const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid wind context"); return v as Record<string, unknown>; };
  const text = (v: unknown) => { if (typeof v !== "string" || !v.trim()) throw new Error("Invalid wind text"); return v; };
  const time = (v: unknown) => { const s = text(v); if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(s) || !Number.isFinite(Date.parse(s))) throw new Error("Invalid wind time"); return s; };
  const number = (v: unknown, max = Infinity) => { if (v === null) return null; if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v >= max) throw new Error("Invalid wind number"); return v; };
  const v = object(value);
  const status = text(v.status);
  if (!["READY", "CALM", "MISSING_WIND", "STALE", "NOT_YET_VALID", "INVALID", "UNAVAILABLE", "NO_FORECAST", "NO_VERIFIED_REGION"].includes(status) || v.disclaimer !== "Downwind attention, not predicted perimeter" || v.spatialExtent !== null || v.settlementExposure !== "UNAVAILABLE") throw new Error("Unsupported wind contract");
  const f = v.forecast === null ? null : object(v.forecast);
  if (f && f.provider !== "BMKG" && f.provider !== "GOOGLE_WEATHER") throw new Error("Invalid wind provider");
  const google = f?.provider === "GOOGLE_WEATHER";
  if (google && (f.regionId !== null || f.selectionBasis !== "CASE_COORDINATES" || f.issuedAt !== null || v.basis !== "CASE_COORDINATES")) throw new Error("Invalid Google wind basis");
  const provenance = google ? object(v.provenance) : null;
  if (provenance && (provenance.provider !== "GOOGLE_WEATHER" || provenance.relationBasis !== "CASE_COORDINATES" || provenance.containmentClaimed !== false || typeof provenance.attribution !== "string" || provenance.attribution !== f?.attribution)) throw new Error("Invalid wind provenance");
  const timestamps = google ? object(v.timestamps) : null;
  const result: WindContext = { status: status as WindContext["status"], evaluatedAt: time(v.evaluatedAt), usableUntil: v.usableUntil === null ? null : time(v.usableUntil), ...(v.basis === "CASE_COORDINATES" || v.basis === "UNAVAILABLE" ? { basis: v.basis } : {}), ...(provenance ? { provenance: { provider: "GOOGLE_WEATHER", relationBasis: "CASE_COORDINATES", containmentClaimed: false, attribution: text(provenance.attribution) } as const } : {}), ...(timestamps ? { timestamps: { issuedAt: null, validAt: time(timestamps.validAt), fetchedAt: time(timestamps.fetchedAt), usableUntil: time(timestamps.usableUntil) } } : {}), ...(typeof v.stale === "boolean" ? { stale: v.stale } : {}), ...(v.unavailableReason == null ? { unavailableReason: null } : { unavailableReason: text(v.unavailableReason) }), forecast: f ? { id: text(f.id), provider: f.provider as WindForecast["provider"], regionId: f.regionId === null ? null : text(f.regionId), regionName: typeof f.regionName === "string" ? f.regionName : "", selectionBasis: google ? "CASE_COORDINATES" : f.selectionBasis === "REVIEWED_WEATHER_REFERENCE" ? "REVIEWED_WEATHER_REFERENCE" : "VERIFIED_ADMIN_REGION", ...(f.adm4 ? { adm4: text(f.adm4) } : {}), issuedAt: f.issuedAt === null ? null : time(f.issuedAt), validAt: time(f.validAt), fetchedAt: time(f.fetchedAt), ...(google ? { attribution: text(f.attribution) } : {}) } : null, windSpeedKmh: number(v.windSpeedKmh), windFromDegrees: number(v.windFromDegrees, 360), windToDegrees: number(v.windToDegrees, 360), summary: text(v.summary), disclaimer: v.disclaimer, spatialExtent: null, settlementExposure: v.settlementExposure, ruleVersion: text(v.ruleVersion) };
  if ((result.windFromDegrees === null) !== (result.windToDegrees === null) || (result.windFromDegrees !== null && result.windToDegrees !== (result.windFromDegrees + 180) % 360)) throw new Error("Inconsistent wind directions");
  if (result.status === "CALM" && (result.windSpeedKmh !== 0 || result.windFromDegrees !== null)) throw new Error("Invalid calm wind");
  if (result.status === "READY") {
    const f = result.forecast, at = Date.parse(result.evaluatedAt);
    if (!f || !result.usableUntil || !result.windSpeedKmh || result.windFromDegrees === null) throw new Error("Incomplete usable wind");
    const valid = Date.parse(f.validAt), fetched = Date.parse(f.fetchedAt);
    if (f.provider === "GOOGLE_WEATHER") {
      if (!result.timestamps || !result.provenance || result.timestamps.validAt !== f.validAt || result.timestamps.fetchedAt !== f.fetchedAt || result.timestamps.usableUntil !== result.usableUntil || result.stale !== false || valid > fetched + 300000 || valid <= fetched - 3600000 || fetched > at || Date.parse(result.usableUntil) !== Math.min(valid + 3600000, fetched + 120000) || at >= Date.parse(result.usableUntil)) throw new Error("Invalid usable wind times");
    } else {
      const issued = Date.parse(f.issuedAt!);
      if (issued > fetched || issued > valid || fetched > at || valid > at || Date.parse(result.usableUntil) !== Math.min(valid + 10800000, issued + 86400000, fetched + 86400000) || at >= Date.parse(result.usableUntil)) throw new Error("Invalid usable wind times");
    }
  }
  return result;
}
export function windArrow(detail: { id: string; title: string; verification: string; latitude: number | null; longitude: number | null; windContext: WindContext | null }, now: number): WindArrow | null {
  const w = detail.windContext;
  if (detail.verification !== "CONFIRMED_FIRE" || detail.latitude === null || detail.longitude === null || !Number.isFinite(detail.latitude) || Math.abs(detail.latitude) > 90 || !Number.isFinite(detail.longitude) || Math.abs(detail.longitude) > 180 || !w || w.status !== "READY" || w.windToDegrees === null || !w.usableUntil || now < Date.parse(w.evaluatedAt) || now >= Date.parse(w.usableUntil)) return null;
  return { caseId: detail.id, title: detail.title, latitude: detail.latitude, longitude: detail.longitude, degrees: w.windToDegrees, usableUntil: w.usableUntil, evaluatedAt: w.evaluatedAt };
}
