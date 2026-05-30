import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { listWeightEntries, type WeightEntryItem } from '../api/weightEntries';
import { ensureAccessToken } from '../authSession';
import { postWeightEntry } from '../api/weightEntries';
import { fetchReferenceWeight, type ReferenceWeightResponse } from '../api/referenceWeight';
import { WEIGHT_COPY } from '../copy/weight';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import { useFocusReload } from '../hooks/useFocusReload';
import { useWeightCheckIn } from '../hooks/useWeightCheckIn';
import { WeightCheckInModal } from './WeightCheckInModal';
import { ReferenceWeightCard } from './ReferenceWeightCard';
import { WeightTrendChart } from './WeightTrendChart';
import { Banner, Card, CardTitle, PrimaryButton } from './ui';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

/** Latest entry per KST calendar day (defense if server still returns duplicates). */
function latestEntryPerDay(items: WeightEntryItem[]): WeightEntryItem[] {
  const byDate = new Map<string, WeightEntryItem>();
  for (const e of items) {
    const key = e.recordedAt.slice(0, 10);
    const prev = byDate.get(key);
    if (!prev || new Date(e.recordedAt).getTime() > new Date(prev.recordedAt).getTime()) {
      byDate.set(key, e);
    }
  }
  return [...byDate.values()].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
}

export function StatsWeightSection() {
  const t = useTheme();
  const toast = useToast();
  const {
    weightStatus,
    weightModalVisible,
    authToken,
    refreshWeightStatus,
    openWeightModal,
    dismissWeightModalLater,
    onWeightSaved,
  } = useWeightCheckIn();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [entries, setEntries] = useState<WeightEntryItem[]>([]);
  const [reference, setReference] = useState<ReferenceWeightResponse | null>(null);
  const [refErr, setRefErr] = useState<string | null>(null);

  const load = useCallback(async ({ silent }: { silent: boolean }) => {
    if (!silent) setLoading(true);
    setErr(null);
    setRefErr(null);
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      await refreshWeightStatus();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      const [list, ref] = await Promise.all([
        listWeightEntries(token, { size: 100, from: from.toISOString() }),
        fetchReferenceWeight(token).catch((e) => {
          logAppError('[StatsWeight] reference', e);
          setRefErr(toUserMessage(e, { context: 'stats', fallback: WEIGHT_COPY.referenceLoadError }));
          return null;
        }),
      ]);
      setEntries(latestEntryPerDay(list.items));
      setReference(ref);
    } catch (e) {
      logAppError('[StatsWeight] history', e);
      setErr(toUserMessage(e, { context: 'stats', fallback: WEIGHT_COPY.historyLoadError }));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [refreshWeightStatus]);

  useFocusReload(load);

  const handleSaved = (result: Awaited<ReturnType<typeof postWeightEntry>>) => {
    onWeightSaved(result);
    void load({ silent: true });
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
  };

  const showReference =
    reference != null &&
    reference.weightKgMin > 0 &&
    reference.weightKgMax > reference.weightKgMin;

  return (
    <>
      <Card>
        <CardTitle>{WEIGHT_COPY.historyTitle}</CardTitle>
        {loading ? (
          <ActivityIndicator color={t.colors.primary} style={{ marginVertical: t.spacing.md }} />
        ) : err ? (
          <Banner variant="danger" actionLabel={WEIGHT_COPY.historyRetry} onAction={() => void load({ silent: false })}>
            {err}
          </Banner>
        ) : entries.length === 0 ? (
          <View style={{ gap: t.spacing.sm }}>
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{WEIGHT_COPY.historyEmpty}</Text>
            {showReference ? <ReferenceWeightCard data={reference} error={refErr} /> : null}
            <PrimaryButton title={WEIGHT_COPY.historyRecord} onPress={openWeightModal} />
          </View>
        ) : (
          <View style={{ gap: t.spacing.md }}>
            {showReference ? <ReferenceWeightCard data={reference} error={refErr} /> : null}
            {weightStatus?.lastWeightKg != null && weightStatus.daysSince != null ? (
              <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
                {WEIGHT_COPY.lastRecorded(weightStatus.lastWeightKg, weightStatus.daysSince)}
              </Text>
            ) : null}
            <WeightTrendChart
              entries={entries}
              weightKgMin={reference?.weightKgMin ?? null}
              weightKgMax={reference?.weightKgMax ?? null}
            />
            <PrimaryButton title={WEIGHT_COPY.historyRecord} onPress={openWeightModal} />
          </View>
        )}
      </Card>

      {authToken ? (
        <WeightCheckInModal
          visible={weightModalVisible}
          status={weightStatus}
          token={authToken}
          onDismissLater={dismissWeightModalLater}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}
