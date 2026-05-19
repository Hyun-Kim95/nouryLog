import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { listWeightEntries, type WeightEntryItem } from '../api/weightEntries';
import { ensureAccessToken } from '../authSession';
import { postWeightEntry } from '../api/weightEntries';
import { WEIGHT_COPY } from '../copy/weight';
import { useFocusReload } from '../hooks/useFocusReload';
import { useWeightCheckIn } from '../hooks/useWeightCheckIn';
import { WeightCheckInModal } from './WeightCheckInModal';
import { WeightTrendChart } from './WeightTrendChart';
import { Banner, Card, CardTitle, PrimaryButton } from './ui';
import { useTheme } from '../theme';
import { useToast } from '../toast/useToast';

function formatRecordedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
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

  const load = useCallback(async ({ silent }: { silent: boolean }) => {
    if (!silent) setLoading(true);
    setErr(null);
    try {
      const token = await ensureAccessToken();
      if (!token) return;
      await refreshWeightStatus();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      const list = await listWeightEntries(token, { size: 100, from: from.toISOString() });
      setEntries(list.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : WEIGHT_COPY.historyLoadError);
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
            <PrimaryButton title={WEIGHT_COPY.historyRecord} onPress={openWeightModal} />
          </View>
        ) : (
          <View style={{ gap: t.spacing.md }}>
            <WeightTrendChart entries={entries} />
            {entries.slice(0, 20).map((e) => (
              <Text key={e.id} style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
                {WEIGHT_COPY.historyEntryLine(formatRecordedAt(e.recordedAt), e.weightKg)}
              </Text>
            ))}
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
