import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { uploadPhoto } from "@/api/reports";
import { governmentRequest } from "@/api/dashboard/government";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { validatePhoto } from "@/lib/reports";
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
      <label className="block text-sm">Description <span aria-hidden="true">*</span><textarea required aria-required="true" minLength={5} maxLength={2000} disabled={attempted} value={description} onChange={event => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border p-3" /></label>
      <label className="block text-sm">Evidence photos (optional, up to 5)<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={attempted} className="mt-2 block w-full text-xs" onChange={event => {
        const files = Array.from(event.target.files ?? []); event.target.value = "";
        const invalid = files.map(validatePhoto).find(Boolean);
        if (invalid || photos.length + files.length > 5) { setError(invalid || "Choose up to five photos."); return; }
        setError(""); setPhotos(current => [...current, ...files.map(file => ({ file, preview: URL.createObjectURL(file), progress: 0 }))]);
      }} /></label>
      <ul className="space-y-2">{photos.map((photo, index) => <li key={photo.preview} className="flex items-center gap-3 rounded border p-2"><img src={photo.preview} alt={`Selected evidence ${index + 1}`} className="size-16 object-cover" /><span className="min-w-0 flex-1 break-all text-xs">{photo.file.name}{save.isPending && <span role="status" className="mt-1 block bg-secondary p-2 motion-safe:animate-pulse">Uploading {photo.progress}%</span>}{photo.id && " · Ready"}</span><Button type="button" variant="ghost" disabled={attempted} onClick={() => { URL.revokeObjectURL(photo.preview); setPhotos(current => current.filter((_, i) => i !== index)); }}>Remove</Button></li>)}</ul>
      <p className="text-xs text-muted-foreground">Description and evidence are visible to this report’s owner and government reviewers, not public News. JPEG, PNG or WebP, up to 5 MiB each.</p>
      <Button disabled={description.trim().length < 5}>{save.isPending ? "Saving…" : attempted ? "Retry unchanged update" : "Save progress"}</Button>
    </fieldset>
    {(error || save.error) && <p role="alert" className="text-sm">{error || save.error?.message}</p>}
    {attempted && save.error && <p className="text-xs">The result is uncertain. Retry unchanged to avoid duplicate steps.</p>}
    {save.isSuccess && <p role="status" className="text-sm">Progress saved privately.</p>}
  </form>;
}
