import { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { Field } from './Field';
import { PrimaryButton, TextButton } from './ui';
import { postWeightEntry, type WeightCheckInStatus } from '../api/weightEntries';
import { WEIGHT_COPY } from '../copy/weight';
import { useTheme } from '../theme';

const WEIGHT_MIN = 20;
const WEIGHT_MAX = 300;

function parseDecimal(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

export function WeightCheckInModal({
  visible,
  status,
  token,
  onDismissLater,
  onSaved,
}: {
  visible: boolean;
  status: WeightCheckInStatus | null;
  token: string;
  onDismissLater: () => void;
  onSaved: (result: Awaited<ReturnType<typeof postWeightEntry>>) => void;
}) {
  const t = useTheme();
  const [weightStr, setWeightStr] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setWeightStr(status?.lastWeightKg != null ? String(status.lastWeightKg) : '');
    setError(undefined);
    setBusy(false);
  }, [visible, status?.lastWeightKg]);

  const validate = (): number | null => {
    const w = parseDecimal(weightStr);
    if (w === null) {
      setError(WEIGHT_COPY.invalidWeight);
      return null;
    }
    if (w < WEIGHT_MIN || w > WEIGHT_MAX) {
      setError(WEIGHT_COPY.weightRange);
      return null;
    }
    setError(undefined);
    return w;
  };

  const handleSave = async () => {
    const w = validate();
    if (w === null) return;
    setBusy(true);
    try {
      const result = await postWeightEntry(token, w);
      onSaved(result);
    } catch {
      setError(WEIGHT_COPY.saveError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismissLater}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      >
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            padding: t.spacing.xl,
            gap: t.spacing.md,
            borderWidth: 1,
            borderColor: t.colors.border,
          }}
        >
          <Text style={{ color: t.colors.fg, fontSize: t.fontSize.title, fontWeight: '700' }}>
            {WEIGHT_COPY.modalTitle}
          </Text>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.body }}>{WEIGHT_COPY.modalBody}</Text>
          {status?.lastWeightKg != null && status.daysSince != null ? (
            <Text style={{ color: t.colors.fgSubtle, fontSize: t.fontSize.caption }}>
              {WEIGHT_COPY.lastRecorded(status.lastWeightKg, status.daysSince)}
            </Text>
          ) : null}
          <Field
            label={WEIGHT_COPY.fieldLabel}
            helper={WEIGHT_COPY.fieldHelper}
            error={error}
            suffix="kg"
            keyboardType="decimal-pad"
            value={weightStr}
            onChangeText={setWeightStr}
          />
          <PrimaryButton title={WEIGHT_COPY.save} onPress={() => void handleSave()} loading={busy} />
          {!busy ? <TextButton title={WEIGHT_COPY.later} onPress={onDismissLater} /> : null}
        </View>
      </View>
    </Modal>
  );
}
