import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors, spacing, radius, typography } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'> & {
  onComplete: () => void;
};

export default function OnboardingScreen({ onComplete }: Props) {
  const { user, updateUser } = useAuth();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [cgpaTarget, setCgpaTarget] = useState('3.5');
  const [semester, setSemester] = useState('1');
  const [studyHoursPerDay, setStudyHoursPerDay] = useState('6');
  const [focusDuration, setFocusDuration] = useState('25');
  const [breakDuration, setBreakDuration] = useState('5');
  const [namazBreaksEnabled, setNamazBreaksEnabled] = useState(true);
  const [sleepStart, setSleepStart] = useState('23:00');
  const [sleepEnd, setSleepEnd] = useState('07:00');

  const handleNext = async () => {
    if (current < 2) {
      setCurrent(current + 1);
    } else {
      // Save and complete
      setLoading(true);
      setError('');
      try {
        const res = await api.put<{ success: boolean; user: any }>('/auth/profile', {
          cgpaTarget: parseFloat(cgpaTarget),
          semester: parseInt(semester),
          studyHoursPerDay: parseFloat(studyHoursPerDay),
          focusDuration: parseInt(focusDuration),
          breakDuration: parseInt(breakDuration),
          namazBreaksEnabled,
          sleepStart,
          sleepEnd,
        });
        if (res.success) {
          updateUser(res.user);
          onComplete();
        }
      } catch (err: any) {
        setError(err.message || 'Failed to save preferences');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderSlide = () => {
    switch (current) {
      case 0:
        return (
          <>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="hardware-chip" size={64} color={colors.primary} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>Welcome to FocusFlow AI</Text>
              <Text style={styles.subtitle}>AI-powered smart study planner that adapts to your rhythm</Text>
            </View>
          </>
        );
      case 1:
        return (
          <>
            <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
              <Ionicons name="flag" size={64} color={colors.secondary} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>Set Academic Goals</Text>
              <Text style={styles.subtitle}>Define your CGPA target and study preferences</Text>
            </View>
            <View style={styles.form}>
              <FormInput label="CGPA Target" value={cgpaTarget} onChangeText={setCgpaTarget} keyboardType="decimal-pad" placeholder="3.5" />
              <FormInput label="Current Semester" value={semester} onChangeText={setSemester} keyboardType="number-pad" placeholder="1" />
              <FormInput label="Study Hours/Day" value={studyHoursPerDay} onChangeText={setStudyHoursPerDay} keyboardType="decimal-pad" placeholder="6" />
            </View>
          </>
        );
      case 2:
        return (
          <>
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="time" size={64} color={colors.accent} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>Smart Preferences</Text>
              <Text style={styles.subtitle}>Customize your focus sessions and schedule</Text>
            </View>
            <View style={styles.form}>
              <FormInput label="Focus Duration (min)" value={focusDuration} onChangeText={setFocusDuration} keyboardType="number-pad" placeholder="25" />
              <FormInput label="Break Duration (min)" value={breakDuration} onChangeText={setBreakDuration} keyboardType="number-pad" placeholder="5" />
              <ToggleRow label="Enable Namaz Breaks" value={namazBreaksEnabled} onToggle={setNamazBreaksEnabled} />
              <FormInput label="Sleep Start" value={sleepStart} onChangeText={setSleepStart} placeholder="23:00" />
              <FormInput label="Sleep End" value={sleepEnd} onChangeText={setSleepEnd} placeholder="07:00" />
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {renderSlide()}

        {/* Dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>

        {/* Error */}
        {error !== '' && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttons}>
          {current > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrent(current - 1)} disabled={loading}>
              <Ionicons name="chevron-back" size={20} color={colors.mutedForeground} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.nextBtn, current === 0 && { flex: 1 }]} onPress={handleNext} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.nextBtnText}>{current < 2 ? 'Next' : 'Get Started'}</Text>
                {current < 2 && <Ionicons name="chevron-forward" size={18} color={colors.white} />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FormInput({ label, value, onChangeText, keyboardType, placeholder }: any) {
  return (
    <View style={formStyles.row}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        style={formStyles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

function ToggleRow({ label, value, onToggle }: any) {
  return (
    <View style={formStyles.row}>
      <Text style={formStyles.label}>{label}</Text>
      <TouchableOpacity style={[formStyles.toggle, value && formStyles.toggleActive]} onPress={() => onToggle(!value)}>
        <View style={[formStyles.toggleDot, value && formStyles.toggleDotActive]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  form: {
    width: '100%',
    gap: spacing.md,
    marginBottom: 32,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.muted,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.primary,
  },
  errorBox: {
    backgroundColor: colors.destructiveDim,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.destructive + '30',
    marginBottom: 16,
  },
  errorText: { fontSize: typography.xs, color: colors.destructive, flex: 1 },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: 16,
    height: 52,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  backBtnText: {
    fontSize: 16,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 52,
  },
  nextBtnText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '700',
  },
});

const formStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    fontSize: typography.sm,
    color: colors.foreground,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.muted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.sm,
    color: colors.foreground,
    minWidth: 80,
    textAlign: 'right',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.muted,
    padding: 2,
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  toggleDotActive: { transform: [{ translateX: 20 }] },
});
