import { useEffect, useState } from "react";
import { Button, FieldLength, RichTextEditor } from "@/components/ui";
import { publishCompletionReport, saveCompletionReport } from "@/api/dashboard/government";
import { useCompletionReport, useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { emptyRichText, type RichTextDocument } from "@/lib/rich-text";
import type { DashboardUser } from "@/types";
import type { CompletionReportCase } from "@/types/government";
import { CompletionNewsSkeleton } from "./DashboardSkeletons";

const control = "mt-2 min-h-11 w-full rounded-lg border border-input bg-white px-3 text-sm";
function paragraph(value: string): RichTextDocument {
  return value.trim() ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: value.trim() }] }] } : emptyRichText;
}
function words(document: RichTextDocument) {
  const text = document.content.flatMap(function flatten(node): string[] { return node.type === "text" ? [node.text ?? ""] : (node.content ?? []).flatMap(flatten); }).join(" ").trim();
  return { text, length: text.length };
}

export default function CompletionNewsEditor({ user, caseId, onDraft }: { user: DashboardUser; caseId: string; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const resource = useCompletionReport(user, caseId);
  const [updatedItem, setUpdatedItem] = useState<CompletionReportCase>();
  const item = updatedItem ?? resource.data ?? undefined;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState<RichTextDocument>(emptyRichText);
  const [bodyLength, setBodyLength] = useState(0);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [privacyReview, setPrivacyReview] = useState("");
  const [publishApproval, setPublishApproval] = useState(false);
  const save = useGovernmentMutation(user, async () => {
    if (!item) throw new Error("Reload the confirmed case before editing News.");
    const publication = item.publication;
    const sources = sourceUrl.trim() ? [{ title: sourceTitle.trim(), url: sourceUrl.trim() }] : [];
    const saved = await saveCompletionReport({ caseId: item.id, expectedCaseVersion: item.version, expectedUpdatedAt: publication?.updatedAt ?? null, title: title.trim(), summary: summary.trim(), bodyRich: body, sources, regionIds: item.region ? [item.region.id] : [], validUntil: null, publicLocationMode: item.perimeter ? "APPROVED_INCIDENT_PERIMETER" : item.region ? "REGION_ONLY" : "NONE", privacyReview: privacyReview.trim() || null });
    setUpdatedItem({ ...item, publication: saved });
    setEditing(false);
    setPublishApproval(false);
  }, "canPublishInformation", "News draft saved");
  const publish = useGovernmentMutation(user, async () => {
    if (!item?.publication || item.publication.status !== "DRAFT" || !publishApproval) throw new Error("Save and approve the News draft before publishing.");
    const published = await publishCompletionReport(item.publication.id, item.publication.updatedAt, item.version);
    setUpdatedItem({ ...item, publication: published });
    setPublishApproval(false);
  }, "canPublishInformation", "News published");
  useEffect(() => { onDraft({ dirty: editing, pending: resource.loading || save.isPending || publish.isPending }); }, [editing, resource.loading, save.isPending, publish.isPending, onDraft]);
  useEffect(() => () => onDraft({ dirty: false, pending: false }), [onDraft]);
  function start() {
    if (!item) return;
    const publication = item.publication;
    setTitle(publication?.title ?? `${item.title} — completion update`);
    setSummary(publication?.summary ?? item.closureReason ?? "Case handling has been completed.");
    const initialBody = publication?.bodyRich ?? paragraph(publication?.body ?? item.completionEvidence?.description ?? item.closureReason ?? "");
    setBody(initialBody);
    setBodyLength(words(initialBody).length);
    setSourceTitle(publication?.sources[0]?.title ?? `Case ${item.number}`);
    setSourceUrl(publication?.sources[0]?.url ?? "");
    setPrivacyReview(publication?.privacyReviewed ? "Reviewed for personal information, private evidence, and precise location exposure." : "");
    setPublishApproval(false);
    setEditing(true);
  }
  const publication = item?.publication;
  const closed = item?.handlingStatus === "CLOSED";
  const currentLabel = !publication ? "Create News draft" : publication.status === "DRAFT" ? publication.supersedesId ? "Edit update draft" : "Edit draft" : "Edit News";
  const validSource = !sourceUrl.trim() || (() => { try { return new URL(sourceUrl.trim()).protocol === "https:"; } catch { return false; } })();
  const canSave = title.trim().length >= 3 && summary.trim().length >= 5 && bodyLength >= 5 && sourceTitle.trim().length >= 2 && sourceUrl.trim().length > 0 && validSource && privacyReview.trim().length >= 5;
  if (!item && resource.initialLoading) return <CompletionNewsSkeleton />;
  if (!item) return <div role="alert" className="mt-5 space-y-3 text-sm"><p>Completion News is unavailable.</p><Button variant="outline" onClick={resource.retry}>Retry</Button></div>;
  return <section aria-labelledby="completion-news-title" className="mt-5 rounded-xl border border-primary/15 bg-secondary/20 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary/70">{closed ? "Closed case" : "Confirmed case"}</p><h4 id="completion-news-title" className="mt-1 text-lg font-extrabold">News</h4><p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground">{closed ? "Prepare or revise the public News record. Publishing remains a separate approval." : "Prepare the rich-text News draft now. It cannot be published until case handling is closed."}</p></div>{!editing && <Button type="button" onClick={start}>{currentLabel}</Button>}</div>
    {publication && !editing && <div className="mt-4 flex flex-wrap items-center gap-3 text-sm"><span className="rounded-full bg-white px-3 py-1 font-bold">{publication.status === "DRAFT" ? publication.supersedesId ? "Update draft" : "Draft" : publication.supersedesId ? "Published · Updated" : "Published"}</span><span className="text-muted-foreground">{publication.summary}</span></div>}
    {editing && <form className="mt-5 space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}><fieldset disabled={save.isPending || publish.isPending} className="space-y-4"><label htmlFor="completion-title" className="block text-sm font-bold">Title<input id="completion-title" required minLength={3} maxLength={200} value={title} onChange={event => setTitle(event.target.value)} className={control} /><FieldLength value={title} min={3} max={200} /></label><label htmlFor="completion-summary" className="block text-sm font-bold">Summary<textarea id="completion-summary" required minLength={5} maxLength={600} value={summary} onChange={event => setSummary(event.target.value)} className={`${control} min-h-20 py-3`} /><FieldLength value={summary} min={5} max={600} /></label><div><p className="mb-2 text-sm font-bold">Body</p><RichTextEditor value={body} onChange={(value, length) => { setBody(value); setBodyLength(length); }} /></div><div className="grid gap-4 sm:grid-cols-2"><label htmlFor="completion-source-title" className="block text-sm font-bold">Source title<input id="completion-source-title" required minLength={2} maxLength={200} value={sourceTitle} onChange={event => setSourceTitle(event.target.value)} className={control} /><FieldLength value={sourceTitle} min={2} max={200} /></label><label htmlFor="completion-source-url" className="block text-sm font-bold">HTTPS source<input id="completion-source-url" type="url" required pattern="https://.*" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} className={control} /></label></div><label htmlFor="completion-privacy" className="block text-sm font-bold">Privacy review<textarea id="completion-privacy" required minLength={5} maxLength={2000} value={privacyReview} onChange={event => setPrivacyReview(event.target.value)} className={`${control} min-h-20 py-3`} /><FieldLength value={privacyReview} min={5} max={2000} /></label></fieldset>{save.error && <p role="alert" className="text-sm text-red-800">{save.error.message}</p>}<div className="flex justify-end gap-3 border-t border-primary/10 pt-4"><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setEditing(false)}>Cancel</Button><Button disabled={!canSave || save.isPending}>{save.isPending ? "Saving…" : publication?.status === "PUBLISHED" ? "Create update draft" : "Save draft"}</Button></div></form>}
    {publication?.status === "DRAFT" && !editing && !closed && <p role="status" className="mt-5 border-t border-primary/10 pt-4 text-sm text-muted-foreground">Draft saved. Close the case after completion evidence is recorded to enable publishing.</p>}
    {publication?.status === "DRAFT" && !editing && closed && <div className="mt-5 space-y-3 border-t border-primary/10 pt-4"><label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" checked={publishApproval} onChange={event => setPublishApproval(event.target.checked)} className="mt-1" />I reviewed this exact draft and approve publishing it to News.</label><Button type="button" disabled={!publishApproval || publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? "Publishing…" : publication.supersedesId ? "Publish update" : "Publish News"}</Button>{publish.error && <p role="alert" className="text-sm text-red-800">{publish.error.message}</p>}</div>}
    {publish.isSuccess && <p role="status" className="mt-3 text-sm text-emerald-800">{publication?.supersedesId ? "News updated. The previous version is marked superseded." : "News published."}</p>}
  </section>;
}
