import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { taskService, Task } from '../services/taskService';
import { analyticsService } from '../services/analyticsService';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'Small daily improvements lead to stunning results.', author: 'Robin Sharma' },
  { text: 'Do the hard jobs first. The easy jobs will take care of themselves.', author: 'Dale Carnegie' },
];

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusScore, setFocusScore] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [taskRes, overviewRes, insightsRes] = await Promise.all([
        taskService.getTasks({ status: 'pending' }),
        analyticsService.getOverview(),
        analyticsService.getInsights(),
      ]);
      setTasks(taskRes.data.slice(0, 4));
      setFocusScore(overviewRes.data.focusScore);
      setTotalMinutes(overviewRes.data.totalFocusMinutes);
      setWeeklyHours(overviewRes.data.weeklyHours ?? []);
      const tip = insightsRes.data.find((i) => i.type === 'tip');
      if (tip) setAiSuggestion(tip.text);
    } catch {
      // silent
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const streak = user?.streak ?? 0;
  const focusTime =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      : `${totalMinutes}m`;
  const maxH = Math.max(...weeklyHours, 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.userName}>
              {user ? user.name.split(' ')[0] : 'Student'}
            </Text>
          </View>
          {user ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name[0].toUpperCase()}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Focus Score Card ── */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <View>
              <Text style={styles.scoreLabel}>TODAY'S FOCUS SCORE</Text>
              <Text style={styles.scoreValue}>{focusScore}%</Text>
            </View>
            <View style={styles.scoreIconRing}>
              <Ionicons name="flash" size={26} color={colors.primaryLight} />
            </View>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.statsRow}>
            <StatItem icon="time-outline" label="Focus Time" value={focusTime} />
            <View style={styles.statDivider} />
            <StatItem icon="flame-outline" label="Streak" value={`${streak}d`} />
            <View style={styles.statDivider} />
            <StatItem
              icon="checkmark-circle-outline"
              label="Pending"
              value={`${tasks.length}`}
            />
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.quickActions}>
            <QuickAction
              icon="timer-outline"
              label="Focus"
              color={colors.primary}
              onPress={() => navigation.navigate('Focus')}
            />
            <QuickAction
              icon="calendar-outline"
              label="Schedule"
              color={colors.accent}
              onPress={() => navigation.navigate('MainTabs')}
            />
            <QuickAction
              icon="add-circle-outline"
              label="Add Task"
              color={colors.secondary}
              onPress={() => navigation.navigate('TaskInput')}
            />
            <QuickAction
              icon="bar-chart-outline"
              label="Analytics"
              color={colors.warning}
              onPress={() => navigation.navigate('MainTabs')}
            />
          </View>
        </View>

        {/* ── AI Suggestion ── */}
        {(aiSuggestion || !user) && (
          <View style={styles.aiCard}>
            <View style={styles.aiIconBox}>
              <Ionicons name="sparkles" size={18} color={colors.white} />
            </View>
            <View style={styles.aiContent}>
              <Text style={styles.aiLabel}>AI INSIGHT</Text>
              <Text style={styles.aiText}>
                {aiSuggestion ??
                  'Sign in to get personalized AI study recommendations based on your tasks and habits.'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Upcoming Tasks ── */}
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('TaskInput')}
            >
              <Ionicons name="add" size={14} color={colors.primaryLight} />
              <Text style={styles.seeAllText}>Add Task</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="book-outline" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={styles.emptyTitle}>No pending tasks</Text>
              <Text style={styles.emptyText}>
                {user ? 'Add your first task to get started.' : 'Sign in to manage your tasks.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() =>
                  user ? navigation.navigate('TaskInput') : navigation.navigate('Auth')
                }
              >
                <Text style={styles.emptyActionText}>
                  {user ? 'Add Task' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.taskList}>
              {tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  title={task.title}
                  course={task.course ?? ''}
                  deadline={new Date(task.deadline).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                  priority={task.priority}
                  progress={task.progress}
                  type={task.type}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Weekly Progress ── */}
        <View style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <Text style={styles.weekTitle}>This Week</Text>
            <Text style={styles.weekSub}>
              {weeklyHours.reduce((a, b) => a + b, 0).toFixed(1)}h total
            </Text>
          </View>
          <View style={styles.bars}>
            {weeklyHours.map((h, i) => {
              const isToday = i === (new Date().getDay() + 6) % 7;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>{h > 0 ? `${h.toFixed(0)}h` : ''}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((h / maxH) * 72, 4),
                          backgroundColor: isToday ? colors.primary : colors.primary + '40',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, isToday && styles.barLabelActive]}>
                    {DAYS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Quote ── */}
        <View style={styles.quoteCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} style={{ marginBottom: spacing.sm }} />
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TaskInput')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={statStyles.container}>
      <Ionicons name={icon} size={15} color={colors.primaryLight} style={{ marginBottom: 4 }} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: colors.destructive,
  high: '#f97316',
  medium: colors.warning,
  low: colors.success,
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  assignment: 'document-text-outline',
  quiz: 'help-circle-outline',
  midterm: 'school-outline',
  final: 'trophy-outline',
  project: 'construct-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

function TaskCard({
  title,
  course,
  deadline,
  priority,
  progress,
  type,
}: {
  title: string;
  course: string;
  deadline: string;
  priority: string;
  progress: number;
  type: string;
}) {
  const pColor = PRIORITY_COLORS[priority] ?? colors.mutedForeground;
  const tIcon = TYPE_ICONS[type] ?? 'document-outline';
  return (
    <View style={taskStyles.card}>
      <View style={taskStyles.row}>
        <View style={[taskStyles.typeIcon, { backgroundColor: pColor + '18' }]}>
          <Ionicons name={tIcon} size={16} color={pColor} />
        </View>
        <View style={taskStyles.info}>
          <Text style={taskStyles.title} numberOfLines={1}>{title}</Text>
          <Text style={taskStyles.sub}>
            {course ? `${course}  ·  ` : ''}{deadline}
          </Text>
        </View>
        <View style={[taskStyles.priorityBadge, { backgroundColor: pColor + '18' }]}>
          <Text style={[taskStyles.priorityText, { color: pColor }]}>
            {priority.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={taskStyles.progressRow}>
        <View style={taskStyles.progressBg}>
          <View style={[taskStyles.progressFill, { width: `${progress}%`, backgroundColor: pColor }]} />
        </View>
        <Text style={taskStyles.progressPct}>{progress}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 110,
    gap: spacing.section,
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { gap: 2 },
  greeting: { fontSize: typography.sm, color: colors.mutedForeground, fontWeight: '500' },
  userName: { fontSize: typography.xxl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: typography.md },
  signInBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  signInBtnText: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600' },

  // Score Card
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  scoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  scoreLabel: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  scoreValue: { fontSize: 44, fontWeight: '800', color: colors.primaryLight, letterSpacing: -2 },
  scoreIconRing: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDivider: { height: 1, backgroundColor: colors.cardBorder, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statDivider: { width: 1, backgroundColor: colors.cardBorder },

  // Quick Actions
  sectionLabel: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickActionItem: { flex: 1, alignItems: 'center', gap: spacing.sm },
  quickActionIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: typography.xs, color: colors.subtext, fontWeight: '600' },

  // AI Card
  aiCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    alignItems: 'flex-start',
  },
  aiIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiContent: { flex: 1, gap: 4 },
  aiLabel: { fontSize: typography.xs, fontWeight: '700', color: colors.primaryLight, letterSpacing: 0.8 },
  aiText: { fontSize: typography.sm, color: colors.subtext, lineHeight: 20 },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: typography.md, fontWeight: '700', color: colors.foreground },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
  },
  seeAllText: { fontSize: typography.xs, color: colors.primaryLight, fontWeight: '600' },

  // Loading / Empty
  loadingBox: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: typography.base, fontWeight: '700', color: colors.foreground },
  emptyText: { fontSize: typography.sm, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  emptyAction: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  emptyActionText: { color: colors.white, fontWeight: '700', fontSize: typography.sm },

  taskList: { gap: spacing.sm },

  // Weekly Chart
  weekCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  weekTitle: { fontSize: typography.base, fontWeight: '700', color: colors.foreground },
  weekSub: { fontSize: typography.sm, color: colors.mutedForeground },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: spacing.xs },
  barCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barValue: { fontSize: 9, color: colors.mutedForeground, height: 14 },
  barTrack: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar: { width: '100%', borderRadius: radius.sm },
  barLabel: { fontSize: 11, color: colors.mutedForeground, fontWeight: '500' },
  barLabelActive: { color: colors.primaryLight, fontWeight: '700' },

  // Quote
  quoteCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quoteText: {
    fontSize: typography.sm,
    color: colors.subtext,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  quoteAuthor: { fontSize: typography.xs, color: colors.mutedForeground, marginTop: spacing.sm, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 96,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
});

const statStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', gap: 2 },
  value: { fontSize: typography.md, fontWeight: '700', color: colors.foreground },
  label: { fontSize: typography.xs, color: colors.mutedForeground },
});

const taskStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 3 },
  title: { fontSize: typography.base, fontWeight: '600', color: colors.foreground },
  sub: { fontSize: typography.xs, color: colors.mutedForeground },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  priorityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBg: { flex: 1, height: 5, backgroundColor: colors.muted, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  progressPct: { fontSize: 10, color: colors.mutedForeground, width: 28, textAlign: 'right' },
});
