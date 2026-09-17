import { useState } from "react";
import { Button } from "@/components/ui";
import type { DashboardUser } from "@/types";
import type { CaseDetail, PublicationDraft, PublicationInput } from "@/types/government";
import { getCaseDetail, publishPerimeter, savePublication } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { formatTime } from "@/pages/dashboard/utils";

const control = "mt-1 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";
export default function CasePublication({ user, detail, editing }: { user: DashboardUser; detail: CaseDetail; editing: boolean }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [authority, setAuthority] = useState("");
  const [saved, setSaved] = useState<{ publication: PublicationDraft; input: string; revision: number; caseVersion: number } | null>(null);
  const [approved, setApproved] = useState(false);
  const input: PublicationInput = { title: title.trim(), summary: summary.trim(), body: body.trim(), type: "UPDATE", sources: [{ title: sourceTitle.trim(), url: sourceUrl.trim() }], regionIds: [], caseId: detail.id, publicLocationMode: "APPROVED_INCIDENT_PERIMETER", privacyReview: privacy.trim() };
  const signature = JSON.stringify(input);
  const save = useGovernmentMutation(user, async () => {
    const url = new URL(input.sources[0].url);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Provide a factual source URL using HTTP or HTTPS without credentials.");
    if (/<\/?[a-z][^>]*>/i.test(input.body)) throw new Error("Use plain text or Markdown without HTML.");
    const publication = await savePublication(input, saved?.publication.id);
    setSaved({ publication, input: signature, revision: detail.perimeterRevision, caseVersion: detail.version });
    setApproved(false);
    return publication;
  }, "canPublishInformation");
  const publish = useGovernmentMutation(user, async () => {
    if (!saved || !approved || saved.input !== signature || saved.caseVersion !== detail.version || editing) throw new Error("Save and review the current draft and perimeter before publishing.");
    const current = await getCaseDetail(detail.id);
    if (current.version !== saved.caseVersion || current.perimeterRevision !== saved.revision || current.verification !== "CONFIRMED_FIRE") throw new Error("Case or perimeter changed. Refresh, save the draft, and review the current perimeter again.");
    const publication = await publishPerimeter(saved.publication.id, saved.publication.updatedAt, authority.trim());
    setSaved({ ...saved, publication }); setApproved(false);
    return publication;
  }, "canPublishInformation");
  if (!user.canPublishInformation) return <p className="mt-5 border-t pt-4 text-xs">Publishing requires the information-publication capability.</p>;
  const published = saved?.publication.status === "PUBLISHED";
  return <section aria-label="Publish approved perimeter" className="mt-5 space-y-3 border-t pt-4"><h4 className="font-extrabold">Publish approved perimeter</h4><p className="text-xs">Only the saved, confirmed perimeter is eligible. Private report evidence is not copied. Saving a publication draft does not publish it.</p>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); save.mutate(); }}><fieldset className="space-y-3" disabled={save.isPending || publish.isPending || published || editing || !detail.perimeter || detail.verification !== "CONFIRMED_FIRE"}>
      <label className="block text-xs font-bold">Public title<input required minLength={3} maxLength={200} className={control} value={title} onChange={event => { setTitle(event.target.value); setApproved(false); }} /></label><label className="block text-xs font-bold">Public summary<textarea required minLength={5} maxLength={600} className={`${control} py-2`} value={summary} onChange={event => { setSummary(event.target.value); setApproved(false); }} /></label><label className="block text-xs font-bold">Public body<textarea required minLength={5} maxLength={40000} className={`${control} min-h-28 py-2`} value={body} onChange={event => { setBody(event.target.value); setApproved(false); }} /></label>
      <label className="block text-xs font-bold">Factual source title<input required minLength={2} maxLength={200} className={control} value={sourceTitle} onChange={event => { setSourceTitle(event.target.value); setApproved(false); }} /></label><label className="block text-xs font-bold">Factual source URL<input required type="url" maxLength={2000} className={control} value={sourceUrl} onChange={event => { setSourceUrl(event.target.value); setApproved(false); }} /></label>
      <label className="block text-xs font-bold">Privacy review and disclosure reason<textarea required minLength={5} maxLength={2000} className={`${control} py-2`} value={privacy} onChange={event => { setPrivacy(event.target.value); setApproved(false); }} /></label>
      <Button type="submit">{save.isPending ? "Saving draft…" : saved ? "Save reviewed draft again" : "Save publication draft"}</Button>
    </fieldset>{save.error && <p role="alert" className="text-sm">{save.error.message}</p>}</form>
    {saved && !published && <form className="space-y-3 rounded-lg border bg-white p-3" onSubmit={event => { event.preventDefault(); publish.mutate(); }}><h5 className="text-sm font-bold">Review saved draft</h5><p className="text-sm font-bold">{saved.publication.title}</p><p className="whitespace-pre-wrap text-sm">{saved.publication.summary}</p><p className="whitespace-pre-wrap text-xs">{saved.publication.body}</p><ul className="text-xs">{saved.publication.sources.map((s, i) => <li key={i}>{s.title}: {s.url}</li>)}</ul><p className="text-xs">Perimeter revision {saved.revision} · {detail.areaHectares?.toLocaleString("en", { maximumFractionDigits: 2 })} ha<br />Source: {detail.perimeterSource}<br />Observed {detail.perimeterObservedAt && formatTime(detail.perimeterObservedAt)}<br />Publication draft saved {formatTime(saved.publication.updatedAt)}</p>
      <label className="block text-xs font-bold">Publisher authority reference<input required minLength={3} maxLength={500} className={control} value={authority} onChange={event => { setAuthority(event.target.value); setApproved(false); }} /></label>
      {(signature !== saved.input || saved.caseVersion !== detail.version || editing) && <p role="alert" className="text-xs">Content, case, or drawing changed. Save the reviewed publication draft again after saving or cancelling the drawing.</p>}
      <label className="flex min-h-11 gap-2 text-xs"><input type="checkbox" required checked={approved} disabled={signature !== saved.input || saved.caseVersion !== detail.version || editing} onChange={event => setApproved(event.target.checked)} className="size-4 shrink-0" />I reviewed the public text, sources, privacy and saved perimeter. I explicitly authorize publication of this snapshot.</label><Button type="submit" disabled={!approved || publish.isPending || save.isPending || signature !== saved.input || saved.caseVersion !== detail.version || editing}>{publish.isPending ? "Publishing…" : "Publish approved perimeter"}</Button>
    </form>}
    {publish.error && <p role="alert" className="text-sm">{publish.error.message}</p>}
    {published && <p role="status" className="text-sm">Published explicitly. The public map uses the approved snapshot, not subsequent private edits.</p>}
  </section>;
}
