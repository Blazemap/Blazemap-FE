import type { CaseItem, OwnReport, Priority } from "@/types";
import type { Polygon } from "@/lib/perimeter";
import type { WindContext } from "@/lib/wind";

export type Triage = { level: "CRITICAL" | "HIGH" | "MEDIUM" | "UNKNOWN"; reasonCodes: string[]; missingData: string[]; evaluatedAt: string; ruleVersion: string; satelliteMatch: { distanceMeters: number; acquiredAt: string | null } | null; settlementMatch: { name: string | null; distanceMeters: number | null } | null };
export type GovernmentReport = OwnReport & { regionId: string | null; reporter?: { id: string; name: string; email: string }; case: (NonNullable<OwnReport["case"]> & { id: string; version: number }) | null; triage: Triage };
export type GovernmentReports = { data: GovernmentReport[]; meta: { total: number; page: number; pageSize: number } };
export type ReportActionStatus = "IN_PROGRESS" | "REVIEWED" | "CONFIRMED_FIRE" | "DECLINED";
export type ReportActionInput = { status: Exclude<ReportActionStatus, "CONFIRMED_FIRE">; description: string; attachmentIds: string[]; idempotencyKey: string } | { status: "CONFIRMED_FIRE"; description: string; attachmentIds: string[]; idempotencyKey: string; confirmed: { evidence: { findings: "VISIBLE_FIRE"; source: "Authorized government review with operator-mapped boundary" }; perimeter: Polygon; authorityReference: "APPLICATION_ADMIN_ROLE"; expectedCaseVersion?: number } };
export type FieldFinding = "VISIBLE_FIRE" | "SMOKE_ONLY" | "NO_INDICATION" | "INCONCLUSIVE" | "UNREACHABLE";
export type FieldInput = { findings: FieldFinding; description: string; source: string; observedAt: string; latitude: number | null; longitude: number | null };
export type VerificationInput = { outcome: "CONFIRMED_FIRE" | "NOT_FIRE" | "INCONCLUSIVE"; fieldUpdateId: string; version: number; reason: string; reporterMessage: string; authorityReference: string; operatorWorkflow?: true; perimeter?: Polygon; perimeterObservedAt?: string; perimeterSource?: string };
export type ForecastRegion = { id: string; name: string; code: string; level: 4; timezone: string; bmkgMapped: true };
export type CaseDetail = CaseItem & { regionId: string | null; region: { id: string; name: string } | null; operatorAuthorityConfigured: boolean; activeAssignmentCount: number; windContext: WindContext | null; version: number; perimeterObservedAt: string | null; perimeterSource: string | null; areaHectares: number | null; fieldUpdates: (FieldInput & { id: string })[]; priorityHistory: { id: string; from: Priority; to: Priority; reason: string | null; changedAt: string; changedBy: string }[]; analysisLimitations: { completedAt: string | null; current: boolean; limitations: string[] }[] };
export type PerimeterInput = { version: number; perimeter: Polygon; perimeterObservedAt: string; perimeterSource: string; reason: string; authorityReference: string };
export type PublicationInput = { title: string; summary: string; body: string; type: "UPDATE"; sources: { title: string; url: string }[]; regionIds: string[]; caseId?: string; reportId?: string; outcome?: "CONFIRMED" | "DECLINED"; publicLocationMode: "APPROVED_INCIDENT_PERIMETER" | "NONE"; privacyReview: string };
export type PublicationDraft = { id: string; title: string; summary: string; body: string; updatedAt: string; status: "DRAFT" | "PUBLISHED"; sources: { title: string; url: string }[] };
