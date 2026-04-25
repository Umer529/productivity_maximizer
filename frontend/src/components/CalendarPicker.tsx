import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../lib/theme';

interface CalendarPickerProps {
  value: string;              // YYYY-MM-DD, may be empty
  onChange: (date: string) => void;
  minDate?: string;           // YYYY-MM-DD — defaults to today
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Returns a flat array length = ceil((startOffset + daysInMonth) / 7) * 7 */
function buildGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // Mon = 0
  const total = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = i - startOffset + 1;
    return d >= 1 && d <= last.getDate() ? new Date(year, month, d) : null;
  });
}

export default function CalendarPicker({ value, onChange, minDate }: CalendarPickerProps) {
  const todayStr = toDateStr(new Date());
  const effectiveMin = minDate ?? todayStr;

  const initYear = value ? parseInt(value.slice(0, 4)) : new Date().getFullYear();
  const initMonth = value ? parseInt(value.slice(5, 7)) - 1 : new Date().getMonth();

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth();
  const canGoPrev = viewYear > nowYear || (viewYear === nowYear && viewMonth > nowMonth);

  const goToPrev = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const grid = buildGrid(viewYear, viewMonth);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));

  // Proximity warning for the selected value
  const daysUntil =
    value
      ? Math.round(
          (new Date(`${value}T00:00:00`).getTime() - new Date(`${todayStr}T00:00:00`).getTime()) /
            86400000,
        )
      : null;

  return (
    <View style={styles.wrapper}>
      {/* ── Month navigation ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
          onPress={goToPrev}
          disabled={!canGoPrev}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={canGoPrev ? colors.foreground : colors.mutedForeground}
          />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        <TouchableOpacity style={styles.navBtn} onPress={goToNext}>
          <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* ── Day-of-week labels ── */}
      <View style={styles.labelRow}>
        {DAY_LABELS.map(d => (
          <Text key={d} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* ── Calendar grid ── */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((date, ci) => {
            if (!date) return <View key={`e-${ri}-${ci}`} style={styles.cell} />;
            const ds = toDateStr(date);
            const isPast = ds < effectiveMin;
            const isToday = ds === todayStr;
            const isSelected = ds === value;

            return (
              <TouchableOpacity
                key={ds}
                style={[
                  styles.cell,
                  isToday && !isSelected && styles.todayCell,
                  isSelected && styles.selectedCell,
                  isPast && styles.pastCell,
                ]}
                onPress={() => !isPast && onChange(ds)}
                disabled={isPast}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && !isSelected && styles.todayText,
                    isSelected && styles.selectedText,
                    isPast && styles.pastText,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {isToday && (
                  <View
                    style={[
                      styles.todayDot,
                      isSelected && { backgroundColor: colors.white },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* ── Warnings ── */}
      {daysUntil !== null && daysUntil < 0 && (
        <View style={[styles.banner, styles.errorBanner]}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.destructive} />
          <Text style={styles.bannerText}>This deadline is already in the past.</Text>
        </View>
      )}
      {daysUntil !== null && daysUntil === 0 && (
        <View style={[styles.banner, styles.urgentBanner]}>
          <Ionicons name="time-outline" size={12} color={colors.warning} />
          <Text style={[styles.bannerText, styles.urgentText]}>Deadline is today — start now!</Text>
        </View>
      )}
      {daysUntil !== null && daysUntil > 0 && daysUntil <= 3 && (
        <View style={[styles.banner, styles.urgentBanner]}>
          <Ionicons name="time-outline" size={12} color={colors.warning} />
          <Text style={[styles.bannerText, styles.urgentText]}>
            Only {daysUntil} day{daysUntil === 1 ? '' : 's'} away — plan carefully!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  monthTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.foreground,
  },

  // Day labels
  labelRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
    letterSpacing: 0.5,
    paddingBottom: spacing.xs,
  },

  // Grid
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    margin: 1,
    position: 'relative',
  },
  todayCell: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  selectedCell: {
    backgroundColor: colors.primary,
  },
  pastCell: {
    opacity: 0.25,
  },

  // Day number text
  dayText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  todayText: { color: colors.primaryLight, fontWeight: '700' },
  selectedText: { color: colors.white, fontWeight: '700' },
  pastText: { color: colors.mutedForeground },

  // Today dot
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // Warning banners
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
  },
  errorBanner: {
    backgroundColor: colors.destructiveDim,
    borderColor: colors.destructive + '30',
  },
  urgentBanner: {
    backgroundColor: colors.warningDim,
    borderColor: colors.warning + '30',
  },
  bannerText: {
    fontSize: typography.xs,
    color: colors.destructive,
    fontWeight: '600',
    flex: 1,
  },
  urgentText: { color: colors.warning },
});
