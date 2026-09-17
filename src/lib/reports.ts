import type { ReportDraft, ReportPayload } from "@/types";

export function reportPayload(draft: ReportDraft, attachmentIds: string[], idempotencyKey: string): ReportPayload {
  if (!draft.observationTypes.length || draft.observationTypes.some(type => !["SMOKE", "FLAME", "BURNING_SMELL"].includes(type))) throw new Error("Select what you observed.");
  const observedAt = `${draft.observedLocal}:00${draft.offset}`;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(draft.observedLocal) || !["+07:00", "+08:00"].includes(draft.offset) || !Number.isFinite(Date.parse(observedAt)) || Date.parse(observedAt) > Date.now()) throw new Error("Enter an observation time that is not in the future, with the correct timezone.");
  const calendar = new Date(`${draft.observedLocal}:00Z`);
  if (calendar.toISOString().slice(0, 16) !== draft.observedLocal) throw new Error("Enter a valid calendar date.");
  if (!["INCIDENT_ESTIMATE", "OBSERVER_POSITION"].includes(draft.locationMode)) throw new Error("Choose what the location represents.");
  if (draft.accuracyMeters !== null && (!Number.isFinite(draft.accuracyMeters) || draft.accuracyMeters < 0 || draft.accuracyMeters > 100000)) throw new Error("Location accuracy is unavailable; enter a location manually.");
  const hasPoint = draft.latitude.trim() !== "" || draft.longitude.trim() !== "";
  const latitude = hasPoint ? Number(draft.latitude) : null;
  const longitude = hasPoint ? Number(draft.longitude) : null;
  if (hasPoint && (!draft.latitude.trim() || !draft.longitude.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude!) > 90 || Math.abs(longitude!) > 180)) throw new Error("Enter valid latitude and longitude together.");
  if (!draft.confirmed) throw new Error("Confirm the location information before continuing.");
  if (!hasPoint && !draft.regionId) throw new Error("Select a verified region or provide coordinates.");
  if (draft.locationDescription.trim().length < 5 || draft.locationDescription.trim().length > 1000) throw new Error("Describe a landmark or direction using 5–1,000 characters.");
  if (draft.description.trim().length < 5 || draft.description.trim().length > 2000) throw new Error("Describe your observation using 5–2,000 characters.");
  if (attachmentIds.length > 5 || new Set(attachmentIds).size !== attachmentIds.length) throw new Error("Choose up to five different photos.");
  return { observationTypes: [...new Set(draft.observationTypes)], observedAt, locationMode: draft.locationMode, latitude, longitude, accuracyMeters: hasPoint ? draft.accuracyMeters : null, regionId: draft.regionId || null, locationDescription: draft.locationDescription.trim(), description: draft.description.trim(), attachmentIds, idempotencyKey };
}
export function validatePhoto(file: Pick<File, "name" | "type" | "size">): string {
  const extensions: Record<string, RegExp> = { "image/jpeg": /\.jpe?g$/i, "image/png": /\.png$/i, "image/webp": /\.webp$/i };
  if (!extensions[file.type]?.test(file.name) || (/[\\/]/.test(file.name) || [...file.name].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) || file.name.length > 180) return "Choose a JPEG, PNG or WebP file with a matching filename.";
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) return "Each photo must be between 1 byte and 5 MiB.";
  return "";
}
export function privateError(error: unknown): string {
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : 0;
  if (status === 401 || status === 403) return "Your session or access could not be verified. Keep this page open and log in again in another tab using the same account, then retry.";
  if (status === 409) return "The submission conflicts with an earlier request. Retry the unchanged submission or check My reports before starting another.";
  if (status === 429) return "Too many requests. Wait a moment, then retry. Your input is unchanged.";
  return "The request could not be confirmed. Your input is unchanged. Check your connection and retry.";
}
