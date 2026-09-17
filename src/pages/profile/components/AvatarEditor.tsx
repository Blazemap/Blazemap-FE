import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Pencil, UserRound } from "lucide-react";
import { Button } from "@/components/ui";
import { useAvatar, useMutationSaveAvatar } from "@/hooks/profile";
import { cropRect, decodeAvatar, encodeCrop, paintCrop } from "@/lib/avatar";
import type { DashboardUser } from "@/types";

export function AvatarEditor({ user, disabled, onSaved, onState }: { user: DashboardUser; disabled: boolean; onSaved: (user: DashboardUser) => void; onState: (dirty: boolean, pending: boolean) => void }) {
  const avatar = useAvatar(user);
  const mutation = useMutationSaveAvatar(user);
  const [image, setImage] = useState<ImageBitmap>();
  const [crop, setCrop] = useState({ zoom: 1, x: 0.5, y: 0.5 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const drag = useRef<{ x: number; y: number; crop: typeof crop } | null>(null);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  useEffect(() => () => image?.close(), [image]);
  useEffect(() => { onState(!!image || loading, saving); }, [image, loading, saving, onState]);
  useEffect(() => {
    if (image && canvas.current) paintCrop(canvas.current, image, crop.zoom, crop.x, crop.y);
  }, [image, crop]);
  function cancel() {
    if (lock.current) return;
    generation.current++;
    setImage(undefined);
    setLoading(false);
    setError("");
  }
  async function select(selected: File | undefined) {
    if (!selected || lock.current) return;
    const current = ++generation.current;
    setLoading(true); setError(""); setSaved(false);
    try {
      const bitmap = await decodeAvatar(selected);
      if (current !== generation.current) { bitmap.close(); return; }
      setCrop({ zoom: 1, x: 0.5, y: 0.5 }); setImage(bitmap);
    } catch (failure) {
      if (current === generation.current) setError(failure instanceof Error ? failure.message : "Unable to open this image.");
    } finally { if (current === generation.current) setLoading(false); }
  }
  async function save() {
    if (!image || lock.current) return;
    lock.current = true; setSaving(true); setError("");
    const current = generation.current;
    controller.current = new AbortController();
    try {
      const blob = await encodeCrop(image, crop.zoom, crop.x, crop.y);
      const updated = await mutation.mutateAsync({ blob, signal: controller.current.signal });
      if (current !== generation.current) return;
      onSaved(updated); setImage(undefined); setSaved(true);
    } catch {
      if (current === generation.current) setError("Photo save could not be confirmed. Your previous photo stays visible. Retry or reload to check your account.");
    } finally { lock.current = false; if (current === generation.current) setSaving(false); }
  }
  return <div className="border-b border-primary/10 p-6">
    <div className="flex items-center gap-5">
      <button ref={trigger} type="button" aria-label="Edit profile photo" disabled={disabled || saving || loading} onClick={() => file.current?.click()} className="group relative grid size-24 shrink-0 place-items-center rounded-full bg-emerald-50 text-primary ring-1 ring-primary/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
        {avatar.url ? <img src={avatar.url} alt="Current profile" referrerPolicy="no-referrer" className="size-full rounded-full object-cover" /> : <UserRound size={36} aria-hidden="true" />}
        <span className="absolute inset-0 grid place-items-center rounded-full bg-forest/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"><Pencil size={22} aria-hidden="true" /></span>
        <span className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full border-2 border-white bg-primary text-white"><Pencil size={15} aria-hidden="true" /></span>
      </button>
      <div><h3 className="font-extrabold">Profile photo</h3><Button type="button" variant="outline" className="mt-2" disabled={disabled || saving || loading} onClick={() => file.current?.click()}>Change photo</Button><p className="mt-2 text-xs text-muted-foreground">JPEG, PNG or WebP · up to 5 MB</p></div>
      <input ref={file} type="file" className="hidden" aria-label="Choose profile photo" accept="image/jpeg,image/png,image/webp" onChange={event => { void select(event.target.files?.[0]); event.target.value = ""; }} />
    </div>
    {loading && <div className="mt-3 flex items-center gap-3"><p role="status" className="text-sm">Opening image…</p><Button type="button" variant="ghost" onClick={cancel}>Cancel</Button></div>}
    {avatar.isError && <div className="mt-3 text-sm"><p role="alert">Your saved photo could not be loaded.</p><Button type="button" variant="ghost" onClick={() => void avatar.refetch()}>Retry photo</Button></div>}
    {saved && <p role="status" className="mt-3 text-sm text-primary">Profile photo saved.</p>}
    {!image && error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    <Dialog.Root open={!!image} onOpenChange={open => { if (!open) cancel(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-80 bg-forest/50" /><Dialog.Content onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }} onEscapeKeyDown={event => { if (saving) event.preventDefault(); }} onPointerDownOutside={event => event.preventDefault()} className="fixed left-1/2 top-1/2 z-90 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 text-forest shadow-2xl">
      <Dialog.Title className="text-xl font-extrabold">Crop profile photo</Dialog.Title><Dialog.Description className="mt-2 text-sm text-muted-foreground">Drag to position, or use the sliders. Saved as a 512 × 512 image.</Dialog.Description>
      <div className="relative mx-auto my-5 aspect-square w-full max-w-64 overflow-hidden rounded-full bg-white ring-1 ring-primary/20">
        <canvas ref={node => { canvas.current = node; if (node && image) paintCrop(node, image, crop.zoom, crop.x, crop.y); }} width={512} height={512} aria-label="Cropped photo preview" className="size-full" />
        <button type="button" disabled={saving} aria-label="Move crop; use arrow keys or drag" className="absolute inset-0 size-full touch-none cursor-move rounded-full focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary" onPointerDown={event => { if (!event.isPrimary || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, crop }; }} onPointerMove={event => {
          const start = drag.current;
          if (!start || !image || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = cropRect(image.width, image.height, start.crop.zoom, start.crop.x, start.crop.y);
          const scale = rect.size / event.currentTarget.clientWidth;
          setCrop({ ...start.crop, x: Math.max(0, Math.min(1, start.crop.x - (event.clientX - start.x) * scale / Math.max(1, image.width - rect.size))), y: Math.max(0, Math.min(1, start.crop.y - (event.clientY - start.y) * scale / Math.max(1, image.height - rect.size))) });
        }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault(); setCrop(value => ({ ...value, x: Math.max(0, Math.min(1, value.x + (event.key === "ArrowRight" ? 0.02 : event.key === "ArrowLeft" ? -0.02 : 0))), y: Math.max(0, Math.min(1, value.y + (event.key === "ArrowDown" ? 0.02 : event.key === "ArrowUp" ? -0.02 : 0))) }));
        }} />
      </div>
      <fieldset disabled={saving} className="space-y-2">{([['zoom', 'Zoom', 1, 4], ['x', 'Horizontal position', 0, 1], ['y', 'Vertical position', 0, 1]] as const).map(([key, label, min, max]) => <div key={key}><label htmlFor={`avatar-${key}`} className="text-sm font-bold">{label}</label><input id={`avatar-${key}`} type="range" min={min} max={max} step={0.01} value={crop[key]} aria-valuetext={key === "zoom" ? `${crop.zoom.toFixed(2)} times` : `${Math.round(crop[key] * 100)} percent`} className="block min-h-11 w-full accent-primary" onChange={event => setCrop(value => ({ ...value, [key]: Number(event.target.value) }))} /></div>)}</fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
      <div className="mt-5 flex justify-end gap-3"><Button type="button" variant="outline" disabled={saving} onClick={cancel}>Cancel</Button><Button type="button" disabled={saving} aria-busy={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button></div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
