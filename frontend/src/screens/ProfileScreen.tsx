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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const FOCUS_DURATION_OPTIONS = ['25', '45', '60', '90'];
const BREAK_FREQUENCY_OPTIONS = ['1', '2', '3', '4'];
const NAMAZ_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

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

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, updateUser, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Preferences state
  const [cgpaTarget, setCgpaTarget] = useState(String(user?.preferences?.cgpaTarget || 3.5));
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(String(user?.preferences?.studyHoursPerDay || 6));
  const [focusDuration, setFocusDuration] = useState(String(user?.preferences?.focusDuration || 25));
  const [breakDuration, setBreakDuration] = useState(String(user?.preferences?.breakDuration || 5));
  const [longBreakDuration, setLongBreakDuration] = useState(String(user?.preferences?.longBreakDuration || 15));
  const [longBreakAfter, setLongBreakAfter] = useState(String(user?.preferences?.longBreakAfter || 4));
  const [namazBreaksEnabled, setNamazBreaksEnabled] = useState(user?.preferences?.namazBreaksEnabled || false);
  const [selectedNamazPrayers, setSelectedNamazPrayers] = useState<string[]>(user?.preferences?.selectedNamazPrayers as string[] || []);
  const [sleepStart, setSleepStart] = useState(user?.preferences?.sleepStart || '23:00');
  const [sleepEnd, setSleepEnd] = useState(user?.preferences?.sleepEnd || '07:00');
  const [studyStartTime, setStudyStartTime] = useState(user?.preferences?.studyStartTime || '09:00');
  const [studyEndTime, setStudyEndTime] = useState(user?.preferences?.studyEndTime || '18:00');
  const [semester, setSemester] = useState(String(user?.preferences?.semester || 1));

  // Picker modals
  const [focusDurationPickerVisible, setFocusDurationPickerVisible] = useState(false);
  const [breakFrequencyPickerVisible, setBreakFrequencyPickerVisible] = useState(false);
  const [sleepStartPickerVisible, setSleepStartPickerVisible] = useState(false);
  const [sleepEndPickerVisible, setSleepEndPickerVisible] = useState(false);
  const [studyStartPickerVisible, setStudyStartPickerVisible] = useState(false);
  const [studyEndPickerVisible, setStudyEndPickerVisible] = useState(false);
  const [semesterPickerVisible, setSemesterPickerVisible] = useState(false);
  const [namazPrayersPickerVisible, setNamazPrayersPickerVisible] = useState(false);

  // Validation
  const [cgpaError, setCgpaError] = useState('');

  const handleSave = async () => {
    // Validation
    const cgpa = parseFloat(cgpaTarget);
    if (cgpa < 2.0 || cgpa > 4.0) {
      setCgpaError('CGPA must be between 2.0 and 4.0');
      return;
    }
    setCgpaError('');

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await api.put<{ success: boolean; user: any }>('/auth/profile', {
        cgpaTarget: parseFloat(cgpaTarget),
        studyHoursPerDay: parseFloat(studyHoursPerDay),
        focusDuration: parseInt(focusDuration),
        breakDuration: parseInt(breakDuration),
        longBreakDuration: parseInt(longBreakDuration),
        longBreakAfter: parseInt(longBreakAfter),
        namazBreaksEnabled,
        selectedNamazPrayers,
        sleepStart,
        sleepEnd,
        studyStartTime,
        studyEndTime,
        semester: parseInt(semester),
      });

      if (res.success) {
        updateUser(res.user);
        setSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCgpaTarget('3.5');
    setStudyHoursPerDay('6');
    setFocusDuration('25');
    setBreakDuration('5');
    setLongBreakDuration('15');
    setLongBreakAfter('4');
    setNamazBreaksEnabled(false);
    setSelectedNamazPrayers([]);
    setSleepStart('23:00');
    setSleepEnd('07:00');
    setStudyStartTime('09:00');
    setStudyEndTime('18:00');
    setSemester('1');
    setCgpaError('');
  };

  const toggleNamazPrayer = (prayer: string) => {
    if (selectedNamazPrayers.includes(prayer)) {
      setSelectedNamazPrayers(selectedNamazPrayers.filter(p => p !== prayer));
    } else {
      setSelectedNamazPrayers([...selectedNamazPrayers, prayer]);
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
          <Text style={styles.headerLabel}>ACCOUNT</Text>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Profile</Text>
            {!isEditing && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="pencil" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Avatar Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              {user ? (
                <Text style={styles.avatarText}>{user.name[0].toUpperCase()}</Text>
              ) : (
                <Ionicons name="person" size={36} color={colors.white} />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user ? user.name : 'Guest User'}</Text>
              <Text style={styles.profileEmail}>
                {user ? user.email : 'Sign in to personalize your experience'}
              </Text>
              {user && (
                <View style={styles.memberBadge}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.success} />
                  <Text style={styles.memberBadgeText}>Active Member</Text>
                </View>
              )}
            </View>
          </View>

          {user && (
            <>
              <View style={styles.profileDivider} />
              <View style={styles.statsRow}>
                <ProfileStat label="CGPA Target" value={isEditing ? cgpaTarget : String(user.preferences?.cgpaTarget || 3.5)} />
                <View style={styles.statDivider} />
                <ProfileStat label="Study/Day" value={`${isEditing ? studyHoursPerDay : (user.preferences?.studyHoursPerDay || 6)}h`} />
                <View style={styles.statDivider} />
                <ProfileStat label="Streak" value={`${user.streak || 0}d`} />
                <View style={styles.statDivider} />
                <ProfileStat label="Semester" value={`S${isEditing ? semester : (user.preferences?.semester || 1)}`} />
              </View>
            </>
          )}
        </View>

        {user ? (
          <>
            {/* ── Academic Goals Section ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Academic Goals</Text>
              <View style={styles.sectionCard}>
                {isEditing ? (
                  <>
                    <SettingRow label="CGPA Target (2.0-4.0)">
                      <Stepper
                        value={cgpaTarget}
                        onValueChange={(val) => {
                          setCgpaTarget(val);
                          setCgpaError('');
                        }}
                        min={2.0}
                        max={4.0}
                        step={0.1}
                      />
                    </SettingRow>
                    {cgpaError !== '' && <Text style={styles.errorText}>{cgpaError}</Text>}
                    <SettingRow label="Current Semester">
                      <PickerButton
                        value={`Semester ${semester}`}
                        onPress={() => setSemesterPickerVisible(true)}
                      />
                    </SettingRow>
                  </>
                ) : (
                  <>
                    <SettingRow label="CGPA Target">
                      <Text style={styles.valueText}>{user.preferences?.cgpaTarget || 3.5}</Text>
                    </SettingRow>
                    <View style={styles.divider} />
                    <SettingRow label="Current Semester">
                      <Text style={styles.valueText}>Semester {user.preferences?.semester || 1}</Text>
                    </SettingRow>
                  </>
                )}
              </View>
            </View>

            {/* ── Daily Routine Section ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Routine</Text>
              <View style={styles.sectionCard}>
                {isEditing ? (
                  <>
                    <SettingRow label="Study Hours/Day">
                      <Stepper
                        value={studyHoursPerDay}
                        onValueChange={(val) => setStudyHoursPerDay(val)}
                        min={1}
                        max={12}
                        step={0.5}
                      />
                    </SettingRow>
                    <SettingRow label="Sleep Schedule">
                      <View style={styles.timeRange}>
                        <PickerButton
                          value={sleepStart}
                          onPress={() => setSleepStartPickerVisible(true)}
                        />
                        <Text style={styles.timeSeparator}>–</Text>
                        <PickerButton
                          value={sleepEnd}
                          onPress={() => setSleepEndPickerVisible(true)}
                        />
                      </View>
                    </SettingRow>
                    <SettingRow label="Study Hours">
                      <View style={styles.timeRange}>
                        <PickerButton
                          value={studyStartTime}
                          onPress={() => setStudyStartPickerVisible(true)}
                        />
                        <Text style={styles.timeSeparator}>–</Text>
                        <PickerButton
                          value={studyEndTime}
                          onPress={() => setStudyEndPickerVisible(true)}
                        />
                      </View>
                    </SettingRow>
                  </>
                ) : (
                  <>
                    <SettingRow label="Study Hours/Day">
                      <Text style={styles.valueText}>{user.preferences?.studyHoursPerDay || 6}h</Text>
                    </SettingRow>
                    <View style={styles.divider} />
                    <SettingRow label="Sleep Schedule">
                      <Text style={styles.valueText}>
                        {user.preferences?.sleepStart || '23:00'} – {user.preferences?.sleepEnd || '07:00'}
                      </Text>
                    </SettingRow>
                    <View style={styles.divider} />
                    <SettingRow label="Study Hours">
                      <Text style={styles.valueText}>
                        {user.preferences?.studyStartTime || '09:00'} – {user.preferences?.studyEndTime || '18:00'}
                      </Text>
                    </SettingRow>
                  </>
                )}
              </View>
            </View>

            {/* ── Focus Preferences Section ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Focus Preferences</Text>
              <View style={styles.sectionCard}>
                {isEditing ? (
                  <>
                    <SettingRow label="Focus Duration">
                      <PickerButton
                        value={`${focusDuration} min`}
                        onPress={() => setFocusDurationPickerVisible(true)}
                      />
                    </SettingRow>
                    <SettingRow label="Break Duration">
                      <TextInput
                        style={styles.smallInput}
                        value={breakDuration}
                        onChangeText={setBreakDuration}
                        keyboardType="number-pad"
                        placeholder="5"
                      />
                      <Text style={styles.unitText}>min</Text>
                    </SettingRow>
                    <SettingRow label="Long Break Duration">
                      <TextInput
                        style={styles.smallInput}
                        value={longBreakDuration}
                        onChangeText={setLongBreakDuration}
                        keyboardType="number-pad"
                        placeholder="15"
                      />
                      <Text style={styles.unitText}>min</Text>
                    </SettingRow>
                    <SettingRow label="Long Break After">
                      <PickerButton
                        value={`After ${longBreakAfter} sessions`}
                        onPress={() => setBreakFrequencyPickerVisible(true)}
                      />
                    </SettingRow>
                  </>
                ) : (
                  <>
                    <SettingRow label="Focus Duration">
                      <Text style={styles.valueText}>{user.preferences?.focusDuration || 25} min</Text>
                    </SettingRow>
                    <View style={styles.divider} />
                    <SettingRow label="Break Duration">
                      <Text style={styles.valueText}>{user.preferences?.breakDuration || 5} min</Text>
                    </SettingRow>
                    <View style={styles.divider} />
                    <SettingRow label="Long Break Duration">
                      <Text style={styles.valueText}>{user.preferences?.longBreakDuration || 15} min</Text>
                    </SettingRow>
                    <View style={styles.divider} />
                    <SettingRow label="Long Break After">
                      <Text style={styles.valueText}>After {user.preferences?.longBreakAfter || 4} sessions</Text>
                    </SettingRow>
                  </>
                )}
              </View>
            </View>

            {/* ── Break & Wellness Section ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Break & Wellness</Text>
              <View style={styles.sectionCard}>
                {isEditing ? (
                  <>
                    <SettingRow label="Namaz Breaks">
                      <TouchableOpacity
                        style={[styles.toggle, namazBreaksEnabled && styles.toggleActive]}
                        onPress={() => setNamazBreaksEnabled(!namazBreaksEnabled)}
                      >
                        <View style={[styles.toggleDot, namazBreaksEnabled && styles.toggleDotActive]} />
                      </TouchableOpacity>
                    </SettingRow>
                    {namazBreaksEnabled && (
                      <View style={styles.namazPrayersSection}>
                        <Text style={styles.namazPrayersLabel}>Select Prayers:</Text>
                        <View style={styles.namazPrayersGrid}>
                          {NAMAZ_PRAYERS.map((prayer) => (
                            <TouchableOpacity
                              key={prayer}
                              style={[
                                styles.namazPrayerBtn,
                                selectedNamazPrayers.includes(prayer) && styles.namazPrayerBtnActive,
                              ]}
                              onPress={() => toggleNamazPrayer(prayer)}
                            >
                              <Text
                                style={[
                                  styles.namazPrayerText,
                                  selectedNamazPrayers.includes(prayer) && styles.namazPrayerTextActive,
                                ]}
                              >
                                {prayer}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <SettingRow label="Namaz Breaks">
                      <Text style={styles.valueText}>
                        {user.preferences?.namazBreaksEnabled ? 'Enabled' : 'Disabled'}
                      </Text>
                    </SettingRow>
                  </>
                )}
              </View>
            </View>

            {/* ── Edit/Save Actions ── */}
            {isEditing && (
              <View style={styles.actionsContainer}>
                {error !== '' && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
                {success && (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                    <Text style={styles.successText}>Preferences saved successfully!</Text>
                  </View>
                )}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={handleReset}
                    disabled={loading}
                  >
                    <Text style={styles.resetBtnText}>Reset to Default</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={18} color={colors.white} />
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setIsEditing(false);
                    // Reset to current values
                    setCgpaTarget(String(user?.preferences?.cgpaTarget || 3.5));
                    setStudyHoursPerDay(String(user?.preferences?.studyHoursPerDay || 6));
                    setFocusDuration(String(user?.preferences?.focusDuration || 25));
                    setBreakDuration(String(user?.preferences?.breakDuration || 5));
                    setLongBreakDuration(String(user?.preferences?.longBreakDuration || 15));
                    setLongBreakAfter(String(user?.preferences?.longBreakAfter || 4));
                    setNamazBreaksEnabled(user?.preferences?.namazBreaksEnabled || false);
                    setSelectedNamazPrayers(user?.preferences?.selectedNamazPrayers as string[] || []);
                    setSleepStart(user?.preferences?.sleepStart || '23:00');
                    setSleepEnd(user?.preferences?.sleepEnd || '07:00');
                    setStudyStartTime(user?.preferences?.studyStartTime || '09:00');
                    setStudyEndTime(user?.preferences?.studyEndTime || '18:00');
                    setSemester(String(user?.preferences?.semester || 1));
                    setCgpaError('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Sign Out ── */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={async () => await logout()}
              activeOpacity={0.8}
            >
              <View style={styles.logoutIconBox}>
                <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
              </View>
              <Text style={styles.logoutText}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.destructive + '80'} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.signInCard}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.8}
          >
            <View style={styles.signInIconBox}>
              <Ionicons name="log-in-outline" size={20} color={colors.primaryLight} />
            </View>
            <View style={styles.signInInfo}>
              <Text style={styles.signInTitle}>Sign In or Create Account</Text>
              <Text style={styles.signInSub}>Unlock AI features, analytics & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* ── App Info ── */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>FocusFlow AI  ·  v1.0.0</Text>
          <Text style={styles.appInfoText}>Built for students, powered by AI</Text>
        </View>
      </ScrollView>

      {/* Picker Modals */}
      <PickerModal
        visible={focusDurationPickerVisible}
        onClose={() => setFocusDurationPickerVisible(false)}
        options={FOCUS_DURATION_OPTIONS}
        selectedValue={focusDuration}
        onSelect={setFocusDuration}
        label="Focus Duration"
      />

      <PickerModal
        visible={breakFrequencyPickerVisible}
        onClose={() => setBreakFrequencyPickerVisible(false)}
        options={BREAK_FREQUENCY_OPTIONS}
        selectedValue={longBreakAfter}
        onSelect={setLongBreakAfter}
        label="Sessions"
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

      <PickerModal
        visible={semesterPickerVisible}
        onClose={() => setSemesterPickerVisible(false)}
        options={['1', '2', '3', '4', '5', '6', '7', '8']}
        selectedValue={semester}
        onSelect={setSemester}
        label="Semester"
      />
    </SafeAreaView>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.container}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={rowStyles.container}>
      <Text style={rowStyles.label}>{label}</Text>
      <View style={rowStyles.children}>{children}</View>
    </View>
  );
}

function Stepper({ value, onValueChange, min, max, step }: { value: string; onValueChange: (val: string) => void; min: number; max: number; step: number }) {
  const handleIncrement = () => {
    const newValue = parseFloat(value) + step;
    if (newValue <= max) {
      onValueChange(newValue.toFixed(step >= 1 ? 0 : 1));
    }
  };

  const handleDecrement = () => {
    const newValue = parseFloat(value) - step;
    if (newValue >= min) {
      onValueChange(newValue.toFixed(step >= 1 ? 0 : 1));
    }
  };

  return (
    <View style={stepperStyles.container}>
      <TouchableOpacity
        style={stepperStyles.button}
        onPress={handleDecrement}
        disabled={parseFloat(value) <= min}
      >
        <Ionicons name="remove" size={20} color={colors.primary} />
      </TouchableOpacity>
      <Text style={stepperStyles.value}>{value}</Text>
      <TouchableOpacity
        style={stepperStyles.button}
        onPress={handleIncrement}
        disabled={parseFloat(value) >= max}
      >
        <Ionicons name="add" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function PickerButton({ value, onPress }: any) {
  return (
    <TouchableOpacity style={pickerStyles.button} onPress={onPress}>
      <Text style={pickerStyles.text}>{value}</Text>
      <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
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

function SettingsSection({
  title,
  items,
}: {
  title: string;
  items: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    color: string;
  }[];
}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title.toUpperCase()}</Text>
      <View style={sectionStyles.card}>
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            <TouchableOpacity style={sectionStyles.row} activeOpacity={0.7}>
              <View style={[sectionStyles.iconBox, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={16} color={item.color} />
              </View>
              <Text style={sectionStyles.label}>{item.label}</Text>
              {item.value !== '' && (
                <Text style={sectionStyles.value}>{item.value}</Text>
              )}
              <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
            {i < items.length - 1 && <View style={sectionStyles.sep} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.section,
  },

  // Header
  header: { marginBottom: spacing.lg },
  headerLabel: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: typography.xxl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Card
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...shadows.primary,
  },
  avatarText: { fontSize: typography.xxl, fontWeight: '800', color: colors.white },
  profileInfo: { flex: 1, gap: spacing.xs },
  profileName: { fontSize: typography.lg, fontWeight: '800', color: colors.foreground },
  profileEmail: { fontSize: typography.xs, color: colors.mutedForeground, lineHeight: 18 },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondaryDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  memberBadgeText: { fontSize: 10, color: colors.success, fontWeight: '700' },
  profileDivider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: spacing.lg },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.cardBorder },

  // Sign In Card
  signInCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  signInIconBox: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInInfo: { flex: 1, gap: 3 },
  signInTitle: { fontSize: typography.base, fontWeight: '700', color: colors.primaryLight },
  signInSub: { fontSize: typography.xs, color: colors.mutedForeground },

  // Logout
  logoutBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.destructive + '30',
  },
  logoutIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.destructiveDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { flex: 1, fontSize: typography.base, fontWeight: '600', color: colors.destructive },

  // App Info
  appInfo: { alignItems: 'center', gap: spacing.xs },
  appInfoText: { fontSize: typography.xs, color: colors.mutedForeground },

  // Section
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
  },

  // Form elements
  valueText: { fontSize: typography.sm, color: colors.foreground, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.cardBorder },
  timeRange: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeSeparator: { color: colors.mutedForeground },
  smallInput: {
    backgroundColor: colors.muted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.sm,
    color: colors.foreground,
    width: 50,
    textAlign: 'center',
  },
  unitText: { fontSize: typography.xs, color: colors.mutedForeground, marginLeft: spacing.xs },

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
  },
  toggleDotActive: { transform: [{ translateX: 20 }] },

  // Namaz prayers
  namazPrayersSection: { marginTop: spacing.md },
  namazPrayersLabel: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  namazPrayersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  namazPrayerBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  namazPrayerBtnActive: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary + '40',
  },
  namazPrayerText: {
    fontSize: typography.xs,
    color: colors.foreground,
    fontWeight: '600',
  },
  namazPrayerTextActive: { color: colors.primary },

  // Actions
  actionsContainer: { gap: spacing.md },
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
    backgroundColor: colors.success + '15',
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  successText: { fontSize: typography.xs, color: colors.success, flex: 1 },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  resetBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  resetBtnText: { fontSize: typography.base, fontWeight: '600', color: colors.mutedForeground },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: typography.base, fontWeight: '700', color: colors.white },
  cancelBtn: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: typography.sm, color: colors.mutedForeground, fontWeight: '600' },
});

const statStyles = StyleSheet.create({
  container: { alignItems: 'center', gap: 3 },
  value: { fontSize: typography.lg, fontWeight: '800', color: colors.foreground },
  label: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600', textAlign: 'center' },
});

const sectionStyles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: typography.sm, color: colors.foreground, fontWeight: '500' },
  value: { fontSize: typography.xs, color: colors.mutedForeground },
  sep: { height: 1, backgroundColor: colors.cardBorder, marginHorizontal: spacing.lg },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: { fontSize: typography.sm, color: colors.foreground, fontWeight: '500' },
  children: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

const stepperStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: typography.sm,
    color: colors.foreground,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
});

const pickerStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
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
