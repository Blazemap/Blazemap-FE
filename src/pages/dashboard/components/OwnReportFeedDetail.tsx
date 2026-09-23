import { ArrowLeft, Clock3, MapPin } from "lucide-react";
import { Button } from "@/components/ui";
import { useQueryGetReport } from "@/hooks/reports";
import { reportStatusLabel } from "@/lib/report-status";
import ReportPhotos from "@/pages/reports/ReportPhotos";
import ReportTimeline from "@/pages/reports/ReportTimeline";
import type { DashboardUser } from "@/types";
import { FeedFoliage, FeedRowsSkeleton } from "./FeedRow";

export default function OwnReportFeedDetail({ user, id, onBack, onLocate }: { user: DashboardUser; id: string; onBack: () => void; onLocate: (report: import("@/types").OwnReport) => void }) {
  const query = useQueryGetReport(user, id);
  const report = query.isError ? undefined : query.data;

  return <section aria-label="Your report details" className="absolute inset-0 overflow-y-auto overscroll-contain bg-white px-4 pb-32 pt-56 sm:px-6 sm:pt-28">
    <FeedFoliage />
    <div className="relative mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-primary/10 pb-3">
        <Button variant="ghost" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back to Feed</Button>
        {report && report.case?.handlingStatus !== "CLOSED" && (report.case?.perimeter || report.latitude !== null && report.longitude !== null) && <Button variant="outline" onClick={() => onLocate(report)}><MapPin size={16} aria-hidden="true" />View on map</Button>}
      </div>
      {query.isPending && <FeedRowsSkeleton citizen />}
      {query.isError && <div role="alert" className="space-y-3"><p>This private report could not be loaded for this account.</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div>}
      {report && <article className="space-y-5 rounded-sm border border-primary/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your private report</p><h1 className="mt-2 text-2xl font-extrabold">{report.description}</h1></div><span className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-bold">{reportStatusLabel(report)}</span></div>
        <dl className="divide-y divide-primary/10 border-y border-primary/10 text-sm">
          <div className="py-4"><dt className="flex items-center gap-2 font-bold"><Clock3 size={16} aria-hidden="true" />Observed</dt><dd className="mt-1 text-muted-foreground">{new Date(report.observedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</dd></div>
          <div className="py-4"><dt className="flex items-center gap-2 font-bold"><MapPin size={16} aria-hidden="true" />Location</dt><dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{report.locationDescription || report.region?.name || "Location description unavailable"}</dd></div>
        </dl>
        {!!report.attachments.length && <section aria-label="Private report photos"><h2 className="font-extrabold">Private photos</h2><ReportPhotos user={user} reportId={report.id} photos={report.attachments} /></section>}
        <ReportTimeline report={report} user={user} />
      </article>}
    </div>
  </section>;
}
