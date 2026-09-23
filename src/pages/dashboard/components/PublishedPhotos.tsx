import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui";
import { publicRequest } from "@/hooks/dashboard/usePublications";
import type { DashboardUser } from "@/types";
import type { Publication } from "@/lib/publications";

export default function PublishedPhotos({ user, title, photos }: { user: DashboardUser; title: string; photos: Publication["attachments"] }) {
  return <ul className="grid gap-3 sm:grid-cols-2">{photos.map((photo, index) => <PublishedPhoto key={photo.id} user={user} title={title} photo={photo} index={index} />)}</ul>;
}

function PublishedPhoto({ user, title, photo, index }: { user: DashboardUser; title: string; photo: Publication["attachments"][number]; index: number }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const query = useQuery({ queryKey: ["dashboard", user.id, user.role, "public-media", photo.id], staleTime: 45_000, gcTime: 60_000, retry: false, queryFn: async ({ signal }) => {
    const value = (await publicRequest<{ data: { url: string } }>(user, `/api/public/media/${encodeURIComponent(photo.id)}`, signal)).data.url;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid media URL");
    return url.href;
  } });
  const label = `Published photo ${index + 1} for ${title}: ${photo.filename}`;
  const image = (full: boolean) => <>
    {(!query.data || !loaded) && !query.isError && !imageError && <div role="status" aria-label={`Loading ${label}`} className="absolute inset-0 bg-secondary motion-safe:animate-pulse" />}
    {query.data && !imageError && <img src={query.data} alt={label} referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setImageError(true)} className={`absolute inset-0 h-full w-full ${full ? "object-contain" : "object-cover"} ${loaded ? "" : "invisible"}`} />}
  </>;
  const error = <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted-foreground">Published photo unavailable.</div>;
  return <li>
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><button type="button" aria-label={`Open ${label}`} className="relative block aspect-video w-full overflow-hidden rounded-sm border bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">{query.isError || imageError ? error : image(false)}</button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-80 bg-black/75" />
        <Dialog.Content data-lenis-prevent className="fixed left-1/2 top-1/2 z-90 flex max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-sm bg-white p-4 text-forest shadow-2xl">
          <div className="flex items-center justify-between gap-3"><Dialog.Title className="min-w-0 break-all text-sm font-bold">{label}</Dialog.Title><Dialog.Close asChild><Button variant="outline" className="shrink-0" aria-label="Close published photo">Close</Button></Dialog.Close></div>
          <Dialog.Description className="sr-only">Full-size privacy-reviewed published photo. Press Escape or Close to return.</Dialog.Description>
          <div className="relative h-[70dvh] min-h-0 overflow-hidden bg-secondary">{query.isError || imageError ? error : image(true)}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </li>;
}
