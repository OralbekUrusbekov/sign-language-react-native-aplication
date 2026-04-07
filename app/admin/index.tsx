// app/admin/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/config/api';
import {
  scaleWidth,
  scaleHeight,
  scaleFont,
  spacing,
  borderRadius,
  isMobile,
  isTablet,
  isDesktop,
  getContentPadding,
  getCardGap,
  getStatCardMinWidth,
  responsiveFont,
} from '@/constants/admin-responsive';

const { width } = Dimensions.get('window');


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

interface StatCard {
  title: string;
  titleKz: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface CategoryStat {
  id: string;
  name: string;
  count: number;
  icon: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWords: 0,
    totalBooks: 0,
    totalCategories: 0,
    totalDownloads: 0,
  });
  const [wordCategories, setWordCategories] = useState<CategoryStat[]>([]);
  const [bookCategories, setBookCategories] = useState<CategoryStat[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [wordsRes, booksRes, wordCatsRes, bookCatsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/words`),
        fetch(`${API_BASE_URL}/api/books`),
        fetch(`${API_BASE_URL}/api/words/categories`),
        fetch(`${API_BASE_URL}/api/books/categories`),
      ]);

      const words = await wordsRes.json();
      const books = await booksRes.json();
      const wordCats = await wordCatsRes.json();
      const bookCats = await bookCatsRes.json();

      const totalDownloads = books.reduce((sum: number, b: any) => sum + (b.download_count || 0), 0);

      setStats({
        totalWords: words.length,
        totalBooks: books.length,
        totalCategories: wordCats.length + bookCats.length,
        totalDownloads,
      });

      setWordCategories(wordCats);
      setBookCategories(bookCats);
    } catch (error) {
      console.log('Dashboard data fetch error:', error);
      setStats({
        totalWords: 150,
        totalBooks: 25,
        totalCategories: 15,
        totalDownloads: 1250,
      });
      setWordCategories([
        { id: 'greeting', name: 'Salamdasu', count: 20, icon: 'hand-wave' },
        { id: 'family', name: 'Otbasy', count: 15, icon: 'users' },
        { id: 'food', name: 'Tamak', count: 25, icon: 'utensils' },
        { id: 'numbers', name: 'Sandar', count: 10, icon: 'hash' },
      ]);
      setBookCategories([
        { id: 'sign_language', name: 'Ym til', count: 10, icon: 'hand' },
        { id: 'education', name: 'Bilim', count: 8, icon: 'book' },
        { id: 'dictionary', name: 'Sozdik', count: 5, icon: 'book-open' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCard[] = [
    {
      title: 'Total Words',
      titleKz: 'Барлық сөздер',
      value: stats.totalWords,
      change: '+12%',
      changeType: 'positive',
      icon: 'text-outline',
      color: AdminColors.primary,
    },
    {
      title: 'Total Books',
      titleKz: 'Барлық кітаптар',
      value: stats.totalBooks,
      change: '+5%',
      changeType: 'positive',
      icon: 'book-outline',
      color: AdminColors.info,
    },
    {
      title: 'Categories',
      titleKz: 'Категориялар',
      value: stats.totalCategories,
      change: '0%',
      changeType: 'neutral',
      icon: 'folder-outline',
      color: AdminColors.warning,
    },
    {
      title: 'Downloads',
      titleKz: 'Жүктемелер',
      value: stats.totalDownloads,
      change: '+28%',
      changeType: 'positive',
      icon: 'download-outline',
      color: AdminColors.success,
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
        <Text style={styles.loadingText}>Деректер жүктелуде...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <Text style={styles.pageSubtitle}>Басты бет - Жалпы шолу</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchDashboardData}>
            <Ionicons name="refresh-outline" size={scaleWidth(18)} color={AdminColors.text} />
            <Text style={styles.refreshText}>Жаңарту</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((card, index) => (
            <View key={index} style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: `${card.color}15` }]}>
                  <Ionicons name={card.icon} size={scaleWidth(22)} color={card.color} />
                </View>
                <View style={[
                  styles.changeBadge,
                  card.changeType === 'positive' && styles.changeBadgePositive,
                  card.changeType === 'negative' && styles.changeBadgeNegative,
                  card.changeType === 'neutral' && styles.changeBadgeNeutral,
                ]}>
                  <Ionicons
                    name={card.changeType === 'positive' ? 'trending-up' : card.changeType === 'negative' ? 'trending-down' : 'remove'}
                    size={scaleWidth(12)}
                    color={card.changeType === 'positive' ? AdminColors.success : card.changeType === 'negative' ? AdminColors.error : AdminColors.textMuted}
                  />
                  <Text style={[
                    styles.changeText,
                    card.changeType === 'positive' && styles.changeTextPositive,
                    card.changeType === 'negative' && styles.changeTextNegative,
                  ]}>
                    {card.change}
                  </Text>
                </View>
              </View>
              <Text style={styles.statValue}>{card.value.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{card.titleKz}</Text>
              <Text style={styles.statLabelEn}>{card.title}</Text>
            </View>
          ))}
        </View>

        {/* Categories Section */}
        <View style={styles.sectionGrid}>
          {/* Word Categories */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="text-outline" size={scaleWidth(20)} color={AdminColors.primary} />
                <Text style={styles.sectionTitle}>Сөз категориялары</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Word Categories</Text>
            </View>
            <View style={styles.categoryList}>
              {wordCategories.map((cat, index) => (
                <View key={cat.id} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.categoryDot, { backgroundColor: AdminColors.primary }]} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </View>
                  <View style={styles.categoryCountContainer}>
                    <Text style={styles.categoryCount}>{cat.count}</Text>
                    <View style={styles.categoryBar}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          { width: `${Math.min((cat.count / 30) * 100, 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Book Categories */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="book-outline" size={scaleWidth(20)} color={AdminColors.info} />
                <Text style={styles.sectionTitle}>Кітап категориялары</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Book Categories</Text>
            </View>
            <View style={styles.categoryList}>
              {bookCategories.map((cat, index) => (
                <View key={cat.id} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.categoryDot, { backgroundColor: AdminColors.info }]} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </View>
                  <View style={styles.categoryCountContainer}>
                    <Text style={styles.categoryCount}>{cat.count}</Text>
                    <View style={styles.categoryBar}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          { width: `${Math.min((cat.count / 15) * 100, 100)}%`, backgroundColor: AdminColors.info },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  content: {
    padding: getContentPadding(),
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AdminColors.background,
    gap: spacing.md,
  },
  loadingText: {
    color: AdminColors.textSecondary,
    fontSize: scaleFont(14),
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pageTitle: {
    fontSize: isMobile ? scaleFont(24) : scaleFont(28),
    fontWeight: '700',
    color: AdminColors.text,
    marginBottom: spacing.xxs,
  },
  pageSubtitle: {
    fontSize: scaleFont(14),
    color: AdminColors.textMuted,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: scaleHeight(10),
    backgroundColor: AdminColors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: spacing.xs,
  },
  refreshText: {
    color: AdminColors.text,
    fontSize: scaleFont(14),
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getCardGap(),
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: getStatCardMinWidth(),
    backgroundColor: AdminColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statIconContainer: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: scaleHeight(4),
    borderRadius: borderRadius.sm,
    gap: spacing.xxs,
  },
  changeBadgePositive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  changeBadgeNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  changeBadgeNeutral: {
    backgroundColor: 'rgba(113, 113, 122, 0.1)',
  },
  changeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: AdminColors.textMuted,
  },
  changeTextPositive: {
    color: AdminColors.success,
  },
  changeTextNegative: {
    color: AdminColors.error,
  },
  statValue: {
    fontSize: isMobile ? scaleFont(28) : scaleFont(32),
    fontWeight: '700',
    color: AdminColors.text,
    marginBottom: spacing.xxs,
  },
  statLabel: {
    fontSize: scaleFont(14),
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  statLabelEn: {
    fontSize: scaleFont(12),
    color: AdminColors.textMuted,
    marginTop: scaleHeight(2),
  },
  sectionGrid: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: getCardGap(),
    marginBottom: spacing.xl,
  },
  sectionCard: {
    flex: 1,
    backgroundColor: AdminColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: AdminColors.text,
  },
  sectionSubtitle: {
    fontSize: scaleFont(12),
    color: AdminColors.textMuted,
    marginTop: spacing.xxs,
    marginLeft: scaleWidth(30),
  },
  categoryList: {
    gap: spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryDot: {
    width: scaleWidth(8),
    height: scaleWidth(8),
    borderRadius: scaleWidth(4),
  },
  categoryName: {
    fontSize: scaleFont(14),
    color: AdminColors.textSecondary,
  },
  categoryCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryCount: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: AdminColors.text,
    width: scaleWidth(30),
    textAlign: 'right',
  },
  categoryBar: {
    width: scaleWidth(80),
    height: scaleHeight(6),
    backgroundColor: AdminColors.surfaceHover,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: AdminColors.primary,
    borderRadius: borderRadius.sm,
  },
});