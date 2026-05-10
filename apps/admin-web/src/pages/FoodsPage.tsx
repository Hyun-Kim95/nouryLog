import { useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { Drawer } from '../components/Drawer';
import { useToast } from '../toast/useToast';
import { EntityListPage } from './EntityListPage';
import type { Row } from './entityColumns';

const CATEGORY_OPTIONS = ['한식', '중식', '일식', '양식', '간식', '음료'] as const;

type FoodForm = {
  id?: string;
  name: string;
  memo: string;
  category: string;
};

const EMPTY_FORM: FoodForm = { name: '', memo: '', category: '' };

export function FoodsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [category, setCategory] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FoodForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const extraQuery = useMemo<Record<string, string>>(() => {
    if (!category) return {} as Record<string, string>;
    return { category };
  }, [category]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setMessage(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: Row) => {
    setForm({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      memo: typeof row.memo === 'string' ? row.memo : '',
      category: typeof row.category === 'string' ? row.category : '',
    });
    setMessage(null);
    setDrawerOpen(true);
  };

  const reload = () => setReloadKey((v) => v + 1);

  const save = async () => {
    if (!token || saving) return;
    const name = form.name.trim();
    if (!name) {
      setMessage('이름을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const body = JSON.stringify({
        name,
        memo: form.memo.trim() || null,
        category: form.category || null,
      });
      if (form.id) {
        await apiFetch(`/admin/foods/${form.id}`, { method: 'PUT', token, body });
      } else {
        await apiFetch('/admin/foods', { method: 'POST', token, body });
      }
      setDrawerOpen(false);
      reload();
      toast.show({ kind: 'success', message: '음식을 저장했어요.' });
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
    setMessage(null);
    try {
      await apiFetch(`/admin/foods/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH', token });
      reload();
      toast.show({ kind: 'success', message: active ? '활성으로 전환했어요.' : '비활성으로 전환했어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상태를 변경하지 못했습니다.';
      toast.show({ kind: 'error', message: msg });
    }
  };

  return (
    <>
      <EntityListPage
        kind="foods"
        reloadKey={reloadKey}
        headerAction={{ label: '음식 추가', onClick: openCreate }}
        emptyAction={{ label: '음식 추가', onClick: openCreate }}
        extraQuery={extraQuery}
        onResetExtraFilters={() => setCategory('')}
        extraFilters={
          <label>
            카테고리
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">전체</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        }
        rowActions={(row) => (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>
              수정
            </button>
            {row.status === 'inactive' ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void setActive(row, true)}>
                활성 재전환
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void setActive(row, false)}>
                비활성
              </button>
            )}
          </>
        )}
        drawer={
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title={form.id ? '음식 템플릿 수정' : '음식 추가'}
            footer={
              <>
                <button type="button" className="btn" onClick={() => setDrawerOpen(false)}>
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
                이름
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="form-field">
                카테고리
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  <option value="">미지정</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                메모
                <textarea
                  rows={5}
                  value={form.memo}
                  onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                />
              </label>
            </div>
          </Drawer>
        }
      />
    </>
  );
}
