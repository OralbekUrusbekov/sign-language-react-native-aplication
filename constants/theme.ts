// TYNDAU Color Palette - Based on Logo Design
// Primary: Deep Blue (#1E3A5F), Turquoise/Teal (#4ECDC4)

export const Colors = {
  // Primary Colors - Deep Blue (from logo)
  primary: '#1E3A5F',
  primaryLight: '#2E5A8F',
  primaryDark: '#0D1F33',
  
  // Secondary Colors - Turquoise/Teal (accent from logo)
  secondary: '#4ECDC4',
  secondaryLight: '#6EE7DE',
  secondaryDark: '#2EAD9F',
  
  // Accent Colors - Warm accent for highlights
  accent: '#FF6B6B',
  accentLight: '#FF8B8B',
  accentDark: '#E54B4B',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F0F4F8',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Background - Light and clean
  background: '#F0F4F8',
  cardBackground: '#FFFFFF',
  
  // Text
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#FFFFFF',
  
  // Gradient colors for special elements
  gradientStart: '#1E3A5F',
  gradientEnd: '#4ECDC4',
};

// Typography
export const Typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  fontWeights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
};

// Shadows - Softer, more modern
export const Shadows = {
  sm: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
