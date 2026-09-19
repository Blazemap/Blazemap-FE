import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { downloadPhoto } from "@/api/reports";
import { Button } from "@/components/ui";
import { useAccount } from "@/hooks/useAccount";
import type { DashboardUser } from "@/types";

type Photo = { id: string; filename: string };
type PhotoState = { url?: string; loaded?: boolean; error?: boolean };

export default function ReportPhotos({ user, reportId, photos }: { user: DashboardUser; reportId: string; photos: Photo[] }) {
  const account = useAccount();
  if (!photos.length) return null;
  if (!account.isSuccess || account.data?.id !== user.id || account.data?.role !== user.role) return <p role="alert" className="text-sm">Photo access could not be verified for this account.</p>;
  return <ul className="mt-3 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">{photos.map((photo, index) => <PhotoCard key={JSON.stringify([user.id, user.role, reportId, photo.id])} user={user} photo={photo} index={index} />)}</ul>;
}

function PhotoCard({ user, photo, index }: { user: DashboardUser; photo: Photo; index: number }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PhotoState>({});
  const { id, role } = user;
  const label = `Report photo ${index + 1}: ${photo.filename}`;
  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]);
    void downloadPhoto({ id, role } as DashboardUser, photo.id, signal).then(url => {
      if (!controller.signal.aborted) setState({ url });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ error: true });
    });
    return () => controller.abort();
  }, [id, role, photo.id, attempt]);
  function reload() { setState({}); setAttempt(value => value + 1); }
  function changeOpen(value: boolean) { setOpen(value); reload(); }
  const image = (full: boolean) => <>
    {!state.loaded && !state.error && <div role="status" aria-label={`Loading ${label}`} className="absolute inset-0 bg-secondary motion-safe:animate-pulse" />}
    {state.url && <img key={state.url} src={state.url} alt={label} referrerPolicy="no-referrer" onLoad={() => setState(current => current.url === state.url ? { ...current, loaded: true } : current)} onError={() => setState(current => current.url === state.url ? { error: true } : current)} className={`absolute inset-0 h-full w-full ${full ? "object-contain" : "object-cover"} ${state.loaded ? "" : "invisible"}`} />}
  </>;
  const error = <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto p-3 text-center"><p role="alert" className="text-xs">Photo unavailable. Access may have expired or been revoked.</p><Button type="button" variant="outline" onClick={reload} aria-label={`Retry ${label}`}>Retry</Button></div>;
  return <li className="min-w-0">
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <div data-report-thumbnail style={{ position: "relative", display: "block", width: "100%", aspectRatio: "4 / 3", minHeight: "9rem" }} className="overflow-hidden rounded-sm border bg-secondary">
        <Dialog.Trigger asChild><button type="button" aria-label={`Open ${label}`} className="absolute inset-0 h-full w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">{!open && !state.error && image(false)}</button></Dialog.Trigger>
        {!open && state.error && error}
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-80 bg-black/75" />
        <Dialog.Content data-lenis-prevent className="fixed left-1/2 top-1/2 z-90 flex max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-sm bg-white p-4 text-forest shadow-2xl">
          <div className="flex shrink-0 items-center justify-between gap-3"><Dialog.Title className="min-w-0 break-all text-sm font-bold">{label}</Dialog.Title><Dialog.Close asChild><Button type="button" variant="outline" className="shrink-0" aria-label="Close photo">Close</Button></Dialog.Close></div>
          <Dialog.Description className="sr-only">Full-size report photo. Press Escape or Close to return to the thumbnail.</Dialog.Description>
          <div className="relative min-h-0 h-[70dvh] shrink overflow-hidden bg-secondary">{state.error ? error : image(true)}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </li>;
}
