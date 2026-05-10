import { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast/useToast';
import { EntityListPage } from './EntityListPage';
import type { Row } from './entityColumns';

export function MembersPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const reload = () => setReloadKey((v) => v + 1);

  const setActive = async (row: Row, active: boolean) => {
    if (!token) return;
    const id = String(row.id ?? '');
    if (!id || pendingId) return;
    setPendingId(id);
    try {
      await apiFetch(`/admin/users/${id}/${active ? 'activate' : 'deactivate'}`, {
        method: 'PATCH',
        token,
      });
      reload();
      toast.show({
        kind: 'success',
        message: active ? '회원을 활성으로 전환했어요.' : '회원을 비활성으로 전환했어요.',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상태를 변경하지 못했습니다.';
      toast.show({ kind: 'error', message: msg });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <EntityListPage
      kind="members"
      reloadKey={reloadKey}
      rowActions={(row) => {
        const id = String(row.id ?? '');
        const isActive = row.status === 'active';
        return (
          <button
            type="button"
            className={`btn btn-row btn-sm ${isActive ? 'btn-danger-ghost' : ''}`}
            onClick={() => void setActive(row, !isActive)}
            disabled={pendingId !== null && pendingId === id}
          >
            {isActive ? '비활성' : '활성 재전환'}
          </button>
        );
      }}
    />
  );
}
