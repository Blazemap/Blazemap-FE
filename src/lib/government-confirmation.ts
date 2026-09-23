export function parseEvidenceProvenance(value: unknown) {
  if (value == null) return undefined;
  if (!["FIELD_OBSERVATION", "REVIEWED_CITIZEN_ESTIMATE", "OPERATOR_ASSESSMENT"].includes(String(value))) throw new Error("Invalid evidence provenance");
  return value as "FIELD_OBSERVATION" | "REVIEWED_CITIZEN_ESTIMATE" | "OPERATOR_ASSESSMENT";
}

export type ConfirmationEvidenceRecord = {
  id: string;
  assignmentId?: string | null;
  teamId?: string | null;
  assignment?: { id: string; status: string; team: { id: string; name: string } } | null;
  findings: string;
  source: string;
  observedAt: string;
  latitude: number | null;
  longitude: number | null;
};

export type ConfirmationEvidenceSnapshot = {
  fieldUpdateId: string;
  evidence: {
    findings: "VISIBLE_FIRE";
    source: string;
    observedAt: string;
    latitude: number;
    longitude: number;
  };
};

export type ReportConfirmationObservation = { provenance: "FIELD_OBSERVATION"; source: string; observedAt: string; incidentPoint: { latitude: number; longitude: number } };

export function confirmationStepVisible(status: string) {
  return status === "CONFIRMED_FIRE";
}

export function eligibleConfirmationEvidence<T extends ConfirmationEvidenceRecord>(items: T[]) {
  return items.filter(item => !!item.assignmentId && !!item.teamId && item.findings === "VISIBLE_FIRE" && item.latitude !== null && item.longitude !== null);
}

export function confirmationEvidenceSnapshot(item: ConfirmationEvidenceRecord): ConfirmationEvidenceSnapshot | null {
  if (!item.assignmentId || !item.teamId || item.findings !== "VISIBLE_FIRE" || item.latitude === null || item.longitude === null) return null;
  return { fieldUpdateId: item.id, evidence: { findings: "VISIBLE_FIRE", source: item.source, observedAt: item.observedAt, latitude: item.latitude, longitude: item.longitude } };
}

export function reportConfirmationObservation(input: { mode: "report" | "existing" | "record"; source: string; observedAt: string; latitude: string; longitude: string }): ReportConfirmationObservation | null {
  void input;
  return null;
}
