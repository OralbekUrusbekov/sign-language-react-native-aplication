// Color Palette
export const Colors = {
  // Primary Colors
  primary: '#1E3A5F',
  primaryLight: '#2E5A8F',
  primaryDark: '#0E2A4F',
  
  // Secondary Colors
  secondary: '#4ECDC4',
  secondaryLight: '#6EE7DE',
  secondaryDark: '#2EAD9F',
  
  // Accent Colors
  accent: '#FF6B6B',
  accentLight: '#FF8B8B',
  accentDark: '#E54B4B',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F7F9FC',
  gray200: '#E8ECF2',
  gray300: '#D1D9E6',
  gray400: '#A0AEC0',
  gray500: '#718096',
  gray600: '#4A5568',
  gray700: '#2D3748',
  gray800: '#1A202C',
  
  // Status Colors
  success: '#48BB78',
  warning: '#F6AD55',
  error: '#FC8181',
  info: '#63B3ED',
  
  // Background
  background: '#F7F9FC',
  cardBackground: '#FFFFFF',
  
  // Text
  textPrimary: '#1A202C',
  textSecondary: '#718096',
  textLight: '#FFFFFF',
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
};
