import { useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { Drawer } from '../components/Drawer';
import { useToast } from '../toast/useToast';
import { FOOD_TEMPLATE_CATEGORIES, foodCategorySelectOptions } from '../constants/foodCategories';
import { EntityListPage } from './EntityListPage';
import type { Row } from './entityColumns';

const PORTION_UNIT_OPTIONS = [
  { value: 'GRAM', label: '그램 (g)' },
  { value: 'PIECE', label: '개' },
  { value: 'PLATE', label: '접시' },
  { value: 'BOWL', label: '공기' },
  { value: 'CUSTOM', label: '직접 표기' },
] as const;

type FoodForm = {
  id?: string;
  name: string;
  memo: string;
  category: string;
  /** 기준 분량의 숫자(그램이면 g 수, 개·접시면 개수 등) */
  referenceAmount: string;
  portionUnit: (typeof PORTION_UNIT_OPTIONS)[number]['value'];
  /** CUSTOM일 때 필수. 그 외에는 표시용 보조(예: 소접시). */
  portionLabel: string;
  /** 그램이 아닌 단위일 때만: 위 기준이 차지하는 총 질량(g) */
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
  referenceAmount: '',
  portionUnit: 'GRAM',
  portionLabel: '',
  servingGrams: '',
  calories: '',
  protein: '',
  fat: '',
  carbohydrate: '',
};

const MACRO_FIELDS = [
  { key: 'calories', label: '칼로리(kcal)', max: 10000 },
  { key: 'protein', label: '단백질(g)', max: 1000 },
  { key: 'fat', label: '지방(g)', max: 1000 },
  { key: 'carbohydrate', label: '탄수화물(g)', max: 1000 },
] as const;

type MacroKey = (typeof MACRO_FIELDS)[number]['key'];

type FoodDetail = {
  id: string;
  name: string;
  memo: string | null;
  category: string | null;
  portionUnit: string;
  portionLabel: string | null;
  referenceAmount: number;
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

  const formCategoryOptions = useMemo(() => foodCategorySelectOptions(form.category), [form.category]);

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
      const pu = (PORTION_UNIT_OPTIONS.some((o) => o.value === detail.portionUnit)
        ? detail.portionUnit
        : 'GRAM') as FoodForm['portionUnit'];
      const refAmt =
        detail.referenceAmount != null && Number.isFinite(detail.referenceAmount)
          ? detail.referenceAmount
          : pu === 'GRAM' && detail.servingGrams != null
            ? detail.servingGrams
            : 1;
      setForm({
        id: detail.id,
        name: detail.name,
        memo: detail.memo ?? '',
        category: detail.category ?? '',
        referenceAmount: nullableNumberToInput(refAmt),
        portionUnit: pu,
        portionLabel: detail.portionLabel ?? '',
        servingGrams: pu === 'GRAM' ? '' : nullableNumberToInput(detail.servingGrams),
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
    const refRaw = form.referenceAmount.trim();
    if (!refRaw) {
      setMessage('기준 숫자를 입력해 주세요.');
      return;
    }
    const referenceAmount = Number(refRaw.replace(',', '.'));
    if (!Number.isFinite(referenceAmount) || referenceAmount <= 0) {
      setMessage('기준 숫자는 0보다 큰 숫자여야 합니다.');
      return;
    }
    if (referenceAmount > 5000) {
      setMessage('기준 숫자는 5000 이하여야 합니다.');
      return;
    }

    let servingGrams: number;
    if (form.portionUnit === 'GRAM') {
      servingGrams = referenceAmount;
    } else {
      const gRaw = form.servingGrams.trim();
      if (!gRaw) {
        setMessage('그램이 아닌 단위일 때는 이 기준의 총 질량(g)을 입력해 주세요.');
        return;
      }
      const g = Number(gRaw.replace(',', '.'));
      if (!Number.isFinite(g) || g <= 0) {
        setMessage('총 질량(g)은 0보다 큰 숫자여야 합니다.');
        return;
      }
      if (g > 5000) {
        setMessage('총 질량(g)은 5000 이하여야 합니다.');
        return;
      }
      servingGrams = g;
    }

    if (form.portionUnit === 'CUSTOM' && !form.portionLabel.trim()) {
      setMessage('직접 표기 단위일 때는 단위 이름을 입력해 주세요.');
      return;
    }

    const numeric: Partial<Record<MacroKey, number>> = {};
    for (const f of MACRO_FIELDS) {
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
        referenceAmount,
        portionUnit: form.portionUnit,
        portionLabel: form.portionLabel.trim() || null,
        servingGrams,
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
              {FOOD_TEMPLATE_CATEGORIES.map((option) => (
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
                  {formCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <p className="form-help" style={{ fontWeight: 600, marginTop: 8 }}>
                기준 분량
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--ds-space-3)',
                }}
              >
                <label className="form-field">
                  기준 숫자
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.referenceAmount}
                    onChange={(e) => updateField('referenceAmount', e.target.value)}
                    placeholder={form.portionUnit === 'GRAM' ? '예: 100' : '예: 1'}
                  />
                </label>
                <label className="form-field">
                  기준 단위
                  <select
                    value={form.portionUnit}
                    onChange={(e) => updateField('portionUnit', e.target.value as FoodForm['portionUnit'])}
                  >
                    {PORTION_UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <span className="form-help">
                {form.portionUnit === 'GRAM'
                  ? '그램을 고르면 기준 숫자가 곧 g입니다. 아래 영양값은 이 g 기준입니다.'
                  : '개·접시 등이면 기준 숫자는 “몇 개·몇 접시”이고, 아래에 그만큼의 총 무게(g)를 적어 주세요. 영양 계산은 g로 합니다.'}
              </span>
              {form.portionUnit !== 'GRAM' ? (
                <label className="form-field">
                  이 기준의 총 질량 (g)
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={form.servingGrams}
                    onChange={(e) => updateField('servingGrams', e.target.value)}
                    placeholder="예: 50"
                  />
                  <span className="form-help">위 기준 숫자·단위가 차지하는 실제 무게입니다.</span>
                </label>
              ) : null}
              <label className="form-field">
                단위 표시(선택, 직접 표기일 때 필수)
                <input
                  value={form.portionLabel}
                  onChange={(e) => updateField('portionLabel', e.target.value)}
                  placeholder={form.portionUnit === 'CUSTOM' ? '예: 컵' : '예: 소접시(선택)'}
                  maxLength={20}
                />
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
