import { useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { Modal } from '../components/Modal';
import { useToast } from '../toast/useToast';
import { EntityListPage } from './EntityListPage';
import type { Row } from './entityColumns';

type Period = '' | '7' | '30' | '90';

type NoticeDetail = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  pinned: boolean;
  publishStart: string | null;
  publishEnd: string | null;
  createdAt: string;
};

type NoticeForm = {
  id?: string;
  title: string;
  body: string;
  pinned: boolean;
  /** datetime-local 입력값(빈 문자열 = 미설정) */
  publishStart: string;
  publishEnd: string;
};

const EMPTY_FORM: NoticeForm = {
  title: '',
  body: '',
  pinned: false,
  publishStart: '',
  publishEnd: '',
};

function rangeFromPeriod(period: Period): Record<string, string> {
  if (!period) return {};
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - Number(period));
  return { from: from.toISOString(), to: to.toISOString() };
}

/** ISO 문자열을 `<input type="datetime-local">` 값(`YYYY-MM-DDTHH:mm`)으로 변환. 로컬 타임존 기준. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local 입력값을 ISO 문자열로 변환. 빈값이면 null. */
function localInputToIso(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function NoticesPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NoticeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const extraQuery = useMemo(() => rangeFromPeriod(period), [period]);
  const reload = () => setReloadKey((v) => v + 1);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setMessage(null);
    setModalOpen(true);
  };

  const openEdit = async (row: Row) => {
    if (!token) return;
    const id = String(row.id ?? '');
    if (!id) return;
    setSaving(true);
    setMessage(null);
    try {
      const detail = await apiFetch<NoticeDetail>(`/admin/notices/${id}`, { token });
      setForm({
        id: detail.id,
        title: detail.title,
        body: detail.body,
        pinned: Boolean(detail.pinned),
        publishStart: isoToLocalInput(detail.publishStart),
        publishEnd: isoToLocalInput(detail.publishEnd),
      });
      setModalOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '공지 상세를 불러오지 못했습니다.';
      toast.show({ kind: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!token || saving) return;
    const title = form.title.trim();
    if (!title) {
      setMessage('제목을 입력해 주세요.');
      return;
    }
    const publishStart = localInputToIso(form.publishStart);
    const publishEnd = localInputToIso(form.publishEnd);
    if (publishStart && publishEnd && new Date(publishStart).getTime() > new Date(publishEnd).getTime()) {
      setMessage('게시 시작은 게시 종료보다 이후일 수 없습니다.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        title,
        body: form.body,
        pinned: form.pinned,
        publishStart,
        publishEnd,
      };
      const body = JSON.stringify(payload);
      if (form.id) {
        await apiFetch(`/admin/notices/${form.id}`, { method: 'PUT', token, body });
      } else {
        await apiFetch('/admin/notices', { method: 'POST', token, body });
      }
      setModalOpen(false);
      reload();
      toast.show({ kind: 'success', message: '공지를 저장했어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '저장하지 못했습니다.';
      setMessage(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (row: Row, active: boolean) => {
    if (!token) return;
    const id = String(row.id ?? '');
    if (!id) return;
    try {
      await apiFetch(`/admin/notices/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH', token });
      reload();
      toast.show({ kind: 'success', message: active ? '활성으로 전환했어요.' : '비활성으로 전환했어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상태를 변경하지 못했습니다.';
      toast.show({ kind: 'error', message: msg });
    }
  };

  return (
    <EntityListPage
      kind="notices"
      reloadKey={reloadKey}
      headerAction={{ label: '공지 작성', onClick: openCreate }}
      emptyAction={{ label: '공지 작성', onClick: openCreate }}
      extraQuery={extraQuery}
      onResetExtraFilters={() => setPeriod('')}
      extraFilters={
        <label>
          기간
          <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="">전체</option>
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
            <option value="90">최근 90일</option>
          </select>
        </label>
      }
      rowActions={(row) => (
        <>
          <button type="button" className="btn btn-row btn-sm" onClick={() => void openEdit(row)}>
            수정
          </button>
          {row.active === false ? (
            <button type="button" className="btn btn-row btn-sm" onClick={() => void setActive(row, true)}>
              활성 재전환
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-row btn-sm btn-danger-ghost"
              onClick={() => void setActive(row, false)}
            >
              비활성
            </button>
          )}
        </>
      )}
      drawer={
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={form.id ? '공지 수정' : '공지 작성'}
          size="lg"
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                취소
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </>
          }
        >
          <div className="form-stack">
            {message ? <div className="banner banner-danger" role="alert">{message}</div> : null}
            <label className="form-field">
              제목
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </label>
            <label
              className="filter-bar-toggle"
              style={{ paddingLeft: 0, alignSelf: 'flex-start' }}
            >
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
              />
              상단 고정
            </label>
            <div
              className="form-field"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-3)' }}
            >
              <label className="form-field">
                게시 시작 (선택)
                <input
                  type="datetime-local"
                  value={form.publishStart}
                  onChange={(e) => setForm((f) => ({ ...f, publishStart: e.target.value }))}
                />
              </label>
              <label className="form-field">
                게시 종료 (선택)
                <input
                  type="datetime-local"
                  value={form.publishEnd}
                  onChange={(e) => setForm((f) => ({ ...f, publishEnd: e.target.value }))}
                />
              </label>
            </div>
            <span className="form-help">
              둘 중 한쪽만 비워두면 무기한으로 처리됩니다. 자동 노출 필터링은 v2에서 적용 예정입니다.
            </span>
            <label className="form-field">
              본문
              <textarea
                rows={12}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
              />
            </label>
          </div>
        </Modal>
      }
    />
  );
}
