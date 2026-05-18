import { apiFetch } from '../api';

export type InquirySummary = {
  id: string;
  subject: string;
  status: string;
  answered: boolean;
  createdAt: string;
};

export type InquiryDetail = {
  id: string;
  subject: string;
  body: string;
  status: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
};

export type PaginatedInquiries = {
  page: number;
  size: number;
  total: number;
  items: InquirySummary[];
};

export async function fetchInquiries(token: string, page = 1, size = 15): Promise<PaginatedInquiries> {
  return apiFetch<PaginatedInquiries>(`/me/inquiries?page=${page}&size=${size}`, { token });
}

export async function fetchInquiry(token: string, id: string): Promise<InquiryDetail> {
  return apiFetch<InquiryDetail>(`/me/inquiries/${encodeURIComponent(id)}`, { token });
}

export async function createInquiry(
  token: string,
  payload: { subject: string; body: string },
): Promise<InquiryDetail> {
  return apiFetch<InquiryDetail>('/me/inquiries', {
    token,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
