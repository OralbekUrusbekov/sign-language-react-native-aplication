// app/admin/books.tsx
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
  Image,
  Platform,
  Dimensions,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
  getGridColumns,
  getModalMaxHeight,
  getModalWidth,
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

interface Book {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  category: string;
  cover_url: string | null;
  pdf_url: string;
  file_size: number;
  page_count: number;
  download_count: number;
  is_active: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  nameKz: string;
  icon: string;
  count: number;
}

interface SelectedFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

const BOOK_CATEGORIES: Category[] = [
  { id: 'sign_language', name: 'Sign Language', nameKz: 'Ым тілі', icon: 'hand-left', count: 0 },
  { id: 'education', name: 'Education', nameKz: 'Білім', icon: 'book', count: 0 },
  { id: 'dictionary', name: 'Dictionary', nameKz: 'Сөздік', icon: 'book', count: 0 },
  { id: 'children', name: 'Children', nameKz: 'Балаларға', icon: 'happy', count: 0 },
  { id: 'grammar', name: 'Grammar', nameKz: 'Грамматика', icon: 'document-text', count: 0 },
];

export default function BooksManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>(BOOK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPdf, setSelectedPdf] = useState<SelectedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    category: 'sign_language' as string,
    page_count: '',
  });

  // Filtered books
  const filteredBooks = books.filter(book => {
    const matchesSearch = !searchQuery ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Fetch books
  const fetchBooks = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/books`;
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
      if (!response.ok) throw new Error('Failed to fetch books');
      
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.error('Fetch books error:', error);
      Alert.alert('Қате', 'Кітаптарды жүктеу кезінде қате орын алды');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/categories`);
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
      fetchBooks(true),
      fetchCategories()
    ]);
  };

  // Refresh control
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks(true);
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
    setEditingBook(null);
    setSelectedPdf(null);
    setUploadProgress(0);
    setFormData({
      title: '',
      author: '',
      description: '',
      category: 'sign_language',
      page_count: '',
    });
    setModalVisible(true);
  };

  // Open edit modal
  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setSelectedPdf(null);
    setFormData({
      title: book.title,
      author: book.author || '',
      description: book.description || '',
      category: book.category,
      page_count: book.page_count.toString(),
    });
    setModalVisible(true);
  };

  // Pick PDF file
  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        if (file.size && file.size > 50 * 1024 * 1024) {
          Alert.alert('Қате', 'Файл өлшемі 50МБ-тан аспауы керек');
          return;
        }

        setSelectedPdf({
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        });
      }
    } catch (error) {
      console.error('Pick PDF error:', error);
      Alert.alert('Қате', 'PDF файлын таңдау кезінде қате орын алды');
    }
  };

  // Upload PDF file
  const uploadPdf = async () => {
    if (!selectedPdf) return null;

    try {
      const uploadData = new FormData();

      const filePayload: any = {
        uri: Platform.OS === "android" 
          ? selectedPdf.uri 
          : selectedPdf.uri.replace("file://", ""),
        type: selectedPdf.mimeType || "application/pdf",
        name: selectedPdf.name || "upload.pdf",
      };

      uploadData.append("file", filePayload);
      uploadData.append("title", formData.title);
      uploadData.append("category", formData.category);
      
      if (formData.author) uploadData.append("author", formData.author);
      if (formData.description) uploadData.append("description", formData.description);
      if (formData.page_count) uploadData.append("page_count", formData.page_count);

      const response = await fetch(`${API_BASE_URL}/api/books/`, {
        method: "POST",
        body: uploadData,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(responseText);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Save book
  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Қате', 'Кітап атауын енгізіңіз');
      return;
    }

    if (!editingBook && !selectedPdf) {
      Alert.alert('Қате', 'PDF файлын таңдаңыз');
      return;
    }

    setSaving(true);

    try {
      if (editingBook) {
        const response = await fetch(`${API_BASE_URL}/api/books/${editingBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            page_count: parseInt(formData.page_count) || 0,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to update book');
        }
      } else {
        await uploadPdf();
      }

      setModalVisible(false);
      await loadData();
      
      Alert.alert(
        'Сәтті',
        editingBook ? 'Кітап сәтті өзгертілді' : 'Жаңа кітап сәтті қосылды'
      );
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Қате', error.message || 'Сақтау кезінде қате орын алды');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  // Delete book
  const handleDelete = (bookId: number) => {
    Alert.alert(
      'Кітапты жою',
      'Бұл кітапты жойғыңыз келетініне сенімдісіз бе?',
      [
        { text: 'Болдырмау', style: 'cancel' },
        {
          text: 'Жою',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete book');
              }

              await loadData();
              Alert.alert('Сәтті', 'Кітап сәтті жойылды');
            } catch (error: any) {
              console.error('Delete error:', error);
              Alert.alert('Қате', error.message || 'Жою кезінде қате орын алды');
            }
          },
        },
      ]
    );
  };

  // Toggle book status
  const toggleBookStatus = async (book: Book) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/${book.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !book.is_active
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update book status');
      }

      await loadData();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      Alert.alert('Қате', error.message || 'Статусты өзгерту кезінде қате орын алды');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('kk-KZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AdminColors.primary} />
        <Text style={styles.loadingText}>Кітаптар жүктелуде...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Кітаптар</Text>
          <Text style={styles.headerSubtitle}>
            Барлығы: {books.length} кітап
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons 
                name="grid-outline" 
                size={scaleWidth(18)} 
                color={viewMode === 'grid' ? AdminColors.primary : AdminColors.textMuted} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons 
                name="list-outline" 
                size={scaleWidth(18)} 
                color={viewMode === 'list' ? AdminColors.primary : AdminColors.textMuted} 
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={scaleWidth(24)} color={AdminColors.background} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={scaleWidth(20)} color={AdminColors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Кітап іздеу..."
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
            <Ionicons 
              name={cat.icon as any} 
              size={scaleWidth(14)} 
              color={selectedCategory === cat.id ? AdminColors.background : AdminColors.textSecondary} 
            />
            <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
              {cat.nameKz} ({cat.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Books List */}
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
        {viewMode === 'grid' ? (
          <View style={styles.booksGrid}>
            {filteredBooks.map((book) => (
              <View key={book.id} style={styles.bookCard}>
                <TouchableOpacity
                  style={styles.statusToggle}
                  onPress={() => toggleBookStatus(book)}
                >
                  <View style={[
                    styles.statusIndicator,
                    book.is_active ? styles.statusActive : styles.statusInactive
                  ]} />
                </TouchableOpacity>
                
                <View style={styles.bookCover}>
                  {book.cover_url ? (
                    <Image source={{ uri: book.cover_url }} style={styles.bookCoverImage} />
                  ) : (
                    <View style={styles.bookCoverPlaceholder}>
                      <Ionicons name="book" size={scaleWidth(40)} color={AdminColors.primary} />
                    </View>
                  )}
                  <View style={styles.bookCategoryBadge}>
                    <Ionicons 
                      name={categories.find(c => c.id === book.category)?.icon as any || 'book'} 
                      size={scaleWidth(10)} 
                      color={AdminColors.text} 
                    />
                    <Text style={styles.bookCategoryText}>
                      {categories.find(c => c.id === book.category)?.nameKz || book.category}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.bookInfo}>
                  <Text style={[styles.bookTitle, !book.is_active && styles.bookInactive]} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {book.author || 'Автор белгісіз'}
                  </Text>
                  
                  <View style={styles.bookMeta}>
                    <View style={styles.bookMetaItem}>
                      <Ionicons name="document-text-outline" size={scaleWidth(12)} color={AdminColors.textMuted} />
                      <Text style={styles.bookMetaText}>{book.page_count} бет</Text>
                    </View>
                    <View style={styles.bookMetaItem}>
                      <Ionicons name="download-outline" size={scaleWidth(12)} color={AdminColors.textMuted} />
                      <Text style={styles.bookMetaText}>{book.download_count}</Text>
                    </View>
                    <View style={styles.bookMetaItem}>
                      <Ionicons name="calendar-outline" size={scaleWidth(12)} color={AdminColors.textMuted} />
                      <Text style={styles.bookMetaText}>{formatDate(book.created_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.bookActions}>
                    <TouchableOpacity
                      style={[styles.bookActionButton, styles.editButton]}
                      onPress={() => openEditModal(book)}
                    >
                      <Ionicons name="pencil-outline" size={scaleWidth(14)} color={AdminColors.info} />
                      <Text style={styles.bookActionText}>Өзгерту</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bookActionButton, styles.deleteButton]}
                      onPress={() => handleDelete(book.id)}
                    >
                      <Ionicons name="trash-outline" size={scaleWidth(14)} color={AdminColors.error} />
                      <Text style={[styles.bookActionText, styles.deleteButtonText]}>Жою</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.bookFooter}>
                    <Text style={styles.bookSize}>{formatFileSize(book.file_size)}</Text>
                    <Text style={styles.bookId}>ID: #{book.id}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.listView}>
            {filteredBooks.map((book) => (
              <View key={book.id} style={styles.listItem}>
                <TouchableOpacity
                  style={styles.listItemStatus}
                  onPress={() => toggleBookStatus(book)}
                >
                  <View style={[
                    styles.statusDot,
                    book.is_active ? styles.statusDotActive : styles.statusDotInactive
                  ]} />
                </TouchableOpacity>

                <View style={styles.listItemCover}>
                  {book.cover_url ? (
                    <Image source={{ uri: book.cover_url }} style={styles.listItemCoverImage} />
                  ) : (
                    <View style={styles.listItemCoverPlaceholder}>
                      <Ionicons name="book" size={scaleWidth(20)} color={AdminColors.primary} />
                    </View>
                  )}
                </View>

                <View style={styles.listItemInfo}>
                  <Text style={[styles.listItemTitle, !book.is_active && styles.bookInactive]}>
                    {book.title}
                  </Text>
                  <Text style={styles.listItemSubtitle}>
                    {book.author || 'Автор белгісіз'} • {book.page_count} бет • {formatFileSize(book.file_size)}
                  </Text>
                  <View style={styles.listItemMeta}>
                    <View style={styles.listItemCategory}>
                      <Ionicons 
                        name={categories.find(c => c.id === book.category)?.icon as any || 'book'} 
                        size={scaleWidth(10)} 
                        color={AdminColors.info} 
                      />
                      <Text style={styles.listItemCategoryText}>
                        {categories.find(c => c.id === book.category)?.nameKz || book.category}
                      </Text>
                    </View>
                    <Text style={styles.listItemDate}>{formatDate(book.created_at)}</Text>
                  </View>
                </View>

                <View style={styles.listItemActions}>
                  <TouchableOpacity
                    style={styles.listItemAction}
                    onPress={() => openEditModal(book)}
                  >
                    <Ionicons name="pencil-outline" size={scaleWidth(16)} color={AdminColors.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.listItemAction}
                    onPress={() => handleDelete(book.id)}
                  >
                    <Ionicons name="trash-outline" size={scaleWidth(16)} color={AdminColors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {filteredBooks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={scaleWidth(64)} color={AdminColors.textMuted} />
            <Text style={styles.emptyStateText}>Кітаптар табылмады</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedCategory 
                ? 'Басқа фильтрлерді қолданып көріңіз'
                : 'Жаңа кітап қосу үшін + батырмасын басыңыз'}
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
                {editingBook ? 'Кітапты өзгерту' : 'Жаңа кітап қосу'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={scaleWidth(24)} color={AdminColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Кітап атауы *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Атауын енгізіңіз"
                  placeholderTextColor={AdminColors.textMuted}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Автор</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Автордың аты-жөні"
                  placeholderTextColor={AdminColors.textMuted}
                  value={formData.author}
                  onChangeText={(text) => setFormData({ ...formData, author: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Сипаттама</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Кітап туралы қысқаша"
                  placeholderTextColor={AdminColors.textMuted}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
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
                        <Ionicons 
                          name={cat.icon as any} 
                          size={scaleWidth(14)} 
                          color={formData.category === cat.id ? AdminColors.primary : AdminColors.textMuted} 
                        />
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
                <Text style={styles.formLabel}>Бет саны</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Мысалы: 120"
                  placeholderTextColor={AdminColors.textMuted}
                  value={formData.page_count}
                  onChangeText={(text) => setFormData({ ...formData, page_count: text })}
                  keyboardType="numeric"
                />
              </View>

              {!editingBook && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PDF файлы *</Text>
                  <TouchableOpacity style={styles.uploadButton} onPress={pickPdf}>
                    <Ionicons name="cloud-upload-outline" size={scaleWidth(32)} color={AdminColors.primary} />
                    <Text style={styles.uploadButtonText}>
                      {selectedPdf ? selectedPdf.name : 'PDF файлын таңдаңыз'}
                    </Text>
                    <Text style={styles.uploadHint}>Максимум 50MB</Text>
                  </TouchableOpacity>
                </View>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                  <Text style={styles.progressText}>{uploadProgress}%</Text>
                </View>
              )}
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
                  <>
                    <Ionicons name="checkmark" size={scaleWidth(18)} color={AdminColors.background} />
                    <Text style={styles.saveButtonText}>
                      {editingBook ? 'Сақтау' : 'Қосу'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// app/admin/books.tsx (түзетілген стильдер бөлігі)

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: AdminColors.surfaceHover,
    borderRadius: borderRadius.sm,
    padding: scaleWidth(2),
  },
  viewToggleButton: {
    padding: scaleWidth(8),
    borderRadius: borderRadius.sm,
  },
  viewToggleButtonActive: {
    backgroundColor: AdminColors.surface,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: scaleHeight(8),
    backgroundColor: AdminColors.surface,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: spacing.xxs,
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
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getCardGap(),
    paddingBottom: spacing.lg,
  },
  bookCard: {
    // Түзетілген: calc() орнына flex негізінде
    flex: isMobile ? 1 : (isTablet ? 0.5 : 0.33),
    minWidth: isMobile ? '100%' : (isTablet ? scaleWidth(280) : scaleWidth(300)),
    backgroundColor: AdminColors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AdminColors.border,
    position: 'relative',
  },
  statusToggle: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
    padding: spacing.xxs,
  },
  statusIndicator: {
    width: scaleWidth(10),
    height: scaleWidth(10),
    borderRadius: scaleWidth(5),
  },
  statusActive: {
    backgroundColor: AdminColors.success,
  },
  statusInactive: {
    backgroundColor: AdminColors.textMuted,
  },
  bookCover: {
    height: scaleHeight(200),
    backgroundColor: AdminColors.surfaceHover,
    position: 'relative',
    overflow: 'hidden', // overflow: 'scroll' емес
  },
  bookCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bookCoverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${AdminColors.primary}10`,
  },
  bookCategoryBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: scaleHeight(4),
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: borderRadius.sm,
    gap: spacing.xxs,
  },
  bookCategoryText: {
    fontSize: scaleFont(10),
    color: AdminColors.text,
    fontWeight: '500',
  },
  bookInfo: {
    padding: spacing.md,
  },
  bookTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: AdminColors.text,
    marginBottom: spacing.xxs,
    lineHeight: scaleHeight(22),
  },
  bookInactive: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  bookAuthor: {
    fontSize: scaleFont(13),
    color: AdminColors.textSecondary,
    marginBottom: spacing.sm,
  },
  bookMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bookMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  bookMetaText: {
    fontSize: scaleFont(11),
    color: AdminColors.textMuted,
  },
  bookActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  bookActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(8),
    borderRadius: borderRadius.sm,
    gap: spacing.xxs,
  },
  editButton: {
    backgroundColor: `${AdminColors.info}15`,
  },
  deleteButton: {
    backgroundColor: `${AdminColors.error}15`,
  },
  bookActionText: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: AdminColors.info,
  },
  deleteButtonText: {
    color: AdminColors.error,
  },
  bookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookSize: {
    fontSize: scaleFont(11),
    color: AdminColors.textMuted,
  },
  bookId: {
    fontSize: scaleFont(11),
    color: AdminColors.textMuted,
  },
  listView: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AdminColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: spacing.sm,
  },
  listItemStatus: {
    padding: spacing.xxs,
  },
  statusDot: {
    width: scaleWidth(8),
    height: scaleWidth(8),
    borderRadius: scaleWidth(4),
  },
  statusDotActive: {
    backgroundColor: AdminColors.success,
  },
  statusDotInactive: {
    backgroundColor: AdminColors.textMuted,
  },
  listItemCover: {
    width: scaleWidth(40),
    height: scaleHeight(50),
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  listItemCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listItemCoverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${AdminColors.primary}10`,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: AdminColors.text,
    marginBottom: scaleHeight(2),
  },
  listItemSubtitle: {
    fontSize: scaleFont(12),
    color: AdminColors.textSecondary,
    marginBottom: scaleHeight(4),
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listItemCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${AdminColors.info}15`,
    paddingHorizontal: spacing.xs,
    paddingVertical: scaleHeight(2),
    borderRadius: borderRadius.sm,
    gap: spacing.xxs,
  },
  listItemCategoryText: {
    fontSize: scaleFont(9),
    color: AdminColors.info,
    fontWeight: '500',
  },
  listItemDate: {
    fontSize: scaleFont(9),
    color: AdminColors.textMuted,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  listItemAction: {
    width: scaleWidth(32),
    height: scaleWidth(32),
    borderRadius: borderRadius.sm,
    backgroundColor: AdminColors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: getModalWidth(),
    alignSelf: 'center',
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
  formTextArea: {
    minHeight: scaleHeight(100),
    textAlignVertical: 'top',
  },
  categorySelect: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: scaleHeight(4),
    flexWrap: 'wrap',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: scaleHeight(8),
    backgroundColor: AdminColors.background,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: spacing.xxs,
  },
  categoryOptionActive: {
    backgroundColor: `${AdminColors.primary}20`,
    borderColor: AdminColors.primary,
  },
  categoryOptionText: {
    fontSize: scaleFont(13),
    color: AdminColors.textSecondary,
  },
  categoryOptionTextActive: {
    color: AdminColors.primary,
    fontWeight: '500',
  },
  uploadButton: {
    backgroundColor: AdminColors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AdminColors.border,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  uploadButtonText: {
    fontSize: scaleFont(14),
    color: AdminColors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  uploadHint: {
    fontSize: scaleFont(12),
    color: AdminColors.textMuted,
  },
  progressContainer: {
    height: scaleHeight(20),
    backgroundColor: AdminColors.background,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.xs,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: AdminColors.primary,
  },
  progressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    fontSize: scaleFont(12),
    color: AdminColors.text,
    lineHeight: scaleHeight(20),
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(16),
    backgroundColor: AdminColors.primary,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
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