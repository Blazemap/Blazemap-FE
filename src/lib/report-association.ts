import { createContext } from "react";
import type { GovernmentReport } from "@/types/government";

export type ReportAssociationPick = {
  sourceId: string;
  apply: (report: GovernmentReport) => void;
};

export const ReportAssociationContext = createContext<{
  activeSourceId: string | null;
  available: boolean;
  start: (pick: ReportAssociationPick) => void;
  cancel: () => void;
  caseId: string | null;
  selectedIds: ReadonlySet<string>;
  selectedReports: { id: string; number: string }[];
  toggleCaseReport: (reportId: string) => void;
  startCase: (caseId: string) => void;
  finishCase: () => void;
  clearCase: () => void;
  validateCaseSelection: (reportIds: string[]) => Promise<void>;
}>({ activeSourceId: null, available: false, start: () => undefined, cancel: () => undefined, caseId: null, selectedIds: new Set(), selectedReports: [], toggleCaseReport: () => undefined, startCase: () => undefined, finishCase: () => undefined, clearCase: () => undefined, validateCaseSelection: async () => undefined });
