import type { CaseItem, OwnReport } from "@/types";
import type { Polygon } from "@/lib/perimeter";
import type { WindContext } from "@/lib/wind";

export type Triage = { level: "CRITICAL" | "HIGH" | "MEDIUM" | "UNKNOWN"; reasonCodes: string[]; missingData: string[]; evaluatedAt: string; ruleVersion: string; satelliteMatch: { distanceMeters: number; acquiredAt: string | null } | null; settlementMatch: { name: string | null; distanceMeters: number | null } | null };
export type GovernmentReport = OwnReport & { regionId: string | null; case: (NonNullable<OwnReport["case"]> & { id: string }) | null; triage: Triage };
export type GovernmentReports = { data: GovernmentReport[]; meta: { total: number; page: number; pageSize: number } };
export type FieldFinding = "VISIBLE_FIRE" | "SMOKE_ONLY" | "NO_INDICATION" | "INCONCLUSIVE" | "UNREACHABLE";
export type FieldInput = { findings: FieldFinding; description: string; source: string; observedAt: string; latitude: number | null; longitude: number | null };
export type VerificationInput = { outcome: "CONFIRMED_FIRE" | "NOT_FIRE" | "INCONCLUSIVE"; fieldUpdateId: string; version: number; reason: string; authorityReference: string };
export type CaseDetail = CaseItem & { windContext: WindContext | null; version: number; perimeter: Polygon | null; perimeterObservedAt: string | null; perimeterSource: string | null; perimeterRevision: number; areaHectares: number | null; fieldUpdates: (FieldInput & { id: string })[]; analysisLimitations: { completedAt: string | null; current: boolean; limitations: string[] }[] };
export type PerimeterInput = { version: number; perimeter: Polygon; perimeterObservedAt: string; perimeterSource: string; reason: string; authorityReference: string };
export type PublicationInput = { title: string; summary: string; body: string; type: "UPDATE"; sources: { title: string; url: string }[]; regionIds: string[]; caseId: string; publicLocationMode: "APPROVED_INCIDENT_PERIMETER"; privacyReview: string };
export type PublicationDraft = { id: string; title: string; summary: string; body: string; updatedAt: string; status: "DRAFT" | "PUBLISHED"; sources: { title: string; url: string }[] };
