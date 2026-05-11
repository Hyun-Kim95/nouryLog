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

function formatNumber(v: unknown, fractionDigits = 1): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(fractionDigits);
}

const DEACTIVATION_REASON_LABEL: Record<string, string> = {
  spam: '스팸/광고',
  inactive_long: '장기 미접속',
  terms_violation: '약관 위반',
  etc: '기타',
};

export function deactivationReasonLabel(code: unknown): string {
  if (typeof code !== 'string') return '—';
  return DEACTIVATION_REASON_LABEL[code] ?? code;
}

function DeactivationReasonCell({ row }: { row: Row }) {
  const reason = (row.deactivationReason ?? null) as { code?: string; text?: string | null } | null;
  if (row.status !== 'inactive' || !reason || !reason.code) return <span>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-1)' }}>
      <Badge tone="neutral">{deactivationReasonLabel(reason.code)}</Badge>
      {reason.text ? (
        <span
          title={reason.text}
          style={{
            fontSize: 'var(--ds-text-xs)',
            color: 'var(--ds-fg-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px',
          }}
        >
          {reason.text}
        </span>
      ) : null}
    </div>
  );
}

function NoticeWindowCell({ row }: { row: Row }) {
  const start = formatDate(row.publishStart);
  const end = formatDate(row.publishEnd);
  if (start === '—' && end === '—') return <span>—</span>;
  return <span>{`${start} ~ ${end}`}</span>;
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
    {
      key: 'deactivationReason',
      label: '비활성 사유',
      render: (r) => <DeactivationReasonCell row={r} />,
      width: '200px',
    },
  ],
  foods: [
    { key: 'name', label: '이름', render: (r) => formatText(r.name) },
    {
      key: 'portionUnit',
      label: '1단위',
      render: (r) =>
        formatText(
          [r.portionUnit, r.portionLabel].filter(Boolean).length
            ? `${String(r.portionUnit ?? '')}${r.portionLabel ? ` · ${String(r.portionLabel)}` : ''}`
            : null,
        ),
      width: '130px',
    },
    { key: 'category', label: '카테고리', render: (r) => formatText(r.category), width: '110px' },
    { key: 'status', label: '상태', render: (r) => <StatusBadge value={r.status} />, width: '110px' },
    { key: 'servingGrams', label: '기준(g)', render: (r) => formatNumber(r.servingGrams), width: '90px' },
    { key: 'calories', label: 'kcal', render: (r) => formatNumber(r.calories), width: '90px' },
    { key: 'protein', label: '단백(g)', render: (r) => formatNumber(r.protein), width: '90px' },
    { key: 'fat', label: '지방(g)', render: (r) => formatNumber(r.fat), width: '90px' },
    { key: 'carbohydrate', label: '탄수(g)', render: (r) => formatNumber(r.carbohydrate), width: '90px' },
    { key: 'memo', label: '메모', render: (r) => formatText(r.memo) },
  ],
  inquiries: [
    { key: 'subject', label: '제목', render: (r) => formatText(r.subject) },
    { key: 'status', label: '처리 상태', render: (r) => <StatusBadge value={r.status} />, width: '120px' },
    { key: 'createdAt', label: '등록일', render: (r) => formatDate(r.createdAt), width: '140px' },
  ],
  notices: [
    {
      key: 'pinned',
      label: '고정',
      render: (r) => (r.pinned === true ? <Badge tone="info">★ 고정</Badge> : <span>—</span>),
      width: '90px',
    },
    { key: 'title', label: '제목', render: (r) => formatText(r.title) },
    { key: 'active', label: '활성', render: (r) => <ActiveBadge value={r.active} />, width: '120px' },
    {
      key: 'publishWindow',
      label: '게시기간',
      render: (r) => <NoticeWindowCell row={r} />,
      width: '210px',
    },
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
