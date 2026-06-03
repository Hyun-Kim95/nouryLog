import { Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { CoachSummaryResponse } from '../../api/ai';
import { AI_COPY } from '../../copy/ai';
import type { RootStackParamList } from '../../navigation';
import { useTheme } from '../../theme';
import { Banner, Card, CardTitle, Chip, PrimaryButton } from '../ui';
import { MacroBarRow } from './MacroBarRow';

type Props = {
  summary: CoachSummaryResponse | null;
  loading: boolean;
};

function KpiCell({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: number;
  unit: string;
  hint?: string;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        minWidth: 120,
        padding: t.spacing.sm,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.surface2,
      }}
    >
      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{label}</Text>
      <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
        {Math.round(value)}
        <Text style={{ fontSize: t.fontSize.caption, fontWeight: '400' }}> {unit}</Text>
      </Text>
      {hint ? (
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginTop: 2 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function CoachDashboard({ summary, loading }: Props) {
  const t = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (loading) {
    return (
      <View style={{ gap: t.spacing.md }}>
        <Card>
          <Text style={{ color: t.colors.fgMuted }}>{AI_COPY.loading}</Text>
        </Card>
      </View>
    );
  }

  if (!summary) return null;

  const emptyWeek = summary.week.mealCount === 0;
  const gcWeek = summary.week.goalComparison;
  const gcToday = summary.today.goalComparison;
  const ga = summary.week.goalAchievement;

  if (emptyWeek) {
    return (
      <Card>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, marginBottom: t.spacing.sm }}>
          {summary.insight.text}
        </Text>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body, marginBottom: t.spacing.md }}>
          {AI_COPY.emptyWeekHint}
        </Text>
        <PrimaryButton
          title={AI_COPY.emptyWeekCta}
          onPress={() => navigation.navigate('Main', { screen: 'Log' })}
        />
      </Card>
    );
  }

  return (
    <View style={{ gap: t.spacing.md }}>
      <Card>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, marginBottom: t.spacing.xs }}>
          {summary.week.period.label} · {AI_COPY.weekMeta(summary.week.recordedDays, summary.week.mealCount)}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          {ga.proteinShortDays > 0 ? (
            <Chip label={AI_COPY.proteinShortChip(ga.proteinShortDays)} tone="muted" />
          ) : (
            <Chip label={AI_COPY.proteinOkChip} />
          )}
          {ga.calorieShortDays > 0 ? <Chip label={AI_COPY.calorieShortChip(ga.calorieShortDays)} tone="muted" /> : null}
        </View>
      </Card>

      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '600' }}>
        {AI_COPY.todaySection(summary.today.period.label)}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
        <KpiCell
          label={AI_COPY.calorie}
          value={summary.today.summary.calories}
          unit={AI_COPY.kcalUnit}
          hint={
            gcToday
              ? AI_COPY.goalLine(gcToday.calorieGoalKcal, gcToday.calorieMet, ` ${AI_COPY.kcalUnit}`)
              : undefined
          }
        />
        <KpiCell
          label={AI_COPY.protein}
          value={summary.today.summary.protein}
          unit="g"
          hint={gcToday ? AI_COPY.goalLine(gcToday.proteinGoalG, gcToday.proteinMet, 'g') : undefined}
        />
      </View>

      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, fontWeight: '600' }}>
        {AI_COPY.weekAvgSection}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
        <KpiCell label={AI_COPY.calorie} value={summary.week.summary.calories} unit={AI_COPY.kcalUnit} />
        <KpiCell label={AI_COPY.protein} value={summary.week.summary.protein} unit="g" />
        <KpiCell label={AI_COPY.carb} value={summary.week.summary.carbohydrate} unit="g" />
        <KpiCell label={AI_COPY.fat} value={summary.week.summary.fat} unit="g" />
      </View>
      {gcWeek ? (
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
          {AI_COPY.weekGoalLine(gcWeek.proteinMet, Math.round(gcWeek.proteinAvgGapG), gcWeek.calorieMet)}
        </Text>
      ) : null}

      <Card>
        <CardTitle>{AI_COPY.insightTitle}</CardTitle>
        <Banner variant="info">{AI_COPY.insightTemplateNote}</Banner>
        <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 22, marginTop: t.spacing.sm }}>
          {summary.insight.text}
        </Text>
      </Card>

      <Card>
        <CardTitle>{AI_COPY.macroTitle}</CardTitle>
        <View style={{ gap: t.spacing.sm, marginTop: t.spacing.sm }}>
          <MacroBarRow label={AI_COPY.carb} pct={summary.week.macroBreakdown.carbPct} />
          <MacroBarRow label={AI_COPY.protein} pct={summary.week.macroBreakdown.proteinPct} />
          <MacroBarRow label={AI_COPY.fat} pct={summary.week.macroBreakdown.fatPct} />
        </View>
      </Card>

      {summary.evidenceMeals.length > 0 ? (
        <Card>
          <CardTitle>{AI_COPY.evidenceTitle}</CardTitle>
          {summary.evidenceMeals.map((m) => (
            <Text
              key={m.mealId}
              style={{ color: t.colors.fg, fontSize: t.fontSize.body, marginTop: t.spacing.xs }}
            >
              · {m.label}
            </Text>
          ))}
        </Card>
      ) : null}

      {summary.frequentFoods.length > 0 ? (
        <Card>
          <CardTitle>{AI_COPY.frequentTitle}</CardTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, marginTop: t.spacing.sm }}>
            {summary.frequentFoods.map((f) => (
              <Chip key={f.name} label={AI_COPY.frequentCount(f.name, f.count)} tone="muted" />
            ))}
          </View>
        </Card>
      ) : null}

      <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption, lineHeight: 18 }}>
        {summary.disclaimer}
      </Text>
    </View>
  );
}
