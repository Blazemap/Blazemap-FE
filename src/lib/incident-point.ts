import { createContext } from "react";

export type IncidentPoint = { latitude: string; longitude: string };
export type IncidentPick = IncidentPoint & { apply: (point: IncidentPoint) => void };
export const IncidentPointContext = createContext<{ start: (pick: IncidentPick) => void; available: boolean }>({ start: () => undefined, available: false });
export function updateIncidentPick(pick: IncidentPick | null, latitude: string, longitude: string): IncidentPick | null {
  if (!pick || !latitude.trim() || !longitude.trim() || !Number.isFinite(Number(latitude)) || Math.abs(Number(latitude)) > 90 || !Number.isFinite(Number(longitude)) || Math.abs(Number(longitude)) > 180) return pick;
  return { ...pick, latitude, longitude };
}
