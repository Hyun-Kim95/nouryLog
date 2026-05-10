import { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { Modal } from '../components/Modal';
import { useToast } from '../toast/useToast';
import { EntityListPage } from './EntityListPage';
import type { Row } from './entityColumns';

const REASON_CODES = ['spam', 'inactive_long', 'terms_violation', 'etc'] as const;
type ReasonCode = (typeof REASON_CODES)[number];

const REASON_LABEL: Record<ReasonCode, string> = {
  spam: '스팸/광고',
  inactive_long: '장기 미접속',
  terms_violation: '약관 위반',
  etc: '기타(직접 입력)',
};

const REASON_TEXT_MAX = 500;

export function MembersPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [target, setTarget] = useState<Row | null>(null);
  const [reasonCode, setReasonCode] = useState<ReasonCode>('inactive_long');
  const [reasonText, setReasonText] = useState('');

  const reload = () => setReloadKey((v) => v + 1);

  const closeModal = () => {
    setTarget(null);
    setReasonCode('inactive_long');
    setReasonText('');
  };

  const activate = async (row: Row) => {
    if (!token) return;
    const id = String(row.id ?? '');
    if (!id || pendingId) return;
    setPendingId(id);
    try {
      await apiFetch(`/admin/users/${id}/activate`, { method: 'PATCH', token });
      reload();
      toast.show({ kind: 'success', message: '회원을 활성으로 전환했어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상태를 변경하지 못했습니다.';
      toast.show({ kind: 'error', message: msg });
    } finally {
      setPendingId(null);
    }
  };

  const submitDeactivate = async () => {
    if (!token || !target) return;
    const id = String(target.id ?? '');
    if (!id || pendingId) return;
    const trimmed = reasonText.trim();
    if (reasonCode === 'etc' && !trimmed) {
      toast.show({ kind: 'error', message: '기타 사유는 직접 입력이 필요합니다.' });
      return;
    }
    if (trimmed.length > REASON_TEXT_MAX) {
      toast.show({ kind: 'error', message: `사유는 ${REASON_TEXT_MAX}자 이하여야 합니다.` });
      return;
    }
    setPendingId(id);
    try {
      const payload: { reasonCode: ReasonCode; reasonText?: string } = { reasonCode };
      if (trimmed) payload.reasonText = trimmed;
      await apiFetch(`/admin/users/${id}/deactivate`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload),
      });
      reload();
      closeModal();
      toast.show({ kind: 'success', message: '회원을 비활성으로 전환했어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상태를 변경하지 못했습니다.';
      toast.show({ kind: 'error', message: msg });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <EntityListPage
        kind="members"
        reloadKey={reloadKey}
        rowActions={(row) => {
          const id = String(row.id ?? '');
          const isActive = row.status === 'active';
          const busy = pendingId !== null && pendingId === id;
          return (
            <button
              type="button"
              className={`btn btn-row btn-sm ${isActive ? 'btn-danger-ghost' : ''}`}
              onClick={() => {
                if (isActive) {
                  setTarget(row);
                  setReasonCode('inactive_long');
                  setReasonText('');
                } else {
                  void activate(row);
                }
              }}
              disabled={busy}
            >
              {isActive ? '비활성' : '활성 재전환'}
            </button>
          );
        }}
      />
      <Modal
        open={target !== null}
        onClose={() => {
          if (pendingId) return;
          closeModal();
        }}
        title="회원 비활성화"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={closeModal}
              disabled={pendingId !== null}
            >
              취소
            </button>
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={() => void submitDeactivate()}
              disabled={pendingId !== null}
            >
              비활성으로 전환
            </button>
          </>
        }
      >
        <div className="form-stack">
          {target?.email ? (
            <span className="form-help">{String(target.email)}</span>
          ) : null}
          <label className="form-field">
            사유 분류
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as ReasonCode)}
              disabled={pendingId !== null}
            >
              {REASON_CODES.map((c) => (
                <option key={c} value={c}>
                  {REASON_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            사유 메모 {reasonCode === 'etc' ? '(필수)' : '(선택)'}
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              maxLength={REASON_TEXT_MAX}
              rows={3}
              placeholder={
                reasonCode === 'etc'
                  ? '예: 사용자 요청에 따른 비활성 처리.'
                  : '추가 메모가 필요하면 입력하세요.'
              }
              disabled={pendingId !== null}
            />
            <span className="form-help">
              {reasonText.length}/{REASON_TEXT_MAX}
            </span>
          </label>
        </div>
      </Modal>
    </>
  );
}
