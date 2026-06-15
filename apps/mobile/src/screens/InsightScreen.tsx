import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getInsightSummary, type InsightSummaryResponse } from '../api/insights';
import { isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { InsightDashboard } from '../components/insights/InsightDashboard';
import { WeeklyReportCard } from '../components/insights/WeeklyReportCard';
import { StatsCalendarModal } from '../components/StatsCalendarModal';
import { Banner, ScreenLayout } from '../components/ui';
import { INSIGHT_COPY } from '../copy/insights';
import { useFocusReload } from '../hooks/useFocusReload';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import { todayAnchorKst } from '../lib/statsPeriod';
import type { RootStackParamList } from '../navigation';
import { useTheme } from '../theme';

type InsightRoute = RouteProp<RootStackParamList, 'DietInsight'>;

export function InsightScreen() {
  const t = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<InsightRoute>();
  const [anchor, setAnchor] = useState(route.params?.anchor ?? todayAnchorKst());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<InsightSummaryResponse | null>(null);

  const load = useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const tok = await ensureAccessToken();
        if (!tok) return;
        setToken(tok);
        const res = await getInsightSummary(tok, anchor);
        setSummary(res);
      } catch (e) {
        if (isAuthDenied(e)) return;
        logAppError('[Insight] load', e);
        setSummary(null);
        setError(toUserMessage(e, { context: 'generic', fallback: INSIGHT_COPY.summaryLoadError }));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [anchor],
  );

  useEffect(() => {
    void load({ silent: false });
  }, [load]);

  useFocusReload(load);

  return (
    <ScreenLayout
      title={INSIGHT_COPY.screenTitle}
      subtitle={INSIGHT_COPY.screenSubtitle}
      loading={loading}
      keyboardAvoiding
      scroll
    >
      <CardAnchorBar anchor={anchor} onOpenCalendar={() => setCalendarOpen(true)} />

      {error ? (
        <Banner variant="danger" actionLabel={INSIGHT_COPY.retry} onAction={() => void load({ silent: false })}>
          {error}
        </Banner>
      ) : null}

      {summary?.isStale ? <Banner variant="warn">{INSIGHT_COPY.staleBanner}</Banner> : null}

      <InsightDashboard summary={summary} loading={loading} />

      {token ? (
        <WeeklyReportCard
          token={token}
          anchor={anchor}
          onGoLog={() => navigation.navigate('Main', { screen: 'Log' })}
        />
      ) : null}

      <StatsCalendarModal
        visible={calendarOpen}
        initialYmd={anchor}
        onClose={() => setCalendarOpen(false)}
        onSelectYmd={(ymd) => setAnchor(ymd)}
      />
    </ScreenLayout>
  );
}

function CardAnchorBar({ anchor, onOpenCalendar }: { anchor: string; onOpenCalendar: () => void }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: t.spacing.md,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface,
        marginBottom: t.spacing.md,
      }}
    >
      <View>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{INSIGHT_COPY.anchorLabel}</Text>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>{anchor}</Text>
      </View>
      <Pressable
        onPress={onOpenCalendar}
        accessibilityRole="button"
        accessibilityLabel={INSIGHT_COPY.anchorCalendarOpen}
        hitSlop={8}
        style={{
          width: 40,
          height: 40,
          borderRadius: t.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="calendar-outline" size={22} color={t.colors.primary} />
      </Pressable>
    </View>
  );
}
