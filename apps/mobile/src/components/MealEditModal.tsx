import { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { apiFetch, isAuthDenied } from '../api';
import type { FoodTemplateItem, MealRow, TemplateInputMode } from '../api/meals';
import { updateMeal } from '../api/meals';
import { getAccessToken } from '../authStorage';
import { LabeledField } from './LabeledField';
import { RadioGroup } from './RadioGroup';
import { Segmented } from './Segmented';
import { Banner, PrimaryButton } from './ui';
import { LOG_COPY } from '../copy/log';
import { useBottomSafeInset } from '../hooks/useBottomSafeInset';
import {
  baselineSummary,
  buildUpdateBody,
  defaultTplAmount,
  hydrateFromMeal,
  previewTemplateKcal,
  unitHint,
  type MealEditFormState,
} from '../lib/mealEntryForm';
import {
  defaultSnackPlacementForNow,
  MEAL_SLOT_OPTIONS,
  SNACK_PLACEMENT_OPTIONS,
  type MealSlot,
  type SnackPlacement,
} from '../lib/mealSlot';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

type Props = {
  visible: boolean;
  meal: MealRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export function MealEditModal({ visible, meal, onClose, onSaved }: Props) {
  const t = useTheme();
  const toast = useToast();
  const bottomInset = useBottomSafeInset();
  const [templates, setTemplates] = useState<FoodTemplateItem[]>([]);
  const [form, setForm] = useState<MealEditFormState | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTemplates = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await apiFetch<{ items: FoodTemplateItem[] }>('/me/food-templates?page=1&size=100', {
        token,
      });
      setTemplates(res.items ?? []);
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    if (!visible || !meal) return;
    void loadTemplates();
  }, [visible, meal, loadTemplates]);

  useEffect(() => {
    if (!visible || !meal) {
      setForm(null);
      return;
    }
    if (meal.foodTemplateId && templates.length === 0) return;
    setForm(hydrateFromMeal(meal, templates));
  }, [visible, meal, templates]);

  const patch = (partial: Partial<MealEditFormState>) => {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const handleSave = async () => {
    if (!form) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      const body = buildUpdateBody(form, LOG_COPY.nameRequired, LOG_COPY.snackPlacementRequired);
      await updateMeal(token, form.mealId, body);
      toast.show({ kind: 'success', message: LOG_COPY.editSuccess });
      onSaved();
      onClose();
    } catch (e) {
      if (isAuthDenied(e)) return;
      toast.show({ kind: 'error', message: e instanceof Error ? e.message : '저장 실패' });
    } finally {
      setBusy(false);
    }
  };

  const previewKcal =
    form?.selectedTpl != null
      ? previewTemplateKcal(form.selectedTpl, form.mealInputMode, form.tplAmount)
      : null;

  const displayName = form?.selectedTpl?.name ?? form?.name.trim() ?? '식사';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            maxHeight: '88%',
            borderWidth: 1,
            borderColor: t.colors.border,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: t.spacing.xl,
              paddingHorizontal: t.spacing.xl,
              paddingBottom: t.spacing.md,
              gap: t.spacing.md,
            }}
          >
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>
              {LOG_COPY.pastEditModalTitle}
            </Text>
            {form ? (
              <>
                <Banner variant="info">{LOG_COPY.editBanner(displayName)}</Banner>
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                  {LOG_COPY.sectionSlot}
                </Text>
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                  {LOG_COPY.slotEditHint}
                </Text>
                <Segmented<MealSlot>
                  options={MEAL_SLOT_OPTIONS}
                  value={form.mealSlot}
                  onChange={(next) => {
                    patch({
                      mealSlot: next,
                      snackPlacement:
                        next === 'SNACK' && !form.snackPlacement
                          ? defaultSnackPlacementForNow()
                          : form.snackPlacement,
                    });
                  }}
                />
                {form.mealSlot === 'SNACK' ? (
                  <View style={{ gap: t.spacing.sm }}>
                    <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                      {LOG_COPY.sectionSnackWhen}
                    </Text>
                    <RadioGroup
                      options={SNACK_PLACEMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      value={form.snackPlacement}
                      onChange={(v) => {
                        if (v) patch({ snackPlacement: v });
                      }}
                    />
                  </View>
                ) : null}

                {form.selectedTpl ? (
                  <View style={{ gap: t.spacing.sm }}>
                    <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                      {form.selectedTpl.name}
                    </Text>
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      기준 분량: {baselineSummary(form.selectedTpl)} (영양 기준 {form.selectedTpl.servingGrams}g) ·
                      기준당 약 {form.selectedTpl.calories} kcal
                    </Text>
                    <Segmented<TemplateInputMode>
                      options={[
                        { value: 'PORTION_COUNT', label: '분량 수' },
                        { value: 'TOTAL_GRAMS', label: '총 g' },
                      ]}
                      value={form.mealInputMode}
                      onChange={(mode) => {
                        patch({
                          mealInputMode: mode,
                          tplAmount: defaultTplAmount(form.selectedTpl!, mode),
                        });
                      }}
                    />
                    <LabeledField
                      label={
                        form.mealInputMode === 'PORTION_COUNT'
                          ? `분량 (${unitHint(form.selectedTpl)})`
                          : '총 중량 (g)'
                      }
                      value={form.tplAmount}
                      onChangeText={(tplAmount) => patch({ tplAmount })}
                      keyboardType="decimal-pad"
                    />
                    {previewKcal != null ? (
                      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                        예상 칼로리 약 {previewKcal} kcal
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={{ gap: t.spacing.sm }}>
                    <LabeledField
                      label="음식명"
                      value={form.name}
                      onChangeText={(name) => patch({ name })}
                      placeholder="예: 닭가슴살 샐러드"
                    />
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      {LOG_COPY.manualPerServingHint}
                    </Text>
                    <LabeledField
                      label={LOG_COPY.manualPortionLabel}
                      value={form.manualPortion}
                      onChangeText={(manualPortion) => patch({ manualPortion })}
                      keyboardType="decimal-pad"
                      placeholder="1"
                    />
                    <LabeledField
                      label={LOG_COPY.calories}
                      value={form.calories}
                      onChangeText={(calories) => patch({ calories })}
                      keyboardType="number-pad"
                    />
                    <LabeledField
                      label={LOG_COPY.protein}
                      value={form.protein}
                      onChangeText={(protein) => patch({ protein })}
                      keyboardType="decimal-pad"
                    />
                    <LabeledField
                      label={LOG_COPY.carb}
                      value={form.carbohydrate}
                      onChangeText={(carbohydrate) => patch({ carbohydrate })}
                      keyboardType="decimal-pad"
                    />
                    <LabeledField
                      label={LOG_COPY.fat}
                      value={form.fat}
                      onChangeText={(fat) => patch({ fat })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>
          <View
            style={{
              paddingHorizontal: t.spacing.xl,
              paddingBottom: t.spacing.xl + bottomInset,
              gap: t.spacing.sm,
            }}
          >
            <PrimaryButton
              title={LOG_COPY.saveEdit}
              onPress={() => void handleSave()}
              loading={busy}
              disabled={!form}
            />
            <PrimaryButton title={LOG_COPY.pastModalClose} onPress={onClose} variant="secondary" disabled={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
