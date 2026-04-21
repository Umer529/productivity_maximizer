import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../lib/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'> & {
  onComplete: () => void;
};

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'hardware-chip' as const,
    iconColor: colors.primary,
    title: 'Welcome to FocusFlow AI',
    subtitle: 'AI-powered smart study planner that adapts to your rhythm',
    items: null,
  },
  {
    icon: 'flag' as const,
    iconColor: colors.secondary,
    title: 'Set Academic Goals',
    subtitle: 'Define your CGPA target, courses, and study preferences',
    items: [
      { label: 'CGPA Target', value: '3.8' },
      { label: 'Courses', value: '5 this semester' },
      { label: 'Study Hours', value: '6h/day' },
    ],
  },
  {
    icon: 'time' as const,
    iconColor: colors.accent,
    title: 'Smart Preferences',
    subtitle: 'Customize breaks, focus sprints, and prayer reminders',
    items: [
      { label: 'Focus Sprint', value: '25 min' },
      { label: 'Break Frequency', value: 'Every 2 sessions' },
      { label: 'Namaz Breaks', value: 'Enabled' },
      { label: 'Sleep Schedule', value: '11PM - 7AM' },
    ],
  },
  {
    icon: 'shield-checkmark' as const,
    iconColor: colors.success,
    title: 'Ready to Focus',
    subtitle: 'Enable notifications and start your AI-powered study journey',
    items: [
      { label: 'Study Reminders', value: 'Get deadline alerts' },
      { label: 'Focus Mode', value: 'Minimize distractions' },
      { label: 'AI Schedule', value: 'Personalized daily plan' },
    ],
  },
];

export default function OnboardingScreen({ onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: slide.iconColor + '20' }]}>
          <Ionicons name={slide.icon} size={64} color={slide.iconColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>

        {/* Items */}
        {slide.items && (
          <View style={styles.itemsList}>
            {slide.items.map((item) => (
              <View key={item.label} style={styles.item}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === current && styles.dotActive]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          {current > 0 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setCurrent(current - 1)}
            >
              <Ionicons name="chevron-back" size={20} color={colors.mutedForeground} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, current === 0 && { flex: 1 }]}
            onPress={() => {
              if (current < slides.length - 1) {
                setCurrent(current + 1);
              } else {
                onComplete();
              }
            }}
          >
            <Text style={styles.nextBtnText}>
              {current < slides.length - 1 ? 'Next' : 'Get Started'}
            </Text>
            {current < slides.length - 1 && (
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
  itemsList: {
    width: '100%',
    gap: 10,
    marginBottom: 32,
  },
  item: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 32,
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
