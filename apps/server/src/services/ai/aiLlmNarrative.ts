import { isAiEnabled, LLM_MODEL, LLM_PROVIDER } from '../../lib/aiConfig.js';
import { ollamaChat } from '../llm/ollamaClient.js';
import type { AiAggregateResult } from './aiMealAggregate.js';
import type { StatsQueryPlan } from './aiIntent.js';
import type { MealPatternAnalysis } from './aiMealPatterns.js';
import { buildTemplateAskAnswer, buildTemplateWeeklySummary } from './aiTemplateAnswer.js';

const NARRATIVE_SYSTEM =
  'You are a Korean nutrition assistant. Use ONLY provided JSON facts. Do not diagnose or prescribe treatment. Use phrasing like "기록 기준으로는 …". Max 5 sentences.';

export type LlmMeta = {
  provider: string;
  model: string;
  used: boolean;
};

function numbersInText(text: string): number[] {
  const matches = text.match(/\d+(\.\d+)?/g) ?? [];
  return matches.map(Number).filter((n) => n > 5);
}

/** LLM 본문에 집계와 무관한 큰 수치가 있으면 환각으로 간주 */
function answerLooksHallucinated(answer: string, agg: AiAggregateResult): boolean {
  const { summary } = agg.computed;
  const allowed = new Set(
    [
      summary.protein,
      summary.calories,
      summary.carbohydrate,
      summary.fat,
      agg.computed.goalComparison?.proteinGoalG,
      agg.computed.goalComparison?.calorieGoalKcal,
      Math.abs(agg.computed.goalComparison?.proteinAvgGapG ?? 0),
    ].filter((n): n is number => n != null && !Number.isNaN(n)),
  );
  for (const n of numbersInText(answer)) {
    const near = [...allowed].some((a) => Math.abs(a - n) <= Math.max(2, a * 0.15));
    if (!near && n > 20) return true;
  }
  return false;
}

export async function narrateAskAnswer(
  question: string,
  plan: StatsQueryPlan,
  agg: AiAggregateResult,
): Promise<{ answer: string; llm: LlmMeta }> {
  const template = buildTemplateAskAnswer(question, plan, agg);
  const llmBase: LlmMeta = { provider: LLM_PROVIDER, model: LLM_MODEL, used: false };

  if (!isAiEnabled()) {
    return { answer: template, llm: llmBase };
  }

  const { summary, goalComparison, period, mealCount } = agg.computed;
  const system = `You are a Korean nutrition assistant. Use ONLY the provided numbers. Do not invent meals or stats. Be concise (3-5 sentences).`;
  const user = JSON.stringify({
    question,
    period: period.label,
    mealCount,
    summary,
    goalComparison,
  });

  try {
    const result = await ollamaChat([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    if (answerLooksHallucinated(result.content, agg)) {
      return { answer: template, llm: llmBase };
    }
    return {
      answer: `${result.content.trim()}\n\n본 답변은 추정 권장값·일반 정보이며, 의료 진단·치료·처방을 대체하지 않습니다.`,
      llm: { provider: LLM_PROVIDER, model: result.model, used: true },
    };
  } catch {
    return { answer: template, llm: llmBase };
  }
}

function buildTemplateFromPatterns(agg: AiAggregateResult, analysis: MealPatternAnalysis): string {
  if (agg.computed.mealCount === 0) {
    return '이번 기간 식단 기록이 없습니다. 기록을 추가하면 맞춤 리포트를 확인할 수 있습니다.';
  }
  const lines = analysis.patterns.map((p) => p.detail);
  const head = `${agg.computed.period.label} 기록 기준 요약입니다.`;
  return lines.length ? `${head} ${lines.join(' ')}` : buildTemplateWeeklySummary(agg, analysis.nextGoals);
}

export async function narrateWeeklySummary(
  agg: AiAggregateResult,
  analysis: MealPatternAnalysis,
): Promise<{ summaryText: string; llm: LlmMeta }> {
  const template = buildTemplateFromPatterns(agg, analysis);
  const llmBase: LlmMeta = { provider: LLM_PROVIDER, model: LLM_MODEL, used: false };
  if (!isAiEnabled() || agg.computed.mealCount === 0) {
    return { summaryText: template, llm: llmBase };
  }
  try {
    const result = await ollamaChat([
      { role: 'system', content: NARRATIVE_SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          period: agg.computed.period.label,
          keyMetrics: analysis.keyMetrics,
          patterns: analysis.patterns,
          summary: agg.computed.summary,
        }),
      },
    ]);
    if (answerLooksHallucinated(result.content, agg)) {
      return { summaryText: template, llm: llmBase };
    }
    return {
      summaryText: result.content.trim(),
      llm: { provider: LLM_PROVIDER, model: result.model, used: true },
    };
  } catch {
    return { summaryText: template, llm: llmBase };
  }
}

export async function narrateMonthlySummary(
  agg: AiAggregateResult,
  analysis: MealPatternAnalysis,
): Promise<{ summaryText: string; llm: LlmMeta }> {
  const template = buildTemplateFromPatterns(agg, analysis);
  const llmBase: LlmMeta = { provider: LLM_PROVIDER, model: LLM_MODEL, used: false };
  if (!isAiEnabled() || agg.computed.mealCount === 0) {
    return { summaryText: template, llm: llmBase };
  }
  try {
    const result = await ollamaChat([
      { role: 'system', content: NARRATIVE_SYSTEM + ' Focus on monthly habits and trends vs previous period.' },
      {
        role: 'user',
        content: JSON.stringify({
          period: agg.computed.period.label,
          keyMetrics: analysis.keyMetrics,
          patterns: analysis.patterns,
          comparison: analysis.comparison,
          breakfastSkipByWeekday: analysis.breakfastSkipByWeekday,
          summary: agg.computed.summary,
        }),
      },
    ]);
    if (answerLooksHallucinated(result.content, agg)) {
      return { summaryText: template, llm: llmBase };
    }
    return {
      summaryText: result.content.trim(),
      llm: { provider: LLM_PROVIDER, model: result.model, used: true },
    };
  } catch {
    return { summaryText: template, llm: llmBase };
  }
}
