// constants/admin-responsive.ts
import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Базалық өлшемдер (iPhone 14 - 390x844)
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

// ==================== МАСШТАБТАУ ФУНКЦИЯЛАРЫ ====================

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
    return Math.round(Math.min(Math.max(newSize, 11), 28));
  }
  return Math.round(Math.min(Math.max(newSize, 11), 26));
};

// ==================== ЭКРАН ТҮРЛЕРІН АНЫҚТАУ ====================

// Кішкентай телефондар (iPhone SE, 5/5s, 6/7/8)
export const isVerySmallDevice = SCREEN_WIDTH < 375;

// Орташа телефондар (iPhone 12/13/14, Android)
export const isSmallDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;

// Үлкен телефондар (iPhone Pro Max, Plus)
export const isLargeDevice = SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768;

// Планшеттер (iPad, Android tablets)
export const isTablet = SCREEN_WIDTH >= 768;

// Десктоп (Web)
export const isDesktop = SCREEN_WIDTH >= 1024;

// Мобильді құрылғы (телефондар)
export const isMobile = SCREEN_WIDTH < 768;

// ==================== ДИНАМИКАЛЫҚ ӨЛШЕМДЕР ====================

// Sidebar ені (десктоп үшін)
export const getSidebarWidth = (collapsed: boolean): number => {
  if (collapsed) {
    return scaleWidth(72);
  }
  return scaleWidth(260);
};

// Хедер биіктігі
export const getHeaderHeight = (): number => {
  if (isMobile) {
    return scaleHeight(56);
  }
  return scaleHeight(64);
};

// Таб бар биіктігі (мобильді үшін)
export const getMobileTabBarHeight = (): number => {
  return scaleHeight(65);
};

// Контент padding
export const getContentPadding = (): number => {
  if (isMobile) {
    return scaleWidth(12);
  }
  if (isTablet) {
    return scaleWidth(20);
  }
  return scaleWidth(24);
};

// Карточкалар арасындағы gap
export const getCardGap = (): number => {
  if (isMobile) {
    return scaleWidth(12);
  }
  return scaleWidth(16);
};

// ==================== ДИНАМИКАЛЫҚ АРАЛЫҚТАР ====================

export const spacing = {
  xxs: scaleWidth(4),
  xs: scaleWidth(8),
  sm: scaleWidth(12),
  md: scaleWidth(16),
  lg: scaleWidth(20),
  xl: scaleWidth(24),
  xxl: scaleWidth(32),
  xxxl: scaleWidth(40),
  huge: scaleWidth(48),
};

// ==================== ДИНАМИКАЛЫҚ ҚАРІП ӨЛШЕМДЕРІ ====================

export const fontSize = {
  xs: scaleFont(10),
  sm: scaleFont(12),
  md: scaleFont(14),
  lg: scaleFont(16),
  xl: scaleFont(18),
  xxl: scaleFont(20),
  xxxl: scaleFont(24),
  huge: scaleFont(28),
  massive: scaleFont(32),
};

// ==================== ДИНАМИКАЛЫҚ РАДИУСТАР ====================

export const borderRadius = {
  xs: scaleWidth(4),
  sm: scaleWidth(6),
  md: scaleWidth(8),
  lg: scaleWidth(12),
  xl: scaleWidth(16),
  xxl: scaleWidth(20),
  xxxl: scaleWidth(24),
  full: 9999,
};

// ==================== ГРИД ЖҮЙЕСІ ====================

// Қатардағы карточкалар саны
export const getGridColumns = (): number => {
  if (isMobile) {
    return 1;
  }
  if (isTablet) {
    return 2;
  }
  if (isDesktop) {
    return 3;
  }
  return 2;
};

// Карточка ені (grid үшін)
export const getCardWidth = (): number => {
  const columns = getGridColumns();
  const padding = getContentPadding() * 2;
  const gap = getCardGap() * (columns - 1);
  return (SCREEN_WIDTH - padding - gap) / columns;
};

// ==================== СТАТИСТИКА КАРТОЧКАЛАРЫ ҮШІН ====================

export const getStatCardMinWidth = (): number => {
  if (isMobile) {
    return SCREEN_WIDTH - spacing.md * 2;
  }
  if (isTablet) {
    return scaleWidth(200);
  }
  return scaleWidth(220);
};

// ==================== КАТЕГОРИЯ ЧИПТЕРІ ====================

export const getCategoryChipPadding = () => ({
  paddingHorizontal: isMobile ? spacing.sm : spacing.md,
  paddingVertical: isMobile ? scaleHeight(6) : scaleHeight(8),
});

// ==================== МОДАЛЬ ӨЛШЕМДЕРІ ====================

export const getModalMaxHeight = (): number => {
  if (isMobile) {
    return SCREEN_HEIGHT * 0.85;
  }
  if (isTablet) {
    return SCREEN_HEIGHT * 0.8;
  }
  return SCREEN_HEIGHT * 0.75;
};

export const getModalWidth = (): number => {
  if (isMobile) {
    return SCREEN_WIDTH;
  }
  if (isTablet) {
    return scaleWidth(500);
  }
  return scaleWidth(600);
};

// ==================== ТАБЛИЦА ӨЛШЕМДЕРІ ====================

export const getTableCellPadding = () => ({
  paddingHorizontal: isMobile ? spacing.sm : spacing.md,
  paddingVertical: isMobile ? scaleHeight(12) : scaleHeight(16),
});

// ==================== БАТЫРМА ӨЛШЕМДЕРІ ====================

export const getButtonHeight = (): number => {
  if (isMobile) {
    return scaleHeight(44);
  }
  return scaleHeight(48);
};

export const getIconSize = (baseSize: number): number => {
  if (isMobile) {
    return scaleWidth(baseSize - 2);
  }
  return scaleWidth(baseSize);
};

// ==================== ШЕКАРАЛЫҚ ӨЛШЕМДЕР ====================

export const getMaxContentWidth = (): number => {
  if (isTablet) {
    return scaleWidth(720);
  }
  if (isDesktop) {
    return scaleWidth(1200);
  }
  return SCREEN_WIDTH;
};

// ==================== МӘТІН ЖОЛДАРЫНЫҢ САНЫ ====================

export const getTitleLines = (): number => {
  if (isMobile) {
    return 2;
  }
  return 1;
};

export const getDescriptionLines = (): number => {
  if (isMobile) {
    return 2;
  }
  return 3;
};

// ==================== АНИМАЦИЯ ПАРАМЕТРЛЕРІ ====================

export const getAnimationDuration = (): number => {
  if (isMobile) {
    return 200;
  }
  return 250;
};

// ==================== КАМЕРА ӨЛШЕМДЕРІ (sign экраны үшін) ====================

export const getCameraHeight = (): number => {
  if (isMobile) {
    return scaleHeight(280);
  }
  if (isTablet) {
    return scaleHeight(400);
  }
  return scaleHeight(450);
};

// ==================== АДМИН ПАНЕЛЬ ҮШІН АРНАЙЫ ====================

// Админ панель хедер стилі
export const getAdminHeaderStyle = () => ({
  height: getHeaderHeight(),
  paddingHorizontal: isMobile ? spacing.md : spacing.xl,
});

// Админ панель сайдбар стилі
export const getAdminSidebarStyle = (collapsed: boolean) => ({
  width: getSidebarWidth(collapsed),
  paddingVertical: spacing.lg,
});

// Админ панель навигация элементтерінің стилі
export const getAdminNavItemStyle = (collapsed: boolean) => ({
  paddingVertical: isMobile ? scaleHeight(8) : scaleHeight(10),
  paddingHorizontal: collapsed ? 0 : spacing.sm,
  marginBottom: spacing.xs,
  borderRadius: borderRadius.md,
});

// Админ панель статистика карточкаларының стилі
export const getAdminStatCardStyle = () => ({
  minWidth: getStatCardMinWidth(),
  padding: isMobile ? spacing.md : spacing.lg,
  borderRadius: borderRadius.xl,
  marginBottom: spacing.md,
});

// ==================== ТАБЛИЦА СТИЛЬДЕРІ ====================

export const getTableContainerStyle = () => ({
  borderRadius: borderRadius.lg,
  overflow: 'hidden' as const,
  marginBottom: spacing.md,
});

export const getTableHeaderStyle = () => ({
  padding: getTableCellPadding(),
  backgroundColor: 'rgba(78, 205, 196, 0.1)',
});

export const getTableRowStyle = () => ({
  padding: getTableCellPadding(),
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(203, 213, 225, 0.1)',
});

// ==================== СТИЛЬ КОМБИНАЦИЯЛАРЫ ====================

// Мобильді және десктоп үшін әртүрлі стильдер
export const responsiveStyle = <T extends object>(
  mobileStyle: T,
  tabletStyle?: T,
  desktopStyle?: T
): T => {
  if (isMobile) return mobileStyle;
  if (isTablet && tabletStyle) return tabletStyle;
  if (desktopStyle) return desktopStyle;
  return mobileStyle;
};

// Шрифт стилін экранға қарай реттеу
export const responsiveFont = (
  mobileSize: number,
  tabletSize?: number,
  desktopSize?: number
) => ({
  fontSize: isMobile ? scaleFont(mobileSize) : 
             isTablet ? scaleFont(tabletSize || mobileSize + 2) : 
             scaleFont(desktopSize || mobileSize + 4),
});

// Кеңдікке байланысты flex direction
export const getFlexDirection = (): 'column' | 'row' => {
  return isMobile ? 'column' : 'row';
};

// Экспорттар
export default {
  scaleWidth,
  scaleHeight,
  scaleFont,
  isVerySmallDevice,
  isSmallDevice,
  isLargeDevice,
  isTablet,
  isDesktop,
  isMobile,
  spacing,
  fontSize,
  borderRadius,
  getSidebarWidth,
  getHeaderHeight,
  getMobileTabBarHeight,
  getContentPadding,
  getCardGap,
  getGridColumns,
  getCardWidth,
  getStatCardMinWidth,
  getCategoryChipPadding,
  getModalMaxHeight,
  getModalWidth,
  getTableCellPadding,
  getButtonHeight,
  getIconSize,
  getMaxContentWidth,
  getTitleLines,
  getDescriptionLines,
  getAnimationDuration,
  getCameraHeight,
  getAdminHeaderStyle,
  getAdminSidebarStyle,
  getAdminNavItemStyle,
  getAdminStatCardStyle,
  getTableContainerStyle,
  getTableHeaderStyle,
  getTableRowStyle,
  responsiveStyle,
  responsiveFont,
  getFlexDirection,
};