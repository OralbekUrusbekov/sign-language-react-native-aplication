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

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

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

interface RecentActivity {
  id: string;
  type: 'word' | 'book' | 'user' | 'setting';
  action: string;
  item: string;
  time: string;
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
      // Fetch word categories
      const wordsRes = await fetch(`${API_BASE_URL}/api/words/categories`);
      const wordsData = await wordsRes.json();
      
      // Fetch book categories
      const booksRes = await fetch(`${API_BASE_URL}/api/books/categories`);
      const booksData = await booksRes.json();

      // Fetch all words count
      const allWordsRes = await fetch(`${API_BASE_URL}/api/words`);
      const allWordsData = await allWordsRes.json();

      // Fetch all books
      const allBooksRes = await fetch(`${API_BASE_URL}/api/books`);
      const allBooksData = await allBooksRes.json();

      const totalDownloads = allBooksData.reduce((sum: number, book: any) => sum + (book.download_count || 0), 0);

      setWordCategories(wordsData);
      setBookCategories(booksData);
      setStats({
        totalWords: allWordsData.length,
        totalBooks: allBooksData.length,
        totalCategories: wordsData.length + booksData.length,
        totalDownloads: totalDownloads,
      });
    } catch (error) {
      console.log('Dashboard data fetch error:', error);
      // Set default data for demo
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

  const recentActivities: RecentActivity[] = [
    { id: '1', type: 'word', action: 'Жаңа сөз қосылды', item: 'Salam', time: '5 мин бұрын' },
    { id: '2', type: 'book', action: 'Кітап жүктелді', item: 'Ым тілі негіздері', time: '15 мин бұрын' },
    { id: '3', type: 'word', action: 'Сөз өзгертілді', item: 'Rahmet', time: '1 сағ бұрын' },
    { id: '4', type: 'book', action: 'Жаңа кітап қосылды', item: 'Балаларға арналған', time: '2 сағ бұрын' },
    { id: '5', type: 'setting', action: 'Баптау өзгертілді', item: 'API URL', time: '3 сағ бұрын' },
  ];

  const getActivityIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'word': return 'text-outline';
      case 'book': return 'book-outline';
      case 'user': return 'person-outline';
      case 'setting': return 'settings-outline';
      default: return 'ellipse-outline';
    }
  };

  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'word': return AdminColors.primary;
      case 'book': return AdminColors.info;
      case 'user': return AdminColors.success;
      case 'setting': return AdminColors.warning;
      default: return AdminColors.textMuted;
    }
  };

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
            <Ionicons name="refresh-outline" size={18} color={AdminColors.text} />
            <Text style={styles.refreshText}>Жаңарту</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((card, index) => (
            <View key={index} style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: `${card.color}15` }]}>
                  <Ionicons name={card.icon} size={22} color={card.color} />
                </View>
                <View style={[
                  styles.changeBadge,
                  card.changeType === 'positive' && styles.changeBadgePositive,
                  card.changeType === 'negative' && styles.changeBadgeNegative,
                  card.changeType === 'neutral' && styles.changeBadgeNeutral,
                ]}>
                  <Ionicons
                    name={card.changeType === 'positive' ? 'trending-up' : card.changeType === 'negative' ? 'trending-down' : 'remove'}
                    size={12}
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
                <Ionicons name="text-outline" size={20} color={AdminColors.primary} />
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
                <Ionicons name="book-outline" size={20} color={AdminColors.info} />
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
    padding: 24,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AdminColors.background,
    gap: 16,
  },
  loadingText: {
    color: AdminColors.textSecondary,
    fontSize: 14,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: AdminColors.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: AdminColors.textMuted,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AdminColors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: 8,
  },
  refreshText: {
    color: AdminColors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: isWeb ? 220 : width / 2 - 32,
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
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
    fontSize: 12,
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
    fontSize: 32,
    fontWeight: '700',
    color: AdminColors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  statLabelEn: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  sectionGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 16,
    marginBottom: 24,
  },
  sectionCard: {
    flex: 1,
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AdminColors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 4,
    marginLeft: 30,
  },
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 14,
    color: AdminColors.textSecondary,
  },
  categoryCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: AdminColors.text,
    width: 30,
    textAlign: 'right',
  },
  categoryBar: {
    width: 80,
    height: 6,
    backgroundColor: AdminColors.surfaceHover,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: AdminColors.primary,
    borderRadius: 3,
  },
  activityCard: {
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AdminColors.border,
    marginBottom: 24,
  },
  activityList: {
    gap: 0,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    gap: 14,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    color: AdminColors.text,
    fontWeight: '500',
  },
  activityItem2: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
  quickActionsCard: {
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AdminColors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    padding: 20,
    backgroundColor: AdminColors.surfaceHover,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: 12,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
});
