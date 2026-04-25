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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { AIInsight, MLPredictions, AnalyticsOverview } from '../services/analyticsService';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const { analyticsOverview: overview, aiInsights: insights, loadAnalytics } = useAppData();
  const navigation = useNavigation<NavProp>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      // Only show spinner when there's no data yet; cache hits are instant
      if (!overview) setLoading(true);
      loadAnalytics(false).finally(() => setLoading(false));
    }, [user, loadAnalytics]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics(true);
    setRefreshing(false);
  }, [loadAnalytics]);

  const focusHours = overview ? (overview.totalFocusMinutes / 60).toFixed(1) : '0.0';
  const weeklyHours = overview?.weeklyHours ?? [0, 0, 0, 0, 0, 0, 0];
  const maxH = Math.max(...weeklyHours, 1);
  const todayIndex = (new Date().getDay() + 6) % 7;

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <View style={styles.guestIconBox}>
            <Ionicons name="bar-chart-outline" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={styles.guestTitle}>Analytics Locked</Text>
          <Text style={styles.guestText}>
            Sign in to track your focus sessions, view AI insights, and monitor your progress.
          </Text>
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.guestBtnText}>Sign In to Unlock</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <View>
          <Text style={styles.headerLabel}>YOUR PROGRESS</Text>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>

        {/* ── Stats Grid ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                icon="time-outline"
                label="Focus Time"
                value={`${focusHours}h`}
                sub="This week"
                color={colors.primaryLight}
              />
              <StatCard
                icon="flash-outline"
                label="Focus Score"
                value={`${overview?.focusScore ?? 0}%`}
                sub={overview?.focusScore ?? 0 >= 70 ? 'Above avg' : 'Keep going'}
                color={colors.success}
              />
              <StatCard
                icon="flame-outline"
                label="Streak"
                value={`${overview?.streak ?? user?.streak ?? 0}`}
                sub="days"
                color={colors.accent}
              />
              <StatCard
                icon="checkmark-circle-outline"
                label="Completed"
                value={String(overview?.tasksCompleted ?? 0)}
                sub={`${overview?.tasksPending ?? 0} pending`}
                color={colors.warning}
              />
            </View>

            {/* ── Weekly Chart ── */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Study Hours</Text>
                  <Text style={styles.chartSub}>Last 7 days</Text>
                </View>
                <View style={styles.trendBadge}>
                  <Ionicons name="trending-up" size={13} color={colors.success} />
                  <Text style={styles.trendText}>
                    {weeklyHours.reduce((a, b) => a + b, 0).toFixed(1)}h total
                  </Text>
                </View>
              </View>
              <View style={styles.barsContainer}>
                {weeklyHours.map((h, i) => {
                  const isToday = i === todayIndex;
                  const barH = Math.max((h / maxH) * 90, 4);
                  return (
                    <View key={i} style={styles.barCol}>
                      {h > 0 && (
                        <Text style={[styles.barValue, isToday && { color: colors.primaryLight }]}>
                          {h.toFixed(1)}
                        </Text>
                      )}
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: barH,
                              backgroundColor: isToday ? colors.primary : colors.primary + '45',
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barLabel, isToday && styles.barLabelActive]}>
                        {DAYS[i].slice(0, 1)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── Subject Breakdown ── */}
            {(overview?.subjectBreakdown?.length ?? 0) > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Subject Breakdown</Text>
                <View style={styles.subjects}>
                  {overview!.subjectBreakdown.map((s, i) => {
                    const barColors = [colors.primary, colors.accent, colors.success, colors.warning, colors.destructive];
                    const c = barColors[i % barColors.length];
                    return (
                      <View key={s.name} style={styles.subjectRow}>
                        <View style={styles.subjectLabelRow}>
                          <View style={[styles.subjectDot, { backgroundColor: c }]} />
                          <Text style={styles.subjectName}>{s.name}</Text>
                          <Text style={styles.subjectHours}>{s.hours.toFixed(1)}h</Text>
                          <Text style={styles.subjectPct}>{s.pct}%</Text>
                        </View>
                        <View style={styles.progressBg}>
                          <View
                            style={[styles.progressFill, { width: `${s.pct}%`, backgroundColor: c }]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── ML Predictions ── */}
            {overview?.mlPredictions && (
              <View style={styles.card}>
                <View style={styles.insightsHeader}>
                  <View style={styles.insightsTitleRow}>
                    <Ionicons name="hardware-chip" size={16} color={colors.primaryLight} />
                    <Text style={styles.cardTitle}>ML Predictions</Text>
                  </View>
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>ML</Text>
                  </View>
                </View>
                <View style={styles.mlPredictionsGrid}>
                  <MLPredictionCard
                    icon="flash"
                    label="Productivity Score"
                    value={overview.mlPredictions.productivity_score?.value.toFixed(0) || 'N/A'}
                    sub={`Confidence: ${overview.mlPredictions.productivity_score?.confidence.toFixed(0)}%`}
                    color={colors.primaryLight}
                  />
                  <MLPredictionCard
                    icon="time"
                    label="Recommended Hours"
                    value={`${overview.mlPredictions.required_hours?.value.toFixed(1)}h/day`}
                    sub={`Confidence: ${overview.mlPredictions.required_hours?.confidence.toFixed(0)}%`}
                    color={colors.success}
                  />
                  <MLPredictionCard
                    icon="cafe"
                    label="Optimal Break"
                    value={`${overview.mlPredictions.break_interval?.value.toFixed(0)}min`}
                    sub={`Confidence: ${overview.mlPredictions.break_interval?.confidence.toFixed(0)}%`}
                    color={colors.accent}
                  />
                </View>
              </View>
            )}

            {/* ── AI Insights ── */}
            <View style={styles.card}>
              <View style={styles.insightsHeader}>
                <View style={styles.insightsTitleRow}>
                  <Ionicons name="hardware-chip" size={16} color={colors.primaryLight} />
                  <Text style={styles.cardTitle}>AI Insights</Text>
                </View>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>Powered by AI</Text>
                </View>
              </View>
              {insights.length === 0 ? (
                <View style={styles.insightsEmpty}>
                  <Ionicons name="sparkles-outline" size={24} color={colors.mutedForeground} />
                  <Text style={styles.emptyText}>
                    Complete more focus sessions to unlock personalized insights.
                  </Text>
                </View>
              ) : (
                <View style={styles.insightsList}>
                  {insights.map((ins, i) => (
                    <InsightCard key={i} insight={ins} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <View style={[statStyles.card, { borderColor: color + '30' }]}>
      <View style={[statStyles.iconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={statStyles.sub}>{sub}</Text>
    </View>
  );
}

function InsightCard({ insight }: { insight: AIInsight }) {
  const cfg: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
    tip:        { icon: 'trending-up',    color: colors.primaryLight, bg: colors.primaryDim },
    warning:    { icon: 'warning-outline', color: colors.warning,      bg: colors.warningDim },
    prediction: { icon: 'analytics-outline', color: colors.accent,    bg: colors.accentDim },
  };
  const c = cfg[insight.type] ?? cfg.tip;
  return (
    <View style={[insightStyles.card, { backgroundColor: c.bg, borderColor: c.color + '30' }]}>
      <View style={[insightStyles.iconBox, { backgroundColor: c.color + '25' }]}>
        <Ionicons name={c.icon} size={14} color={c.color} />
      </View>
      <Text style={[insightStyles.text, { color: c.color }]}>{insight.text}</Text>
    </View>
  );
}

function MLPredictionCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <View style={[mlPredictionStyles.card, { borderColor: color + '30' }]}>
      <View style={[mlPredictionStyles.iconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={mlPredictionStyles.label}>{label}</Text>
      <Text style={[mlPredictionStyles.value, { color }]}>{value}</Text>
      <Text style={mlPredictionStyles.sub}>{sub}</Text>
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

  // Guest
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.lg,
  },
  guestIconBox: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  guestTitle: { fontSize: typography.xl, fontWeight: '800', color: colors.foreground },
  guestText: {
    fontSize: typography.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  guestBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    ...shadows.primary,
  },
  guestBtnText: { color: colors.white, fontWeight: '700', fontSize: typography.base },

  // Header
  headerLabel: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  headerTitle: { fontSize: typography.xxl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },

  // Loading
  loadingBox: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxxl * 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  // Chart
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  chartTitle: { fontSize: typography.base, fontWeight: '700', color: colors.foreground },
  chartSub: { fontSize: typography.xs, color: colors.mutedForeground, marginTop: 2 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondaryDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  trendText: { fontSize: typography.xs, color: colors.success, fontWeight: '700' },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: spacing.xs },
  barCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barValue: { fontSize: 9, color: colors.mutedForeground, height: 14 },
  barTrack: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar: { width: '100%', borderRadius: radius.sm },
  barLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: '500' },
  barLabelActive: { color: colors.primaryLight, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.lg,
  },
  cardTitle: { fontSize: typography.base, fontWeight: '700', color: colors.foreground },

  // Subjects
  subjects: { gap: spacing.lg },
  subjectRow: { gap: spacing.sm },
  subjectLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectName: { flex: 1, fontSize: typography.sm, color: colors.foreground, fontWeight: '500' },
  subjectHours: { fontSize: typography.xs, color: colors.mutedForeground },
  subjectPct: { fontSize: typography.xs, color: colors.mutedForeground, width: 32, textAlign: 'right' },
  progressBg: { height: 6, backgroundColor: colors.muted, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },

  // Insights
  insightsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  insightsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiBadge: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  aiBadgeText: { fontSize: 10, color: colors.primaryLight, fontWeight: '700' },
  insightsEmpty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyText: { fontSize: typography.sm, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  insightsList: { gap: spacing.sm },
  mlPredictionsGrid: { flexDirection: 'row', gap: spacing.sm },
});

const statStyles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  value: { fontSize: typography.xl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  label: { fontSize: typography.xs, color: colors.mutedForeground, fontWeight: '600' },
  sub: { fontSize: typography.xs, color: colors.mutedForeground },
});

const insightStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: { flex: 1, fontSize: typography.sm, lineHeight: 20, fontWeight: '500' },
});

const mlPredictionStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: typography.xs, color: colors.mutedForeground, fontWeight: '600' },
  value: { fontSize: typography.lg, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 10, color: colors.mutedForeground },
});
