// constants/responsive.ts
import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Экран көлеміне қарай масштабтау коэффициенттері
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 667;

// Горизонтальды масштабтау
export const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / guidelineBaseWidth) * size;
};

// Вертикальды масштабтау
export const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / guidelineBaseHeight) * size;
};

// Қаріп өлшемдерін масштабтау
export const scaleFont = (size: number): number => {
  const newSize = scaleWidth(size);
  if (Platform.OS === 'ios') {
    return Math.round(Math.min(Math.max(newSize, 10), 32));
  }
  return Math.round(Math.min(Math.max(newSize, 10), 30));
};

// Экран түрін анықтау
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;
export const isTablet = SCREEN_WIDTH >= 768;

// Камера биіктігі (экранға қарай)
export const getCameraHeight = () => {
  return isTablet ? scaleHeight(400) : scaleHeight(320);
};

// Tab Bar стилін алу
export const getTabBarStyle = () => ({
  position: 'absolute' as const,
  bottom: Platform.OS === 'ios' ? scaleHeight(25) : scaleHeight(15),
  left: scaleWidth(16),
  right: scaleWidth(16),
  height: Platform.OS === 'ios' ? scaleHeight(72) : scaleHeight(68),
  borderRadius: borderRadius.xxl,
  backgroundColor: '#FFFFFF',
  borderTopWidth: 0,
  paddingBottom: 0,
  paddingTop: scaleHeight(8),
  shadowColor: '#1E3A5F',
  shadowOffset: {
    width: 0,
    height: -4,
  },
  shadowOpacity: 0.1,
  shadowRadius: scaleWidth(16),
  elevation: 12,
});

// Динамикалық аралықтар
export const spacing = {
  xxs: scaleWidth(4),
  xs: scaleWidth(8),
  sm: scaleWidth(12),
  md: scaleWidth(16),
  lg: scaleWidth(24),
  xl: scaleWidth(32),
  xxl: scaleWidth(48),
  xxxl: scaleWidth(64),
};

// Динамикалық қаріп өлшемдері
export const fontSize = {
  xs: scaleFont(10),
  sm: scaleFont(12),
  md: scaleFont(14),
  lg: scaleFont(16),
  xl: scaleFont(18),
  xxl: scaleFont(20),
  xxxl: scaleFont(24),
  huge: scaleFont(28),
};

// Динамикалық радиустар
export const borderRadius = {
  sm: scaleWidth(6),
  md: scaleWidth(8),
  lg: scaleWidth(12),
  xl: scaleWidth(16),
  xxl: scaleWidth(20),
  full: 9999,
};