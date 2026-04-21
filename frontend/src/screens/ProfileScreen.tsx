import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View>
          <Text style={styles.headerLabel}>ACCOUNT</Text>
          <Text style={styles.headerTitle}>Profile</Text>
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
                <ProfileStat label="CGPA Target" value={String(user.preferences.cgpaTarget)} />
                <View style={styles.statDivider} />
                <ProfileStat label="Study/Day" value={`${user.preferences.studyHoursPerDay}h`} />
                <View style={styles.statDivider} />
                <ProfileStat label="Streak" value={`${user.streak}d`} />
                <View style={styles.statDivider} />
                <ProfileStat label="Semester" value={`S${user.preferences.semester}`} />
              </View>
            </>
          )}
        </View>

        {user ? (
          <>
            {/* ── Study Preferences ── */}
            <SettingsSection
              title="Study Preferences"
              items={[
                {
                  icon: 'timer-outline',
                  label: 'Focus Sprint',
                  value: `${user.preferences.focusDuration} min`,
                  color: colors.primary,
                },
                {
                  icon: 'cafe-outline',
                  label: 'Break Duration',
                  value: `${user.preferences.breakDuration} min`,
                  color: colors.accent,
                },
                {
                  icon: 'moon-outline',
                  label: 'Namaz Breaks',
                  value: user.preferences.namazBreaksEnabled ? 'Enabled' : 'Disabled',
                  color: colors.success,
                },
                {
                  icon: 'time-outline',
                  label: 'Study Hours',
                  value: `${user.preferences.studyStartTime} – ${user.preferences.studyEndTime}`,
                  color: colors.warning,
                },
                {
                  icon: 'bed-outline',
                  label: 'Sleep Schedule',
                  value: `${user.preferences.sleepStart} – ${user.preferences.sleepEnd}`,
                  color: colors.mutedForeground,
                },
              ]}
            />

            {/* ── Integrations ── */}
            <SettingsSection
              title="Integrations"
              items={[
                {
                  icon: 'calendar-outline',
                  label: 'Google Calendar',
                  value: 'Not connected',
                  color: colors.accent,
                },
                {
                  icon: 'hardware-chip-outline',
                  label: 'AI Personalization',
                  value: 'Active',
                  color: colors.primary,
                },
                {
                  icon: 'notifications-outline',
                  label: 'Push Notifications',
                  value: 'Enabled',
                  color: colors.warning,
                },
              ]}
            />

            {/* ── Data ── */}
            <SettingsSection
              title="Data & Privacy"
              items={[
                { icon: 'download-outline', label: 'Export Study Reports', value: '', color: colors.success },
                { icon: 'trash-outline', label: 'Clear Session History', value: '', color: colors.destructive },
              ]}
            />

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
  headerLabel: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  headerTitle: { fontSize: typography.xxl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },

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
