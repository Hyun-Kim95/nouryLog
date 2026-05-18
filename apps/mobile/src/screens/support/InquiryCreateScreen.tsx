import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createInquiry } from '../../api/inquiries';
import { isAuthDenied } from '../../api';
import { ensureAccessToken } from '../../authSession';
import { Banner, PrimaryButton, ScreenLayout } from '../../components/ui';
import type { RootStackParamList } from '../../navigation';
import { useTheme } from '../../theme';
import { useToast } from '../../toast/useToast';

type Props = NativeStackScreenProps<RootStackParamList, 'InquiryCreate'>;

export function InquiryCreateScreen({ navigation }: Props) {
  const t = useTheme();
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inputStyle = {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    color: t.colors.fg,
    fontSize: t.fontSize.body,
    backgroundColor: t.colors.surface,
  };

  const onSubmit = () => {
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) {
      setErr('제목과 내용을 입력해 주세요.');
      return;
    }
    setErr(null);
    setSubmitting(true);
    void (async () => {
      try {
        const token = await ensureAccessToken();
        if (!token) return;
        const created = await createInquiry(token, { subject: s, body: b });
        toast.show({ kind: 'success', message: '문의를 접수했어요.' });
        navigation.replace('InquiryDetail', { id: created.id });
      } catch (e) {
        if (isAuthDenied(e)) return;
        setErr(e instanceof Error ? e.message : '문의 접수에 실패했어요.');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <ScreenLayout scroll>
      {err ? <Banner variant="danger">{err}</Banner> : null}
      <View style={{ gap: t.spacing.sm }}>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>제목</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="문의 제목"
          placeholderTextColor={t.colors.fgSubtle}
          maxLength={200}
          style={inputStyle}
        />
      </View>
      <View style={{ gap: t.spacing.sm }}>
        <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>내용</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="문의 내용을 입력해 주세요"
          placeholderTextColor={t.colors.fgSubtle}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          maxLength={4000}
          style={[inputStyle, { minHeight: 160 }]}
        />
      </View>
      <PrimaryButton title="문의 접수" onPress={onSubmit} loading={submitting} disabled={submitting} />
    </ScreenLayout>
  );
}
