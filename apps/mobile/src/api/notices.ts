import { apiFetch } from '../api';

export type NoticeSummary = {
  id: string;
  title: string;
  pinned: boolean;
  publishStart: string | null;
  publishEnd: string | null;
  createdAt: string;
};

export type NoticeDetail = NoticeSummary & { body: string };

export type PaginatedNotices = {
  page: number;
  size: number;
  total: number;
  items: NoticeSummary[];
};

export async function fetchNotices(page = 1, size = 15): Promise<PaginatedNotices> {
  return apiFetch<PaginatedNotices>(`/public/notices?page=${page}&size=${size}`);
}

export async function fetchNotice(id: string): Promise<NoticeDetail> {
  return apiFetch<NoticeDetail>(`/public/notices/${encodeURIComponent(id)}`);
}
