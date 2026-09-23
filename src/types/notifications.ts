export type NotificationItem = {
  id: string;
  reportId: string | null;
  publicationId: string | null;
  caseId: string | null;
  publication: { slug: string } | null;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};
export type NotificationPage = { data: NotificationItem[]; meta: { pageSize: number; unreadCount: number; nextCursor: string | null } };
