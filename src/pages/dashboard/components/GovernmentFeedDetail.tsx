import type { Dispatch, SetStateAction } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui";
import type { DashboardUser } from "@/types";
import type { CaseDetail, FieldInput, GovernmentReport } from "@/types/government";
import type { PerimeterDraft } from "@/lib/perimeter";
import { hasPoint } from "@/pages/dashboard/utils";
import { GovernmentReportDetailSkeleton } from "./DashboardSkeletons";
import { FeedFoliage } from "./FeedRow";
import { ReportReview } from "./GovernmentReports";

type GovernmentFeedDetailProps = {
  user: DashboardUser;
  report: GovernmentReport | null;
  loading: boolean;
  failed: boolean;
  retry: () => void;
  caseEvidence?: (FieldInput & { id: string })[];
  caseAssignments?: CaseDetail["assignments"];
  onBack: () => void;
  onLocate: () => void;
  onDraft: (dirty: boolean, pending: boolean) => void;
  perimeterDraft: PerimeterDraft | null;
  setPerimeterDraft: Dispatch<SetStateAction<PerimeterDraft | null>>;
};

export default function GovernmentFeedDetail({ user, report, loading, failed, retry, caseEvidence = [], caseAssignments = [], onBack, onLocate, onDraft, perimeterDraft, setPerimeterDraft }: GovernmentFeedDetailProps) {
  return <section aria-label="Private report details" className="absolute inset-0 overflow-y-auto overscroll-contain bg-white px-4 pb-32 pt-56 sm:px-6 sm:pt-28">
    <FeedFoliage />
    <div className="relative mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-primary/10 pb-3">
        <Button variant="ghost" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back to Feed</Button>
        {report && hasPoint(report) && <Button variant="outline" onClick={onLocate}><MapPin size={16} aria-hidden="true" />Locate</Button>}
      </div>
      {loading && <GovernmentReportDetailSkeleton />}
      {failed && <div role="alert" className="space-y-3"><p>This private report could not be loaded.</p><Button variant="outline" onClick={retry}>Retry</Button></div>}
      {report && <fieldset disabled={failed}><ReportReview user={user} report={report} caseEvidence={caseEvidence} caseAssignments={caseAssignments} onDraft={onDraft} perimeterDraft={perimeterDraft?.caseId === `report:${report.id}` ? perimeterDraft : null} setPerimeterDraft={setPerimeterDraft} canDraw={false} /></fieldset>}
    </div>
  </section>;
}
