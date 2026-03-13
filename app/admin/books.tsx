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

const { width, height } = Dimensions.get('window');
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



  // Filtered books computed property
  const filteredBooks = books.filter(book => {
    const matchesSearch = !searchQuery ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Fetch books with filters
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

  // Fetch categories with counts
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

  // Search with debounce
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
        
        // Check file size (max 50MB)
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
  // const uploadPdf = async () => {
  //   if (!selectedPdf) return null;

  //   try {
  //             const uploadData = new FormData();

  //       uploadData.append('file', {
  //           uri:
  //             Platform.OS === 'android'
  //               ? selectedPdf.uri
  //               : selectedPdf.uri.replace('file://', ''),
  //           type: 'application/pdf',
  //           name: selectedPdf.name,
  //         } as any);
  //       uploadData.append('title', formData.title);
  //       uploadData.append('category', formData.category);

  //       if (formData.author) uploadData.append('author', formData.author);
  //       if (formData.description) uploadData.append('description', formData.description);

  //     const response = await fetch(`${API_BASE_URL}/api/books`, {
  //         method: 'POST',
  //         body: uploadData,
  //       });

  //     if (!response.ok) {
  //       const error = await response.json();
  //       throw new Error(error.detail || 'Failed to upload book');
  //     }

  //     return await response.json();
  //   } catch (error) {
  //     console.error('Upload PDF error:', error);
  //     throw error;
  //   }
  // };
//   const uploadPdf = async () => {
//   if (!selectedPdf) {
//     console.log('❌ selectedPdf жоқ');
//     return null;
//   }

//   try {
//     console.log('📄 selectedPdf:', selectedPdf);
//     console.log('📝 formData:', formData);
//     console.log('🌐 API:', `${API_BASE_URL}/api/books`);

//     const uploadData = new FormData();

//     const newPath = `${selectedPdf.uri}_copy.pdf`;
//     console.log('📂 copy from:', selectedPdf.uri);
//     console.log('📂 copy to:', newPath);

//     await FileSystem.copyAsync({
//       from: selectedPdf.uri,
//       to: newPath,
//     });

//     console.log('✅ copy done');

//     const filePayload = {
//       uri: newPath,
//       type: 'application/pdf',
//       name: selectedPdf.name,
//     };

//     console.log('📦 filePayload:', filePayload);

//     uploadData.append('file', filePayload as any);
//     console.log('✅ file appended');

//     uploadData.append('title', formData.title);
//     console.log('✅ title appended:', formData.title);

//     uploadData.append('category', formData.category);
//     console.log('✅ category appended:', formData.category);

//     if (formData.author) {
//       uploadData.append('author', formData.author);
//       console.log('✅ author appended:', formData.author);
//     }

//     if (formData.description) {
//       uploadData.append('description', formData.description);
//       console.log('✅ description appended:', formData.description);
//     }

//     console.log('🚀 fetch басталды');

//     const response = await fetch(`${API_BASE_URL}/api/books`, {
//       method: 'POST',
//       body: uploadData,
//     });

//     console.log('📡 response status:', response.status);

//     const text = await response.text();
//     console.log('📨 response text:', text);

//     if (!response.ok) {
//       throw new Error(text);
//     }

//     console.log('✅ upload success');

//     return JSON.parse(text);
//   } catch (error) {
//     console.log('🔥 FULL ERROR:', error);
//     throw error;
//   }
// };

const uploadPdf = async () => {
  

  if (!selectedPdf) {
    console.log("❌ selectedPdf жоқ");
    return null;
  }

  try {
   
    const uploadData = new FormData();

    // ---- FILE PAYLOAD ----
    const filePayload = {
      uri:
        Platform.OS === "android"
          ? selectedPdf.uri
          : selectedPdf.uri.replace("file://", ""),
      type: selectedPdf.mimeType || "application/pdf",
      name: selectedPdf.name || "upload.pdf",
    };

   

    uploadData.append("file", filePayload as any);
    uploadData.append("title", formData.title);
    uploadData.append("category", formData.category);
   
    if (formData.author) {
      uploadData.append("author", formData.author);
    }

    if (formData.description) {
      uploadData.append("description", formData.description);
    }

    if (formData.page_count) {
      uploadData.append("page_count", formData.page_count);
    }

    const startTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/api/books/`, {
      method: "POST",
      body: uploadData,
    });


    const endTime = Date.now();
    response.headers.forEach((value, key) => {
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(responseText);
    }

    const parsed = JSON.parse(responseText);
    return parsed;

  } catch (error) {
    if (error instanceof Error) {
      console.log("error message:", error.message);
      console.log("error stack:", error.stack);
    }

    console.log("========== UPLOAD FAILED ==========");

    throw error;
  }
};





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
      
      const uploadData = new FormData();
      
      const filePayload: any = {
        uri: Platform.OS === "android" 
          ? selectedPdf!.uri 
          : selectedPdf!.uri.replace("file://", ""),
        type: selectedPdf!.mimeType || "application/pdf",
        name: selectedPdf!.name || "upload.pdf",
      };
      
      uploadData.append("file", filePayload);
      uploadData.append("title", formData.title);
      uploadData.append("category", formData.category);
      
      if (formData.author) uploadData.append("author", formData.author);
      if (formData.description) uploadData.append("description", formData.description);
      if (formData.page_count) uploadData.append("page_count", formData.page_count);
      
      
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/api/books/`, {
        method: "POST",
        body: uploadData,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const responseText = await response.text();
    
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      
    }

    setModalVisible(false);
    await loadData();
    
    Alert.alert(
      'Сәтті',
      editingBook ? 'Кітап сәтті өзгертілді' : 'Жаңа кітап сәтті қосылды'
    );
  } catch (error: any) {
    console.error('🔥 Save error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    Alert.alert('Қате', 
      `Қате түрі: ${error.name}\n` +
      `Хабарлама: ${error.message}\n` +
      `Код: ${error.code || 'жоқ'}`
    );
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

  // Toggle book active status
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
                size={18} 
                color={viewMode === 'grid' ? AdminColors.primary : AdminColors.textMuted} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons 
                name="list-outline" 
                size={18} 
                color={viewMode === 'list' ? AdminColors.primary : AdminColors.textMuted} 
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={24} color={AdminColors.background} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={AdminColors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Кітап іздеу..."
          placeholderTextColor={AdminColors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={20} color={AdminColors.textMuted} />
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
              size={14} 
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
                      <Ionicons name="book" size={40} color={AdminColors.primary} />
                    </View>
                  )}
                  <View style={styles.bookCategoryBadge}>
                    <Ionicons 
                      name={categories.find(c => c.id === book.category)?.icon as any || 'book'} 
                      size={10} 
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
                      <Ionicons name="document-text-outline" size={12} color={AdminColors.textMuted} />
                      <Text style={styles.bookMetaText}>{book.page_count} бет</Text>
                    </View>
                    <View style={styles.bookMetaItem}>
                      <Ionicons name="download-outline" size={12} color={AdminColors.textMuted} />
                      <Text style={styles.bookMetaText}>{book.download_count}</Text>
                    </View>
                    <View style={styles.bookMetaItem}>
                      <Ionicons name="calendar-outline" size={12} color={AdminColors.textMuted} />
                      <Text style={styles.bookMetaText}>{formatDate(book.created_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.bookActions}>
                    <TouchableOpacity
                      style={[styles.bookActionButton, styles.editButton]}
                      onPress={() => openEditModal(book)}
                    >
                      <Ionicons name="pencil-outline" size={14} color={AdminColors.info} />
                      <Text style={styles.bookActionText}>Өзгерту</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bookActionButton, styles.deleteButton]}
                      onPress={() => handleDelete(book.id)}
                    >
                      <Ionicons name="trash-outline" size={14} color={AdminColors.error} />
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
                      <Ionicons name="book" size={20} color={AdminColors.primary} />
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
                        size={10} 
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
                    <Ionicons name="pencil-outline" size={16} color={AdminColors.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.listItemAction}
                    onPress={() => handleDelete(book.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={AdminColors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {filteredBooks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color={AdminColors.textMuted} />
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBook ? 'Кітапты өзгерту' : 'Жаңа кітап қосу'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={AdminColors.textSecondary} />
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
                          size={14} 
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
                    <Ionicons name="cloud-upload-outline" size={32} color={AdminColors.primary} />
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
                    <Ionicons name="checkmark" size={18} color={AdminColors.background} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AdminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AdminColors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: AdminColors.surfaceHover,
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  viewToggleButtonActive: {
    backgroundColor: AdminColors.surface,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AdminColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AdminColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AdminColors.surface,
    margin: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: AdminColors.text,
    padding: 0,
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: AdminColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: AdminColors.background,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 20,
  },
  bookCard: {
    width: isMobile ? '100%' : 'calc(33.33% - 11px)' as any,
    minWidth: isMobile ? '100%' : 280,
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AdminColors.border,
    position: 'relative',
  },
  statusToggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 4,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusActive: {
    backgroundColor: AdminColors.success,
  },
  statusInactive: {
    backgroundColor: AdminColors.textMuted,
  },
  bookCover: {
    height: 200,
    backgroundColor: AdminColors.surfaceHover,
    position: 'relative',
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
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    gap: 4,
  },
  bookCategoryText: {
    fontSize: 10,
    color: AdminColors.text,
    fontWeight: '500',
  },
  bookInfo: {
    padding: 16,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AdminColors.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  bookInactive: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  bookAuthor: {
    fontSize: 13,
    color: AdminColors.textSecondary,
    marginBottom: 12,
  },
  bookMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  bookMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookMetaText: {
    fontSize: 11,
    color: AdminColors.textMuted,
  },
  bookActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  bookActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  editButton: {
    backgroundColor: `${AdminColors.info}15`,
  },
  deleteButton: {
    backgroundColor: `${AdminColors.error}15`,
  },
  bookActionText: {
    fontSize: 12,
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
    fontSize: 11,
    color: AdminColors.textMuted,
  },
  bookId: {
    fontSize: 11,
    color: AdminColors.textMuted,
  },
  listView: {
    gap: 8,
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AdminColors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: 12,
  },
  listItemStatus: {
    padding: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: AdminColors.success,
  },
  statusDotInactive: {
    backgroundColor: AdminColors.textMuted,
  },
  listItemCover: {
    width: 40,
    height: 50,
    borderRadius: 6,
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
    fontSize: 15,
    fontWeight: '600',
    color: AdminColors.text,
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: AdminColors.textSecondary,
    marginBottom: 4,
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${AdminColors.info}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  listItemCategoryText: {
    fontSize: 9,
    color: AdminColors.info,
    fontWeight: '500',
  },
  listItemDate: {
    fontSize: 9,
    color: AdminColors.textMuted,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  listItemAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: AdminColors.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: AdminColors.textMuted,
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AdminColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: AdminColors.border,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AdminColors.text,
  },
  modalBody: {
    padding: 20,
    maxHeight: height * 0.6,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: AdminColors.textSecondary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: AdminColors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: AdminColors.text,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categorySelect: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: AdminColors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AdminColors.border,
    gap: 4,
  },
  categoryOptionActive: {
    backgroundColor: `${AdminColors.primary}20`,
    borderColor: AdminColors.primary,
  },
  categoryOptionText: {
    fontSize: 13,
    color: AdminColors.textSecondary,
  },
  categoryOptionTextActive: {
    color: AdminColors.primary,
    fontWeight: '500',
  },
  uploadButton: {
    backgroundColor: AdminColors.background,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AdminColors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: AdminColors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  uploadHint: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
  progressContainer: {
    height: 20,
    backgroundColor: AdminColors.background,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
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
    fontSize: 12,
    color: AdminColors.text,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: AdminColors.surfaceHover,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: AdminColors.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: AdminColors.primary,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    color: AdminColors.background,
    fontWeight: '600',
  },
});