import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../contexts/AuthContext';
import { scheduleService, ScheduleSlot, ScheduleData } from '../services/scheduleService';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const TYPE_CONFIG: Record<string, { bg: string; text: string; dot: string; icon: keyof typeof Ionicons.glyphMap }> = {
  study:    { bg: colors.primaryDim,    text: colors.primaryLight, dot: colors.primary,  icon: 'book-outline' },
  revision: { bg: colors.accentDim,     text: colors.accent,       dot: colors.accent,   icon: 'refresh-circle-outline' },
  break:    { bg: colors.muted,         text: colors.mutedForeground, dot: colors.mutedForeground, icon: 'cafe-outline' },
  prayer:   { bg: colors.secondaryDim,  text: colors.success,      dot: colors.success,  icon: 'moon-outline' },
  meal:     { bg: colors.warningDim,    text: colors.warning,      dot: colors.warning,  icon: 'restaurant-outline' },
};

export default function SchedulerScreen() {
  const { user } = useAuth();
  const weekDates = getWeekDates();
  const todayIndex = (new Date().getDay() + 6) % 7;
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const selectedDate = weekDates[selectedDay];
  const dateStr = selectedDate.toISOString().split('T')[0];
  const slots = scheduleData?.slots || [];

  const loadSchedule = useCallback(async (date: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await scheduleService.getSchedule(date, 'ml');
      setScheduleData(res.data);
    } catch {
      setScheduleData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await scheduleService.regenerate(dateStr, 'ml');
      setScheduleData(res.data);
    } catch {
      // keep existing
    } finally {
      setRegenerating(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchedule(dateStr, true);
    setRefreshing(false);
  }, [dateStr, loadSchedule]);

  // Reload whenever this tab gains focus (e.g. after adding a new task)
  useFocusEffect(
    useCallback(() => {
      if (user) loadSchedule(dateStr);
    }, [dateStr, user, loadSchedule]),
  );

  const studySlots = slots.filter((s) => s.type === 'study' || s.type === 'revision');
  const totalStudyHours = studySlots.reduce((sum, s) => sum + s.duration, 0).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>AI OPTIMIZED</Text>
            <Text style={styles.headerTitle}>Schedule</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="hardware-chip" size={20} color={colors.white} />
          </View>
        </View>

        {/* ── AI Banner ── */}
        <View style={styles.aiBanner}>
          <View style={styles.aiBannerLeft}>
            <Ionicons name="sparkles" size={14} color={colors.primaryLight} />
            <Text style={styles.aiBannerText}>
              {scheduleData?.method === 'ml-optimized'
                ? `AI-generated schedule • Productivity: ${scheduleData.student_productivity?.toFixed(0) || 'N/A'}/100`
                : user
                ? 'Schedule optimized for your peak focus hours'
                : 'Sign in to get a personalized AI schedule'}
            </Text>
          </View>
          {user && (
            <TouchableOpacity
              style={[styles.regenBtn, regenerating && { opacity: 0.5 }]}
              onPress={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
                <ActivityIndicator size="small" color={colors.primaryLight} />
              ) : (
                <>
                  <Ionicons name="refresh" size={12} color={colors.primaryLight} />
                  <Text style={styles.regenBtnText}>Regenerate AI</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Day Picker ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayPicker}
        >
          {DAYS.map((d, i) => {
            const isToday = i === todayIndex;
            const isSelected = i === selectedDay;
            return (
              <TouchableOpacity
                key={d + i}
                style={[
                  styles.dayBtn,
                  isSelected && styles.dayBtnActive,
                ]}
                onPress={() => setSelectedDay(i)}
              >
                <Text style={[styles.dayBtnDay, isSelected && styles.dayBtnTextActive]}>
                  {d}
                </Text>
                <Text style={[styles.dayBtnDate, isSelected && styles.dayBtnTextActive]}>
                  {weekDates[i].getDate()}
                </Text>
                {isToday && <View style={[styles.todayDot, isSelected && { backgroundColor: colors.white }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Summary Row ── */}
        {slots.length > 0 && (
          <View style={styles.summaryRow}>
            <SummaryChip icon="time-outline" label={`${totalStudyHours}h study`} color={colors.primary} />
            <SummaryChip icon="list-outline" label={`${slots.length} slots`} color={colors.accent} />
            <SummaryChip
              icon="moon-outline"
              label={`${slots.filter((s) => s.type === 'prayer').length} prayers`}
              color={colors.success}
            />
          </View>
        )}

        {/* ── Timeline ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Generating schedule…</Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>No schedule yet</Text>
            <Text style={styles.emptyText}>
              {user
                ? 'Add tasks to generate a personalized AI schedule.'
                : 'Sign in to see your personalized schedule.'}
            </Text>
            {user && (
              <TouchableOpacity style={styles.emptyAction} onPress={handleRegenerate}>
                <Ionicons name="sparkles" size={14} color={colors.white} />
                <Text style={styles.emptyActionText}>Generate Schedule</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.timeline}>
            {slots.map((slot, i) => {
              const cfg = TYPE_CONFIG[slot.type] ?? TYPE_CONFIG.break;
              const isLast = i === slots.length - 1;
              return (
                <View key={i} style={styles.timelineRow}>
                  {/* Time column */}
                  <View style={styles.timeCol}>
                    <Text style={styles.timeText}>{slot.time}</Text>
                  </View>

                  {/* Track */}
                  <View style={styles.track}>
                    <View style={[styles.trackDot, { backgroundColor: cfg.dot }]} />
                    {!isLast && <View style={styles.trackLine} />}
                  </View>

                  {/* Slot card */}
                  <View style={[styles.slotCard, { backgroundColor: cfg.bg }]}>
                    <View style={styles.slotRow}>
                      <View style={[styles.slotIconBox, { backgroundColor: cfg.dot + '25' }]}>
                        <Ionicons name={cfg.icon} size={14} color={cfg.dot} />
                      </View>
                      <View style={styles.slotInfo}>
                        <Text style={[styles.slotTitle, { color: cfg.text }]} numberOfLines={1}>
                          {slot.task}
                        </Text>
                        {slot.course && (
                          <Text style={styles.slotCourse}>{slot.course}</Text>
                        )}
                      </View>
                      <View style={styles.slotDurationBadge}>
                        <Text style={styles.slotDurationText}>
                          {slot.duration >= 1
                            ? `${slot.duration}h`
                            : `${Math.round(slot.duration * 60)}m`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryChip({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: color + '18', borderColor: color + '30' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[chipStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.section,
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  headerTitle: { fontSize: typography.xxl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },

  // AI Banner
  aiBanner: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  aiBannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiBannerText: { flex: 1, fontSize: typography.xs, color: colors.subtext, lineHeight: 17 },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDim,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    minWidth: 90,
    justifyContent: 'center',
  },
  regenBtnText: { fontSize: typography.xs, color: colors.primaryLight, fontWeight: '700' },

  // Day Picker
  dayPicker: { gap: spacing.sm, paddingVertical: spacing.xs },
  dayBtn: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 52,
    gap: 2,
  },
  dayBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.primary,
  },
  dayBtnDay: { fontSize: typography.xs, fontWeight: '600', color: colors.mutedForeground },
  dayBtnDate: { fontSize: typography.base, fontWeight: '700', color: colors.foreground },
  dayBtnTextActive: { color: colors.white },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },

  // Summary
  summaryRow: { flexDirection: 'row', gap: spacing.sm },

  // Loading / Empty
  loadingBox: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  loadingText: { fontSize: typography.sm, color: colors.mutedForeground },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: typography.base, fontWeight: '700', color: colors.foreground },
  emptyText: {
    fontSize: typography.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  emptyActionText: { color: colors.white, fontWeight: '700', fontSize: typography.sm },

  // Timeline
  timeline: { gap: 0 },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    minHeight: 72,
  },
  timeCol: {
    width: 46,
    paddingTop: spacing.md,
    alignItems: 'flex-end',
  },
  timeText: { fontSize: typography.xs, color: colors.mutedForeground, fontWeight: '600' },
  track: { width: 20, alignItems: 'center', paddingTop: spacing.md },
  trackDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  trackLine: { flex: 1, width: 2, backgroundColor: colors.cardBorder, marginTop: spacing.xs },
  slotCard: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotIconBox: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  slotInfo: { flex: 1, gap: 2 },
  slotTitle: { fontSize: typography.sm, fontWeight: '600' },
  slotCourse: { fontSize: typography.xs, color: colors.mutedForeground },
  slotDurationBadge: {
    backgroundColor: colors.background + '80',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  slotDurationText: { fontSize: typography.xs, color: colors.subtext, fontWeight: '600' },
});

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  text: { fontSize: typography.xs, fontWeight: '600' },
});
