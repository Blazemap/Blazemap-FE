import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import type { DashboardUser } from "@/types";
import type { CaseDetail, GovernmentReport } from "@/types/government";
import { getCaseDetail, governmentRequest } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";

export default function CasePublication({ user, detail, report, editing, onDraft }: { user: DashboardUser; detail?: CaseDetail; report?: GovernmentReport; editing: boolean; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const [message, setMessage] = useState("");
  const [approved, setApproved] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const publish = useGovernmentMutation(user, async () => {
    if (!approved || editing) throw new Error("Approve the public update and saved mapped area first.");
    if (detail) {
      const current = await getCaseDetail(detail.id, AbortSignal.timeout(20000));
      if (current.version !== detail.version || current.verification !== "CONFIRMED_FIRE" || !current.perimeter) throw new Error("Case or boundary changed. Refresh and review it before publishing.");
    }
    await governmentRequest("/api/admin/outcomes/publish", "post", { ...(report ? { reportId: report.id } : { caseId: detail!.id, expectedCaseVersion: detail!.version }), message: message.trim(), publish: true, privacyApproved: true, idempotencyKey: key });
    setMessage(""); setApproved(false); setKey(crypto.randomUUID());
  }, "canPublishInformation");
  const dirty = !!message || approved;
  useEffect(() => { onDraft({ dirty, pending: publish.isPending }); }, [dirty, publish.isPending, onDraft]);
  useEffect(() => () => onDraft({ dirty: false, pending: false }), [onDraft]);
  if (user.role !== "ADMIN" || !user.canPublishInformation) return null;
  const available = report ? report.reviewStatus === "DECLINED" : detail?.verification === "CONFIRMED_FIRE" && detail.handling === "CLOSED" && !!detail.perimeter;
  return <form aria-label="Publish to News" className="mt-5 space-y-3 border-t pt-4" onSubmit={event => { event.preventDefault(); publish.mutate(); }}>
    <fieldset disabled={editing || publish.isPending || !available} className="space-y-3">
      <label className="block text-sm font-bold">Approved public update <span aria-hidden="true">*</span><textarea required aria-required="true" minLength={5} maxLength={600} value={message} onChange={event => { setMessage(event.target.value); setApproved(false); setKey(crypto.randomUUID()); }} className="mt-1 min-h-24 w-full rounded-lg border border-input bg-white p-3 text-sm" /></label>
      <label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" required aria-required="true" checked={approved} onChange={event => setApproved(event.target.checked)} className="mt-1 size-4 shrink-0" /><span>{report ? "Publish this declined status and approved update to News." : "Publish this status, approved update and reviewed mapped area to News."} <span aria-hidden="true">*</span></span></label>
      {!report && detail?.handling !== "CLOSED" && <p role="status" className="text-xs text-muted-foreground">Close incident handling before publishing the completed announcement to News.</p>}
      <p className="text-xs text-muted-foreground">Only the text above{report ? "" : " and saved polygon"} will be public. Do not include personal details. Private notes and evidence photos are not copied.{report ? " Declined does not mean verified not fire." : ""}</p>
      <Button disabled={!approved || message.trim().length < 5}>{publish.isPending ? "Publishing…" : "Publish"}</Button>
    </fieldset>
    {publish.error && <p role="alert" className="text-sm">{publish.error.message}</p>}
    {publish.isSuccess && <p role="status" className="text-sm">Published to News.</p>}
  </form>;
}
