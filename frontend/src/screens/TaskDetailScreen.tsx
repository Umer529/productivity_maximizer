import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { taskService, Task } from '../services/taskService';
import { focusSessionService, FocusSession } from '../services/focusSessionService';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
type RouteType = RouteProp<RootStackParamList, 'TaskDetail'>;

type SprintState = 'idle' | 'running' | 'paused';

const PRIORITY_COLORS: Record<string, string> = {
  critical: colors.destructive,
  high: '#f97316',
  medium: colors.warning,
  low: colors.success,
};

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning,
  in_progress: colors.accent,
  completed: colors.success,
  overdue: colors.destructive,
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

const DIFFICULTY_LABELS = ['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
const DIFFICULTY_COLORS = ['', colors.success, colors.success, colors.warning, '#f97316', colors.destructive];

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  assignment: 'document-text-outline',
  quiz: 'help-circle-outline',
  midterm: 'school-outline',
  final: 'trophy-outline',
  project: 'construct-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TaskDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { user } = useAuth();
  const { invalidateTaskCache, invalidateAnalyticsCache } = useAppData();

  const [task, setTask] = useState<Task>(route.params.task);
  const [sprintState, setSprintState] = useState<SprintState>('idle');
  const [sprintSeconds, setSprintSeconds] = useState(0);
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [completing, setCompleting] = useState(false);
  const [stopSaving, setStopSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedSecondsRef = useRef(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Reload task whenever this screen gains focus (e.g. returning from edit)
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      taskService
        .getTask(String(task._id))
        .then((r) => setTask(r.data))
        .catch(() => {});
    }, [task._id, user]),
  );

  // Animate progress bar whenever task.progress changes
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: (task.progress || 0) / 100,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [task.progress, progressAnim]);

  // Timer tick
  useEffect(() => {
    if (sprintState === 'running') {
      intervalRef.current = setInterval(() => {
        setSprintSeconds((s) => s + 1);
        elapsedSecondsRef.current += 1;
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sprintState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStartSprint = async () => {
    elapsedSecondsRef.current = 0;
    setSprintSeconds(0);
    try {
      const res = await focusSessionService.startSession({
        taskId: String(task._id),
        taskTitle: task.title,
        plannedDuration: task.estimatedDuration,
        sessionType: 'study',
      });
      setActiveSession(res.data);
    } catch {
      // Proceed with local timer even if backend call fails
    }
    setSprintState('running');
  };

  const handlePauseSprint = () => {
    setSprintState('paused');
  };

  const handleResumeSprint = () => {
    setSprintState('running');
  };

  const handleStopSprint = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSprintState('idle');
    setStopSaving(true);

    const actualMinutes = Math.max(1, Math.round(elapsedSecondsRef.current / 60));

    if (activeSession) {
      try {
        await focusSessionService.endSession(activeSession._id, {
          completed: false,
          interrupted: true,
          actualDuration: actualMinutes,
        });
      } catch {
        // ignore
      }
      setActiveSession(null);
    }

    // Refresh task so progress bar reflects new time spent
    try {
      const res = await taskService.getTask(String(task._id));
      setTask(res.data);
    } catch {}

    invalidateTaskCache();
    invalidateAnalyticsCache();
    elapsedSecondsRef.current = 0;
    setSprintSeconds(0);
    setStopSaving(false);
    setSuccessMsg(`Session saved — ${actualMinutes}min logged.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  }, [activeSession, task._id, invalidateTaskCache, invalidateAnalyticsCache]);

  const handleMarkDone = async () => {
    if (task.status === 'completed') return;
    setCompleting(true);
    // Stop any active sprint first
    if (sprintState !== 'idle') {
      await handleStopSprint();
    }
    try {
      const res = await taskService.updateProgress(String(task._id), 100);
      setTask(res.data);
      invalidateTaskCache();
      invalidateAnalyticsCache();
      setSuccessMsg('Task marked as completed!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      Alert.alert('Error', 'Failed to mark task as done. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await taskService.deleteTask(String(task._id));
            invalidateTaskCache();
            invalidateAnalyticsCache();
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete task.');
          }
        },
      },
    ]);
  };

  // Derived display values
  const pColor = PRIORITY_COLORS[task.priority] ?? colors.mutedForeground;
  const sColor = STATUS_COLORS[task.status] ?? colors.mutedForeground;
  const dColor = DIFFICULTY_COLORS[task.difficulty] ?? colors.mutedForeground;
  const tIcon = TYPE_ICONS[task.type] ?? 'document-outline';

  const spentMinutes = task.actualDuration || 0;
  const estMinutes = task.estimatedDuration || 60;
  const confirmedProgress = task.progress || 0;

  // Live contribution of current sprint (added on top of confirmed progress for display)
  const liveSprintMinutes = Math.floor(sprintSeconds / 60);
  const liveProgress =
    sprintState !== 'idle'
      ? Math.min(100, confirmedProgress + Math.round((liveSprintMinutes / estMinutes) * 100))
      : confirmedProgress;

  const deadlineDate = new Date(task.deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((deadlineDate.getTime() - today.getTime()) / 86400000);
  const deadlineLabel =
    daysUntil < 0
      ? `${Math.abs(daysUntil)}d overdue`
      : daysUntil === 0
      ? 'Due today'
      : `${daysUntil}d left`;
  const deadlineColor =
    daysUntil < 0
      ? colors.destructive
      : daysUntil <= 2
      ? colors.warning
      : colors.mutedForeground;

  const isCompleted = task.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{task.title}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('TaskInput', { task })}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.primaryLight} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Badges ── */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: sColor + '20', borderColor: sColor + '40' }]}>
            <View style={[styles.badgeDot, { backgroundColor: sColor }]} />
            <Text style={[styles.badgeText, { color: sColor }]}>
              {STATUS_LABELS[task.status] ?? task.status}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: pColor + '20', borderColor: pColor + '40' }]}>
            <Ionicons name="flag-outline" size={10} color={pColor} />
            <Text style={[styles.badgeText, { color: pColor }]}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.muted, borderColor: colors.cardBorder }]}>
            <Ionicons name={tIcon} size={10} color={colors.mutedForeground} />
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
              {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
            </Text>
          </View>
        </View>

        {/* ── Info Card ── */}
        <View style={styles.infoCard}>
          {task.description ? (
            <Text style={styles.description}>{task.description}</Text>
          ) : (
            <Text style={styles.noDescription}>No description provided.</Text>
          )}

          <View style={styles.infoDivider} />

          <View style={styles.infoGrid}>
            {task.course ? (
              <InfoRow icon="book-outline" label="Course" value={task.course} />
            ) : null}
            <InfoRow
              icon="calendar-outline"
              label="Deadline"
              value={`${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${deadlineLabel}`}
              valueColor={deadlineColor}
            />
            <InfoRow
              icon="time-outline"
              label="Estimated"
              value={formatDuration(estMinutes)}
            />
            <InfoRow
              icon="speedometer-outline"
              label="Difficulty"
              value={DIFFICULTY_LABELS[task.difficulty] ?? '—'}
              valueColor={dColor}
            />
          </View>

          {/* Difficulty bar */}
          <View style={styles.diffBar}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View
                key={n}
                style={[
                  styles.diffSegment,
                  { backgroundColor: n <= task.difficulty ? dColor : colors.muted },
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── Progress ── */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Progress</Text>
            <Text style={styles.progressPct}>{liveProgress}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: isCompleted ? colors.success : pColor,
                },
              ]}
            />
            {/* Live sprint contribution overlay */}
            {sprintState !== 'idle' && liveSprintMinutes > 0 && (
              <View
                style={[
                  styles.progressLiveOverlay,
                  {
                    left: `${confirmedProgress}%` as any,
                    width: `${liveProgress - confirmedProgress}%` as any,
                  },
                ]}
              />
            )}
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Ionicons name="time-outline" size={13} color={colors.primaryLight} />
              <Text style={styles.timeLabel}>Spent</Text>
              <Text style={styles.timeValue}>{formatDuration(spentMinutes)}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeItem}>
              <Ionicons name="hourglass-outline" size={13} color={colors.mutedForeground} />
              <Text style={styles.timeLabel}>Estimated</Text>
              <Text style={styles.timeValue}>{formatDuration(estMinutes)}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeItem}>
              <Ionicons name="bar-chart-outline" size={13} color={colors.accent} />
              <Text style={styles.timeLabel}>Remaining</Text>
              <Text style={styles.timeValue}>
                {formatDuration(Math.max(0, estMinutes - spentMinutes))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Focus Sprint ── */}
        <View style={styles.sprintCard}>
          <View style={styles.sprintHeader}>
            <Ionicons name="timer-outline" size={16} color={colors.primaryLight} />
            <Text style={styles.sectionTitle}>Focus Sprint</Text>
          </View>

          {sprintState === 'idle' && (
            <TouchableOpacity
              style={[styles.startBtn, isCompleted && styles.startBtnDisabled]}
              onPress={handleStartSprint}
              disabled={isCompleted}
              activeOpacity={0.85}
            >
              <Ionicons name="play" size={18} color={colors.white} style={{ marginLeft: 2 }} />
              <Text style={styles.startBtnText}>
                {isCompleted ? 'Task Completed' : 'Start Focus Sprint'}
              </Text>
            </TouchableOpacity>
          )}

          {(sprintState === 'running' || sprintState === 'paused') && (
            <View style={styles.timerBox}>
              {/* Live indicator */}
              <View style={styles.timerStatus}>
                {sprintState === 'running' ? (
                  <>
                    <View style={styles.liveDot} />
                    <Text style={styles.timerStatusText}>LIVE SESSION</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="pause" size={10} color={colors.warning} />
                    <Text style={[styles.timerStatusText, { color: colors.warning }]}>PAUSED</Text>
                  </>
                )}
              </View>

              <Text style={styles.timerDisplay}>{formatTimer(sprintSeconds)}</Text>
              <Text style={styles.timerSub}>
                {liveSprintMinutes > 0
                  ? `+${liveSprintMinutes}m this sprint`
                  : 'Tracking started'}
              </Text>

              <View style={styles.timerControls}>
                {sprintState === 'running' ? (
                  <TouchableOpacity style={styles.pauseBtn} onPress={handlePauseSprint}>
                    <Ionicons name="pause" size={16} color={colors.foreground} />
                    <Text style={styles.pauseBtnText}>Pause</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.resumeBtn} onPress={handleResumeSprint}>
                    <Ionicons name="play" size={16} color={colors.white} style={{ marginLeft: 1 }} />
                    <Text style={styles.resumeBtnText}>Resume</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.stopBtn, stopSaving && { opacity: 0.6 }]}
                  onPress={handleStopSprint}
                  disabled={stopSaving}
                >
                  {stopSaving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="stop" size={16} color={colors.white} />
                      <Text style={styles.stopBtnText}>Stop & Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Success message ── */}
        {successMsg !== '' && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* ── Mark as Done ── */}
        <TouchableOpacity
          style={[
            styles.doneBtn,
            isCompleted && styles.doneBtnCompleted,
            (completing || isCompleted) && { opacity: isCompleted ? 0.7 : 0.6 },
          ]}
          onPress={handleMarkDone}
          disabled={completing || isCompleted}
          activeOpacity={0.85}
        >
          {completing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={22}
                color={colors.white}
              />
              <Text style={styles.doneBtnText}>
                {isCompleted ? 'Completed ✓' : 'Mark as Done'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon} size={14} color={colors.mutedForeground} style={infoStyles.icon} />
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 1,
  },
  icon: { width: 18, textAlign: 'center' },
  label: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    fontWeight: '600',
    width: 72,
  },
  value: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.foreground,
    fontWeight: '500',
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.section,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexShrink: 0,
  },
  deleteBtn: {
    backgroundColor: colors.destructiveDim,
    borderColor: colors.destructive + '30',
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.md,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  headerActions: { flexDirection: 'row', gap: spacing.sm },

  // Badges
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // Info card
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
  },
  description: {
    fontSize: typography.sm,
    color: colors.subtext,
    lineHeight: 20,
  },
  noDescription: {
    fontSize: typography.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  infoGrid: { gap: 0 },
  diffBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  diffSegment: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
  },

  // Progress card
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: 0.3,
  },
  progressPct: {
    fontSize: typography.lg,
    fontWeight: '800',
    color: colors.foreground,
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.muted,
    borderRadius: radius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.full,
  },
  progressLiveOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.primaryLight + '60',
    borderRadius: radius.full,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.cardBorder,
  },
  timeLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: typography.sm,
    color: colors.foreground,
    fontWeight: '700',
  },

  // Sprint card
  sprintCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.lg,
  },
  sprintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.primary,
  },
  startBtnDisabled: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  startBtnText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.white,
  },
  timerBox: {
    backgroundColor: colors.primaryDim,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  timerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  timerStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 1.5,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
  },
  timerControls: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  pauseBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pauseBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.foreground,
  },
  resumeBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.primary,
  },
  resumeBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.white,
  },
  stopBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.destructive,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stopBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.white,
  },

  // Success banner
  successBanner: {
    backgroundColor: colors.secondaryDim,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  successText: {
    fontSize: typography.xs,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },

  // Mark done button
  doneBtn: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.success,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  doneBtnCompleted: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  doneBtnText: {
    fontSize: typography.base,
    fontWeight: '800',
    color: colors.white,
  },
});
