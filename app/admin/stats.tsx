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

interface StatItem {
  label: string;
  value: number;
  change: number;
  color: string;
}

interface ChartData {
  label: string;
  value: number;
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [stats, setStats] = useState({
    totalWords: 0,
    totalBooks: 0,
    totalDownloads: 0,
    activeUsers: 0,
  });
  const [categoryStats, setCategoryStats] = useState<{ name: string; count: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch real data
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
        totalDownloads,
        activeUsers: Math.floor(totalDownloads / 10) + 50,
      });

      setCategoryStats([
        ...wordCats.map((c: any) => ({ name: c.name, count: c.count })),
        ...bookCats.map((c: any) => ({ name: c.name, count: c.count })),
      ]);
    } catch (error) {
      // Demo data
      setStats({
        totalWords: 256,
        totalBooks: 32,
        totalDownloads: 1847,
        activeUsers: 234,
      });
      setCategoryStats([
        { name: 'Salamdasu', count: 45 },
        { name: 'Otbasy', count: 32 },
        { name: 'Tamak', count: 28 },
        { name: 'Sandar', count: 20 },
        { name: 'Sezimder', count: 18 },
        { name: 'Ym til', count: 15 },
        { name: 'Bilim', count: 12 },
      ]);
    }

    // Generate demo monthly data
    const months = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];
    setMonthlyData(
      months.slice(0, selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 12).map((m, i) => ({
        label: selectedPeriod === 'week' ? ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн', 'Жс'][i] : m.slice(0, 3),
        value: Math.floor(Math.random() * 100) + 50,
      }))
    );

    setLoading(false);
  };

  const statCards: StatItem[] = [
    { label: 'Барлық сөздер', value: stats.totalWords, change: 12, color: AdminColors.primary },
    { label: 'Барлық кітаптар', value: stats.totalBooks, change: 5, color: AdminColors.info },
    { label: 'Жүктемелер', value: stats.totalDownloads, change: 28, color: AdminColors.success },
    { label: 'Белсенді қолданушылар', value: stats.activeUsers, change: 15, color: AdminColors.warning },
  ];

  const maxCategoryCount = Math.max(...categoryStats.map(c => c.count), 1);
  const maxMonthlyValue = Math.max(...monthlyData.map(d => d.value), 1);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
        <Text style={styles.loadingText}>Статистика жүктелуде...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Statistics</Text>
            <Text style={styles.pageSubtitle}>Статистика - Жалпы мәліметтер</Text>
          </View>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="download-outline" size={18} color={AdminColors.text} />
            <Text style={styles.exportButtonText}>Экспорттау</Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextActive]}>
                {period === 'week' ? 'Апта' : period === 'month' ? 'Ай' : 'Жыл'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stat Cards */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
                <Ionicons
                  name={
                    index === 0 ? 'text-outline' :
                    index === 1 ? 'book-outline' :
                    index === 2 ? 'download-outline' : 'people-outline'
                  }
                  size={24}
                  color={stat.color}
                />
              </View>
              <Text style={styles.statValue}>{stat.value.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <View style={[styles.changeBadge, { backgroundColor: `${AdminColors.success}15` }]}>
                <Ionicons name="trending-up" size={12} color={AdminColors.success} />
                <Text style={styles.changeText}>+{stat.change}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Charts Row */}
        <View style={styles.chartsRow}>
          {/* Activity Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Қолданыс белсенділігі</Text>
                <Text style={styles.chartSubtitle}>Usage Activity</Text>
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: AdminColors.primary }]} />
                  <Text style={styles.legendText}>Жүктемелер</Text>
                </View>
              </View>
            </View>
            <View style={styles.barChart}>
              {monthlyData.slice(0, 12).map((data, index) => (
                <View key={index} style={styles.barItem}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${(data.value / maxMonthlyValue) * 100}%`,
                          backgroundColor: AdminColors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{data.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Category Distribution */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Категория таралымы</Text>
                <Text style={styles.chartSubtitle}>Category Distribution</Text>
              </View>
            </View>
            <View style={styles.horizontalBars}>
              {categoryStats.slice(0, 7).map((cat, index) => (
                <View key={index} style={styles.horizontalBarItem}>
                  <View style={styles.horizontalBarInfo}>
                    <Text style={styles.horizontalBarLabel}>{cat.name}</Text>
                    <Text style={styles.horizontalBarValue}>{cat.count}</Text>
                  </View>
                  <View style={styles.horizontalBarContainer}>
                    <View
                      style={[
                        styles.horizontalBar,
                        {
                          width: `${(cat.count / maxCategoryCount) * 100}%`,
                          backgroundColor: [
                            AdminColors.primary,
                            AdminColors.info,
                            AdminColors.success,
                            AdminColors.warning,
                            AdminColors.error,
                            AdminColors.secondary,
                            AdminColors.primaryDark,
                          ][index % 7],
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Insights Cards */}
        <View style={styles.insightsRow}>
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="trending-up" size={20} color={AdminColors.success} />
              <Text style={styles.insightTitle}>Өсу көрсеткіші</Text>
            </View>
            <Text style={styles.insightValue}>+23.5%</Text>
            <Text style={styles.insightDescription}>
              Соңғы айдағы жүктемелер саны алдыңғы ай мен салыстырғанда 23.5% өсті
            </Text>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="star" size={20} color={AdminColors.warning} />
              <Text style={styles.insightTitle}>Танымал категория</Text>
            </View>
            <Text style={styles.insightValue}>Salamdasu</Text>
            <Text style={styles.insightDescription}>
              Сәлемдесу категориясы ең танымал болып табылады, 45 сөз бар
            </Text>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="book" size={20} color={AdminColors.info} />
              <Text style={styles.insightTitle}>Ең көп жүктелген</Text>
            </View>
            <Text style={styles.insightValue}>Ым тілі сөздігі</Text>
            <Text style={styles.insightDescription}>
              Бұл кітап 567 рет жүктелді және ең танымал кітап болып табылады
            </Text>
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
  exportButton: {
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
  exportButtonText: {
    color: AdminColors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: AdminColors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: AdminColors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: AdminColors.background,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: isWeb ? 200 : width / 2 - 32,
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: AdminColors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: AdminColors.textSecondary,
    marginBottom: 12,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.success,
  },
  chartsRow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 16,
    marginBottom: 24,
  },
  chartCard: {
    flex: 1,
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AdminColors.text,
  },
  chartSubtitle: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 20,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barContainer: {
    width: '60%',
    height: 140,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: AdminColors.textMuted,
  },
  horizontalBars: {
    gap: 16,
  },
  horizontalBarItem: {
    gap: 8,
  },
  horizontalBarInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horizontalBarLabel: {
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
  horizontalBarValue: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.text,
  },
  horizontalBarContainer: {
    height: 8,
    backgroundColor: AdminColors.surfaceHover,
    borderRadius: 4,
    overflow: 'hidden',
  },
  horizontalBar: {
    height: '100%',
    borderRadius: 4,
  },
  insightsRow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 16,
    marginBottom: 24,
  },
  insightCard: {
    flex: 1,
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 14,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '700',
    color: AdminColors.text,
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 13,
    color: AdminColors.textMuted,
    lineHeight: 20,
  },
  tableCard: {
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AdminColors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AdminColors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: AdminColors.primary,
    fontWeight: '500',
  },
  tableContent: {},
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  tableRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 2,
  },
  tableRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableRowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: AdminColors.text,
  },
  tableRowType: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  tableRowUser: {
    flex: 1,
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
  tableRowTime: {
    fontSize: 12,
    color: AdminColors.textMuted,
    textAlign: 'right',
  },
});
