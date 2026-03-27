// app/admin/_layout.tsx
import React, { useState, useEffect } from 'react';
import { Slot, Tabs } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import {
  scaleWidth,
  scaleHeight,
  scaleFont,
  spacing,
  borderRadius,
  isMobile,
  isTablet,
  isDesktop,
  getHeaderHeight,
  getMobileTabBarHeight,
  getSidebarWidth,
  getAdminHeaderStyle,
  getAdminSidebarStyle,
  getAdminNavItemStyle,
  responsiveFont,
} from '@/constants/admin-responsive';

// TYNDAU Admin Theme Colors
const AdminColors = {
  background: '#0D1F33',
  surface: '#1E3A5F',
  surfaceHover: '#2E5A8F',
  border: '#2E5A8F',
  primary: '#4ECDC4',
  primaryDark: '#2EAD9F',
  secondary: '#6EE7DE',
  text: '#ffffff',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

interface NavItem {
  label: string;
  labelKz: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', labelKz: 'Басты бет', icon: 'grid-outline', href: '/admin' },
  { label: 'Words', labelKz: 'Сөздер', icon: 'text-outline', href: '/admin/words' },
  { label: 'Books', labelKz: 'Кітаптар', icon: 'book-outline', href: '/admin/books' },
  { label: 'Settings', labelKz: 'Баптаулар', icon: 'settings-outline', href: '/admin/settings' },
];

function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <View style={[styles.sidebar, isCollapsed && styles.sidebarCollapsed]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Ionicons name="hand-left" size={scaleWidth(24)} color={AdminColors.primary} />
        </View>
        {!isCollapsed && (
          <View>
            <Text style={styles.logoText}>Sign Language</Text>
            <Text style={styles.logoSubtext}>Admin Panel</Text>
          </View>
        )}
        {!isMobile && (
          <TouchableOpacity style={styles.collapseButton} onPress={onToggle}>
            <Ionicons
              name={isCollapsed ? 'chevron-forward' : 'chevron-back'}
              size={scaleWidth(18)}
              color={AdminColors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation */}
      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.navSection, isCollapsed && styles.hidden]}>МӘЗІР</Text>
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href as any} asChild>
              <TouchableOpacity
                style={[
                  styles.navItem,
                  isActive && styles.navItemActive,
                  isCollapsed && styles.navItemCollapsed,
                ]}
              >
                <View style={[styles.navIconContainer, isActive && styles.navIconContainerActive]}>
                  <Ionicons
                    name={item.icon}
                    size={scaleWidth(20)}
                    color={isActive ? AdminColors.primary : AdminColors.textSecondary}
                  />
                </View>
                {!isCollapsed && (
                  <View style={styles.navTextContainer}>
                    <Text style={[styles.navText, isActive && styles.navTextActive]}>
                      {item.labelKz}
                    </Text>
                    <Text style={styles.navSubtext}>{item.label}</Text>
                  </View>
                )}
                {isActive && !isCollapsed && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            </Link>
          );
        })}
      </ScrollView>

      {/* Back to App */}
      <View style={styles.sidebarFooter}>
        <Link href="/" asChild>
          <TouchableOpacity style={[styles.backButton, isCollapsed && styles.backButtonCollapsed]}>
            <Ionicons name="arrow-back" size={scaleWidth(20)} color={AdminColors.textSecondary} />
            {!isCollapsed && <Text style={styles.backText}>Қолданбаға оралу</Text>}
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Админ Панель</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Желіде</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={scaleWidth(20)} color={AdminColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="help-circle-outline" size={scaleWidth(20)} color={AdminColors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={scaleWidth(18)} color={AdminColors.background} />
        </View>
      </View>
    </View>
  );
}

function MobileTabBar() {
  const pathname = usePathname();

  return (
    <View style={styles.mobileTabBar}>
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== '/admin' && pathname.startsWith(item.href));
        
        return (
          <Link key={item.href} href={item.href as any} asChild>
            <TouchableOpacity style={styles.mobileTabItem}>
              <View style={[styles.mobileTabIcon, isActive && styles.mobileTabIconActive]}>
                <Ionicons
                  name={item.icon}
                  size={scaleWidth(22)}
                  color={isActive ? AdminColors.primary : AdminColors.textSecondary}
                />
              </View>
              <Text style={[styles.mobileTabLabel, isActive && styles.mobileTabLabelActive]}>
                {item.labelKz}
              </Text>
            </TouchableOpacity>
          </Link>
        );
      })}
    </View>
  );
}

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(isMobile);

  useEffect(() => {
    const updateDimensions = () => {
      const newWidth = Dimensions.get('window').width;
      setIsMobileDevice(newWidth < 768);
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription?.remove();
  }, []);

  // For mobile devices, render a different layout with tabs at the bottom
  if (isMobileDevice) {
    return (
      <SafeAreaView style={styles.mobileContainer}>
        <View style={styles.mobileHeader}>
          <View style={styles.mobileLogo}>
            <Ionicons name="hand-left" size={scaleWidth(24)} color={AdminColors.primary} />
            <Text style={styles.mobileLogoText}>Админ</Text>
          </View>
          <View style={styles.mobileHeaderRight}>
            <TouchableOpacity style={styles.mobileHeaderButton}>
              <Ionicons name="notifications-outline" size={scaleWidth(20)} color={AdminColors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.mobileUserAvatar}>
              <Ionicons name="person" size={scaleWidth(16)} color={AdminColors.background} />
            </View>
          </View>
        </View>
        
        <View style={styles.mobileContent}>
          <Slot />
        </View>
        
        <MobileTabBar />
      </SafeAreaView>
    );
  }

  // Desktop layout with sidebar
  return (
    <View style={styles.container}>
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <View style={styles.mainContent}>
        <Header />
        <View style={styles.pageContent}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AdminColors.background,
  },
  sidebar: {
    width: getSidebarWidth(false),
    backgroundColor: AdminColors.surface,
    borderRightWidth: 1,
    borderRightColor: AdminColors.border,
    paddingVertical: spacing.lg,
  },
  sidebarCollapsed: {
    width: getSidebarWidth(true),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  logoIcon: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: AdminColors.text,
  },
  logoSubtext: {
    fontSize: scaleFont(11),
    color: AdminColors.textMuted,
    marginTop: scaleHeight(2),
  },
  collapseButton: {
    marginLeft: 'auto',
    width: scaleWidth(28),
    height: scaleWidth(28),
    borderRadius: borderRadius.sm,
    backgroundColor: AdminColors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navContainer: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  navSection: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    color: AdminColors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xxs,
    letterSpacing: 1,
  },
  hidden: {
    opacity: 0,
    height: 0,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(10),
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xxs,
    gap: spacing.sm,
  },
  navItemActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navIconContainer: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AdminColors.surfaceHover,
  },
  navIconContainerActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  navTextContainer: {
    flex: 1,
  },
  navText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: AdminColors.textSecondary,
  },
  navTextActive: {
    color: AdminColors.text,
  },
  navSubtext: {
    fontSize: scaleFont(11),
    color: AdminColors.textMuted,
    marginTop: scaleHeight(2),
  },
  activeIndicator: {
    width: scaleWidth(4),
    height: scaleHeight(20),
    backgroundColor: AdminColors.primary,
    borderRadius: borderRadius.xs,
  },
  sidebarFooter: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    marginTop: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: AdminColors.surfaceHover,
    gap: spacing.xs,
  },
  backButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  backText: {
    fontSize: scaleFont(13),
    color: AdminColors.textSecondary,
  },
  mainContent: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  header: {
    height: getHeaderHeight(),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    backgroundColor: AdminColors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: AdminColors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: scaleHeight(4),
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: borderRadius.lg,
    gap: spacing.xxs,
  },
  statusDot: {
    width: scaleWidth(6),
    height: scaleWidth(6),
    borderRadius: scaleWidth(3),
    backgroundColor: AdminColors.success,
  },
  statusText: {
    fontSize: scaleFont(12),
    color: AdminColors.success,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerButton: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AdminColors.surfaceHover,
  },
  userAvatar: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(18),
    backgroundColor: AdminColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  pageContent: {
    flex: 1,
  },
  
  // Mobile styles
  mobileContainer: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  mobileHeader: {
    height: scaleHeight(60),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: AdminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  mobileLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mobileLogoText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: AdminColors.text,
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mobileHeaderButton: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AdminColors.surfaceHover,
  },
  mobileUserAvatar: {
    width: scaleWidth(32),
    height: scaleWidth(32),
    borderRadius: scaleWidth(16),
    backgroundColor: AdminColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileContent: {
    flex: 1,
    padding: spacing.md,
  },
  mobileTabBar: {
    height: getMobileTabBarHeight(),
    flexDirection: 'row',
    backgroundColor: AdminColors.surface,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    paddingBottom: Platform.OS === 'ios' ? scaleHeight(8) : scaleHeight(4),
    paddingTop: scaleHeight(4),
  },
  mobileTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTabIcon: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleHeight(4),
  },
  mobileTabIconActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  mobileTabLabel: {
    fontSize: scaleFont(10),
    color: AdminColors.textSecondary,
    textAlign: 'center',
  },
  mobileTabLabelActive: {
    color: AdminColors.primary,
    fontWeight: '500',
  },
});