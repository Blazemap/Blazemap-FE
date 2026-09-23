import { useEffect, useState } from "react";
import { Button, FieldLength } from "@/components/ui";
import { publishPerimeter, savePublication } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { activeIncidentPublicationState } from "@/lib/publications";
import type { DashboardUser } from "@/types";
import type { CaseDetail, PublicationDraft } from "@/types/government";

const control = "mt-2 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";

export default function ActiveIncidentPublication({ user, detail, onDraft }: { user: DashboardUser; detail: CaseDetail; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const [publication, setPublication] = useState<PublicationDraft | null>(detail.activePublication);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [privacyReview, setPrivacyReview] = useState("");
  const [approved, setApproved] = useState(false);
  const state = activeIncidentPublicationState({ verification: detail.verification, handling: detail.handling, publication });
  const save = useGovernmentMutation(user, async () => {
    const saved = await savePublication({ title: title.trim(), summary: summary.trim(), body: summary.trim(), type: "UPDATE", sources: [{ title: sourceTitle.trim(), url: sourceUrl.trim() }], regionIds: detail.regionId ? [detail.regionId] : [], caseId: detail.id, publicLocationMode: "APPROVED_INCIDENT_PERIMETER", privacyReview: privacyReview.trim() }, publication?.id);
    setPublication(saved);
    setEditing(false);
    setApproved(false);
  }, "canPublishInformation", "Incident draft saved");
  const publish = useGovernmentMutation(user, async () => {
    if (!publication || publication.status !== "DRAFT" || !approved) throw new Error("Review and approve the saved draft first.");
    setPublication(await publishPerimeter(publication.id, publication.updatedAt, "Approved active incident publication", detail.version));
    setApproved(false);
  }, "canPublishInformation", "Incident published to citizen dashboards");
  useEffect(() => { onDraft({ dirty: editing || approved, pending: save.isPending || publish.isPending }); }, [editing, approved, save.isPending, publish.isPending, onDraft]);
  useEffect(() => () => onDraft({ dirty: false, pending: false }), [onDraft]);
  if (!state.available) return null;
  const validSource = (() => { try { const url = new URL(sourceUrl.trim()); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; } })();
  const canSave = title.trim().length >= 3 && summary.trim().length >= 5 && sourceTitle.trim().length >= 2 && validSource && privacyReview.trim().length >= 5;
  function start() {
    setTitle(publication?.title ?? detail.title);
    setSummary(publication?.summary ?? "");
    setSourceTitle(publication?.sources[0]?.title ?? "");
    setSourceUrl(publication?.sources[0]?.url ?? "");
    setPrivacyReview("");
    setApproved(false);
    setEditing(true);
  }
  return <section aria-labelledby="incident-publication-title" className="mt-4 rounded-xl border border-primary/15 bg-white p-4">
    <h4 id="incident-publication-title" className="text-sm font-extrabold">Publish confirmed incident</h4><p className="mt-2 text-xs leading-5 text-muted-foreground">Review the public text and perimeter before publishing. Private reports and reporter details stay private.</p>
    <div className="mt-4 border-t border-primary/10 pt-3"><p className="text-xs text-muted-foreground">Publication status</p><span className="mt-2 inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">{state.label}</span></div>
    {publication && !editing && <p className="mt-3 text-sm leading-6">{publication.summary}</p>}
    {!editing && user.canPublishInformation && <Button type="button" variant="outline" className="mt-4 w-full" onClick={start}>{publication?.status === "DRAFT" ? "Edit incident draft" : publication?.status === "PUBLISHED" ? "Prepare updated draft" : "Prepare public update"}</Button>}
    {editing && <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); if (canSave) save.mutate(); }}><fieldset disabled={save.isPending || publish.isPending} className="space-y-3"><label htmlFor="incident-publish-title" className="block text-xs font-bold">Public title<input id="incident-publish-title" required minLength={3} maxLength={200} value={title} onChange={event => setTitle(event.target.value)} className={control} /><FieldLength value={title} min={3} max={200} /></label><label htmlFor="incident-publish-summary" className="block text-xs font-bold">Approved public update<textarea id="incident-publish-summary" required minLength={5} maxLength={600} value={summary} onChange={event => setSummary(event.target.value)} className={`${control} min-h-24 py-3`} /><FieldLength value={summary} min={5} max={600} /></label><label htmlFor="incident-publish-source" className="block text-xs font-bold">Source title<input id="incident-publish-source" required minLength={2} maxLength={200} value={sourceTitle} onChange={event => setSourceTitle(event.target.value)} className={control} /></label><label htmlFor="incident-publish-url" className="block text-xs font-bold">HTTPS source URL<input id="incident-publish-url" type="url" required pattern="https://.*" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} className={control} /></label><label htmlFor="incident-publish-privacy" className="block text-xs font-bold">Privacy review<textarea id="incident-publish-privacy" required minLength={5} maxLength={2000} value={privacyReview} onChange={event => setPrivacyReview(event.target.value)} className={`${control} min-h-20 py-3`} /><FieldLength value={privacyReview} min={5} max={2000} /></label></fieldset>{save.error && <p role="alert" className="text-sm text-red-800">{save.error.message}</p>}<div className="flex flex-wrap gap-2"><Button type="submit" disabled={!canSave || save.isPending}>{save.isPending ? "Saving…" : "Save draft"}</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setEditing(false)}>Cancel</Button></div></form>}
    {publication?.status === "DRAFT" && !editing && <div className="mt-4 space-y-3 border-t border-primary/10 pt-3"><label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} className="mt-1" /><span>I reviewed this draft and approve publishing its confirmed perimeter to citizen dashboards.</span></label><Button type="button" disabled={!approved || publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? "Publishing…" : "Publish incident"}</Button>{publish.error && <p role="alert" className="text-sm text-red-800">{publish.error.message}</p>}</div>}
  </section>;
}
