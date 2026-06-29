import * as Crypto from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { FoodTemplateItem } from '../api/meals';
import {
  applyMealSet,
  parseUnavailableItems,
  type MealSet,
  type MealSetApplyResult,
} from '../api/mealSets';
import { ApiError, isAuthDenied } from '../api';
import { getAccessToken } from '../authStorage';
import { MEAL_SET_COPY } from '../copy/mealSet';
import { addDaysYmd, todayAnchorKst } from '../lib/statsPeriod';
import { formatKstDayTitle, kstNoonIsoFromYmd } from '../lib/dateRange';
import {
  isMealSetItemUnavailable,
  mealSetItemKcal,
  mealSetItemPortionLabel,
} from '../lib/mealSetItem';
import {
  MEAL_SLOT_OPTIONS,
  SNACK_PLACEMENT_OPTIONS,
  defaultSnackPlacementForNow,
  type MealSlot,
  type SnackPlacement,
} from '../lib/mealSlot';
import { Segmented } from './Segmented';
import { RadioGroup } from './RadioGroup';
import { Banner, PrimaryButton } from './ui';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import { useToast } from '../toast/useToast';
import { useTheme } from '../theme';

const APPLY_TIMEOUT_MS = 45_000;

function isAmbiguousError(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  return e.code === 'TIMEOUT' || e.code === 'NETWORK_UNAVAILABLE' || e.status === 408 || e.status === 0;
}

type Props = {
  visible: boolean;
  set: MealSet | null;
  tplById: Map<string, FoodTemplateItem>;
  onClose: () => void;
  onApplied: (result: MealSetApplyResult) => void;
};

export function MealSetApplySheet({ visible, set, tplById, onClose, onApplied }: Props) {
  const t = useTheme();
  const toast = useToast();
  const [ymd, setYmd] = useState(() => todayAnchorKst());
  const [slot, setSlot] = useState<MealSlot>('BREAKFAST');
  const [snackPlacement, setSnackPlacement] = useState<SnackPlacement>(defaultSnackPlacementForNow());
  const [excludeUnavailable, setExcludeUnavailable] = useState(false);
  const [serverUnavailableIds, setServerUnavailableIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !set) return;
    setYmd(todayAnchorKst());
    setSlot(set.defaultMealSlot);
    setSnackPlacement(set.defaultSnackPlacement ?? defaultSnackPlacementForNow());
    setExcludeUnavailable(false);
    setServerUnavailableIds([]);
    requestIdRef.current = null;
  }, [visible, set]);

  const todayYmd = todayAnchorKst();
  const isFuture = ymd > todayYmd;

  const unavailableIds = useMemo(() => {
    if (!set) return new Set<string>();
    const ids = new Set<string>(serverUnavailableIds);
    for (const item of set.items) {
      const tpl = item.foodTemplateId ? tplById.get(item.foodTemplateId) : undefined;
      if (isMealSetItemUnavailable(item, tpl)) ids.add(item.id);
    }
    return ids;
  }, [set, tplById, serverUnavailableIds]);

  const hasUnavailable = unavailableIds.size > 0;

  const includedItems = useMemo(() => {
    if (!set) return [];
    return set.items.filter((it) => !(excludeUnavailable && unavailableIds.has(it.id)));
  }, [set, excludeUnavailable, unavailableIds]);

  const includedKcal = useMemo(() => {
    if (!set) return 0;
    let sum = 0;
    for (const it of includedItems) {
      const tpl = it.foodTemplateId ? tplById.get(it.foodTemplateId) : undefined;
      const kcal = mealSetItemKcal(it, tpl);
      if (kcal != null) sum += kcal;
    }
    return sum;
  }, [set, includedItems, tplById]);

  const canApply =
    !!set && !isFuture && includedItems.length > 0 && !(hasUnavailable && !excludeUnavailable);

  const handleApply = async () => {
    if (!set || !canApply || busy) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      if (!requestIdRef.current) requestIdRef.current = Crypto.randomUUID();
      const excludeItemIds = excludeUnavailable ? [...unavailableIds] : [];

      const body = {
        clientRequestId: requestIdRef.current,
        consumedAt: kstNoonIsoFromYmd(ymd),
        mealSlot: slot,
        ...(slot === 'SNACK' ? { snackPlacement } : {}),
        ...(excludeItemIds.length > 0 ? { excludeItemIds } : {}),
      };

      const runOnce = async () => {
        try {
          return await applyMealSet(token, set.id, body, { timeoutMs: APPLY_TIMEOUT_MS });
        } catch (e) {
          if (isAmbiguousError(e)) {
            return await applyMealSet(token, set.id, body, { timeoutMs: APPLY_TIMEOUT_MS });
          }
          throw e;
        }
      };

      const result = await runOnce();
      requestIdRef.current = null;
      toast.show({ kind: 'success', message: MEAL_SET_COPY.applySuccess(result.createdMealIds.length) });
      onApplied(result);
    } catch (e) {
      if (isAuthDenied(e)) return;
      if (e instanceof ApiError && e.code === 'MEAL_SET_ITEM_UNAVAILABLE') {
        const items = parseUnavailableItems(e.details);
        if (items.length > 0) {
          setServerUnavailableIds(items.map((it) => it.itemId));
          setExcludeUnavailable(false);
        }
        toast.show({ kind: 'error', message: MEAL_SET_COPY.unavailableBanner(items.length || 1) });
        return;
      }
      logAppError('[MealSetApplySheet] apply', e);
      toast.show({
        kind: 'error',
        message: toUserMessage(e, { context: 'meal', fallback: MEAL_SET_COPY.applyError }),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={busy ? undefined : onClose} />
        <View
          style={{
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            borderTopWidth: 1,
            borderColor: t.colors.border,
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.lg,
            paddingBottom: t.spacing.xl,
            maxHeight: '88%',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.md }}>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>
              {MEAL_SET_COPY.applyTitle}
            </Text>
            <Pressable onPress={busy ? undefined : onClose} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{MEAL_SET_COPY.close}</Text>
            </Pressable>
          </View>

          {set ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: t.spacing.md }}>
              <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>{set.name}</Text>

              {/* 날짜 */}
              <View style={{ gap: t.spacing.xs }}>
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '600' }}>
                  {MEAL_SET_COPY.dateLabel}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                  <Pressable
                    onPress={() => setYmd((d) => addDaysYmd(d, -1))}
                    accessibilityRole="button"
                    accessibilityLabel={MEAL_SET_COPY.prevDay}
                    style={{
                      paddingHorizontal: t.spacing.md,
                      paddingVertical: t.spacing.sm,
                      borderRadius: t.radius.md,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      backgroundColor: t.colors.surface,
                    }}
                  >
                    <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg }}>‹</Text>
                  </Pressable>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                      {formatKstDayTitle(ymd)}
                      {ymd === todayYmd ? ` · ${MEAL_SET_COPY.today}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      const next = addDaysYmd(ymd, 1);
                      if (next <= todayYmd) setYmd(next);
                    }}
                    disabled={ymd >= todayYmd}
                    accessibilityRole="button"
                    accessibilityLabel={MEAL_SET_COPY.nextDay}
                    style={{
                      paddingHorizontal: t.spacing.md,
                      paddingVertical: t.spacing.sm,
                      borderRadius: t.radius.md,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      backgroundColor: t.colors.surface,
                      opacity: ymd >= todayYmd ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg }}>›</Text>
                  </Pressable>
                </View>
                {isFuture ? (
                  <Text style={{ color: t.colors.danger, fontSize: t.fontSize.caption }}>
                    {MEAL_SET_COPY.futureBlocked}
                  </Text>
                ) : null}
              </View>

              {/* 끼니 override */}
              <Segmented<MealSlot>
                label={MEAL_SET_COPY.slotLabel}
                options={MEAL_SLOT_OPTIONS}
                value={slot}
                onChange={(next) => {
                  setSlot(next);
                  if (next === 'SNACK' && !snackPlacement) setSnackPlacement(defaultSnackPlacementForNow());
                }}
              />
              {slot === 'SNACK' ? (
                <RadioGroup
                  options={SNACK_PLACEMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={snackPlacement}
                  onChange={(v) => {
                    if (v) setSnackPlacement(v);
                  }}
                />
              ) : null}

              {/* 등록 불가 안내 */}
              {hasUnavailable && !excludeUnavailable ? (
                <Banner variant="warn">
                  <Text style={{ color: t.colors.warn, fontSize: t.fontSize.body }}>
                    {MEAL_SET_COPY.unavailableBanner(unavailableIds.size)}
                  </Text>
                  <View style={{ marginTop: t.spacing.sm }}>
                    <PrimaryButton
                      title={MEAL_SET_COPY.excludeAndApply}
                      onPress={() => setExcludeUnavailable(true)}
                      variant="secondary"
                    />
                  </View>
                </Banner>
              ) : null}

              {/* 미리보기 */}
              <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '700' }}>
                {MEAL_SET_COPY.previewTitle(includedItems.length, includedKcal)}
              </Text>
              {set.items.map((item) => {
                const tpl = item.foodTemplateId ? tplById.get(item.foodTemplateId) : undefined;
                const unavailable = unavailableIds.has(item.id);
                const excluded = excludeUnavailable && unavailable;
                const kcal = mealSetItemKcal(item, tpl);
                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: t.spacing.sm,
                      paddingHorizontal: t.spacing.md,
                      borderRadius: t.radius.md,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      backgroundColor: t.colors.surface,
                      opacity: excluded ? 0.45 : 1,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                      <Text numberOfLines={1} style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                        {item.kind === 'manual' ? (item.name ?? '직접 입력 음식') : (tpl?.name ?? '삭제된 음식')}
                      </Text>
                      {unavailable ? (
                        <View
                          style={{
                            paddingHorizontal: t.spacing.sm,
                            paddingVertical: 2,
                            borderRadius: t.radius.sm,
                            backgroundColor: t.colors.surface2,
                          }}
                        >
                          <Text style={{ color: t.colors.warn, fontSize: t.fontSize.caption, fontWeight: '600' }}>
                            {excluded ? MEAL_SET_COPY.excludedBadge : MEAL_SET_COPY.itemUnavailable}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      {mealSetItemPortionLabel(item, tpl)}
                      {kcal != null ? ` · ${kcal} kcal` : ''}
                    </Text>
                  </View>
                );
              })}

              <PrimaryButton
                title={
                  includedItems.length === 0
                    ? MEAL_SET_COPY.applyEmpty
                    : MEAL_SET_COPY.applyButton(includedItems.length)
                }
                onPress={() => void handleApply()}
                loading={busy}
                disabled={!canApply}
              />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
