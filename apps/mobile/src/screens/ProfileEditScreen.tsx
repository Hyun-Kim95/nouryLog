import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { Field } from '../components/Field';
import { Segmented } from '../components/Segmented';
import { RadioGroup } from '../components/RadioGroup';
import { Banner, Card, CardTitle } from '../components/ui';
import {
  ProfileApiError,
  getProfile,
  isAuthDenied,
  recalcRecommendation,
  saveProfile,
  type ActivityLevel,
  type Gender,
  type Goal,
  type SaveProfileInput,
  type WarningCode,
} from '../api/profile';
import { clearTokens, getAccessToken } from '../authStorage';
import { useDevToggles } from '../dev/devToggles';
import { useToast } from '../toast/useToast';
import {
  OVERRIDE_CALORIE_HINT_MAX,
  OVERRIDE_CALORIE_HINT_MIN,
  OVERRIDE_COPY,
  OVERRIDE_PROTEIN_HINT_MAX,
  OVERRIDE_PROTEIN_HINT_MIN,
  RECOMMENDATION_COPY,
  WARNING_COPY,
  sortedWarnings,
} from '../copy/recommendation';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;

type FieldKey = 'gender' | 'age' | 'heightCm' | 'weightKg' | 'activityLevel' | 'goal';

const AGE_MIN = 13;
const AGE_MAX = 99;
const HEIGHT_MIN = 100;
const HEIGHT_MAX = 250;
const WEIGHT_MIN = 20;
const WEIGHT_MAX = 300;

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: '거의 없음', description: '거의 앉아서 생활' },
  { value: 'light', label: '가벼움', description: '가벼운 산책·집안일' },
  { value: 'moderate', label: '보통', description: '주 3~4회 운동' },
  { value: 'active', label: '활동적', description: '주 5회 이상 강한 운동' },
];

const GOAL_OPTIONS: { value: Goal; label: string; description: string }[] = [
  { value: 'lose', label: '감량', description: '현재 체중 대비 −10%' },
  { value: 'maintain', label: '유지', description: '현재 체중 유지' },
  { value: 'gain', label: '증량', description: '현재 체중 대비 +10%' },
];

type FormState = {
  gender: Gender | null;
  ageStr: string;
  heightStr: string;
  weightStr: string;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
};

const EMPTY: FormState = {
  gender: null,
  ageStr: '',
  heightStr: '',
  weightStr: '',
  activityLevel: null,
  goal: null,
};

function parseInteger(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

function parseDecimal(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function ProfileEditScreen({ navigation }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const dev = useDevToggles();
  const toast = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [initial, setInitial] = useState<FormState>(EMPTY);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [recommendation, setRecommendation] = useState<{
    proteinGoalG?: number;
    calorieGoalKcal?: number;
    warnings?: WarningCode[];
    recommendationVersion?: string;
  }>({});
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Phase T — override 입력 모드. 영속화하지 않으며 매 진입 시 OFF로 시작.
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [proteinOverrideStr, setProteinOverrideStr] = useState('');
  const [calorieOverrideStr, setCalorieOverrideStr] = useState('');
  const [overrideErrors, setOverrideErrors] = useState<{
    protein?: string;
    calorie?: string;
  }>({});

  useEffect(() => {
    void (async () => {
      const tk = await getAccessToken();
      if (!tk) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setToken(tk);
      try {
        const me = await getProfile(tk);
        const next: FormState = {
          gender: me.gender,
          ageStr: String(me.age),
          heightStr: String(me.heightCm),
          weightStr: String(me.weightKg),
          activityLevel: me.activityLevel,
          goal: me.goal,
        };
        setInitial(next);
        setForm(next);
        setRecommendation({
          proteinGoalG: me.proteinGoalG,
          calorieGoalKcal: me.calorieGoalKcal,
          warnings: me.warnings,
          recommendationVersion: me.recommendationVersion,
        });
      } catch (e) {
        if (e instanceof ProfileApiError && isAuthDenied(e)) {
          await clearTokens();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }
        setBanner('프로필을 불러오지 못했어요. 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  const formDirty = useMemo(() => {
    return (
      form.gender !== initial.gender ||
      form.ageStr !== initial.ageStr ||
      form.heightStr !== initial.heightStr ||
      form.weightStr !== initial.weightStr ||
      form.activityLevel !== initial.activityLevel ||
      form.goal !== initial.goal
    );
  }, [form, initial]);

  // Phase T — override 토글이 켜져 있으면 항상 저장 가능 의도로 본다.
  const dirty = formDirty || overrideEnabled;

  const onToggleOverride = useCallback(
    (next: boolean) => {
      setOverrideEnabled(next);
      setOverrideErrors({});
      if (next) {
        const p = recommendation.proteinGoalG;
        const c = recommendation.calorieGoalKcal;
        setProteinOverrideStr(typeof p === 'number' ? String(p) : '');
        setCalorieOverrideStr(typeof c === 'number' ? String(c) : '');
      }
    },
    [recommendation.proteinGoalG, recommendation.calorieGoalKcal],
  );

  const goBackWithGuard = useCallback(() => {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert('변경 사항을 저장하지 않고 나갈까요?', undefined, [
      { text: '계속 편집', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }, [dirty, navigation]);

  const validate = useCallback((): {
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
    if (!form.gender) next.gender = '성별을 선택해 주세요.';
    const age = parseInteger(form.ageStr);
    if (age === null) next.age = '나이는 숫자만 입력해 주세요.';
    else if (age < AGE_MIN || age > AGE_MAX) next.age = `나이는 ${AGE_MIN}세 이상 ${AGE_MAX}세 이하이어야 합니다.`;
    const height = parseInteger(form.heightStr);
    if (height === null) next.heightCm = '신장은 숫자만 입력해 주세요.';
    else if (height < HEIGHT_MIN || height > HEIGHT_MAX) next.heightCm = `신장은 ${HEIGHT_MIN}~${HEIGHT_MAX}cm 범위로 입력해 주세요.`;
    const weight = parseDecimal(form.weightStr);
    if (weight === null) next.weightKg = '체중은 숫자(소수 1자리까지)만 입력해 주세요.';
    else if (weight < WEIGHT_MIN || weight > WEIGHT_MAX) next.weightKg = `체중은 ${WEIGHT_MIN}~${WEIGHT_MAX}kg 범위로 입력해 주세요.`;
    if (Object.keys(next).length > 0) return { ok: false, errors: next };
    return {
      ok: true,
      errors: {},
      values: {
        gender: form.gender as Gender,
        age: age as number,
        heightCm: height as number,
        weightKg: Math.round(weight as number),
        activityLevel: form.activityLevel,
        goal: form.goal,
      },
    };
  }, [form]);

  const validateOverride = useCallback((): {
    ok: boolean;
    errors: { protein?: string; calorie?: string };
    values?: { proteinGoalG: number; calorieGoalKcal: number };
  } => {
    const next: { protein?: string; calorie?: string } = {};
    const p = parseInteger(proteinOverrideStr);
    if (p === null) next.protein = '단백질 목표는 정수만 입력해 주세요.';
    else if (p < OVERRIDE_PROTEIN_HINT_MIN || p > OVERRIDE_PROTEIN_HINT_MAX)
      next.protein = `단백질 목표는 ${OVERRIDE_PROTEIN_HINT_MIN}~${OVERRIDE_PROTEIN_HINT_MAX} g 범위로 입력해 주세요.`;
    const c = parseInteger(calorieOverrideStr);
    if (c === null) next.calorie = '칼로리 목표는 정수만 입력해 주세요.';
    else if (c < OVERRIDE_CALORIE_HINT_MIN || c > OVERRIDE_CALORIE_HINT_MAX)
      next.calorie = `칼로리 목표는 ${OVERRIDE_CALORIE_HINT_MIN}~${OVERRIDE_CALORIE_HINT_MAX} kcal 범위로 입력해 주세요.`;
    if (Object.keys(next).length > 0) return { ok: false, errors: next };
    return { ok: true, errors: {}, values: { proteinGoalG: p as number, calorieGoalKcal: c as number } };
  }, [proteinOverrideStr, calorieOverrideStr]);

  const onResetToAuto = useCallback(async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const r = await recalcRecommendation(token, { __forceFail: dev.forceRecalcFail });
      setRecommendation({
        proteinGoalG: r.proteinGoalG,
        calorieGoalKcal: r.calorieGoalKcal,
        warnings: r.warnings,
        recommendationVersion: r.recommendationVersion,
      });
      setOverrideEnabled(false);
      setOverrideErrors({});
      toast.show({ kind: 'success', message: OVERRIDE_COPY.resetSuccess });
    } catch (e) {
      if (e instanceof ProfileApiError && isAuthDenied(e)) {
        await clearTokens();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      toast.show({ kind: 'info', message: '권장량을 다시 계산하지 못했어요. 잠시 후 다시 시도하세요.' });
    } finally {
      setBusy(false);
    }
  }, [token, busy, dev.forceRecalcFail, navigation, toast]);

  const onSave = useCallback(async () => {
    if (!token || busy || !dirty) return;
    setBanner(null);
    const v = validate();
    if (!v.ok || !v.values) {
      setErrors(v.errors);
      return;
    }
    setErrors({});

    let overrideValues: { proteinGoalG: number; calorieGoalKcal: number } | null = null;
    if (overrideEnabled) {
      const ov = validateOverride();
      if (!ov.ok || !ov.values) {
        setOverrideErrors(ov.errors);
        return;
      }
      setOverrideErrors({});
      overrideValues = ov.values;
    }

    setBusy(true);
    try {
      const diff: SaveProfileInput = {};
      if (form.gender !== initial.gender) diff.gender = v.values.gender;
      if (form.ageStr !== initial.ageStr) diff.age = v.values.age;
      if (form.heightStr !== initial.heightStr) diff.heightCm = v.values.heightCm;
      if (form.weightStr !== initial.weightStr) diff.weightKg = v.values.weightKg;
      if (form.activityLevel !== initial.activityLevel) diff.activityLevel = v.values.activityLevel;
      if (form.goal !== initial.goal) diff.goal = v.values.goal;
      if (overrideValues) {
        diff.proteinGoalG = overrideValues.proteinGoalG;
        diff.calorieGoalKcal = overrideValues.calorieGoalKcal;
      }
      await saveProfile(token, diff, { __forceFail: dev.force5xx });

      if (overrideValues) {
        // override 저장: 자동 recalc은 호출하지 않는다. 카드 수치는 입력값으로 즉시 갱신.
        setRecommendation((prev) => ({
          ...prev,
          proteinGoalG: overrideValues!.proteinGoalG,
          calorieGoalKcal: overrideValues!.calorieGoalKcal,
        }));
        toast.show({ kind: 'success', message: OVERRIDE_COPY.saveSuccess });
      } else {
        try {
          const r = await recalcRecommendation(token, { __forceFail: dev.forceRecalcFail });
          setRecommendation({
            proteinGoalG: r.proteinGoalG,
            calorieGoalKcal: r.calorieGoalKcal,
            warnings: r.warnings,
            recommendationVersion: r.recommendationVersion,
          });
        } catch (recalcErr) {
          if (__DEV__) console.warn('recalc failed', recalcErr);
        }
        toast.show({ kind: 'success', message: RECOMMENDATION_COPY.onboardingDone });
      }

      setTimeout(() => navigation.goBack(), 100);
    } catch (e) {
      if (e instanceof ProfileApiError) {
        if (isAuthDenied(e)) {
          await clearTokens();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
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
          if (e.field === 'proteinGoalG') {
            setOverrideErrors((prev) => ({ ...prev, protein: e.message }));
          } else if (e.field === 'calorieGoalKcal') {
            setOverrideErrors((prev) => ({ ...prev, calorie: e.message }));
          } else {
            const target = map[e.field];
            if (target) setErrors({ [target]: e.message });
          }
          setBanner(e.message);
          toast.show({ kind: 'error', message: e.message });
        } else {
          setBanner(e.message);
          toast.show({ kind: 'error', message: e.message });
        }
      } else {
        const msg = '네트워크 오류로 저장하지 못했어요. 다시 시도해 주세요.';
        setBanner(msg);
        toast.show({ kind: 'error', message: msg });
      }
    } finally {
      setBusy(false);
    }
  }, [
    token,
    busy,
    dirty,
    validate,
    validateOverride,
    overrideEnabled,
    navigation,
    dev.force5xx,
    dev.forceRecalcFail,
    form,
    initial,
    toast,
  ]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [keyToFieldKey(key)]: undefined }));
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.colors.bg }]} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.lg,
            paddingBottom: t.spacing.xxl + 96,
            gap: t.spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {banner ? (
            <Banner variant="danger">{banner}</Banner>
          ) : null}

          {loading ? (
            <View style={{ paddingVertical: t.spacing.xxl, alignItems: 'center' }}>
              <ActivityIndicator color={t.colors.primary} />
              <Text style={{ color: t.colors.fgMuted, marginTop: t.spacing.sm, fontSize: t.fontSize.body }}>
                프로필을 불러오는 중…
              </Text>
            </View>
          ) : (
            <>
              <Segmented<Gender>
                label="성별"
                required
                error={errors.gender}
                options={[
                  { value: 'male', label: '남성' },
                  { value: 'female', label: '여성' },
                  { value: 'unspecified', label: '응답하지 않음' },
                ]}
                value={form.gender}
                onChange={(v) => setField('gender', v)}
              />

              <Field
                label="나이"
                required
                suffix="세"
                placeholder="예: 28"
                keyboardType="number-pad"
                maxLength={2}
                value={form.ageStr}
                onChangeText={(v) => setField('ageStr', v)}
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
                value={form.heightStr}
                onChangeText={(v) => setField('heightStr', v)}
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
                value={form.weightStr}
                onChangeText={(v) => setField('weightStr', v)}
                helper={`${WEIGHT_MIN}~${WEIGHT_MAX}kg, 소수 1자리까지`}
                error={errors.weightKg}
              />

              <RadioGroup<ActivityLevel>
                label="활동량 (선택)"
                helper="입력 시 더 정확한 권장량을 계산해 드려요."
                error={errors.activityLevel}
                options={ACTIVITY_OPTIONS}
                value={form.activityLevel}
                onChange={(v) => setField('activityLevel', v)}
              />

              <RadioGroup<Goal>
                label="목표 (선택)"
                helper="현재 체중 대비 권장 칼로리를 가감합니다."
                error={errors.goal}
                options={GOAL_OPTIONS}
                value={form.goal}
                onChange={(v) => setField('goal', v)}
              />

              <Card style={{ backgroundColor: t.colors.surface2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <CardTitle>현재 권장량 (자동 계산)</CardTitle>
                  <Text
                    accessibilityLabel={`권장 계산 버전 ${RECOMMENDATION_COPY.versionTag}`}
                    style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}
                  >
                    {RECOMMENDATION_COPY.versionTag}
                  </Text>
                </View>
                <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
                  단백질 {recommendation.proteinGoalG ?? '—'} g · 칼로리{' '}
                  {recommendation.calorieGoalKcal ?? '—'} kcal
                </Text>
                <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
                  저장 시 자동으로 다시 계산됩니다.
                </Text>
                <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
                  {RECOMMENDATION_COPY.estimate}
                </Text>
                {sortedWarnings(recommendation.warnings).map((w) => (
                  <Text
                    key={w}
                    accessibilityRole="text"
                    style={{ color: t.colors.warn, fontSize: t.fontSize.caption, fontWeight: '700' }}
                  >
                    {WARNING_COPY[w]}
                  </Text>
                ))}

                <View
                  style={{
                    height: 1,
                    backgroundColor: t.colors.border,
                    marginVertical: t.spacing.xs,
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: t.spacing.sm,
                  }}
                >
                  <Text
                    accessibilityRole="text"
                    style={{ color: t.colors.fg, fontSize: t.fontSize.body, fontWeight: '600', flex: 1 }}
                  >
                    {OVERRIDE_COPY.toggleLabel}
                  </Text>
                  <Switch
                    accessibilityRole="switch"
                    accessibilityLabel={OVERRIDE_COPY.toggleLabel}
                    accessibilityState={{ checked: overrideEnabled }}
                    value={overrideEnabled}
                    onValueChange={onToggleOverride}
                    trackColor={{ false: t.colors.border, true: t.colors.primary }}
                    thumbColor={t.colors.surface}
                  />
                </View>
                <Text
                  accessibilityRole="text"
                  style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}
                >
                  {overrideEnabled ? OVERRIDE_COPY.toggleHelperOn : OVERRIDE_COPY.toggleHelperOff}
                </Text>

                {overrideEnabled ? (
                  <View style={{ gap: t.spacing.sm, marginTop: t.spacing.xs }}>
                    <Field
                      label={OVERRIDE_COPY.proteinLabel}
                      suffix="g"
                      placeholder="예: 80"
                      keyboardType="number-pad"
                      maxLength={3}
                      value={proteinOverrideStr}
                      onChangeText={(v) => {
                        setProteinOverrideStr(v);
                        if (overrideErrors.protein) setOverrideErrors((p) => ({ ...p, protein: undefined }));
                      }}
                      helper={OVERRIDE_COPY.proteinHelper}
                      error={overrideErrors.protein}
                    />
                    <Field
                      label={OVERRIDE_COPY.calorieLabel}
                      suffix="kcal"
                      placeholder="예: 2200"
                      keyboardType="number-pad"
                      maxLength={5}
                      value={calorieOverrideStr}
                      onChangeText={(v) => {
                        setCalorieOverrideStr(v);
                        if (overrideErrors.calorie) setOverrideErrors((p) => ({ ...p, calorie: undefined }));
                      }}
                      helper={OVERRIDE_COPY.calorieHelper}
                      error={overrideErrors.calorie}
                    />
                    <Text
                      accessibilityRole="text"
                      style={{ color: t.colors.warn, fontSize: t.fontSize.caption, fontWeight: '700' }}
                    >
                      {RECOMMENDATION_COPY.medicalGeneric}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={OVERRIDE_COPY.resetButton}
                      accessibilityState={{ disabled: busy }}
                      disabled={busy}
                      onPress={() => void onResetToAuto()}
                      style={({ pressed }) => ({
                        paddingVertical: t.spacing.xs,
                        opacity: busy ? 0.5 : pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ color: t.colors.primary, fontSize: t.fontSize.caption, fontWeight: '600' }}>
                        {OVERRIDE_COPY.resetButton}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: t.colors.bg,
              borderTopColor: t.colors.border,
              paddingHorizontal: t.spacing.lg,
              paddingTop: t.spacing.md,
              paddingBottom: Math.max(insets.bottom, t.spacing.md),
              gap: t.spacing.sm,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !dirty || busy || loading }}
            disabled={!dirty || busy || loading}
            onPress={() => void onSave()}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: t.colors.primary,
                borderRadius: t.radius.md,
                opacity: !dirty || busy || loading ? 0.5 : pressed ? 0.85 : 1,
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
                저장
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={goBackWithGuard}
            style={styles.skipBtn}
          >
            <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>취소</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function keyToFieldKey(k: keyof FormState): FieldKey {
  if (k === 'ageStr') return 'age';
  if (k === 'heightStr') return 'heightCm';
  if (k === 'weightStr') return 'weightKg';
  return k as FieldKey;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  footer: { borderTopWidth: 1 },
  primaryBtn: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { paddingVertical: 8, alignItems: 'center' },
});
