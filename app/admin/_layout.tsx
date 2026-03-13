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

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = width < 768;

// Admin Theme Colors
const AdminColors = {
  background: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1a1a1a',
  border: '#262626',
  primary: '#4ECDC4',
  primaryDark: '#3EBDB4',
  secondary: '#1E3A5F',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
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
  { label: 'Statistics', labelKz: 'Статистика', icon: 'stats-chart-outline', href: '/admin/stats' },
  { label: 'Settings', labelKz: 'Баптаулар', icon: 'settings-outline', href: '/admin/settings' },
];

function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <View style={[styles.sidebar, isCollapsed && styles.sidebarCollapsed]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Ionicons name="hand-left" size={24} color={AdminColors.primary} />
        </View>
        {!isCollapsed && (
          <View>
            <Text style={styles.logoText}>Sign Language</Text>
            <Text style={styles.logoSubtext}>Admin Panel</Text>
          </View>
        )}
        {isWeb && !isMobile && (
          <TouchableOpacity style={styles.collapseButton} onPress={onToggle}>
            <Ionicons
              name={isCollapsed ? 'chevron-forward' : 'chevron-back'}
              size={18}
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
                    size={20}
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
            <Ionicons name="arrow-back" size={20} color={AdminColors.textSecondary} />
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
          <Ionicons name="notifications-outline" size={20} color={AdminColors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="help-circle-outline" size={20} color={AdminColors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={18} color={AdminColors.background} />
        </View>
      </View>
    </View>
  );
}

// Mobile Tab Bar Component
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
                  size={22}
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
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
            <Ionicons name="hand-left" size={24} color={AdminColors.primary} />
            <Text style={styles.mobileLogoText}>Админ</Text>
          </View>
          <View style={styles.mobileHeaderRight}>
            <TouchableOpacity style={styles.mobileHeaderButton}>
              <Ionicons name="notifications-outline" size={20} color={AdminColors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.mobileUserAvatar}>
              <Ionicons name="person" size={16} color={AdminColors.background} />
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
    width: 260,
    backgroundColor: AdminColors.surface,
    borderRightWidth: 1,
    borderRightColor: AdminColors.border,
    paddingVertical: 20,
  },
  sidebarCollapsed: {
    width: 72,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.text,
  },
  logoSubtext: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  collapseButton: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: AdminColors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navSection: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.textMuted,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 1,
  },
  hidden: {
    opacity: 0,
    height: 0,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
    fontSize: 14,
    fontWeight: '500',
    color: AdminColors.textSecondary,
  },
  navTextActive: {
    color: AdminColors.text,
  },
  navSubtext: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  activeIndicator: {
    width: 4,
    height: 20,
    backgroundColor: AdminColors.primary,
    borderRadius: 2,
  },
  sidebarFooter: {
    paddingHorizontal: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    marginTop: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: AdminColors.surfaceHover,
    gap: 10,
  },
  backButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  backText: {
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
  mainContent: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    backgroundColor: AdminColors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AdminColors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AdminColors.success,
  },
  statusText: {
    fontSize: 12,
    color: AdminColors.success,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AdminColors.surfaceHover,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AdminColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: AdminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  mobileLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileLogoText: {
    fontSize: 16,
    fontWeight: '600',
    color: AdminColors.text,
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AdminColors.surfaceHover,
  },
  mobileUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AdminColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileContent: {
    flex: 1,
    padding: 16,
  },
  mobileTabBar: {
    height: 70,
    flexDirection: 'row',
    backgroundColor: AdminColors.surface,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    paddingBottom: 8,
    paddingTop: 8,
  },
  mobileTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTabIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  mobileTabIconActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  mobileTabLabel: {
    fontSize: 10,
    color: AdminColors.textSecondary,
    textAlign: 'center',
  },
  mobileTabLabelActive: {
    color: AdminColors.primary,
    fontWeight: '500',
  },
});