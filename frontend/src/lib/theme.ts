export const colors = {
  background: '#08080f',
  surface: '#0f0f1a',
  card: '#13131f',
  cardBorder: '#1f1f30',
  primary: '#7c3aed',
  primaryLight: '#a78bfa',
  primaryDim: '#7c3aed22',
  accent: '#06b6d4',
  accentDim: '#06b6d422',
  secondary: '#10b981',
  secondaryDim: '#10b98122',
  success: '#10b981',
  warning: '#f59e0b',
  warningDim: '#f59e0b22',
  destructive: '#ef4444',
  destructiveDim: '#ef444422',
  muted: '#1a1a28',
  mutedForeground: '#64748b',
  foreground: '#f1f5f9',
  subtext: '#94a3b8',
  border: '#1f1f30',
  white: '#ffffff',
  transparent: 'transparent',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

export const typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 34,
};

export const shadows = {
  primary: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
};

export const gradientColors = {
  primary: ['#7c3aed', '#06b6d4'] as const,
  secondary: ['#10b981', '#06b6d4'] as const,
  dark: ['#13131f', '#08080f'] as const,
};
