import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

export default function AuthScreen() {
  const navigation = useNavigation<NavProp>();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
      navigation.goBack();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Back ── */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* ── Logo ── */}
          <View style={styles.logoArea}>
            <View style={styles.logoBox}>
              <Ionicons name="hardware-chip" size={34} color={colors.white} />
            </View>
            <Text style={styles.logoTitle}>FocusFlow AI</Text>
            <Text style={styles.logoSub}>AI-powered study planner for students</Text>
          </View>

          {/* ── Mode Toggle ── */}
          <View style={styles.toggle}>
            {(['login', 'register'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                onPress={() => { setMode(m); setError(''); }}
              >
                <Text style={[styles.toggleBtnText, mode === m && styles.toggleBtnTextActive]}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Fields ── */}
          <View style={styles.fields}>
            {mode === 'register' && (
              <InputField
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Ahmed Khan"
                icon="person-outline"
                autoCapitalize="words"
              />
            )}
            <InputField
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="ahmed@university.edu"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.passwordField}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordBox}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Error ── */}
          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Switch Mode ── */}
          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            <Text style={styles.switchModeText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchModeLink}>
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>

          {/* ── Terms ── */}
          {mode === 'register' && (
            <Text style={styles.terms}>
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType,
  autoCapitalize,
  autoCorrect,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  autoCorrect?: boolean;
}) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputBox}>
        <Ionicons name={icon} size={16} color={colors.mutedForeground} style={fieldStyles.icon} />
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },

  // Back
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignSelf: 'flex-start',
  },

  // Logo
  logoArea: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadows.primary,
  },
  logoTitle: { fontSize: typography.xxl, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  logoSub: { fontSize: typography.sm, color: colors.mutedForeground, textAlign: 'center' },

  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.card, ...shadows.card },
  toggleBtnText: { fontSize: typography.base, fontWeight: '600', color: colors.mutedForeground },
  toggleBtnTextActive: { color: colors.foreground },

  // Fields
  fields: { gap: spacing.md },
  fieldLabel: { fontSize: typography.xs, color: colors.mutedForeground, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.sm },
  passwordField: {},
  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.sm,
  },
  fieldIcon: {},
  fieldInput: { fontSize: typography.base, color: colors.foreground },
  eyeBtn: { padding: spacing.xs },

  // Error
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

  // Submit
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: typography.base, fontWeight: '700', color: colors.white },

  // Switch
  switchMode: { alignItems: 'center' },
  switchModeText: { fontSize: typography.sm, color: colors.mutedForeground, textAlign: 'center' },
  switchModeLink: { color: colors.primaryLight, fontWeight: '700' },

  // Terms
  terms: {
    fontSize: typography.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
});

const fieldStyles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontSize: typography.xs, color: colors.mutedForeground, fontWeight: '700', letterSpacing: 0.5 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.sm,
  },
  icon: {},
  input: { flex: 1, fontSize: typography.base, color: colors.foreground },
});
