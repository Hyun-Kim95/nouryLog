import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiFetch, isAuthDenied } from '../api';
import { getWeightCheckInStatus, type WeightCheckInStatus } from '../api/weightEntries';
import { ensureAccessToken } from '../authSession';
import { WeightCheckInModal } from '../components/WeightCheckInModal';
import { Banner, Card, CardTitle, Chip, PrimaryButton, ProgressBar, ScreenLayout } from '../components/ui';
import { HOME_COPY } from '../copy/home';
import { sortedWarnings, WARNING_COPY } from '../copy/recommendation';
import { WEIGHT_COPY } from '../copy/weight';
import { useFocusReload } from '../hooks/useFocusReload';
import { computeFulfillment } from '../lib/goalFulfillment';
import { listMeals, type MealRow } from '../api/meals';
import { summarizeByMealSlot } from '../lib/mealTimeline';
import { fetchTodayGoals, fetchTodayIntake } from '../lib/todayNutrition';
import { localDayBounds } from '../lib/dateRange';
import { todayAnchorKst } from '../lib/statsPeriod';
import type { RootStackParamList } from '../navigation';
import { useToast } from '../toast/useToast';
import { useTheme } from '../theme';
import { getWeightPromptDismissedYmd, setWeightPromptDismissedYmd } from '../userPrefs';

type Ent = {
  ocrQuotaLimit: number;
  ocrQuotaUsed: number;
  ocrPaidEnabled: boolean;
  nextPaywallTrigger: 'none' | 'ocr_remaining_1' | 'ocr_exhausted';
};

type Ads = { showBottomBanner: boolean; reason: string };

export function HomeScreen() {
  const t = useTheme();
  const toast = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ent, setEnt] = useState<Ent | null>(null);
  const [ads, setAds] = useState<Ads | null>(null);
  const [intake, setIntake] = useState<Awaited<ReturnType<typeof fetchTodayIntake>> | null>(null);
  const [goals, setGoals] = useState<Awaited<ReturnType<typeof fetchTodayGoals>> | null>(null);
  const [todayMeals, setTodayMeals] = useState<MealRow[]>([]);
  const [weightStatus, setWeightStatus] = useState<WeightCheckInStatus | null>(null);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const load = useCallback(async ({ silent }: { silent: boolean }) => {
    if (!silent) setLoading(true);
    setErr(null);
    try {
      const token = await ensureAccessToken();
      if (!token) return;

      setAuthToken(token);
      const { from, to } = localDayBounds();
      const [settled, weightR, dismissedYmd] = await Promise.all([
        Promise.allSettled([
          apiFetch<Ent>('/me/billing/entitlements', { token }),
          apiFetch<Ads>('/me/ads/status', { token }),
          fetchTodayIntake(token),
          fetchTodayGoals(token),
          listMeals(token, { page: 1, size: 100, from, to }),
        ]),
        getWeightCheckInStatus(token).catch(() => null),
        getWeightPromptDismissedYmd(),
      ]);

      const [entR, adsR, intakeR, goalsR, mealsR] = settled;
      const rejected = [entR, adsR, intakeR, goalsR, mealsR].filter((r) => r.status === 'rejected');
      if (rejected.some((r) => r.status === 'rejected' && isAuthDenied(r.reason))) return;

      if (entR.status === 'fulfilled') setEnt(entR.value);
      if (adsR.status === 'fulfilled') setAds(adsR.value);
      if (intakeR.status === 'fulfilled') setIntake(intakeR.value);
      if (goalsR.status === 'fulfilled') setGoals(goalsR.value);
      if (mealsR.status === 'fulfilled') setTodayMeals(mealsR.value.items ?? []);

      if (weightR) {
        setWeightStatus(weightR);
        const todayKst = todayAnchorKst();
        const showModal = weightR.due && dismissedYmd !== todayKst;
        setWeightModalVisible(showModal);
      }

      if (rejected.length === 5) {
        const reason = rejected[0].reason;
        setErr(reason instanceof Error ? reason.message : HOME_COPY.loadError);
      }
    } catch (e) {
      if (isAuthDenied(e)) return;
      setErr(e instanceof Error ? e.message : HOME_COPY.loadError);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useFocusReload(load);

  const warnings = sortedWarnings(goals?.profile.warnings).map((w) => WARNING_COPY[w]);
  const profile = goals?.profile;
  const slotSummaries = summarizeByMealSlot(todayMeals).filter(
    (s) => s.slot !== 'SNACK' && s.slot !== 'UNSPECIFIED',
  );
  const snackSummary = summarizeByMealSlot(todayMeals).find((s) => s.slot === 'SNACK');

  return (
    <ScreenLayout title={HOME_COPY.title} subtitle={HOME_COPY.subtitle} loading={loading}>
      {err ? (
        <Banner variant="danger" actionLabel={HOME_COPY.retry} onAction={() => void load({ silent: false })}>
          {err}
        </Banner>
      ) : null}

      {ent ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          <Chip label={HOME_COPY.photoAnalysisChip(ent.ocrQuotaUsed, ent.ocrQuotaLimit)} />
          {ent.ocrPaidEnabled ? <Chip label="사진 분석 추가 이용" tone="muted" /> : null}
        </View>
      ) : null}

      {ent?.nextPaywallTrigger === 'ocr_remaining_1' ? (
        <Banner variant="warn">{HOME_COPY.ocrBannerRemaining}</Banner>
      ) : null}
      {ent?.nextPaywallTrigger === 'ocr_exhausted' ? (
        <Banner variant="warn">{HOME_COPY.ocrBannerExhausted}</Banner>
      ) : null}

      {intake ? (
        <Card>
          <CardTitle>{HOME_COPY.intakeTitle}</CardTitle>
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
            {intake.calorieKcal} kcal
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
            {HOME_COPY.protein} {Math.round(intake.proteinG)}g · {HOME_COPY.carb}{' '}
            {Math.round(intake.carbohydrateG)}g · {HOME_COPY.fat} {Math.round(intake.fatG)}g
          </Text>
        </Card>
      ) : null}

      <Card>
        <CardTitle>{HOME_COPY.mealsBySlotTitle}</CardTitle>
        {slotSummaries.map((s) => (
          <Text
            key={s.slot}
            style={{
              color: s.count > 0 ? t.colors.fg : t.colors.fgMuted,
              fontSize: t.fontSize.body,
              marginBottom: t.spacing.xs,
            }}
          >
            {s.count > 0
              ? HOME_COPY.mealSlotLine(s.label, s.summaryKcal, s.summaryProteinG)
              : `${s.label} · ${HOME_COPY.mealSlotEmpty}`}
          </Text>
        ))}
        {snackSummary ? (
          <Text
            style={{
              color: snackSummary.count > 0 ? t.colors.fg : t.colors.fgMuted,
              fontSize: t.fontSize.body,
            }}
          >
            {snackSummary.count > 0
              ? HOME_COPY.mealSlotLine(snackSummary.label, snackSummary.summaryKcal, snackSummary.summaryProteinG)
              : `${snackSummary.label} · ${HOME_COPY.mealSlotEmpty}`}
          </Text>
        ) : null}
      </Card>

      {goals?.proteinGoalG != null || goals?.calorieGoalKcal != null ? (
        <Card>
          <CardTitle>{HOME_COPY.goalsTitle}</CardTitle>
          {goals.calorieGoalKcal != null && intake ? (
            <ProgressBar
              label={HOME_COPY.calorie}
              value={Math.round(intake.calorieKcal)}
              max={goals.calorieGoalMaxKcal ?? goals.calorieGoalKcal}
              unit=" kcal"
              fulfillment={computeFulfillment(
                'calorie',
                intake.calorieKcal,
                goals.calorieGoalKcal,
                profile,
                {
                  min: goals.calorieGoalMinKcal,
                  max: goals.calorieGoalMaxKcal,
                },
              )}
            />
          ) : null}
          {goals.proteinGoalG != null && intake ? (
            <ProgressBar
              label={HOME_COPY.protein}
              value={Math.round(intake.proteinG)}
              max={goals.proteinGoalMaxG ?? goals.proteinGoalG}
              unit="g"
              fulfillment={computeFulfillment('protein', intake.proteinG, goals.proteinGoalG, profile, {
                min: goals.proteinGoalMinG,
                max: goals.proteinGoalMaxG,
              })}
            />
          ) : null}
          {warnings.map((line) => (
            <Text key={line} style={{ color: t.colors.warn, fontSize: t.fontSize.caption }}>
              {line}
            </Text>
          ))}
        </Card>
      ) : !loading && !err ? (
        <Card>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{HOME_COPY.emptyGoals}</Text>
          <PrimaryButton title={HOME_COPY.profileCta} onPress={() => navigation.navigate('ProfileEdit')} />
        </Card>
      ) : null}

      {ads ? (
        <Card dashed={ads.showBottomBanner}>
          <CardTitle>광고</CardTitle>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
            {ads.showBottomBanner ? HOME_COPY.adBanner : HOME_COPY.adHidden}
          </Text>
        </Card>
      ) : null}

      {authToken ? (
        <WeightCheckInModal
          visible={weightModalVisible}
          status={weightStatus}
          token={authToken}
          onDismissLater={() => {
            void setWeightPromptDismissedYmd(todayAnchorKst());
            setWeightModalVisible(false);
          }}
          onSaved={(result) => {
            setWeightModalVisible(false);
            setWeightStatus({
              due: false,
              lastRecordedAt: result.entry.recordedAt,
              lastWeightKg: result.entry.weightKg,
              daysSince: 0,
            });
            toast.show({
              kind: 'success',
              message: WEIGHT_COPY.toastSaved(
                result.entry.weightKg,
                result.goalsBefore.calorieGoalKcal,
                result.goalsAfter.calorieGoalKcal,
                result.goalsBefore.proteinGoalG,
                result.goalsAfter.proteinGoalG,
              ),
            });
            void load({ silent: true });
          }}
        />
      ) : null}
    </ScreenLayout>
  );
}
