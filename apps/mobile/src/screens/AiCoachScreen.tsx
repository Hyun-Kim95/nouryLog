import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getCoachSummary, postAiAsk, type CoachSummaryResponse } from '../api/ai';
import { ApiError, isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { AiChatSection } from '../components/ai/AiChatSection';
import { CoachDashboard } from '../components/ai/CoachDashboard';
import { WeeklyReportCard } from '../components/ai/WeeklyReportCard';
import { StatsCalendarModal } from '../components/StatsCalendarModal';
import { Banner, ScreenLayout } from '../components/ui';
import { AI_COPY } from '../copy/ai';
import { useFocusReload } from '../hooks/useFocusReload';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import { todayAnchorKst } from '../lib/statsPeriod';
import type { RootStackParamList } from '../navigation';
import { useToast } from '../toast/useToast';
import { useTheme } from '../theme';

type AiCoachRoute = RouteProp<RootStackParamList, 'AiCoach'>;

export function AiCoachScreen() {
  const t = useTheme();
  const toast = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<AiCoachRoute>();
  const [anchor, setAnchor] = useState(route.params?.anchor ?? todayAnchorKst());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CoachSummaryResponse | null>(null);

  const load = useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const tok = await ensureAccessToken();
        if (!tok) return;
        setToken(tok);
        const res = await getCoachSummary(tok, anchor);
        setSummary(res);
      } catch (e) {
        if (isAuthDenied(e)) return;
        logAppError('[AiCoach] load', e);
        setSummary(null);
        setError(toUserMessage(e, { context: 'generic', fallback: AI_COPY.summaryLoadError }));
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

  const handleAsk = async (question: string) => {
    const tok = token ?? (await ensureAccessToken());
    if (!tok) throw new ApiError(401, { code: 'AUTH_REQUIRED', message: '로그인이 필요해요.' });
    return postAiAsk(tok, { question, contextAnchor: anchor });
  };

  return (
    <ScreenLayout
      title={AI_COPY.screenTitle}
      subtitle={AI_COPY.screenSubtitle}
      loading={loading}
      keyboardAvoiding
      scroll
    >
      <CardAnchorBar anchor={anchor} onOpenCalendar={() => setCalendarOpen(true)} />

      {error ? (
        <Banner variant="danger" actionLabel={AI_COPY.retry} onAction={() => void load({ silent: false })}>
          {error}
        </Banner>
      ) : null}

      {summary?.isStale ? <Banner variant="warn">{AI_COPY.staleBanner}</Banner> : null}

      <CoachDashboard summary={summary} loading={loading} />

      {token ? (
        <WeeklyReportCard
          token={token}
          anchor={anchor}
          onGoLog={() => navigation.navigate('Main', { screen: 'Log' })}
        />
      ) : null}

      {token ? (
        <AiChatSection
          summary={summary}
          summaryLoading={loading}
          onAsk={handleAsk}
          onRateLimit={() => toast.show({ kind: 'info', message: AI_COPY.rateLimitToast })}
          onAskError={(message) => toast.show({ kind: 'error', message })}
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
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{AI_COPY.anchorLabel}</Text>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>{anchor}</Text>
      </View>
      <Pressable
        onPress={onOpenCalendar}
        accessibilityRole="button"
        accessibilityLabel={AI_COPY.anchorCalendarOpen}
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
