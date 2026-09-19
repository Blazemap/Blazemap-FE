import { useEffect, useRef, useState } from "react";
import { Button, EvidenceUpload } from "@/components/ui";
import { uploadPhoto } from "@/api/reports";
import { governmentRequest } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import type { DashboardUser, ReportPhoto } from "@/types";

export default function ReportProgress({ user, reportId, disabled, onDraft }: { user: DashboardUser; reportId: string; disabled: boolean; onDraft: (state: { dirty: boolean; pending: boolean }) => void }) {
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [error, setError] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [attempted, setAttempted] = useState(false);
  const photoRef = useRef(photos);
  useEffect(() => { photoRef.current = photos; }, [photos]);
  useEffect(() => () => photoRef.current.forEach(photo => URL.revokeObjectURL(photo.preview)), []);
  const save = useGovernmentMutation(user, async () => {
    setError("");
    const ids: string[] = [];
    for (let index = 0; index < photos.length; index++) {
      const photo = photos[index];
      try { ids.push(photo.id || await uploadPhoto(user, photo, values => setPhotos(current => current.map((item, i) => i === index ? { ...item, ...values } : item)))); }
      catch { throw new Error(`Photo ${index + 1} upload failed. Retry to resume, or remove it before saving.`); }
    }
    setAttempted(true);
    await governmentRequest(`/api/admin/reports/${encodeURIComponent(reportId)}/progress`, "post", { description: description.trim(), attachmentIds: ids, idempotencyKey: key });
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setPhotos([]); setDescription(""); setAttempted(false); setKey(crypto.randomUUID());
  });
  const dirty = !!description || photos.length > 0;
  useEffect(() => { onDraft({ dirty, pending: save.isPending }); }, [dirty, save.isPending, onDraft]);
  useEffect(() => () => onDraft({ dirty: false, pending: false }), [onDraft]);
  return <form className="space-y-3 border-t pt-4" aria-label="Add report progress" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
    <fieldset disabled={disabled || save.isPending} className="space-y-3"><legend className="text-sm font-bold">Progress update</legend>
      <label htmlFor="progress-description" className="block text-sm font-bold">Update for the report owner <span aria-hidden="true">*</span></label>
      <p id="progress-description-help" className="text-xs text-muted-foreground">Describe progress or the next action in 5–2,000 characters. This update and any photos are visible to the report owner and government reviewers, not public News. Adding progress does not confirm fire.</p>
      <textarea id="progress-description" aria-describedby="progress-description-help" required aria-required="true" minLength={5} maxLength={2000} disabled={attempted} value={description} onChange={event => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border p-3" />
      <section aria-label="Optional evidence photos" className="border-t pt-4">
        <EvidenceUpload count={photos.length} disabled={attempted || disabled || save.isPending} error={error} onError={setError} onFiles={files => setPhotos(current => [...current, ...files.map(file => ({ file, preview: URL.createObjectURL(file), progress: 0 }))])} />
      </section>
      <ul className="space-y-2">{photos.map((photo, index) => <li key={photo.preview} className="flex items-center gap-3 rounded border p-2"><img src={photo.preview} alt={`Selected evidence ${index + 1}`} className="size-16 object-cover" /><span className="min-w-0 flex-1 break-all text-xs">{photo.file.name}{save.isPending && <span role="status" className="mt-1 block bg-secondary p-2 motion-safe:animate-pulse">Uploading {photo.progress}%</span>}{photo.id && " · Ready"}</span><Button type="button" variant="ghost" aria-label={`Remove photo ${index + 1}: ${photo.file.name}`} disabled={attempted || disabled || save.isPending} onClick={() => { URL.revokeObjectURL(photo.preview); setPhotos(current => current.filter((_, i) => i !== index)); setError(""); }}>Remove</Button></li>)}</ul>
      <Button disabled={description.trim().length < 5}>{save.isPending ? "Saving…" : attempted ? "Retry unchanged update" : "Save progress"}</Button>
    </fieldset>
    {save.error && <p role="alert" className="text-sm">{save.error.message}</p>}
    {attempted && save.error && <p className="text-xs">The result is uncertain. Retry unchanged to avoid duplicate steps.</p>}
    {save.isSuccess && <p role="status" className="text-sm">Progress saved privately.</p>}
  </form>;
}
