import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../services/taskService';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'TaskInput'>;

const TASK_TYPES = [
  { key: 'assignment', label: 'Assignment', icon: 'document-text-outline' as const },
  { key: 'quiz',       label: 'Quiz',       icon: 'help-circle-outline' as const },
  { key: 'midterm',    label: 'Midterm',    icon: 'school-outline' as const },
  { key: 'final',      label: 'Final',      icon: 'trophy-outline' as const },
  { key: 'project',    label: 'Project',    icon: 'construct-outline' as const },
  { key: 'other',      label: 'Other',      icon: 'ellipsis-horizontal-circle-outline' as const },
] as const;
type TaskType = (typeof TASK_TYPES)[number]['key'];

const DURATIONS = [
  { label: '30m', minutes: 30 },
  { label: '1h',  minutes: 60 },
  { label: '2h',  minutes: 120 },
  { label: '3h',  minutes: 180 },
  { label: '4h+', minutes: 240 },
];

const DIFFICULTY_LABELS = ['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
const DIFFICULTY_COLORS = ['', colors.success, colors.success, colors.warning, '#f97316', colors.destructive];

function todayPlusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function TaskInputScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();

  const [taskType, setTaskType] = useState<TaskType>('assignment');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [deadline, setDeadline] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [duration, setDuration] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const diffColor = DIFFICULTY_COLORS[difficulty];
  const estimate = {
    hours: (duration / 60).toFixed(1),
    complexity: difficulty <= 2 ? 'Low' : difficulty <= 3 ? 'Medium' : 'High',
    priority: difficulty >= 4 ? 'High' : difficulty >= 3 ? 'Medium' : 'Low',
  };

  const handleSubmit = async () => {
    if (!user) { setError('Please sign in to create tasks.'); return; }
    if (!title.trim()) { setError('Task title is required.'); return; }
    if (!deadline) { setError('Deadline is required (YYYY-MM-DD).'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      setError('Use format YYYY-MM-DD (e.g. 2025-12-31).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await taskService.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        type: taskType,
        course: course.trim() || undefined,
        deadline,
        difficulty,
        estimatedDuration: duration,
      });
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Task</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* ── Task Type ── */}
          <View>
            <Text style={styles.fieldLabel}>Task Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typePicker}
            >
              {TASK_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, taskType === t.key && styles.typeBtnActive]}
                  onPress={() => setTaskType(t.key)}
                >
                  <Ionicons
                    name={t.icon}
                    size={14}
                    color={taskType === t.key ? colors.white : colors.mutedForeground}
                  />
                  <Text style={[styles.typeBtnText, taskType === t.key && styles.typeBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Title ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Task Title <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Binary Trees Implementation"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          {/* ── Course & Deadline row ── */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Course</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={course}
                  onChangeText={setCourse}
                  placeholder="CS201"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1.4 }]}>
              <Text style={styles.fieldLabel}>Deadline <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={deadline}
                  onChangeText={setDeadline}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>
          </View>

          {/* ── Quick Deadline Shortcuts ── */}
          <View style={styles.deadlineShortcuts}>
            {[
              { label: 'Tomorrow', days: 1 },
              { label: 'In 3 days', days: 3 },
              { label: 'Next week', days: 7 },
              { label: 'In 2 weeks', days: 14 },
            ].map((s) => (
              <TouchableOpacity
                key={s.label}
                style={styles.shortcutBtn}
                onPress={() => setDeadline(todayPlusDays(s.days))}
              >
                <Text style={styles.shortcutText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Description ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Description</Text>
            <View style={[styles.inputBox, styles.multilineBox]}>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add details, requirements, or notes…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Difficulty ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Difficulty</Text>
              <Text style={[styles.difficultyValue, { color: diffColor }]}>
                {DIFFICULTY_LABELS[difficulty]}
              </Text>
            </View>
            <View style={styles.difficultyRow}>
              {[1, 2, 3, 4, 5].map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[
                    styles.difficultySegment,
                    {
                      backgroundColor: l <= difficulty ? DIFFICULTY_COLORS[difficulty] : colors.muted,
                    },
                  ]}
                  onPress={() => setDifficulty(l)}
                />
              ))}
            </View>
          </View>

          {/* ── Duration ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Expected Duration</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d.label}
                  style={[styles.durationBtn, duration === d.minutes && styles.durationBtnActive]}
                  onPress={() => setDuration(d.minutes)}
                >
                  <Text
                    style={[
                      styles.durationBtnText,
                      duration === d.minutes && styles.durationBtnTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── AI Estimate ── */}
          <View style={styles.estimateCard}>
            <View style={styles.estimateIconBox}>
              <Ionicons name="hardware-chip" size={18} color={colors.primaryLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.estimateTitle}>AI Effort Estimate</Text>
              <Text style={styles.estimateSub}>
                ~{estimate.hours}h  ·  {estimate.complexity} complexity  ·  {estimate.priority} priority
              </Text>
            </View>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
          </View>

          {/* ── Error / Success ── */}
          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={styles.successText}>Task created successfully!</Text>
            </View>
          )}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[styles.submitBtn, (loading || success) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || success}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons
                  name={success ? 'checkmark' : 'add-circle-outline'}
                  size={20}
                  color={colors.white}
                />
                <Text style={styles.submitBtnText}>
                  {success ? 'Task Created!' : 'Create Task'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.xl,
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
  headerTitle: { fontSize: typography.lg, fontWeight: '800', color: colors.foreground },

  // Type Picker
  typePicker: { gap: spacing.sm, paddingVertical: spacing.xs },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { fontSize: typography.xs, fontWeight: '600', color: colors.mutedForeground },
  typeBtnTextActive: { color: colors.white },

  // Fields
  fieldGroup: { gap: spacing.sm },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: typography.xs, color: colors.mutedForeground, fontWeight: '700', letterSpacing: 0.5 },
  required: { color: colors.destructive },
  difficultyValue: { fontSize: typography.xs, fontWeight: '700' },
  inputBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  multilineBox: { paddingVertical: spacing.md },
  input: { fontSize: typography.base, color: colors.foreground },
  multiline: { minHeight: 72, lineHeight: 22 },

  // Row fields
  rowFields: { flexDirection: 'row', gap: spacing.sm },

  // Deadline shortcuts
  deadlineShortcuts: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  shortcutBtn: {
    backgroundColor: colors.muted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  shortcutText: { fontSize: typography.xs, color: colors.subtext, fontWeight: '600' },

  // Difficulty
  difficultyRow: { flexDirection: 'row', gap: spacing.sm },
  difficultySegment: { flex: 1, height: 8, borderRadius: radius.full },

  // Duration
  durationRow: { flexDirection: 'row', gap: spacing.sm },
  durationBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  durationBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  durationBtnText: { fontSize: typography.xs, fontWeight: '700', color: colors.mutedForeground },
  durationBtnTextActive: { color: colors.white },

  // Estimate
  estimateCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  estimateIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimateTitle: { fontSize: typography.xs, fontWeight: '700', color: colors.primaryLight, marginBottom: 3 },
  estimateSub: { fontSize: typography.xs, color: colors.mutedForeground },

  // Feedback
  errorBox: {
    backgroundColor: colors.destructiveDim,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.destructive + '30',
  },
  errorText: { fontSize: typography.xs, color: colors.destructive, flex: 1 },
  successBox: {
    backgroundColor: colors.secondaryDim,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  successText: { fontSize: typography.xs, color: colors.success, flex: 1 },

  // Submit
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.primary,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: typography.base, fontWeight: '700', color: colors.white },
});
