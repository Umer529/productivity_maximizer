import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { focusSessionService, FocusSession } from '../services/focusSessionService';
import { taskService, Task } from '../services/taskService';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Focus'>;

const SESSION_TYPES = [
  { key: 'study', label: 'Study', icon: 'book-outline' as const, color: colors.primary },
  { key: 'revision', label: 'Revision', icon: 'refresh-circle-outline' as const, color: colors.accent },
  { key: 'break', label: 'Break', icon: 'cafe-outline' as const, color: colors.secondary },
];

const AMBIENT = [
  { icon: 'rainy-outline' as const, label: 'Rain' },
  { icon: 'radio-outline' as const, label: 'White Noise' },
  { icon: 'musical-notes-outline' as const, label: 'Lo-fi' },
  { icon: 'leaf-outline' as const, label: 'Nature' },
];

export default function FocusScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const { invalidateTaskCache, invalidateAnalyticsCache } = useAppData();
  const plannedDuration = user?.preferences?.focusDuration ?? 25;
  const totalSeconds = plannedDuration * 60;

  const [seconds, setSeconds] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [sessionType, setSessionType] = useState<'study' | 'revision' | 'break'>('study');
  const [activeAmbient, setActiveAmbient] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [taskProgress, setTaskProgress] = useState(50);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks actual focused seconds (pauses excluded) for accurate duration reporting
  const elapsedSecondsRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    focusSessionService
      .getActiveSession()
      .then((r) => {
        if (r.data) {
          setActiveSession(r.data);
          setIsRunning(true);
        }
      })
      .catch(() => {});

    // Load pending tasks
    taskService.getTasks({ status: 'pending' })
      .then((res) => setTasks(res.data.slice(0, 5)))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s - 1);
        elapsedSecondsRef.current += 1;
      }, 1000);
    } else if (seconds === 0 && isRunning) {
      setIsRunning(false);
      setCompletedSessions((c) => c + 1);
      handleEndSession(true);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, seconds]);

  useEffect(() => {
    const progress = (totalSeconds - seconds) / totalSeconds;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [seconds, totalSeconds, progressAnim]);

  useEffect(() => {
    if (isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRunning, pulseAnim]);

  const handleToggle = useCallback(async () => {
    if (!isRunning) {
      if (user && !activeSession) {
        elapsedSecondsRef.current = 0;
        try {
          const res = await focusSessionService.startSession({
            plannedDuration,
            sessionType,
            taskId: selectedTask?._id,
          });
          setActiveSession(res.data);
        } catch {
          // proceed with local timer even if backend call fails
        }
      }
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  }, [isRunning, user, activeSession, plannedDuration, sessionType, selectedTask]);

  const handleEndSession = useCallback(async (completed = false) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    if (completed && selectedTask) {
      setShowCompletionModal(true);
      return;
    }
    if (user && activeSession) {
      const actualDuration = Math.max(1, Math.round(elapsedSecondsRef.current / 60));
      try {
        await focusSessionService.endSession(activeSession._id, {
          interrupted: !completed,
          completed,
          actualDuration,
        });
      } catch {
        // ignore
      }
      invalidateTaskCache();
      invalidateAnalyticsCache();
    }
    navigation.goBack();
  }, [user, activeSession, navigation, selectedTask, invalidateTaskCache, invalidateAnalyticsCache]);

  const handleConfirmCompletion = useCallback(async () => {
    setShowCompletionModal(false);
    if (user && activeSession) {
      const actualDuration = Math.max(1, Math.round(elapsedSecondsRef.current / 60));
      try {
        await focusSessionService.endSession(activeSession._id, {
          completed: true,
          interrupted: false,
          taskProgress,
          actualDuration,
        });
      } catch {
        // ignore
      }
      invalidateTaskCache();
      invalidateAnalyticsCache();
    }
    navigation.goBack();
  }, [user, activeSession, taskProgress, navigation, invalidateTaskCache, invalidateAnalyticsCache]);

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(totalSeconds);
    elapsedSecondsRef.current = 0;
  };

  const progress = (totalSeconds - seconds) / totalSeconds;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const ringColor = isRunning ? colors.primary : colors.cardBorder;
  const currentType = SESSION_TYPES.find((s) => s.key === sessionType)!;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => handleEndSession(false)} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>FOCUS SESSION</Text>
            <Text style={styles.headerTitle}>{currentType.label} Mode</Text>
          </View>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>{completedSessions}</Text>
            <Text style={styles.sessionBadgeLabel}>done</Text>
          </View>
        </View>

        {/* ── Session Type Selector ── */}
        <View style={styles.typeRow}>
          {SESSION_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.typeBtn,
                sessionType === t.key && { backgroundColor: t.color + '22', borderColor: t.color + '60' },
              ]}
              onPress={() => !isRunning && setSessionType(t.key as typeof sessionType)}
              disabled={isRunning}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={sessionType === t.key ? t.color : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  sessionType === t.key && { color: t.color },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Timer Ring ── */}
        <View style={styles.timerArea}>
          <Animated.View style={[styles.ringOuter, { transform: [{ scale: pulseAnim }] }]}>
            {/* Background ring */}
            <View style={[styles.ringBg, { borderColor: colors.cardBorder }]} />
            {/* Progress ring (CSS border trick) */}
            <View
              style={[
                styles.ringProgress,
                {
                  borderColor: 'transparent',
                  borderTopColor: ringColor,
                  borderRightColor: progress > 0.25 ? ringColor : 'transparent',
                  borderBottomColor: progress > 0.5 ? ringColor : 'transparent',
                  borderLeftColor: progress > 0.75 ? ringColor : 'transparent',
                  transform: [{ rotate: `${progress * 360 - 90}deg` }],
                },
              ]}
            />
            <View style={styles.ringInner}>
              <Text style={styles.timerText}>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </Text>
              <Text style={styles.timerSub}>{plannedDuration} min session</Text>
              {isRunning && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        {/* ── Controls ── */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={handleReset}>
            <Ionicons name="refresh" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: currentType.color }]}
            onPress={handleToggle}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={34}
              color={colors.white}
              style={!isRunning ? { marginLeft: 3 } : undefined}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => handleEndSession(false)}
          >
            <Ionicons name="stop" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* ── Status Pills ── */}
        <View style={styles.pills}>
          <StatusPill
            icon="shield-checkmark-outline"
            label="Focus Mode"
            active={isRunning}
            activeColor={colors.success}
          />
          <StatusPill
            icon="notifications-off-outline"
            label="DND Active"
            active={isRunning}
            activeColor={colors.accent}
          />
        </View>

        {/* ── Active Task ── */}
        <View style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>Active Task</Text>
            <TouchableOpacity
              style={styles.changeTaskBtn}
              onPress={() => setShowTaskPicker(!showTaskPicker)}
            >
              <Ionicons name="swap-horizontal" size={14} color={colors.primaryLight} />
              <Text style={styles.changeTaskText}>Change</Text>
            </TouchableOpacity>
          </View>
          {selectedTask ? (
            <View style={styles.taskInfo}>
              <View style={styles.taskTypeBadge}>
                <Text style={styles.taskTypeText}>{selectedTask.type}</Text>
              </View>
              <Text style={styles.taskName}>{selectedTask.title}</Text>
              <Text style={styles.taskMeta}>
                {selectedTask.course && `${selectedTask.course} • `}
                Due: {new Date(selectedTask.deadline).toLocaleDateString()}
              </Text>
            </View>
          ) : showTaskPicker ? (
            <View style={styles.taskPicker}>
              {tasks.length === 0 ? (
                <Text style={styles.noTasksText}>No pending tasks</Text>
              ) : (
                tasks.map((task) => (
                  <TouchableOpacity
                    key={task._id}
                    style={styles.taskOption}
                    onPress={() => {
                      setSelectedTask(task);
                      setShowTaskPicker(false);
                    }}
                  >
                    <Text style={styles.taskOptionTitle}>{task.title}</Text>
                    <Text style={styles.taskOptionMeta}>
                      {task.course} • {task.difficulty}/5
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectTaskBtn}
              onPress={() => setShowTaskPicker(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primaryLight} />
              <Text style={styles.selectTaskText}>Select a task to focus on</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Ambient Sounds ── */}
        <View style={styles.ambientCard}>
          <Text style={styles.ambientTitle}>Ambient Sounds</Text>
          <View style={styles.ambientRow}>
            {AMBIENT.map((s) => (
              <TouchableOpacity
                key={s.label}
                style={[
                  styles.ambientBtn,
                  activeAmbient === s.label && styles.ambientBtnActive,
                ]}
                onPress={() =>
                  setActiveAmbient(activeAmbient === s.label ? null : s.label)
                }
              >
                <Ionicons
                  name={s.icon}
                  size={18}
                  color={activeAmbient === s.label ? colors.primaryLight : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.ambientBtnText,
                    activeAmbient === s.label && { color: colors.primaryLight },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Tips ── */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={16} color={colors.warning} />
          <Text style={styles.tipText}>
            Stay off social media during your session. Every interruption costs ~23 minutes of focus recovery.
          </Text>
        </View>
      </ScrollView>

      {/* ── Session Completion Modal ── */}
      <Modal
        visible={showCompletionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={completionStyles.overlay}>
          <View style={completionStyles.card}>
            <View style={completionStyles.iconBox}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            </View>
            <Text style={completionStyles.title}>Session Complete!</Text>
            <Text style={completionStyles.sub}>
              Great work on "{selectedTask?.title}"!{'\n'}How much of the task did you complete?
            </Text>

            {/* Progress slider as step buttons */}
            <View style={completionStyles.progressRow}>
              {[0, 25, 50, 75, 100].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[
                    completionStyles.progressBtn,
                    taskProgress === pct && completionStyles.progressBtnActive,
                  ]}
                  onPress={() => setTaskProgress(pct)}
                >
                  <Text
                    style={[
                      completionStyles.progressBtnText,
                      taskProgress === pct && completionStyles.progressBtnTextActive,
                    ]}
                  >
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={completionStyles.doneBtn} onPress={handleConfirmCompletion}>
              <Ionicons name="checkmark" size={18} color={colors.white} />
              <Text style={completionStyles.doneBtnText}>Save & Finish</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={completionStyles.skipBtn}
              onPress={() => { setShowCompletionModal(false); navigation.goBack(); }}
            >
              <Text style={completionStyles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatusPill({
  icon,
  label,
  active,
  activeColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  activeColor: string;
}) {
  return (
    <View
      style={[
        pillStyles.pill,
        active
          ? { backgroundColor: activeColor + '20', borderColor: activeColor + '40' }
          : { backgroundColor: colors.muted, borderColor: colors.cardBorder },
      ]}
    >
      <Ionicons name={icon} size={13} color={active ? activeColor : colors.mutedForeground} />
      <Text style={[pillStyles.text, active && { color: activeColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerLabel: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  headerTitle: { fontSize: typography.base, fontWeight: '700', color: colors.foreground },
  sessionBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sessionBadgeText: { fontSize: typography.md, fontWeight: '800', color: colors.foreground, lineHeight: 18 },
  sessionBadgeLabel: { fontSize: 8, color: colors.mutedForeground, fontWeight: '600' },

  // Type Selector
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  typeBtnText: { fontSize: typography.xs, fontWeight: '600', color: colors.mutedForeground },

  // Timer
  timerArea: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  ringOuter: {
    width: 248,
    height: 248,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBg: {
    position: 'absolute',
    width: 248,
    height: 248,
    borderRadius: 124,
    borderWidth: 8,
  },
  ringProgress: {
    position: 'absolute',
    width: 248,
    height: 248,
    borderRadius: 124,
    borderWidth: 8,
  },
  ringInner: { alignItems: 'center', gap: spacing.xs },
  timerText: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  timerSub: { fontSize: typography.sm, color: colors.mutedForeground },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: { fontSize: 10, color: colors.success, fontWeight: '700', letterSpacing: 1 },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },

  // Pills
  pills: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },

  // Ambient
  ambientCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
  },
  ambientTitle: { fontSize: typography.sm, fontWeight: '700', color: colors.foreground },
  ambientRow: { flexDirection: 'row', gap: spacing.sm },
  ambientBtn: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ambientBtnActive: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary + '40',
  },
  ambientBtnText: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600' },

  // Tip
  tipCard: {
    backgroundColor: colors.warningDim,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  tipText: { flex: 1, fontSize: typography.xs, color: colors.subtext, lineHeight: 18 },

  // Task Card
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: { fontSize: typography.sm, fontWeight: '700', color: colors.foreground },
  changeTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  changeTaskText: { fontSize: typography.xs, color: colors.primaryLight, fontWeight: '600' },
  taskInfo: { gap: spacing.sm },
  taskTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  taskTypeText: { fontSize: 10, color: colors.primaryLight, fontWeight: '700' },
  taskName: { fontSize: typography.base, fontWeight: '600', color: colors.foreground },
  taskMeta: { fontSize: typography.xs, color: colors.mutedForeground },
  taskPicker: { gap: spacing.sm },
  noTasksText: { fontSize: typography.sm, color: colors.mutedForeground, textAlign: 'center', paddingVertical: spacing.md },
  taskOption: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  taskOptionTitle: { fontSize: typography.sm, fontWeight: '600', color: colors.foreground },
  taskOptionMeta: { fontSize: typography.xs, color: colors.mutedForeground },
  selectTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: radius.md,
    borderStyle: 'dashed',
  },
  selectTaskText: { fontSize: typography.sm, color: colors.primaryLight, fontWeight: '600' },
});

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  text: { fontSize: typography.xs, color: colors.mutedForeground, fontWeight: '600' },
});

const completionStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.secondaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { fontSize: typography.xl, fontWeight: '800', color: colors.foreground },
  sub: {
    fontSize: typography.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  progressBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  progressBtnActive: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary + '60',
  },
  progressBtnText: { fontSize: typography.xs, fontWeight: '700', color: colors.mutedForeground },
  progressBtnTextActive: { color: colors.primaryLight },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    width: '100%',
    height: 52,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  doneBtnText: { fontSize: typography.base, fontWeight: '700', color: colors.white },
  skipBtn: { paddingVertical: spacing.sm },
  skipBtnText: { fontSize: typography.sm, color: colors.mutedForeground },
});
