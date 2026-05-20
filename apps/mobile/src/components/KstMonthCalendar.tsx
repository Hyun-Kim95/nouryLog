import { useMemo } from 'react';
import { Calendar, type DateData } from 'react-native-calendars';
import { todayAnchorKst } from '../lib/statsPeriod';
import { useTheme } from '../theme';

type Props = {
  selectedYmd: string;
  onSelectYmd: (ymd: string) => void;
  maxDate?: string;
  recordedDates?: string[];
  onMonthChange?: (ym: string) => void;
};

export function KstMonthCalendar({
  selectedYmd,
  onSelectYmd,
  maxDate,
  recordedDates = [],
  onMonthChange,
}: Props) {
  const t = useTheme();
  const max = maxDate ?? todayAnchorKst();

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      {
        selected?: boolean;
        selectedColor?: string;
        selectedTextColor?: string;
        marked?: boolean;
        dotColor?: string;
      }
    > = {};

    for (const ymd of recordedDates) {
      if (ymd > max) continue;
      marks[ymd] = {
        marked: true,
        dotColor: t.colors.primary,
      };
    }

    marks[selectedYmd] = {
      ...marks[selectedYmd],
      selected: true,
      selectedColor: t.colors.primary,
      selectedTextColor: t.colors.primaryFg,
      marked: marks[selectedYmd]?.marked ?? false,
      dotColor: t.colors.primaryFg,
    };

    return marks;
  }, [recordedDates, selectedYmd, max, t.colors.primary, t.colors.primaryFg]);

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: t.colors.surface,
      calendarBackground: t.colors.surface,
      textSectionTitleColor: t.colors.fgMuted,
      selectedDayBackgroundColor: t.colors.primary,
      selectedDayTextColor: t.colors.primaryFg,
      todayTextColor: t.colors.primary,
      dayTextColor: t.colors.fg,
      textDisabledColor: t.colors.fgSubtle,
      monthTextColor: t.colors.fg,
      arrowColor: t.colors.fg,
      textDayFontWeight: '500' as const,
      textMonthFontWeight: '700' as const,
    }),
    [t.colors],
  );

  const onDayPress = (day: DateData) => {
    if (day.dateString > max) return;
    onSelectYmd(day.dateString);
  };

  const handleMonthChange = (month: DateData) => {
    const ym = `${month.year}-${String(month.month).padStart(2, '0')}`;
    onMonthChange?.(ym);
  };

  return (
    <Calendar
      current={selectedYmd}
      maxDate={max}
      onDayPress={onDayPress}
      onMonthChange={handleMonthChange}
      markedDates={markedDates}
      enableSwipeMonths
      theme={calendarTheme}
      style={{
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
      }}
    />
  );
}
