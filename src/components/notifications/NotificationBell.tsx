import { Bell, Inbox } from "lucide-react";
import { Popover } from "radix-ui";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { useNotifications } from "@/hooks/notifications";
import type { DashboardUser } from "@/types";

function NotificationSkeleton() {
  return <div role="status" aria-label="Loading notifications" className="space-y-2 p-3 motion-safe:animate-pulse"><span className="sr-only">Loading notifications</span>{Array.from({ length: 3 }, (_, index) => <div key={index} className="rounded-lg bg-gray-100 p-3"><span className="block h-3 w-2/3 rounded bg-gray-200" /><span className="mt-2 block h-3 w-full rounded bg-gray-200" /><span className="mt-2 block h-2 w-24 rounded bg-gray-200" /></div>)}</div>;
}

export function NotificationBell({ user }: { user: DashboardUser }) {
  const navigate = useNavigate();
  const notifications = useNotifications(user);
  if (user.role !== "USER") return null;
  function open(id: string, reportId: string, unread: boolean) {
    if (unread) notifications.read.mutate(id);
    navigate(`/dashboard?panel=my-reports&report=${encodeURIComponent(reportId)}`);
  }
  return <Popover.Root>
    <Popover.Trigger asChild><button type="button" aria-label={`${notifications.unreadCount} unread notifications`} className="relative grid size-11 shrink-0 place-items-center rounded-full text-forest hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"><Bell size={20} aria-hidden="true" />{notifications.unreadCount > 0 && <span aria-hidden="true" className="absolute right-1 top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-orange-700 px-1 text-[10px] font-extrabold text-white">{notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}</span>}</button></Popover.Trigger>
    <Popover.Portal><Popover.Content align="end" sideOffset={8} collisionPadding={12} data-lenis-prevent className="z-[75] max-h-[min(32rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-24px))] overflow-y-auto rounded-xl border bg-white text-forest shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white p-4"><div><h2 className="font-extrabold">Notifications</h2><p aria-live="polite" className="text-xs text-gray-600">{notifications.unreadCount} unread</p></div><Button variant="ghost" disabled={!notifications.unreadCount || notifications.readAll.isPending} onClick={() => notifications.readAll.mutate()}>Mark all as read</Button></header>
      {notifications.isPending && <NotificationSkeleton />}
      {notifications.isError && <div role="alert" className="space-y-3 p-4 text-sm"><p>Notifications could not be loaded.</p><Button variant="outline" onClick={() => void notifications.refetch()}>Retry</Button></div>}
      {!notifications.isPending && !notifications.isError && !notifications.items.length && <div role="status" className="flex flex-col items-center gap-3 px-5 py-12 text-center text-gray-500"><Inbox size={38} strokeWidth={1.5} aria-hidden="true" /><p className="text-sm font-semibold">No notifications yet.</p></div>}
      {!!notifications.items.length && <ul className="divide-y">{notifications.items.map(item => <li key={item.id}><button type="button" onClick={() => open(item.id, item.reportId, item.readAt === null)} className={`block min-h-11 w-full px-4 py-3 text-left hover:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${item.readAt === null ? "bg-orange-50/60" : "bg-white"}`}><span className="flex items-start gap-2"><span className="min-w-0 flex-1"><span className="block font-extrabold">{item.title}</span><span className="mt-1 block whitespace-pre-wrap text-sm leading-5 text-gray-700">{item.message}</span><time dateTime={item.createdAt} className="mt-2 block text-xs text-gray-500">{new Date(item.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time></span>{item.readAt === null && <span className="mt-1 size-2.5 shrink-0 rounded-full bg-orange-700"><span className="sr-only">Unread</span></span>}</span></button></li>)}</ul>}
      {notifications.hasNextPage && <div className="border-t p-3"><Button variant="outline" className="w-full" disabled={notifications.isFetchingNextPage} onClick={notifications.showMore}>{notifications.isFetchingNextPage ? "Loading…" : "Show more"}</Button></div>}
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
