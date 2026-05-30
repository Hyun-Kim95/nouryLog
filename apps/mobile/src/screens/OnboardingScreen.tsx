import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomSafeInset } from '../hooks/useBottomSafeInset';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { Field } from '../components/Field';
import { Segmented } from '../components/Segmented';
import { RadioGroup } from '../components/RadioGroup';
import { Banner } from '../components/ui';
import {
  ProfileApiError,
  isAuthDenied,
  recalcRecommendation,
  saveProfile,
  type ActivityLevel,
  type Gender,
  type Goal,
} from '../api/profile';
import {
  clearTokens,
  getAccessToken,
  parseUserIdFromAccessToken,
  setOnboardingDone,
} from '../authStorage';
import { AnalyticsEvents, track } from '../analytics';
import { useDevToggles } from '../dev/devToggles';
import { useToast } from '../toast/useToast';
import { fetchReferenceWeight, type ReferenceWeightResponse } from '../api/referenceWeight';
import { ReferenceWeightCard } from '../components/ReferenceWeightCard';
import { RECOMMENDATION_COPY } from '../copy/recommendation';
import { logAppError, toUserMessage } from '../lib/userFacingError';
import type { RootStackParamList } from '../navigation';

type Props = CompositeScreenProps<
  NativeStackScreenProps<RootStackParamList, 'Onboarding'>,
  NativeStackScreenProps<RootStackParamList>
>;

type FieldKey = 'gender' | 'age' | 'heightCm' | 'weightKg' | 'activityLevel' | 'goal';

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: '거의 없음', description: '거의 앉아서 생활' },
  { value: 'light', label: '가벼움', description: '가벼운 산책·집안일' },
  { value: 'moderate', label: '보통', description: '주 3~4회 운동' },
  { value: 'active', label: '활동적', description: '주 5회 이상 강한 운동' },
];

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'lose', label: '감량' },
  { value: 'maintain', label: '유지' },
  { value: 'gain', label: '증량' },
];

const AGE_MIN = 13;
const AGE_MAX = 99;
const HEIGHT_MIN = 100;
const HEIGHT_MAX = 250;
const WEIGHT_MIN = 20;
const WEIGHT_MAX = 300;

function parseInteger(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

function parseDecimal(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Number(trimmed);
}

function validateAge(input: string): { value?: number; error?: string } {
  const n = parseInteger(input);
  if (n === null) return { error: '나이는 숫자만 입력해 주세요.' };
  if (n < AGE_MIN || n > AGE_MAX) {
    return { error: `나이는 ${AGE_MIN}세 이상 ${AGE_MAX}세 이하이어야 합니다.` };
  }
  return { value: n };
}

function validateHeight(input: string): { value?: number; error?: string } {
  const n = parseInteger(input);
  if (n === null) return { error: '신장은 숫자만 입력해 주세요.' };
  if (n < HEIGHT_MIN || n > HEIGHT_MAX) {
    return { error: `신장은 ${HEIGHT_MIN}~${HEIGHT_MAX}cm 범위로 입력해 주세요.` };
  }
  return { value: n };
}

function validateWeight(input: string): { value?: number; error?: string } {
  const n = parseDecimal(input);
  if (n === null) return { error: '체중은 숫자(소수 1자리까지)만 입력해 주세요.' };
  if (n < WEIGHT_MIN || n > WEIGHT_MAX) {
    return { error: `체중은 ${WEIGHT_MIN}~${WEIGHT_MAX}kg 범위로 입력해 주세요.` };
  }
  return { value: Math.round(n) };
}

export function OnboardingScreen({ navigation }: Props) {
  const t = useTheme();
  const bottomInset = useBottomSafeInset();
  const dev = useDevToggles();
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageStr, setAgeStr] = useState('');
  const [heightStr, setHeightStr] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refData, setRefData] = useState<ReferenceWeightResponse | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);

  useEffect(() => {
    void getAccessToken().then((tk) => {
      if (!tk) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setToken(tk);
    });
  }, [navigation]);

  useEffect(() => {
    if (!token) return;
    const h = validateHeight(heightStr);
    const a = validateAge(ageStr);
    const w = validateWeight(weightStr);
    if (h.error || a.error || h.value == null || a.value == null) {
      setRefData(null);
      setRefError(null);
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        setRefLoading(true);
        setRefError(null);
        try {
          const data = await fetchReferenceWeight(token, {
            heightCm: h.value as number,
            age: a.value as number,
            weightKg: w.value ?? undefined,
          });
          setRefData(data);
        } catch (e) {
          setRefData(null);
          logAppError('[Onboarding] referenceWeight', e);
          setRefError(toUserMessage(e, { context: 'profile', fallback: '참고 체중을 불러오지 못했어요.' }));
        } finally {
          setRefLoading(false);
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [token, heightStr, ageStr, weightStr]);

  const goMain = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }, [navigation]);

  const goLoginAfterAuthFail = useCallback(async () => {
    await clearTokens();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation]);

  const validateAll = useCallback((): {
    ok: boolean;
    errors: Partial<Record<FieldKey, string>>;
    values?: {
      gender: Gender;
      age: number;
      heightCm: number;
      weightKg: number;
      activityLevel: ActivityLevel | null;
      goal: Goal | null;
    };
  } => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!gender) next.gender = '성별을 선택해 주세요.';
    const a = validateAge(ageStr);
    if (a.error) next.age = a.error;
    const h = validateHeight(heightStr);
    if (h.error) next.heightCm = h.error;
    const w = validateWeight(weightStr);
    if (w.error) next.weightKg = w.error;
    if (Object.keys(next).length > 0) {
      return { ok: false, errors: next };
    }
    return {
      ok: true,
      errors: {},
      values: {
        gender: gender as Gender,
        age: a.value as number,
        heightCm: h.value as number,
        weightKg: w.value as number,
        activityLevel,
        goal,
      },
    };
  }, [gender, ageStr, heightStr, weightStr, activityLevel, goal]);

  const onSubmit = useCallback(async () => {
    if (!token || busy) return;
    setBanner(null);
    const v = validateAll();
    if (!v.ok || !v.values) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await saveProfile(token, v.values, { __forceFail: dev.force5xx });
      try {
        await recalcRecommendation(token, { __forceFail: dev.forceRecalcFail });
        toast.show({ kind: 'success', message: RECOMMENDATION_COPY.onboardingDone });
      } catch (recalcErr) {
        toast.show({ kind: 'info', message: '권장량을 다시 계산하지 못했어요. 잠시 후 다시 시도하세요.' });
        if (__DEV__) console.warn('recalc failed', recalcErr);
      }
      const userId = token ? parseUserIdFromAccessToken(token) : null;
      await setOnboardingDone(true, userId ?? undefined);
      track(AnalyticsEvents.onboardingCompleted, { skipped: false });
      setTimeout(() => goMain(), 600);
    } catch (e) {
      if (e instanceof ProfileApiError) {
        if (isAuthDenied(e)) {
          await goLoginAfterAuthFail();
          return;
        }
        if (e.status === 422 && e.field) {
          const map: Record<string, FieldKey> = {
            gender: 'gender',
            age: 'age',
            heightCm: 'heightCm',
            weightKg: 'weightKg',
            activityLevel: 'activityLevel',
            goal: 'goal',
          };
          const target = map[e.field];
          if (target) {
            setErrors({ [target]: e.message });
          }
          setBanner(e.message);
          toast.show({ kind: 'error', message: e.message });
        } else {
          const msg = toUserMessage(e, { context: 'profile' });
          setBanner(msg);
          toast.show({ kind: 'error', message: msg });
        }
      } else {
        logAppError('[Onboarding] save', e);
        const msg = toUserMessage(e, { context: 'profile', fallback: '네트워크 오류로 저장하지 못했어요. 다시 시도해 주세요.' });
        setBanner(msg);
        toast.show({ kind: 'error', message: msg });
      }
    } finally {
      setBusy(false);
    }
  }, [token, busy, validateAll, goMain, goLoginAfterAuthFail, dev.force5xx, dev.forceRecalcFail, toast]);

  const onSkip = useCallback(() => {
    if (busy) return;
    track(AnalyticsEvents.onboardingCompleted, { skipped: true });
    goMain();
  }, [busy, goMain]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.colors.bg }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: t.spacing.lg,
              paddingTop: t.spacing.lg,
              paddingBottom: t.spacing.xxl + 96,
              gap: t.spacing.lg,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: t.spacing.xs }}>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.display, fontWeight: '700' }}>
              기본 정보를 알려주세요
            </Text>
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>
              정확한 칼로리·영양 권장량 계산을 위해 입력해 주세요. 언제든 설정에서 변경할 수 있습니다.
            </Text>
          </View>

          {banner ? (
            <Banner variant="danger">{banner}</Banner>
          ) : null}

          <Segmented<Gender>
            label="성별"
            required
            error={errors.gender}
            options={[
              { value: 'male', label: '남성' },
              { value: 'female', label: '여성' },
              { value: 'unspecified', label: '응답하지 않음' },
            ]}
            value={gender}
            onChange={(v) => {
              setGender(v);
              setErrors((prev) => ({ ...prev, gender: undefined }));
            }}
          />

          <Field
            label="나이"
            required
            suffix="세"
            placeholder="예: 28"
            keyboardType="number-pad"
            maxLength={2}
            value={ageStr}
            onChangeText={(v) => {
              setAgeStr(v);
              setErrors((prev) => ({ ...prev, age: undefined }));
            }}
            onBlur={() => {
              if (!ageStr.trim()) return;
              const r = validateAge(ageStr);
              if (r.error) setErrors((prev) => ({ ...prev, age: r.error }));
            }}
            helper={`만 ${AGE_MIN}세 이상 ${AGE_MAX}세 이하`}
            error={errors.age}
          />

          <Field
            label="신장"
            required
            suffix="cm"
            placeholder="예: 172"
            keyboardType="number-pad"
            maxLength={3}
            value={heightStr}
            onChangeText={(v) => {
              setHeightStr(v);
              setErrors((prev) => ({ ...prev, heightCm: undefined }));
            }}
            onBlur={() => {
              if (!heightStr.trim()) return;
              const r = validateHeight(heightStr);
              if (r.error) setErrors((prev) => ({ ...prev, heightCm: r.error }));
            }}
            helper={`${HEIGHT_MIN}~${HEIGHT_MAX}cm`}
            error={errors.heightCm}
          />

          <Field
            label="체중"
            required
            suffix="kg"
            placeholder="예: 65"
            keyboardType="decimal-pad"
            maxLength={6}
            value={weightStr}
            onChangeText={(v) => {
              setWeightStr(v);
              setErrors((prev) => ({ ...prev, weightKg: undefined }));
            }}
            onBlur={() => {
              if (!weightStr.trim()) return;
              const r = validateWeight(weightStr);
              if (r.error) setErrors((prev) => ({ ...prev, weightKg: r.error }));
            }}
            helper={`${WEIGHT_MIN}~${WEIGHT_MAX}kg, 소수 1자리까지`}
            error={errors.weightKg}
          />

          <RadioGroup<ActivityLevel>
            label="활동량 (선택)"
            helper="입력 시 더 정확한 권장량을 계산해 드려요."
            error={errors.activityLevel}
            options={ACTIVITY_OPTIONS}
            value={activityLevel}
            onChange={(v) => {
              setActivityLevel(v);
              setErrors((prev) => ({ ...prev, activityLevel: undefined }));
            }}
          />

          <ReferenceWeightCard data={refData} loading={refLoading} error={refError} />

          <RadioGroup<Goal>
            label="목표 (선택)"
            error={errors.goal}
            options={GOAL_OPTIONS}
            value={goal}
            onChange={(v) => {
              setGoal(v);
              setErrors((prev) => ({ ...prev, goal: undefined }));
            }}
          />

          <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
            프로필 정보는 권장량 계산에만 사용됩니다.
          </Text>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: t.colors.bg,
              borderTopColor: t.colors.border,
              paddingHorizontal: t.spacing.lg,
              paddingTop: t.spacing.md,
              paddingBottom: bottomInset + t.spacing.md,
              gap: t.spacing.sm,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => void onSubmit()}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: t.colors.primary,
                borderRadius: t.radius.md,
                opacity: busy ? 0.7 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={t.colors.primaryFg} />
                <Text style={{ color: t.colors.primaryFg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
                  저장하고 있어요
                </Text>
              </View>
            ) : (
              <Text style={{ color: t.colors.primaryFg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
                다음
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={onSkip}
            style={styles.skipBtn}
          >
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>나중에 설정</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {},
  footer: {
    borderTopWidth: 1,
  },
  primaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: { paddingVertical: 8, alignItems: 'center' },
});
