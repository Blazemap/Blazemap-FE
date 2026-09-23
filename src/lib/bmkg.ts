import type { WeatherResolution } from "@/types/government";

export type WeatherSummary = {
  availability: "Current" | "Unavailable";
  basis: string;
  issuedAt: string | null;
  validAt: string | null;
  fetchedAt: string | null;
  usableUntil: string | null;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  reason: string | null;
};

export function weatherSummary(resolution: WeatherResolution): WeatherSummary {
  const availability = resolution.status === "CURRENT" ? "Current" : "Unavailable";
  return {
    availability,
    basis: resolution.basis === "CASE_COORDINATES" ? "Case coordinates" : "Case coordinates unavailable",
    issuedAt: resolution.timestamps?.issuedAt ?? null,
    validAt: resolution.timestamps?.validAt ?? null,
    fetchedAt: resolution.timestamps?.fetchedAt ?? null,
    usableUntil: resolution.timestamps?.usableUntil ?? null,
    temperature: resolution.forecast?.temperature ?? null,
    humidity: resolution.forecast?.humidity ?? null,
    windSpeed: resolution.forecast?.windSpeed ?? null,
    reason: resolution.unavailableReason,
  };
}
