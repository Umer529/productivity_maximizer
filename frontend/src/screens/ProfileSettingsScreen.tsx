import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const DIET_OPTIONS = ['Poor', 'Fair', 'Good', 'Excellent'];
const INTERNET_OPTIONS = ['Poor', 'Fair', 'Good', 'Excellent'];
const EDUCATION_OPTIONS = ['High School', 'Bachelor', 'Master', 'PhD'];
const SEMESTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const STUDY_HOURS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function generateTimeOptions() {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const hourStr = hour.toString().padStart(2, '0');
      const minStr = min.toString().padStart(2, '0');
      options.push(`${hourStr}:${minStr}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

export default function ProfileSettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, updateUser } = useAuth();
  const route = useRoute();
  const section = (route.params as any)?.section || 'preferences';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Preferences
  const [cgpaTarget, setCgpaTarget] = useState(String(user?.preferences?.cgpaTarget || 3.5));
  const [semester, setSemester] = useState(String(user?.preferences?.semester || 1));
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(String(user?.preferences?.studyHoursPerDay || 6));
  const [focusDuration, setFocusDuration] = useState(String(user?.preferences?.focusDuration || 25));
  const [breakDuration, setBreakDuration] = useState(String(user?.preferences?.breakDuration || 5));
  const [namazBreaksEnabled, setNamazBreaksEnabled] = useState(user?.preferences?.namazBreaksEnabled || false);
  const [sleepStart, setSleepStart] = useState(user?.preferences?.sleepStart || '23:00');
  const [sleepEnd, setSleepEnd] = useState(user?.preferences?.sleepEnd || '07:00');
  const [studyStartTime, setStudyStartTime] = useState(user?.preferences?.studyStartTime || '09:00');
  const [studyEndTime, setStudyEndTime] = useState(user?.preferences?.studyEndTime || '18:00');

  // Picker modals
  const [semesterPickerVisible, setSemesterPickerVisible] = useState(false);
  const [studyHoursPickerVisible, setStudyHoursPickerVisible] = useState(false);
  const [sleepStartPickerVisible, setSleepStartPickerVisible] = useState(false);
  const [sleepEndPickerVisible, setSleepEndPickerVisible] = useState(false);
  const [studyStartPickerVisible, setStudyStartPickerVisible] = useState(false);
  const [studyEndPickerVisible, setStudyEndPickerVisible] = useState(false);

  // ML Features
  const [age, setAge] = useState(String(user?.age || 20));
  const [gender, setGender] = useState(user?.gender || 'Male');
  const [socialMediaHours, setSocialMediaHours] = useState(String(user?.socialMediaHours || 2));
  const [netflixHours, setNetflixHours] = useState(String(user?.netflixHours || 1));
  const [hasPartTimeJob, setHasPartTimeJob] = useState(user?.hasPartTimeJob || false);
  const [attendancePercentage, setAttendancePercentage] = useState(String(user?.attendancePercentage || 95));
  const [sleepHours, setSleepHours] = useState(String(user?.sleepHours || 7));
  const [dietQuality, setDietQuality] = useState(user?.dietQuality || 'Fair');
  const [exerciseFrequency, setExerciseFrequency] = useState(String(user?.exerciseFrequency || 3));
  const [parentalEducationLevel, setParentalEducationLevel] = useState(user?.parentalEducationLevel || 'Bachelor');
  const [internetQuality, setInternetQuality] = useState(user?.internetQuality || 'Good');
  const [mentalHealthRating, setMentalHealthRating] = useState(String(user?.mentalHealthRating || 7));
  const [extraCurricularParticipation, setExtraCurricularParticipation] = useState(user?.extraCurricularParticipation || false);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await api.put<{ success: boolean; user: any }>('/auth/profile', {
        // Preferences
        cgpaTarget: parseFloat(cgpaTarget),
        semester: parseInt(semester),
        studyHoursPerDay: parseFloat(studyHoursPerDay),
        focusDuration: parseInt(focusDuration),
        breakDuration: parseInt(breakDuration),
        namazBreaksEnabled,
        sleepStart,
        sleepEnd,
        studyStartTime,
        studyEndTime,
        // ML Features
        age: parseInt(age),
        gender,
        socialMediaHours: parseFloat(socialMediaHours),
        netflixHours: parseFloat(netflixHours),
        hasPartTimeJob,
        attendancePercentage: parseFloat(attendancePercentage),
        sleepHours: parseFloat(sleepHours),
        dietQuality,
        exerciseFrequency: parseInt(exerciseFrequency),
        parentalEducationLevel,
        internetQuality,
        mentalHealthRating: parseInt(mentalHealthRating),
        extraCurricularParticipation,
      });

      if (res.success) {
        updateUser(res.user);
        setSuccess(true);
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Study Preferences ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Preferences</Text>
          
          <SettingRow label="CGPA Target">
            <TextInput
              style={styles.input}
              value={cgpaTarget}
              onChangeText={setCgpaTarget}
              keyboardType="decimal-pad"
            />
          </SettingRow>

          <SettingRow label="Semester">
            <PickerButton value={`Semester ${semester}`} onPress={() => setSemesterPickerVisible(true)} />
          </SettingRow>

          <SettingRow label="Study Hours/Day">
            <PickerButton value={`${studyHoursPerDay} hours`} onPress={() => setStudyHoursPickerVisible(true)} />
          </SettingRow>

          <SettingRow label="Focus Duration (min)">
            <TextInput
              style={styles.input}
              value={focusDuration}
              onChangeText={setFocusDuration}
              keyboardType="number-pad"
            />
          </SettingRow>

          <SettingRow label="Break Duration (min)">
            <TextInput
              style={styles.input}
              value={breakDuration}
              onChangeText={setBreakDuration}
              keyboardType="number-pad"
            />
          </SettingRow>

          <SettingRow label="Namaz Breaks">
            <TouchableOpacity
              style={[styles.toggle, namazBreaksEnabled && styles.toggleActive]}
              onPress={() => setNamazBreaksEnabled(!namazBreaksEnabled)}
            >
              <View style={[styles.toggleDot, namazBreaksEnabled && styles.toggleDotActive]} />
            </TouchableOpacity>
          </SettingRow>

          <SettingRow label="Sleep Start">
            <PickerButton value={sleepStart} onPress={() => setSleepStartPickerVisible(true)} />
          </SettingRow>

          <SettingRow label="Sleep End">
            <PickerButton value={sleepEnd} onPress={() => setSleepEndPickerVisible(true)} />
          </SettingRow>

          <SettingRow label="Study Start">
            <PickerButton value={studyStartTime} onPress={() => setStudyStartPickerVisible(true)} />
          </SettingRow>

          <SettingRow label="Study End">
            <PickerButton value={studyEndTime} onPress={() => setStudyEndPickerVisible(true)} />
          </SettingRow>
        </View>

        {/* ── ML Features ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Personalization Features</Text>
          <Text style={styles.sectionSub}>These help our AI optimize your schedule</Text>

          <SettingRow label="Age">
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
          </SettingRow>

          <SettingRow label="Gender">
            <View style={styles.optionsRow}>
              {['Male', 'Female'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionBtn, gender === g && styles.optionBtnActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.optionText, gender === g && styles.optionTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>

          <SettingRow label="Social Media Hours/Day">
            <TextInput
              style={styles.input}
              value={socialMediaHours}
              onChangeText={setSocialMediaHours}
              keyboardType="decimal-pad"
            />
          </SettingRow>

          <SettingRow label="Netflix Hours/Day">
            <TextInput
              style={styles.input}
              value={netflixHours}
              onChangeText={setNetflixHours}
              keyboardType="decimal-pad"
            />
          </SettingRow>

          <SettingRow label="Part-time Job">
            <TouchableOpacity
              style={[styles.toggle, hasPartTimeJob && styles.toggleActive]}
              onPress={() => setHasPartTimeJob(!hasPartTimeJob)}
            >
              <View style={[styles.toggleDot, hasPartTimeJob && styles.toggleDotActive]} />
            </TouchableOpacity>
          </SettingRow>

          <SettingRow label="Attendance %">
            <TextInput
              style={styles.input}
              value={attendancePercentage}
              onChangeText={setAttendancePercentage}
              keyboardType="decimal-pad"
            />
          </SettingRow>

          <SettingRow label="Sleep Hours">
            <TextInput
              style={styles.input}
              value={sleepHours}
              onChangeText={setSleepHours}
              keyboardType="decimal-pad"
            />
          </SettingRow>

          <SettingRow label="Diet Quality">
            <View style={styles.optionsRow}>
              {DIET_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.optionBtn, dietQuality === d && styles.optionBtnActive]}
                  onPress={() => setDietQuality(d)}
                >
                  <Text style={[styles.optionText, dietQuality === d && styles.optionTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>

          <SettingRow label="Exercise Frequency (days/week)">
            <TextInput
              style={styles.input}
              value={exerciseFrequency}
              onChangeText={setExerciseFrequency}
              keyboardType="number-pad"
            />
          </SettingRow>

          <SettingRow label="Parental Education">
            <View style={styles.optionsRow}>
              {EDUCATION_OPTIONS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.optionBtn, parentalEducationLevel === e && styles.optionBtnActive]}
                  onPress={() => setParentalEducationLevel(e)}
                >
                  <Text style={[styles.optionText, parentalEducationLevel === e && styles.optionTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>

          <SettingRow label="Internet Quality">
            <View style={styles.optionsRow}>
              {INTERNET_OPTIONS.map((i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.optionBtn, internetQuality === i && styles.optionBtnActive]}
                  onPress={() => setInternetQuality(i)}
                >
                  <Text style={[styles.optionText, internetQuality === i && styles.optionTextActive]}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>

          <SettingRow label="Mental Health (1-10)">
            <TextInput
              style={styles.input}
              value={mentalHealthRating}
              onChangeText={setMentalHealthRating}
              keyboardType="number-pad"
            />
          </SettingRow>

          <SettingRow label="Extra-curricular Activities">
            <TouchableOpacity
              style={[styles.toggle, extraCurricularParticipation && styles.toggleActive]}
              onPress={() => setExtraCurricularParticipation(!extraCurricularParticipation)}
            >
              <View style={[styles.toggleDot, extraCurricularParticipation && styles.toggleDotActive]} />
            </TouchableOpacity>
          </SettingRow>
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
            <Text style={styles.successText}>Profile updated successfully!</Text>
          </View>
        )}

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, (loading || success) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading || success}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name={success ? 'checkmark' : 'save-outline'} size={20} color={colors.white} />
              <Text style={styles.saveBtnText}>{success ? 'Saved!' : 'Save Changes'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Picker Modals */}
      <PickerModal
        visible={semesterPickerVisible}
        onClose={() => setSemesterPickerVisible(false)}
        options={SEMESTER_OPTIONS}
        selectedValue={semester}
        onSelect={setSemester}
        label="Semester"
      />

      <PickerModal
        visible={studyHoursPickerVisible}
        onClose={() => setStudyHoursPickerVisible(false)}
        options={STUDY_HOURS_OPTIONS}
        selectedValue={studyHoursPerDay}
        onSelect={setStudyHoursPerDay}
        label="Study Hours"
      />

      <PickerModal
        visible={sleepStartPickerVisible}
        onClose={() => setSleepStartPickerVisible(false)}
        options={TIME_OPTIONS}
        selectedValue={sleepStart}
        onSelect={setSleepStart}
        label="Sleep Start"
      />

      <PickerModal
        visible={sleepEndPickerVisible}
        onClose={() => setSleepEndPickerVisible(false)}
        options={TIME_OPTIONS}
        selectedValue={sleepEnd}
        onSelect={setSleepEnd}
        label="Sleep End"
      />

      <PickerModal
        visible={studyStartPickerVisible}
        onClose={() => setStudyStartPickerVisible(false)}
        options={TIME_OPTIONS}
        selectedValue={studyStartTime}
        onSelect={setStudyStartTime}
        label="Study Start"
      />

      <PickerModal
        visible={studyEndPickerVisible}
        onClose={() => setStudyEndPickerVisible(false)}
        options={TIME_OPTIONS}
        selectedValue={studyEndTime}
        onSelect={setStudyEndTime}
        label="Study End"
      />
    </SafeAreaView>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={rowStyles.container}>
      <Text style={rowStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

function PickerButton({ value, onPress }: any) {
  return (
    <TouchableOpacity style={rowStyles.pickerBtn} onPress={onPress}>
      <Text style={rowStyles.pickerBtnText}>{value}</Text>
      <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function PickerModal({ visible, onClose, options, selectedValue, onSelect, label }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Select {label}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.optionsList}>
            {options.map((option: string) => (
              <TouchableOpacity
                key={option}
                style={[modalStyles.option, selectedValue === option && modalStyles.optionSelected]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text style={[modalStyles.optionText, selectedValue === option && modalStyles.optionTextSelected]}>
                  {option}
                </Text>
                {selectedValue === option && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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

  // Section
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.lg,
  },
  sectionTitle: { fontSize: typography.base, fontWeight: '700', color: colors.foreground },
  sectionSub: { fontSize: typography.xs, color: colors.mutedForeground, marginTop: -spacing.sm },

  // Input
  input: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    color: colors.foreground,
    minWidth: 80,
    textAlign: 'right',
  },

  // Toggle
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  toggleDotActive: { transform: [{ translateX: 20 }] },

  // Options
  optionsRow: { flexDirection: 'row', gap: spacing.sm },
  optionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionBtnActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary + '40' },
  optionText: { fontSize: typography.xs, color: colors.mutedForeground, fontWeight: '600', textAlign: 'center' },
  optionTextActive: { color: colors.primaryLight },

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

  // Save
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.primary,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: typography.base, fontWeight: '700', color: colors.white },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: typography.sm, color: colors.foreground, fontWeight: '500' },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pickerBtnText: {
    fontSize: typography.sm,
    color: colors.foreground,
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    paddingVertical: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  optionSelected: {
    backgroundColor: colors.primaryDim,
  },
  optionText: {
    fontSize: typography.base,
    color: colors.foreground,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
