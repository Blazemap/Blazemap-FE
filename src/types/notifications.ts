export type NotificationItem = {
  id: string;
  reportId: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};
export type NotificationPage = { data: NotificationItem[]; meta: { pageSize: number; unreadCount: number; nextCursor: string | null } };
