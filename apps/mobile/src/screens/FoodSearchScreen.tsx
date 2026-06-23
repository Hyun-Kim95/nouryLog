import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Banner, Card, CardTitle, ScreenLayout } from '../components/ui';
import { Segmented } from '../components/Segmented';
import type { RootStackParamList } from '../navigation';
import {
  fetchMealEntrySuggestions,
  fetchMealSearchSummary,
  listMeals,
  type MealRow,
  type MealSearchSummary,
  type MealSlotKey,
} from '../api/meals';
import { isAuthDenied } from '../api';
import { ensureAccessToken } from '../authSession';
import { mealSlotLabel, snackPlacementLabel, type MealSlot } from '../lib/mealSlot';
import { todayAnchorKst } from '../lib/statsPeriod';
import { formatKstDayTitle } from '../lib/dateRange';
import { FOOD_SEARCH_COPY } from '../copy/foodSearch';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import { useTheme } from '../theme';

type Preset = '30' | '90' | 'all';

const PAGE_SIZE = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

function rangeFromPreset(preset: Preset): { from?: string; to?: string } {
  if (preset === 'all') return {};
  const days = preset === '30' ? 30 : 90;
  const now = Date.now();
  return { from: new Date(now - days * DAY_MS).toISOString(), to: new Date(now).toISOString() };
}

function ymdFromIso(iso: string): string {
  return todayAnchorKst(new Date(iso));
}

function slotKeyLabel(key: MealSlotKey): string {
  return key === 'UNSPECIFIED' ? '미분류' : mealSlotLabel(key as MealSlot);
}

function suggestionName(item: { kind: 'template' | 'past_meal'; template?: { name: string }; meal?: { name: string } }): string {
  return item.kind === 'template' ? item.template?.name ?? '' : item.meal?.name ?? '';
}

function historySlotText(item: MealRow): string {
  const slot = mealSlotLabel(item.mealSlot ?? null);
  if (item.mealSlot === 'SNACK' && item.snackPlacement) {
    return `${slot} · ${snackPlacementLabel(item.snackPlacement)}`;
  }
  return slot;
}

export function FoodSearchScreen() {
  const t = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [preset, setPreset] = useState<Preset>('90');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  const [recent, setRecent] = useState<string[]>([]);

  const [summary, setSummary] = useState<MealSearchSummary | null>(null);
  const [items, setItems] = useState<MealRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const trimmed = debounced.trim();
  const hasQuery = trimmed.length > 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 검색어 디바운스
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  // 페이지 리셋 (검색어/기간 변경 시)
  useEffect(() => {
    setPage(1);
  }, [trimmed, preset]);

  // 최근 먹은 음식 (빈 검색어 발견성)
  const loadRecent = useCallback(async () => {
    try {
      const token = await ensureAccessToken();
      if (!token) {
        setDenied(true);
        return;
      }
      setDenied(false);
      const res = await listMeals(token, { page: 1, size: 30 });
      const names: string[] = [];
      for (const m of res.items ?? []) {
        if (m.name && !names.includes(m.name)) names.push(m.name);
        if (names.length >= 8) break;
      }
      setRecent(names);
    } catch (e) {
      if (isAuthDenied(e)) {
        setDenied(true);
        return;
      }
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  // 자동완성
  const suggestAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const raw = query.trim();
    if (raw.length === 0) {
      setSuggestions([]);
      return;
    }
    const id = setTimeout(async () => {
      suggestAbort.current?.abort();
      const controller = new AbortController();
      suggestAbort.current = controller;
      try {
        const token = await ensureAccessToken();
        if (!token) return;
        const res = await fetchMealEntrySuggestions(token, { q: raw, limit: 6, signal: controller.signal });
        const names: string[] = [];
        for (const it of res.items ?? []) {
          const n = suggestionName(it);
          if (n && !names.includes(n)) names.push(n);
        }
        setSuggestions(names);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  // 검색 결과 (요약 + 이력)
  const loadResults = useCallback(async () => {
    if (!hasQuery) {
      setSummary(null);
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const token = await ensureAccessToken();
      if (!token) {
        setDenied(true);
        return;
      }
      setDenied(false);
      const { from, to } = rangeFromPreset(preset);
      const [summaryRes, listRes] = await Promise.all([
        fetchMealSearchSummary(token, { q: trimmed, from, to }),
        listMeals(token, { q: trimmed, from, to, page, size: PAGE_SIZE }),
      ]);
      setSummary(summaryRes);
      setItems(listRes.items ?? []);
      setTotal(listRes.total ?? 0);
    } catch (e) {
      if (isAuthDenied(e)) {
        setDenied(true);
        return;
      }
      logAppError('[FoodSearch] load', e);
      setErr(toUserMessage(e, { context: 'meal', fallback: FOOD_SEARCH_COPY.loadError }));
    } finally {
      setLoading(false);
    }
  }, [hasQuery, trimmed, preset, page]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const distributionText = useMemo(() => {
    if (!summary) return null;
    const entries = (Object.keys(summary.bySlot) as MealSlotKey[])
      .map((k) => ({ k, n: summary.bySlot[k] }))
      .filter((e) => e.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 3);
    if (entries.length === 0) return null;
    return (
      FOOD_SEARCH_COPY.slotDistributionPrefix +
      entries.map((e) => FOOD_SEARCH_COPY.slotDistributionItem(slotKeyLabel(e.k), e.n)).join(' · ')
    );
  }, [summary]);

  const lastConsumedText = summary?.lastConsumedAt
    ? FOOD_SEARCH_COPY.lastConsumed(formatKstDayTitle(ymdFromIso(summary.lastConsumedAt)))
    : FOOD_SEARCH_COPY.lastConsumedNone;

  const isEmptyResult = hasQuery && !loading && !err && (summary?.total ?? 0) === 0;
  const hasResult = hasQuery && !loading && !err && (summary?.total ?? 0) > 0;

  const goDate = (item: MealRow) => {
    navigation.navigate('PastMealBrowse', { targetYmd: ymdFromIso(item.consumedAt) });
  };

  return (
    <ScreenLayout scroll>
      {/* 검색 입력 + 자동완성 */}
      <View style={{ position: 'relative', zIndex: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: t.colors.border,
            borderRadius: t.radius.md,
            backgroundColor: t.colors.surface,
            paddingHorizontal: t.spacing.md,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setShowSuggest(true)}
            placeholder={FOOD_SEARCH_COPY.searchPlaceholder}
            placeholderTextColor={t.colors.fgSubtle}
            accessibilityLabel={FOOD_SEARCH_COPY.searchA11yLabel}
            returnKeyType="search"
            onSubmitEditing={() => {
              setDebounced(query);
              setShowSuggest(false);
            }}
            style={{
              flex: 1,
              color: t.colors.fg,
              fontSize: t.fontSize.body,
              paddingVertical: t.spacing.md,
            }}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={FOOD_SEARCH_COPY.clearSearch}
              onPress={() => {
                setQuery('');
                setDebounced('');
                setShowSuggest(false);
              }}
              hitSlop={8}
            >
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {showSuggest && suggestions.length > 0 ? (
          <View
            accessibilityLabel={FOOD_SEARCH_COPY.suggestionsA11y}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.md,
              backgroundColor: t.colors.surface,
              overflow: 'hidden',
            }}
          >
            {suggestions.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                onPress={() => {
                  setQuery(s);
                  setDebounced(s);
                  setShowSuggest(false);
                }}
                style={({ pressed }) => ({
                  paddingVertical: t.spacing.md,
                  paddingHorizontal: t.spacing.md,
                  backgroundColor: pressed ? t.colors.surface2 : 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: t.colors.border,
                })}
              >
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* 기간 프리셋 */}
      <View style={{ marginTop: t.spacing.md }}>
        <Segmented<Preset>
          label={FOOD_SEARCH_COPY.rangeLabel}
          options={[
            { value: '30', label: FOOD_SEARCH_COPY.range30 },
            { value: '90', label: FOOD_SEARCH_COPY.range90 },
            { value: 'all', label: FOOD_SEARCH_COPY.rangeAll },
          ]}
          value={preset}
          onChange={setPreset}
        />
      </View>

      <View style={{ marginTop: t.spacing.md, gap: t.spacing.md }}>
        {denied ? <Banner variant="info">로그인이 필요해요.</Banner> : null}

        {err ? (
          <Banner variant="danger" actionLabel={FOOD_SEARCH_COPY.retry} onAction={() => void loadResults()}>
            {err}
          </Banner>
        ) : null}

        {loading ? (
          <View style={{ paddingVertical: t.spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : null}

        {/* 빈 검색어 → 안내 + 최근 음식 */}
        {!hasQuery && !loading && !denied ? (
          <Card>
            <CardTitle>{FOOD_SEARCH_COPY.promptTitle}</CardTitle>
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
              {FOOD_SEARCH_COPY.promptDesc}
            </Text>
            {recent.length > 0 ? (
              <View style={{ marginTop: t.spacing.md }}>
                <Text
                  style={{
                    color: t.colors.fgSubtle,
                    fontSize: t.fontSize.caption,
                    fontWeight: '700',
                    marginBottom: t.spacing.sm,
                  }}
                >
                  {FOOD_SEARCH_COPY.recentTitle}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
                  {recent.map((name) => (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      onPress={() => {
                        setQuery(name);
                        setDebounced(name);
                      }}
                      style={({ pressed }) => ({
                        paddingHorizontal: t.spacing.md,
                        paddingVertical: t.spacing.xs,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: t.colors.primary,
                        backgroundColor: pressed ? t.colors.surface2 : t.colors.surface,
                      })}
                    >
                      <Text style={{ color: t.colors.primary, fontSize: t.fontSize.caption, fontWeight: '700' }}>
                        {name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>
        ) : null}

        {/* 빈 결과 */}
        {isEmptyResult ? (
          <Card>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
              {FOOD_SEARCH_COPY.emptyResult(trimmed)}
            </Text>
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginTop: t.spacing.xs }}>
              {FOOD_SEARCH_COPY.emptyResultHint}
            </Text>
          </Card>
        ) : null}

        {/* 빈도 요약 + 이력 */}
        {hasResult && summary ? (
          <>
            <Card>
              <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
                {FOOD_SEARCH_COPY.frequency(summary.total)}
              </Text>
              <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, marginTop: t.spacing.xs }}>
                {lastConsumedText}
              </Text>
              {distributionText ? (
                <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, marginTop: t.spacing.xs }}>
                  {distributionText}
                </Text>
              ) : null}
            </Card>

            <Text
              style={{
                color: t.colors.fg,
                fontSize: t.fontSize.body,
                fontWeight: '700',
                marginTop: t.spacing.xs,
              }}
            >
              {FOOD_SEARCH_COPY.historyTitle}
            </Text>

            {items.map((item) => {
              const ymd = ymdFromIso(item.consumedAt);
              const dateLabel = formatKstDayTitle(ymd);
              const slotText = historySlotText(item);
              return (
                <Pressable
                  key={item.mealId}
                  accessibilityRole="button"
                  accessibilityLabel={FOOD_SEARCH_COPY.historyItemA11y(dateLabel, slotText, item.name)}
                  onPress={() => goDate(item)}
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: t.colors.border,
                    borderRadius: t.radius.md,
                    backgroundColor: pressed ? t.colors.surface2 : t.colors.surface,
                    padding: t.spacing.md,
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600' }}>
                      {dateLabel}
                    </Text>
                    <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                      {Math.round(item.calories)} kcal
                    </Text>
                  </View>
                  <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginTop: t.spacing.xs }}>
                    {slotText} · {item.name}
                  </Text>
                </Pressable>
              );
            })}

            {totalPages > 1 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: t.spacing.lg,
                  marginTop: t.spacing.sm,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  hitSlop={8}
                >
                  <Text
                    style={{
                      color: page <= 1 ? t.colors.fgSubtle : t.colors.primary,
                      fontSize: t.fontSize.bodyLg,
                      fontWeight: '700',
                    }}
                  >
                    ‹
                  </Text>
                </Pressable>
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>
                  {page} / {totalPages}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  hitSlop={8}
                >
                  <Text
                    style={{
                      color: page >= totalPages ? t.colors.fgSubtle : t.colors.primary,
                      fontSize: t.fontSize.bodyLg,
                      fontWeight: '700',
                    }}
                  >
                    ›
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </ScreenLayout>
  );
}
