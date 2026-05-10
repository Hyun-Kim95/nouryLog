import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from '../components/Badge';

export type Kind = 'members' | 'foods' | 'inquiries' | 'notices';

export type Row = Record<string, unknown>;

export type ColumnDef = {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
  width?: string;
};

const dateFmt = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateTimeFmt = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatDate(v: unknown): string {
  if (typeof v !== 'string' || !v) return '—';
  try {
    return dateFmt.format(new Date(v));
  } catch {
    return v;
  }
}

function formatDateTime(v: unknown): string {
  if (typeof v !== 'string' || !v) return '—';
  try {
    return dateTimeFmt.format(new Date(v));
  } catch {
    return v;
  }
}

function formatText(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

const STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: '활성', tone: 'success' },
  inactive: { label: '비활성', tone: 'neutral' },
  pending: { label: '접수', tone: 'warn' },
  in_progress: { label: '처리중', tone: 'info' },
  done: { label: '완료', tone: 'info' },
};

function StatusBadge({ value }: { value: unknown }) {
  if (typeof value !== 'string' || !value) return <Badge tone="neutral">—</Badge>;
  const meta = STATUS_LABEL[value] ?? { label: value, tone: 'neutral' as BadgeTone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function ActiveBadge({ value }: { value: unknown }) {
  if (value === true) return <Badge tone="success">활성</Badge>;
  if (value === false) return <Badge tone="neutral">비활성</Badge>;
  return <Badge tone="neutral">—</Badge>;
}

export const COLUMNS: Record<Kind, ColumnDef[]> = {
  members: [
    { key: 'email', label: '이메일', render: (r) => formatText(r.email) },
    { key: 'status', label: '상태', render: (r) => <StatusBadge value={r.status} />, width: '110px' },
    { key: 'lastLoginAt', label: '마지막 로그인', render: (r) => formatDateTime(r.lastLoginAt), width: '170px' },
    { key: 'createdAt', label: '가입일', render: (r) => formatDate(r.createdAt), width: '130px' },
    {
      key: 'deactivatedAt',
      label: '비활성일',
      render: (r) => (r.status === 'inactive' ? formatDateTime(r.deactivatedAt) : '—'),
      width: '170px',
    },
  ],
  foods: [
    { key: 'name', label: '이름', render: (r) => formatText(r.name) },
    { key: 'category', label: '카테고리', render: (r) => formatText(r.category), width: '120px' },
    { key: 'status', label: '상태', render: (r) => <StatusBadge value={r.status} />, width: '120px' },
    { key: 'memo', label: '메모', render: (r) => formatText(r.memo) },
  ],
  inquiries: [
    { key: 'subject', label: '제목', render: (r) => formatText(r.subject) },
    { key: 'status', label: '처리 상태', render: (r) => <StatusBadge value={r.status} />, width: '120px' },
    { key: 'createdAt', label: '등록일', render: (r) => formatDate(r.createdAt), width: '140px' },
  ],
  notices: [
    { key: 'title', label: '제목', render: (r) => formatText(r.title) },
    { key: 'active', label: '활성', render: (r) => <ActiveBadge value={r.active} />, width: '120px' },
    { key: 'createdAt', label: '등록일', render: (r) => formatDate(r.createdAt), width: '140px' },
  ],
};

export const KIND_TITLE: Record<Kind, string> = {
  members: '회원',
  foods: '음식 템플릿',
  inquiries: '문의',
  notices: '공지',
};

export const KIND_PATH: Record<Kind, string> = {
  members: '/admin/users',
  foods: '/admin/foods',
  inquiries: '/admin/inquiries',
  notices: '/admin/notices',
};
