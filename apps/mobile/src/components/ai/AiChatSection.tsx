import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../api';
import type { AiAskResponse, CoachSummaryResponse } from '../../api/ai';
import { AI_COPY, aiIntentLabel } from '../../copy/ai';
import { useTheme } from '../../theme';
import { Banner, Card, CardTitle, PrimaryButton } from '../ui';

type Props = {
  summary: CoachSummaryResponse | null;
  summaryLoading: boolean;
  onAsk: (question: string) => Promise<AiAskResponse>;
  onRateLimit: () => void;
  onAskError: (message: string) => void;
};

export function AiChatSection({
  summary,
  summaryLoading,
  onAsk,
  onRateLimit,
  onAskError,
}: Props) {
  const t = useTheme();
  const submittingRef = useRef(false);
  const [question, setQuestion] = useState('');
  const [chipHint, setChipHint] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [result, setResult] = useState<AiAskResponse | null>(null);

  const suggested = summary?.suggestedQuestions ?? [];

  useEffect(() => {
    const first = summary?.suggestedQuestions[0]?.question;
    if (first) {
      setQuestion((prev) => (prev.trim() ? prev : first));
    }
  }, [summary]);

  const submit = async () => {
    const q = question.trim();
    if (!q || submittingRef.current) return;
    submittingRef.current = true;
    setAskLoading(true);
    try {
      const res = await onAsk(q);
      setResult(res);
    } catch (e: unknown) {
      const err = e instanceof ApiError ? e : null;
      if (err && (err.status === 429 || err.code === 'AI_RATE_LIMIT')) {
        onRateLimit();
      } else {
        onAskError(err?.message ?? (e instanceof Error ? e.message : AI_COPY.askError));
      }
    } finally {
      setAskLoading(false);
      submittingRef.current = false;
    }
  };

  const lastQuestion = question.trim();

  return (
    <View style={{ gap: t.spacing.md }}>
      <Card>
        <CardTitle>{AI_COPY.askSectionTitle}</CardTitle>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={AI_COPY.askPlaceholder}
          placeholderTextColor={t.colors.fgMuted}
          multiline
          maxLength={500}
          editable={!askLoading}
          style={{
            marginTop: t.spacing.sm,
            minHeight: 88,
            borderWidth: 1,
            borderColor: t.colors.border,
            borderRadius: t.radius.md,
            padding: t.spacing.md,
            color: t.colors.fg,
            fontSize: t.fontSize.body,
            textAlignVertical: 'top',
          }}
        />
        {suggested.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, marginTop: t.spacing.sm }}>
            {suggested.map((item) => (
              <Pressable
                key={item.label}
                disabled={askLoading}
                onPress={() => {
                  setQuestion(item.question);
                  setChipHint(item.intentHint ? aiIntentLabel(item.intentHint) : null);
                }}
                style={{
                  paddingHorizontal: t.spacing.md,
                  paddingVertical: t.spacing.xs,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: t.colors.primary,
                  backgroundColor: t.colors.surface2,
                }}
              >
                <Text style={{ color: t.colors.primary, fontSize: t.fontSize.caption, fontWeight: '700' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {chipHint ? (
          <View style={{ marginTop: t.spacing.sm }}>
            <Banner variant="info">{AI_COPY.expectedIntent(chipHint)}</Banner>
          </View>
        ) : null}
        <View style={{ marginTop: t.spacing.md }}>
          <PrimaryButton
            title={askLoading ? AI_COPY.askSubmitting : AI_COPY.askSubmit}
            onPress={() => void submit()}
            disabled={askLoading || !question.trim() || summaryLoading}
          />
        </View>
      </Card>

      {result ? (
        <View style={{ gap: t.spacing.sm }}>
          {result.intent === 'unknown' ? (
            <Banner variant="info">{AI_COPY.unknownIntentNote}</Banner>
          ) : aiIntentLabel(result.intent) ? (
            <Banner variant="info">{AI_COPY.answerIntent(aiIntentLabel(result.intent)!)}</Banner>
          ) : null}
          {!result.llm.used ? <Banner variant="info">{AI_COPY.answerNoLlm}</Banner> : null}
          {result.computed?.mealCount === 0 ? <Banner variant="info">{AI_COPY.answerNoMeals}</Banner> : null}

          <View
            style={{
              alignSelf: 'flex-end',
              maxWidth: '92%',
              backgroundColor: t.colors.surface2,
              borderWidth: 1,
              borderColor: t.colors.primary,
              borderRadius: t.radius.lg,
              padding: t.spacing.md,
            }}
          >
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body }}>{lastQuestion}</Text>
          </View>

          <View
            style={{
              alignSelf: 'flex-start',
              maxWidth: '92%',
              backgroundColor: t.colors.surface,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.lg,
              padding: t.spacing.md,
              gap: t.spacing.sm,
            }}
          >
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.body, lineHeight: 22 }}>{result.answer}</Text>
            {result.citations.length > 0 ? (
              <>
                <Text style={{ color: t.colors.fg, fontWeight: '700', fontSize: t.fontSize.body }}>
                  {AI_COPY.citationsTitle}
                </Text>
                {result.citations.map((c, i) => (
                  <Text key={`${c.type}-${i}`} style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>
                    · {c.label}
                  </Text>
                ))}
              </>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
