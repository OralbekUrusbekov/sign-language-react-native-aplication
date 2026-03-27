// app/admin/words.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Dimensions,
  SafeAreaView,
  RefreshControl,
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
  getContentPadding,
  getCardGap,
  getModalMaxHeight,
  getModalWidth,
  getTableCellPadding,
  getButtonHeight,
  responsiveFont,
} from '@/constants/admin-responsive';

const { width, height } = Dimensions.get('window');

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

interface Word {
  id: number;
  text_kz: string;
  text_ru: string | null;
  text_en: string | null;
  category: string;
  icon: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  nameKz: string;
  icon: string;
  count: number;
}

const CATEGORIES: Category[] = [
  { id: 'greeting', name: 'Salamdasu', nameKz: 'Сәлемдесу', icon: 'hand-wave', count: 0 },
  { id: 'family', name: 'Otbasy', nameKz: 'Отбасы', icon: 'users', count: 0 },
  { id: 'food', name: 'Tamak', nameKz: 'Тамақ', icon: 'utensils', count: 0 },
  { id: 'numbers', name: 'Sandar', nameKz: 'Сандар', icon: 'hash', count: 0 },
  { id: 'colors', name: 'Tuster', nameKz: 'Түстер', icon: 'palette', count: 0 },
  { id: 'emotions', name: 'Sezimder', nameKz: 'Сезімдер', icon: 'smile', count: 0 },
  { id: 'actions', name: 'Areketler', nameKz: 'Әрекеттер', icon: 'activity', count: 0 },
  { id: 'questions', name: 'Suraktar', nameKz: 'Сұрақтар', icon: 'help-circle', count: 0 },
  { id: 'time', name: 'Uakyt', nameKz: 'Уақыт', icon: 'clock', count: 0 },
  { id: 'places', name: 'Zherler', nameKz: 'Жерлер', icon: 'map-pin', count: 0 },
];

export default function WordsManagement() {
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    text_kz: '',
    text_ru: '',
    text_en: '',
    category: 'greeting',
    icon: '',
  });

  // Fetch words with filters
  const fetchWords = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/words`;
      const params = new URLSearchParams();
      
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch words');
      
      const data = await response.json();
      setWords(data);
    } catch (error) {
      console.error('Fetch words error:', error);
      Alert.alert('Қате', 'Сөздерді жүктеу кезінде қате орын алды');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  // Fetch categories with counts
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/words/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      
      setCategories(prevCategories => 
        prevCategories.map(cat => {
          const apiCat = data.find((c: any) => c.id === cat.id);
          return {
            ...cat,
            count: apiCat?.count || 0
          };
        })
      );
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchWords(true),
      fetchCategories()
    ]);
  };

  // Refresh control
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWords(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter by category
  const handleCategoryFilter = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Open add modal
  const openAddModal = () => {
    setEditingWord(null);
    setFormData({
      text_kz: '',
      text_ru: '',
      text_en: '',
      category: 'greeting',
      icon: '',
    });
    setModalVisible(true);
  };

  // Open edit modal
  const openEditModal = (word: Word) => {
    setEditingWord(word);
    setFormData({
      text_kz: word.text_kz,
      text_ru: word.text_ru || '',
      text_en: word.text_en || '',
      category: word.category,
      icon: word.icon || '',
    });
    setModalVisible(true);
  };

  // Save word (create or update)
  const handleSave = async () => {
    if (!formData.text_kz.trim()) {
      Alert.alert('Қате', 'Қазақша сөзді енгізіңіз');
      return;
    }

    setSaving(true);
    try {
      const url = editingWord
        ? `${API_BASE_URL}/api/words/${editingWord.id}`
        : `${API_BASE_URL}/api/words`;
      
      const method = editingWord ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save word');
      }

      setModalVisible(false);
      await loadData();
      
      Alert.alert(
        'Сәтті',
        editingWord ? 'Сөз сәтті өзгертілді' : 'Жаңа сөз сәтті қосылды'
      );
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Қате', error.message || 'Сақтау кезінде қате орын алды');
    } finally {
      setSaving(false);
    }
  };

  // Delete word
  const handleDelete = (wordId: number) => {
    Alert.alert(
      'Сөзді жою',
      'Бұл сөзді жойғыңыз келетініне сенімдісіз бе?',
      [
        { text: 'Болдырмау', style: 'cancel' },
        {
          text: 'Жою',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/words/${wordId}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete word');
              }

              await loadData();
              Alert.alert('Сәтті', 'Сөз сәтті жойылды');
            } catch (error: any) {
              console.error('Delete error:', error);
              Alert.alert('Қате', error.message || 'Жою кезінде қате орын алды');
            }
          },
        },
      ]
    );
  };

  // Toggle word active status
  const toggleWordStatus = async (word: Word) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/words/${word.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !word.is_active
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update word status');
      }

      await loadData();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      Alert.alert('Қате', error.message || 'Статусты өзгерту кезінде қате орын алды');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
        <Text style={styles.loadingText}>Сөздер жүктелуде...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Сөздер</Text>
          <Text style={styles.headerSubtitle}>
            Барлығы: {words.length} сөз
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={scaleWidth(24)} color={AdminColors.background} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={scaleWidth(20)} color={AdminColors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Сөз іздеу..."
          placeholderTextColor={AdminColors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={scaleWidth(20)} color={AdminColors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => handleCategoryFilter(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
            Барлығы ({categories.reduce((sum, cat) => sum + cat.count, 0)})
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
            onPress={() => handleCategoryFilter(cat.id)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
              {cat.nameKz} ({cat.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Words List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AdminColors.primary}
            colors={[AdminColors.primary]}
          />
        }
      >
        {words.map((word) => (
          <View key={word.id} style={styles.wordCard}>
            {/* Main Word Info */}
            <View style={styles.wordCardHeader}>
              <View style={styles.wordMainInfo}>
                <View style={styles.wordIcon}>
                  <Ionicons
                    name={word.icon as any || (word.is_active ? 'text-outline' : 'ban-outline')}
                    size={scaleWidth(20)}
                    color={word.is_active ? AdminColors.primary : AdminColors.textMuted}
                  />
                </View>
                <View style={styles.wordInfo}>
                  <Text style={[
                    styles.wordKz,
                    !word.is_active && styles.wordInactive
                  ]}>
                    {word.text_kz}
                  </Text>
                  <View style={styles.wordTranslations}>
                    {word.text_ru && (
                      <Text style={styles.wordTranslation}>🇷🇺 {word.text_ru}</Text>
                    )}
                    {word.text_en && (
                      <Text style={styles.wordTranslation}>🇬🇧 {word.text_en}</Text>
                    )}
                  </View>
                </View>
              </View>
              
              {/* Status Toggle */}
              <TouchableOpacity
                style={[
                  styles.statusBadge,
                  word.is_active ? styles.statusActive : styles.statusInactive
                ]}
                onPress={() => toggleWordStatus(word)}
              >
                <View style={[
                  styles.statusDot,
                  word.is_active ? styles.statusDotActive : styles.statusDotInactive
                ]} />
                <Text style={[
                  styles.statusText,
                  word.is_active ? styles.statusTextActive : styles.statusTextInactive
                ]}>
                  {word.is_active ? 'Белсенді' : 'Сөндірулі'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category and Actions */}
            <View style={styles.wordCardFooter}>
              <View style={styles.categoryBadge}>
                <Ionicons name="pricetag-outline" size={scaleWidth(12)} color={AdminColors.info} />
                <Text style={styles.categoryBadgeText}>
                  {categories.find(c => c.id === word.category)?.nameKz || word.category}
                </Text>
              </View>
              
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(word)}
                >
                  <Ionicons name="pencil-outline" size={scaleWidth(18)} color={AdminColors.info} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(word.id)}
                >
                  <Ionicons name="trash-outline" size={scaleWidth(18)} color={AdminColors.error} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Metadata */}
            <View style={styles.wordMetadata}>
              <Text style={styles.metadataText}>
                ID: #{word.id} • Реті: {word.order_index}
              </Text>
              <Text style={styles.metadataText}>
                {new Date(word.created_at).toLocaleDateString('kk-KZ')}
              </Text>
            </View>
          </View>
        ))}

        {words.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={scaleWidth(64)} color={AdminColors.textMuted} />
            <Text style={styles.emptyStateText}>Сөздер табылмады</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedCategory 
                ? 'Басқа фильтрлерді қолданып көріңіз'
                : 'Жаңа сөз қосу үшін + батырмасын басыңыз'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: getModalWidth(), alignSelf: 'center' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingWord ? 'Сөзді өзгерту' : 'Жаңа сөз қосу'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={scaleWidth(24)} color={AdminColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Қазақша *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Сөзді енгізіңіз"
                  placeholderTextColor={AdminColors.textMuted}
                  value={formData.text_kz}
                  onChangeText={(text) => setFormData({ ...formData, text_kz: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Орысша</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Русский перевод"
                  placeholderTextColor={AdminColors.textMuted}
                  value={formData.text_ru}
                  onChangeText={(text) => setFormData({ ...formData, text_ru: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ағылшынша</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="English translation"
                  placeholderTextColor={AdminColors.textMuted}
                  value={formData.text_en}
                  onChangeText={(text) => setFormData({ ...formData, text_en: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Категория</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categorySelect}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryOption,
                          formData.category === cat.id && styles.categoryOptionActive,
                        ]}
                        onPress={() => setFormData({ ...formData, category: cat.id })}
                      >
                        <Text style={[
                          styles.categoryOptionText,
                          formData.category === cat.id && styles.categoryOptionTextActive,
                        ]}>
                          {cat.nameKz}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Icon</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="hand-left, heart, star"
                  placeholderTextColor={AdminColors.textMuted}
                  value={formData.icon}
                  onChangeText={(text) => setFormData({ ...formData, icon: text })}
                />
                <Text style={styles.helperText}>
                  Ionicons атаулары: hand-left, heart, star, book, etc.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Болдырмау</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={AdminColors.background} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingWord ? 'Сақтау' : 'Қосу'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: AdminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  headerTitle: {
    fontSize: isMobile ? scaleFont(20) : scaleFont(24),
    fontWeight: '700',
    color: AdminColors.text,
  },
  headerSubtitle: {
    fontSize: scaleFont(13),
    color: AdminColors.textMuted,
    marginTop: scaleHeight(2),
  },
  addButton: {
    width: scaleWidth(48),
    height: scaleWidth(48),
    borderRadius: scaleWidth(24),
    backgroundColor: AdminColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AdminColors.primary,
    shadowOffset: { width: 0, height: scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scaleWidth(8),
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AdminColors.surface,
    margin: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? scaleHeight(14) : scaleHeight(10),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(16),
    color: AdminColors.text,
    padding: 0,
  },
  categoriesContainer: {
    maxHeight: scaleHeight(50),
    marginBottom: spacing.sm,
  },
  categoriesContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: scaleHeight(8),
    backgroundColor: AdminColors.surface,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  categoryChipActive: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },
  categoryChipText: {
    fontSize: scaleFont(14),
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: AdminColors.background,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  wordCard: {
    backgroundColor: AdminColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: AdminColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: scaleWidth(4),
    elevation: 2,
  },
  wordCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  wordMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  wordIcon: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: borderRadius.lg,
    backgroundColor: `${AdminColors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordInfo: {
    flex: 1,
  },
  wordKz: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: AdminColors.text,
    marginBottom: scaleHeight(4),
  },
  wordInactive: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  wordTranslations: {
    gap: scaleHeight(2),
  },
  wordTranslation: {
    fontSize: scaleFont(13),
    color: AdminColors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: scaleHeight(4),
    borderRadius: borderRadius.lg,
    gap: spacing.xxs,
  },
  statusActive: {
    backgroundColor: `${AdminColors.success}15`,
  },
  statusInactive: {
    backgroundColor: `${AdminColors.textMuted}15`,
  },
  statusDot: {
    width: scaleWidth(6),
    height: scaleWidth(6),
    borderRadius: scaleWidth(3),
  },
  statusDotActive: {
    backgroundColor: AdminColors.success,
  },
  statusDotInactive: {
    backgroundColor: AdminColors.textMuted,
  },
  statusText: {
    fontSize: scaleFont(11),
    fontWeight: '500',
  },
  statusTextActive: {
    color: AdminColors.success,
  },
  statusTextInactive: {
    color: AdminColors.textMuted,
  },
  wordCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${AdminColors.info}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: scaleHeight(4),
    borderRadius: borderRadius.sm,
    gap: spacing.xxs,
  },
  categoryBadgeText: {
    fontSize: scaleFont(12),
    color: AdminColors.info,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: borderRadius.md,
    backgroundColor: AdminColors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: `${AdminColors.error}15`,
  },
  wordMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  metadataText: {
    fontSize: scaleFont(11),
    color: AdminColors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(60),
  },
  emptyStateText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: AdminColors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: scaleFont(14),
    color: AdminColors.textMuted,
    marginTop: spacing.xxs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: AdminColors.surface,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: AdminColors.border,
    maxHeight: getModalMaxHeight(),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: AdminColors.text,
  },
  modalBody: {
    padding: spacing.lg,
    maxHeight: height * 0.5,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: AdminColors.textSecondary,
    marginBottom: spacing.xs,
  },
  formInput: {
    backgroundColor: AdminColors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: scaleHeight(14),
    fontSize: scaleFont(16),
    color: AdminColors.text,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  helperText: {
    fontSize: scaleFont(12),
    color: AdminColors.textMuted,
    marginTop: spacing.xxs,
  },
  categorySelect: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: scaleHeight(4),
    flexWrap: 'wrap',
  },
  categoryOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: scaleHeight(10),
    backgroundColor: AdminColors.background,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  categoryOptionActive: {
    backgroundColor: `${AdminColors.primary}20`,
    borderColor: AdminColors.primary,
  },
  categoryOptionText: {
    fontSize: scaleFont(14),
    color: AdminColors.textSecondary,
  },
  categoryOptionTextActive: {
    color: AdminColors.primary,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: scaleHeight(16),
    borderRadius: borderRadius.lg,
    backgroundColor: AdminColors.surfaceHover,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: scaleFont(16),
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: scaleHeight(16),
    backgroundColor: AdminColors.primary,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: scaleFont(16),
    color: AdminColors.background,
    fontWeight: '600',
  },
});