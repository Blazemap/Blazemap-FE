import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui";
import { getMonitoringAvatar, updateMonitoringAvatar } from "@/api/dashboard/monitoring";
import { useGovernmentMutation } from "@/hooks/dashboard/useGovernment";
import { cropRect, decodeAvatar, encodeCrop, monitoringAvatarImage, paintCrop } from "@/lib/avatar";
import type { DashboardUser, MonitoringAvatarUpdate, MonitoringUser } from "@/types";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] ?? "").join("").toLocaleUpperCase("en") || "?";
}

function AvatarImage({ src, fallback }: { src: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? fallback : <img src={src} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailed(true)} />;
}

function AvatarBlob({ blob, fallback }: { blob: Blob; fallback: string }) {
  const [url] = useState(() => URL.createObjectURL(blob));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <AvatarImage src={url} fallback={fallback} />;
}

export function MonitoringAvatar({ actor, user, className = "size-11" }: { actor: DashboardUser; user: MonitoringUser; className?: string }) {
  const source = monitoringAvatarImage(user.image);
  const query = useQuery({ queryKey: ["dashboard", actor.id, actor.role, "monitoring-avatar", user.id, user.image], queryFn: ({ signal }) => getMonitoringAvatar(user.id, signal), enabled: source?.kind === "uploaded", retry: false, gcTime: 0, staleTime: 60000 });
  const fallback = initials(user.name);
  return <span role="img" aria-label={`Profile photo for ${user.name}`} className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-forest text-sm font-extrabold text-white ring-1 ring-primary/15 ${className}`}>
    {source?.kind === "remote" ? <AvatarImage key={source.value} src={source.value} fallback={fallback} /> : source?.kind === "uploaded" && query.data ? <AvatarBlob key={source.value} blob={query.data} fallback={fallback} /> : fallback}
  </span>;
}

export function MonitoringAvatarEditor({ actor, user, disabled, onSaved, onState }: { actor: DashboardUser; user: MonitoringUser; disabled: boolean; onSaved: (updated: MonitoringAvatarUpdate) => void; onState: (dirty: boolean, pending: boolean) => void }) {
  const [image, setImage] = useState<ImageBitmap>();
  const [crop, setCrop] = useState({ zoom: 1, x: 0.5, y: 0.5 });
  const [photoReason, setPhotoReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const drag = useRef<{ x: number; y: number; crop: typeof crop } | null>(null);
  const mutation = useGovernmentMutation(actor, ({ blob, signal, reason }: { blob: Blob; signal: AbortSignal; reason: string }) => updateMonitoringAvatar(user.id, blob, user.updatedAt, reason, signal));
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  useEffect(() => () => image?.close(), [image]);
  useEffect(() => { onState(!!image || loading, mutation.isPending); }, [image, loading, mutation.isPending, onState]);
  useEffect(() => { if (image && canvas.current) paintCrop(canvas.current, image, crop.zoom, crop.x, crop.y); }, [image, crop]);
  function cancel() {
    if (mutation.isPending) return;
    generation.current++;
    setImage(undefined);
    setPhotoReason("");
    setLoading(false);
    setError("");
    mutation.reset();
  }
  async function select(selected: File | undefined) {
    if (!selected || mutation.isPending) return;
    const current = ++generation.current;
    setLoading(true);
    setError("");
    setPhotoReason("");
    mutation.reset();
    try {
      const bitmap = await decodeAvatar(selected);
      if (current !== generation.current) { bitmap.close(); return; }
      setCrop({ zoom: 1, x: 0.5, y: 0.5 });
      setImage(bitmap);
    } catch (failure) {
      if (current === generation.current) setError(failure instanceof Error ? failure.message : "Unable to open this image.");
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  async function save() {
    const reason = photoReason.trim();
    if (!image || mutation.isPending || reason.length < 5) return;
    setError("");
    controller.current = new AbortController();
    try {
      const blob = await encodeCrop(image, crop.zoom, crop.x, crop.y);
      const updated = await mutation.mutateAsync({ blob, signal: controller.current.signal, reason });
      setImage(undefined);
      setPhotoReason("");
      onSaved(updated);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The profile photo could not be saved.");
    }
  }
  return <section aria-labelledby="monitoring-photo-title" className="rounded-xl border border-primary/10 bg-secondary/20 p-4 sm:p-5">
    <div className="flex items-center gap-4">
      <MonitoringAvatar actor={actor} user={user} className="size-20 text-xl" />
      <div className="min-w-0 flex-1"><h3 id="monitoring-photo-title" className="font-extrabold">Profile photo</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">JPEG, PNG or WebP up to 5 MB.</p><Button ref={trigger} type="button" variant="outline" className="mt-3" disabled={disabled || loading} onClick={() => file.current?.click()}><ImagePlus size={17} aria-hidden="true" />{loading ? "Opening photo…" : "Change photo"}</Button></div>
      <input ref={file} type="file" className="hidden" aria-label="Choose profile photo" accept="image/jpeg,image/png,image/webp" onChange={event => { void select(event.target.files?.[0]); event.target.value = ""; }} />
    </div>
    {!image && error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    {mutation.isSuccess && <p role="status" className="mt-3 text-sm text-emerald-800">Profile photo saved.</p>}
    <Dialog.Root open={!!image} onOpenChange={open => { if (!open) cancel(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-80 bg-forest/50" /><Dialog.Content data-lenis-prevent onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }} onEscapeKeyDown={event => { if (mutation.isPending) event.preventDefault(); }} onPointerDownOutside={event => { if (mutation.isPending) event.preventDefault(); }} className="fixed left-1/2 top-1/2 z-90 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 text-forest shadow-2xl">
      <Dialog.Title className="text-xl font-extrabold">Adjust profile photo</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">Drag the preview or use the controls. The photo is saved at 512 × 512.</Dialog.Description>
      {image && <div className="relative mx-auto my-6 aspect-square w-full max-w-64 overflow-hidden rounded-full bg-white ring-1 ring-primary/20">
        <canvas ref={node => { canvas.current = node; if (node && image) paintCrop(node, image, crop.zoom, crop.x, crop.y); }} width={512} height={512} aria-label="Cropped photo preview" className="size-full" />
        <button type="button" disabled={mutation.isPending} aria-label="Move crop; use arrow keys or drag" className="absolute inset-0 size-full touch-none cursor-move rounded-full focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary" onPointerDown={event => { if (!event.isPrimary || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, crop }; }} onPointerMove={event => {
          const start = drag.current;
          if (!start || !image || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = cropRect(image.width, image.height, start.crop.zoom, start.crop.x, start.crop.y);
          const scale = rect.size / event.currentTarget.clientWidth;
          setCrop({ ...start.crop, x: Math.max(0, Math.min(1, start.crop.x - (event.clientX - start.x) * scale / Math.max(1, image.width - rect.size))), y: Math.max(0, Math.min(1, start.crop.y - (event.clientY - start.y) * scale / Math.max(1, image.height - rect.size))) });
        }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          setCrop(value => ({ ...value, x: Math.max(0, Math.min(1, value.x + (event.key === "ArrowRight" ? 0.02 : event.key === "ArrowLeft" ? -0.02 : 0))), y: Math.max(0, Math.min(1, value.y + (event.key === "ArrowDown" ? 0.02 : event.key === "ArrowUp" ? -0.02 : 0))) }));
        }} />
      </div>}
      <fieldset disabled={mutation.isPending} className="space-y-3">{([['zoom', 'Zoom', 1, 4], ['x', 'Horizontal position', 0, 1], ['y', 'Vertical position', 0, 1]] as const).map(([key, label, min, max]) => <div key={key}><label htmlFor={`monitoring-avatar-${key}`} className="text-sm font-bold">{label}</label><input id={`monitoring-avatar-${key}`} type="range" min={min} max={max} step={0.01} value={crop[key]} className="block min-h-11 w-full accent-primary" onChange={event => setCrop(value => ({ ...value, [key]: Number(event.target.value) }))} /></div>)}<label htmlFor="monitoring-avatar-reason" className="block text-sm font-bold">Audit reason<textarea id="monitoring-avatar-reason" required minLength={5} maxLength={300} value={photoReason} onChange={event => { setPhotoReason(event.target.value); mutation.reset(); }} className="mt-2 min-h-20 w-full rounded-lg border border-input bg-white px-3 py-3 text-sm" /></label></fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" disabled={mutation.isPending} onClick={cancel}>Cancel</Button><Button type="button" disabled={mutation.isPending || photoReason.trim().length < 5} onClick={() => void save()}>{mutation.isPending ? "Saving…" : "Save photo"}</Button></div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>;
}
