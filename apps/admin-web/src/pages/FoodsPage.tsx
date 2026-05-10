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
  /** 입력값은 빈 문자열 가능. 저장 시 number로 변환·검증한다. */
  servingGrams: string;
  calories: string;
  protein: string;
  fat: string;
  carbohydrate: string;
};

const EMPTY_FORM: FoodForm = {
  name: '',
  memo: '',
  category: '',
  servingGrams: '',
  calories: '',
  protein: '',
  fat: '',
  carbohydrate: '',
};

const NUTRITION_FIELDS = [
  { key: 'servingGrams', label: '기준 분량(g)', max: 5000 },
  { key: 'calories', label: '칼로리(kcal)', max: 10000 },
  { key: 'protein', label: '단백질(g)', max: 1000 },
  { key: 'fat', label: '지방(g)', max: 1000 },
  { key: 'carbohydrate', label: '탄수화물(g)', max: 1000 },
] as const;

type NutritionKey = (typeof NUTRITION_FIELDS)[number]['key'];

type FoodDetail = {
  id: string;
  name: string;
  memo: string | null;
  category: string | null;
  servingGrams: number | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
};

function nullableNumberToInput(v: number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v);
}

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

  const openEdit = async (row: Row) => {
    const id = String(row.id ?? '');
    if (!id || !token) return;
    setSaving(true);
    setMessage(null);
    try {
      // 행에 영양값이 비어 있을 수 있어 detail로 한 번 더 가져와 정확히 매핑.
      const detail = await apiFetch<FoodDetail>(`/admin/foods/${id}`, { token });
      setForm({
        id: detail.id,
        name: detail.name,
        memo: detail.memo ?? '',
        category: detail.category ?? '',
        servingGrams: nullableNumberToInput(detail.servingGrams),
        calories: nullableNumberToInput(detail.calories),
        protein: nullableNumberToInput(detail.protein),
        fat: nullableNumberToInput(detail.fat),
        carbohydrate: nullableNumberToInput(detail.carbohydrate),
      });
      setDrawerOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '음식 상세를 불러오지 못했습니다.';
      toast.show({ kind: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const reload = () => setReloadKey((v) => v + 1);

  const updateField = (key: keyof FoodForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!token || saving) return;
    const name = form.name.trim();
    if (!name) {
      setMessage('이름을 입력해 주세요.');
      return;
    }
    const numeric: Partial<Record<NutritionKey, number>> = {};
    for (const f of NUTRITION_FIELDS) {
      const raw = form[f.key].trim();
      if (!raw) {
        setMessage(`${f.label} 값을 입력해 주세요.`);
        return;
      }
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        setMessage(`${f.label}은 숫자여야 합니다.`);
        return;
      }
      if (n < 0) {
        setMessage(`${f.label}은 0 이상이어야 합니다.`);
        return;
      }
      if (n > f.max) {
        setMessage(`${f.label}은 ${f.max} 이하여야 합니다.`);
        return;
      }
      numeric[f.key] = n;
    }
    setSaving(true);
    setMessage(null);
    try {
      const body = JSON.stringify({
        name,
        memo: form.memo.trim() || null,
        category: form.category || null,
        servingGrams: numeric.servingGrams,
        calories: numeric.calories,
        protein: numeric.protein,
        fat: numeric.fat,
        carbohydrate: numeric.carbohydrate,
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
            <button type="button" className="btn btn-row btn-sm" onClick={() => void openEdit(row)}>
              수정
            </button>
            {row.status === 'inactive' ? (
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
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title={form.id ? '음식 템플릿 수정' : '음식 추가'}
            hideHeaderClose
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
                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} />
              </label>
              <label className="form-field">
                카테고리
                <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                  <option value="">미지정</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                기준 분량 (g)
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  value={form.servingGrams}
                  onChange={(e) => updateField('servingGrams', e.target.value)}
                  placeholder="예: 100"
                />
                <span className="form-help">아래 영양값은 이 분량 기준입니다.</span>
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--ds-space-3)',
                }}
              >
                <label className="form-field">
                  칼로리 (kcal)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={form.calories}
                    onChange={(e) => updateField('calories', e.target.value)}
                  />
                </label>
                <label className="form-field">
                  단백질 (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={form.protein}
                    onChange={(e) => updateField('protein', e.target.value)}
                  />
                </label>
                <label className="form-field">
                  지방 (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={form.fat}
                    onChange={(e) => updateField('fat', e.target.value)}
                  />
                </label>
                <label className="form-field">
                  탄수화물 (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={form.carbohydrate}
                    onChange={(e) => updateField('carbohydrate', e.target.value)}
                  />
                </label>
              </div>
              <label className="form-field">
                메모
                <textarea
                  rows={3}
                  value={form.memo}
                  onChange={(e) => updateField('memo', e.target.value)}
                />
              </label>
            </div>
          </Drawer>
        }
      />
    </>
  );
}
