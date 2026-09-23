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
}>({ activeSourceId: null, available: false, start: () => undefined, cancel: () => undefined });
