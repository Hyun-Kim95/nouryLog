import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KstMonthCalendar } from './KstMonthCalendar';
import { STATS_COPY } from '../copy/stats';
import { todayAnchorKst } from '../lib/statsPeriod';
import { useTheme } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectYmd: (ymd: string) => void;
  initialYmd?: string;
};

export function StatsCalendarModal({ visible, onClose, onSelectYmd, initialYmd }: Props) {
  const t = useTheme();
  const [picked, setPicked] = useState(initialYmd ?? todayAnchorKst());

  useEffect(() => {
    if (visible) setPicked(initialYmd ?? todayAnchorKst());
  }, [visible, initialYmd]);

  const handleSelect = (ymd: string) => {
    if (ymd > todayAnchorKst()) return;
    setPicked(ymd);
    onSelectYmd(ymd);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            padding: t.spacing.lg,
            paddingBottom: t.spacing.xxl,
            gap: t.spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.fg, fontSize: t.fontSize.bodyLg, fontWeight: '700' }}>
              {STATS_COPY.calendarTitle}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={STATS_COPY.calendarClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={t.colors.fgMuted} />
            </Pressable>
          </View>
          <Text style={{ color: t.colors.fgMuted, fontSize: t.fontSize.caption }}>{STATS_COPY.calendarHint}</Text>
          <KstMonthCalendar selectedYmd={picked} onSelectYmd={handleSelect} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
