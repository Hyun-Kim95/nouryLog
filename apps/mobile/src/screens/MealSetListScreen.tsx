import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiFetch, isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { getAccessToken } from '../authStorage';
import type { FoodTemplateItem } from '../api/meals';
import {
  deactivateMealSet,
  listMealSets,
  type MealSet,
} from '../api/mealSets';
import { Banner, Card, PrimaryButton, ScreenLayout } from '../components/ui';
import { MealSetApplySheet } from '../components/MealSetApplySheet';
import { MEAL_SET_COPY } from '../copy/mealSet';
import { useFocusReload } from '../hooks/useFocusReload';
import { summarizeMealSet } from '../lib/mealSetItem';
import { mealSlotLabel, snackPlacementLabel } from '../lib/mealSlot';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import type { RootStackParamList } from '../navigation';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MealSetList'>;
type LoadState = 'loading' | 'ready' | 'error';

export function MealSetListScreen() {
  const t = useTheme();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const [sets, setSets] = useState<MealSet[]>([]);
  const [templates, setTemplates] = useState<FoodTemplateItem[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [applyTarget, setApplyTarget] = useState<MealSet | null>(null);

  const tplById = useMemo(() => {
    const map = new Map<string, FoodTemplateItem>();
    for (const tpl of templates) map.set(tpl.id, tpl);
    return map;
  }, [templates]);

  const load = useCallback(async ({ silent }: { silent: boolean }) => {
    if (!silent) setState('loading');
    const token = await ensureAccessToken();
    if (!token) return;
    try {
      const [setsRes, tplRes] = await Promise.all([
        listMealSets(token),
        apiFetch<{ items: FoodTemplateItem[] }>('/me/food-templates?page=1&size=100', { token }),
      ]);
      setSets(setsRes.items ?? []);
      setTemplates(tplRes.items ?? []);
      setState('ready');
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[MealSetList] load', e);
      setState('error');
    }
  }, []);

  useFocusReload(load);

  const confirmDeactivate = (set: MealSet) => {
    Alert.alert(MEAL_SET_COPY.deactivateConfirmTitle, MEAL_SET_COPY.deactivateConfirmBody, [
      { text: MEAL_SET_COPY.cancel, style: 'cancel' },
      {
        text: MEAL_SET_COPY.deactivate,
        style: 'destructive',
        onPress: () => void deactivate(set),
      },
    ]);
  };

  const deactivate = async (set: MealSet) => {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 필요');
      await deactivateMealSet(token, set.id);
      toast.show({ kind: 'success', message: MEAL_SET_COPY.deactivateSuccess });
      setSets((prev) => prev.filter((s) => s.id !== set.id));
    } catch (e) {
      if (isAuthDenied(e)) return;
      logAppError('[MealSetList] deactivate', e);
      toast.show({
        kind: 'error',
        message: toUserMessage(e, { context: 'meal', fallback: MEAL_SET_COPY.deactivateError }),
      });
    }
  };

  const body = () => {
    if (state === 'error') {
      return (
        <Banner variant="danger" actionLabel={MEAL_SET_COPY.retry} onAction={() => void load({ silent: false })}>
          {MEAL_SET_COPY.listLoadError}
        </Banner>
      );
    }
    if (sets.length === 0) {
      return (
        <Card>
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
            {MEAL_SET_COPY.empty}
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{MEAL_SET_COPY.emptyHint}</Text>
          <PrimaryButton title={MEAL_SET_COPY.createCta} onPress={() => navigation.navigate('MealSetEditor', {})} />
        </Card>
      );
    }
    return (
      <>
        <PrimaryButton title={MEAL_SET_COPY.createCta} onPress={() => navigation.navigate('MealSetEditor', {})} />
        {sets.map((set) => {
          const summary = summarizeMealSet(set, tplById);
          return (
            <Card key={set.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: t.spacing.sm }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>{set.name}</Text>
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginTop: 2 }}>
                    {mealSlotLabel(set.defaultMealSlot)}
                    {set.defaultMealSlot === 'SNACK' && set.defaultSnackPlacement
                      ? ` · ${snackPlacementLabel(set.defaultSnackPlacement)}`
                      : ''}
                    {' · '}
                    {MEAL_SET_COPY.itemCount(summary.itemCount)}
                    {summary.totalKcal > 0 ? ` · ${summary.totalKcal} kcal` : ''}
                  </Text>
                </View>
              </View>

              {summary.hasUnavailable ? (
                <Text style={{ color: t.colors.warn, fontSize: t.fontSize.caption }}>
                  {MEAL_SET_COPY.itemUnavailableHint}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title={MEAL_SET_COPY.applyCta} onPress={() => setApplyTarget(set)} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title={MEAL_SET_COPY.editCta}
                    variant="secondary"
                    onPress={() => navigation.navigate('MealSetEditor', { id: set.id })}
                  />
                </View>
              </View>
              <Pressable onPress={() => confirmDeactivate(set)} accessibilityRole="button" hitSlop={6}>
                <Text style={{ color: t.colors.danger, fontSize: t.fontSize.caption, textAlign: 'center' }}>
                  {MEAL_SET_COPY.deactivate}
                </Text>
              </Pressable>
            </Card>
          );
        })}
      </>
    );
  };

  return (
    <>
      <ScreenLayout
        title={MEAL_SET_COPY.listTitle}
        subtitle={MEAL_SET_COPY.listSubtitle}
        loading={state === 'loading'}
      >
        {body()}
      </ScreenLayout>
      <MealSetApplySheet
        visible={applyTarget != null}
        set={applyTarget}
        tplById={tplById}
        onClose={() => setApplyTarget(null)}
        onApplied={() => setApplyTarget(null)}
      />
    </>
  );
}
