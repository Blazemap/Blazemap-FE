import { useState } from "react";
import { Bell, Inbox, X } from "lucide-react";
import { Popover } from "radix-ui";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { reportQueryOptions } from "@/api/reports";
import { useNotifications } from "@/hooks/notifications";
import { publicRequest } from "@/hooks/dashboard/usePublications";
import type { DashboardUser } from "@/types";
import { ownReportHasActiveMap, publicationHasMap, publicationPath, type Publication } from "@/lib/publications";
import NearbyPreferences from "./NearbyPreferences";

function NotificationSkeleton({ count = 3, label = "Loading notifications" }: { count?: number; label?: string }) {
  return <div role="status" aria-label={label} className="space-y-2 p-4 motion-safe:animate-pulse"><span className="sr-only">{label}</span>{Array.from({ length: count }, (_, index) => <div key={index} className="rounded-xl bg-secondary/50 p-3"><span className="block h-3 w-2/3 rounded bg-secondary" /><span className="mt-2 block h-3 w-full rounded bg-secondary" /><span className="mt-2 block h-2 w-24 rounded bg-secondary" /></div>)}</div>;
}

export function NotificationBell({ user }: { user: DashboardUser }) {
  const navigate = useNavigate();
  const notifications = useNotifications(user);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const items = unreadOnly ? notifications.items.filter(item => item.readAt === null) : notifications.items;
  async function open(item: typeof notifications.items[number]) {
    if (openingId) return;
    setOpeningId(item.id);
    try {
      let target = "/dashboard";
      if (item.type !== "NEARBY_CONFIRMED_FIRE" && item.publication) {
        const publication = await publicRequest<{ data: Publication }>(user, `/api/public/information/${encodeURIComponent(item.publication.slug)}`, AbortSignal.timeout(20000)).then(result => result.data).catch(() => null);
        target = publication && publicationHasMap(publication) ? `/dashboard?publication=${encodeURIComponent(item.publication.slug)}` : publicationPath(item.publication.slug, item.type === "NEARBY_COMPLETION" ? "news" : "feed");
      } else if (item.reportId) {
        if (user.role === "ADMIN") target = `/dashboard?report=${encodeURIComponent(item.reportId)}`;
        else {
          const report = await reportQueryOptions(user, item.reportId).queryFn({ signal: AbortSignal.timeout(20000) }).catch(() => null);
          target = report && ownReportHasActiveMap(report) ? `/dashboard?report=${encodeURIComponent(item.reportId)}` : `/dashboard?panel=my-reports&report=${encodeURIComponent(item.reportId)}`;
        }
      }
      if (item.readAt === null) notifications.read.mutate(item.id);
      setPopoverOpen(false);
      navigate(target);
    } finally { setOpeningId(null); }
  }
  return <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
    <Popover.Trigger asChild><button type="button" aria-label={`${notifications.unreadCount} unread notifications`} className="relative grid size-11 shrink-0 place-items-center rounded-full border border-primary/20 bg-red-50 text-primary shadow-sm transition-colors hover:border-primary/35 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-primary"><Bell size={20} aria-hidden="true" />{notifications.unreadCount > 0 && <span aria-hidden="true" className="absolute right-1 top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-white">{notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}</span>}</button></Popover.Trigger>
    <Popover.Portal><Popover.Content align="end" sideOffset={10} collisionPadding={12} data-lenis-prevent className="z-[75] flex max-h-[min(34rem,calc(100dvh-6rem))] w-[min(22.5rem,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-primary/10 bg-white text-forest shadow-2xl">
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4"><h2 className="text-lg font-extrabold">Notifications</h2><Popover.Close asChild><button type="button" aria-label="Close notifications" className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"><X size={17} aria-hidden="true" /></button></Popover.Close></header>
      <div role="tablist" aria-label="Notification filter" className="mx-5 mb-3 grid grid-cols-2 rounded-xl bg-secondary/60 p-1"><button type="button" role="tab" aria-selected={!unreadOnly} onClick={() => setUnreadOnly(false)} className={`min-h-9 rounded-lg px-3 text-xs font-extrabold ${!unreadOnly ? "bg-white shadow-sm" : "text-muted-foreground"}`}>All</button><button type="button" role="tab" aria-selected={unreadOnly} onClick={() => setUnreadOnly(true)} className={`min-h-9 rounded-lg px-3 text-xs font-extrabold ${unreadOnly ? "bg-white shadow-sm" : "text-muted-foreground"}`}>Unread ({notifications.unreadCount})</button></div>
      {user.role === "USER" && <details className="border-y border-primary/10"><summary className="flex min-h-11 cursor-pointer items-center px-5 text-xs font-bold">Nearby alert settings</summary><NearbyPreferences user={user} /></details>}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.isPending && <NotificationSkeleton />}
        {notifications.isError && <div role="alert" className="space-y-3 p-5 text-sm"><p>Notifications could not be loaded.</p><Button variant="outline" onClick={() => void notifications.refetch()}>Retry</Button></div>}
        {!notifications.isPending && !notifications.isError && !items.length && <div role="status" className="flex min-h-44 flex-col items-center justify-center gap-3 px-5 py-10 text-center text-muted-foreground"><Inbox size={38} strokeWidth={1.5} aria-hidden="true" /><p className="text-sm font-bold">{unreadOnly ? "No unread notifications" : "No notifications yet"}</p></div>}
        {!!items.length && <ul className="divide-y divide-primary/10">{items.map(item => <li key={item.id}><button type="button" disabled={openingId !== null} aria-busy={openingId === item.id} onClick={() => { void open(item); }} className={`block min-h-11 w-full px-5 py-4 text-left hover:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${item.readAt === null ? "bg-orange-50/60" : "bg-white"}`}><span className="flex items-start gap-3"><span aria-hidden="true" className={`mt-1 size-2.5 shrink-0 rounded-full ${item.readAt === null ? "bg-primary" : "border border-muted-foreground/30 bg-white"}`} /><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{item.title}</span><span className="mt-1 block whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.message}</span><time dateTime={item.createdAt} className="mt-2 block text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time></span></span></button></li>)}</ul>}
        {notifications.hasNextPage && <div className="p-3"><Button variant="outline" aria-busy={notifications.isFetchingNextPage} className="w-full" disabled={notifications.isFetchingNextPage} onClick={notifications.showMore}>Show more</Button></div>}
        {notifications.isFetchingNextPage && <NotificationSkeleton count={1} label="Loading more notifications" />}
      </div>
      <footer className="flex min-h-12 items-center justify-end border-t border-primary/10 px-4"><Button variant="ghost" disabled={!notifications.unreadCount || notifications.readAll.isPending} onClick={() => notifications.readAll.mutate()}>Mark all as read</Button></footer>
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
