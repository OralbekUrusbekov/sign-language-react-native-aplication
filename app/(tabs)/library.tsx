import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { BookItem } from '@/types';
import { getBooks, getBookCategories, getDownloadedBooks, markBookDownloaded, updateReadingProgress } from '@/services/api';
import { DEVICE_ID, API_BASE_URL } from '@/config/api';

// Сақталған кітаптар кілті
const STORAGE_KEYS = {
  DOWNLOADED_BOOKS: '@library_downloaded_books',
};

export default function LibraryScreen() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadedBooks, setDownloadedBooks] = useState<Map<string, string>>(new Map()); // bookId -> localPath
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Сақталған жүктеулерді жүктеу
  const loadSavedDownloads = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_BOOKS);
      if (saved) {
        const parsed = JSON.parse(saved) as { bookId: string; filePath: string }[];
        const map = new Map<string, string>();
        const set = new Set<string>();
        
        parsed.forEach(item => {
          map.set(item.bookId, item.filePath);
          set.add(item.bookId);
        });
        
        setDownloadedBooks(map);
        setDownloadedIds(set);
      }
    } catch (error) {
      console.log('Error loading saved downloads:', error);
    }
  }, []);

  // Жүктеулерді сақтау
  const saveDownloads = useCallback(async (map: Map<string, string>) => {
    try {
      const array = Array.from(map.entries()).map(([bookId, filePath]) => ({
        bookId,
        filePath,
      }));
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_BOOKS, JSON.stringify(array));
    } catch (error) {
      console.log('Error saving downloads:', error);
    }
  }, []);

  // Файлдардың бар екенін тексеру және жоқтарын тазалау
  const validateDownloadedFiles = useCallback(async (map: Map<string, string>) => {
    const validMap = new Map<string, string>();
    
    for (const [bookId, filePath] of map.entries()) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && fileInfo.size > 1000) {
          validMap.set(bookId, filePath);
        }
      } catch (error) {
        console.log(`Error validating file ${bookId}:`, error);
      }
    }
    
    return validMap;
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Алдымен сақталған жүктеулерді жүктеу
      await loadSavedDownloads();
      
      const [booksData, categoriesData, downloadedData] = await Promise.all([
        getBooks(),
        getBookCategories(),
        DEVICE_ID ? getDownloadedBooks(DEVICE_ID) : Promise.resolve([]),
      ]);

      setBooks(booksData);
      setCategories([
        { id: 'all', name: 'Barlygy', count: booksData.length },
        ...categoriesData,
      ]);

      // Сақталған жүктеулерді тексеру
      const validMap = await validateDownloadedFiles(downloadedBooks);
      
      if (validMap.size !== downloadedBooks.size) {
        setDownloadedBooks(validMap);
        setDownloadedIds(new Set(validMap.keys()));
        await saveDownloads(validMap);
      }

    } catch (error) {
      console.log('Error loading library data:', error);
      Alert.alert('Qate', 'Kitaphanany júkteu múmkin bolmady');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getBookFilePath = (bookId: string | number) => {
    return `${FileSystem.documentDirectory}books/book_${bookId}.pdf`;
  };

  const ensureBookDirectory = async () => {
    const bookDir = `${FileSystem.documentDirectory}books`;
    const dirInfo = await FileSystem.getInfoAsync(bookDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(bookDir, { intermediates: true });
    }
    return bookDir;
  };

  const downloadBook = async (book: BookItem) => {
    try {
      setDownloadingIds(prev => [...prev, book.id]);

      await ensureBookDirectory();

      const fileUri = getBookFilePath(book.id);

      const existingFile = await FileSystem.getInfoAsync(fileUri);
      if (existingFile.exists) {
        await FileSystem.deleteAsync(fileUri);
      }

      const pdfUrl = `${API_BASE_URL}/api/books/${book.id}/download`;

      const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri, {
        headers: {
          Accept: 'application/pdf',
        },
      });

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed: ${downloadResult.status}`);
      }

      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists || (fileInfo.size && fileInfo.size < 1000)) {
        throw new Error('Downloaded file invalid');
      }

      if (DEVICE_ID) {
        await markBookDownloaded(DEVICE_ID, parseInt(book.id));
      }

      // Жаңа жүктеуді қосу
      const newDownloadedBooks = new Map(downloadedBooks);
      newDownloadedBooks.set(book.id, fileUri);
      
      const newDownloadedIds = new Set(downloadedIds);
      newDownloadedIds.add(book.id);
      
      setDownloadedBooks(newDownloadedBooks);
      setDownloadedIds(newDownloadedIds);
      
      // Сақтау
      await saveDownloads(newDownloadedBooks);

      Alert.alert('Júkteldi', `"${book.title}" sátti júkteldi!`);

    } catch (error) {
      console.log('Download error:', error);
      Alert.alert('Qate', 'Kitapty júkteu múmkin bolmady');
    } finally {
      setDownloadingIds(prev => prev.filter(id => id !== book.id));
    }
  };

  // Жүктелген кітапты өшіру функциясы (қажет болса)
  const deleteDownloadedBook = async (bookId: string) => {
    try {
      const filePath = downloadedBooks.get(bookId);
      if (filePath) {
        await FileSystem.deleteAsync(filePath);
        
        const newDownloadedBooks = new Map(downloadedBooks);
        newDownloadedBooks.delete(bookId);
        
        const newDownloadedIds = new Set(downloadedIds);
        newDownloadedIds.delete(bookId);
        
        setDownloadedBooks(newDownloadedBooks);
        setDownloadedIds(newDownloadedIds);
        
        await saveDownloads(newDownloadedBooks);
        
        Alert.alert('Óshirildi', 'Kitap júklemelerden óshirildi');
      }
    } catch (error) {
      console.log('Delete error:', error);
      Alert.alert('Qate', 'Kitap óshirilmedi');
    }
  };

  const openBook = async (book: BookItem) => {
    try {
      const fileUri = downloadedBooks.get(book.id);

      if (!fileUri) {
        Alert.alert(
          'Júkteu qajet',
          'Bul kitap áli júktelmegen.',
          [
            { text: 'Boldyrmau', style: 'cancel' },
            { text: 'Júkteu', onPress: () => downloadBook(book) },
          ]
        );
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists) {
        Alert.alert('Qate', 'PDF faıly tabylmady');
        return;
      }

      // Платформаға байланысты PDF ашу
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        });
      } else if (Platform.OS === 'ios') {
        try {
          await WebBrowser.openBrowserAsync(fileUri);
        } catch (error) {
          const canOpen = await Linking.canOpenURL(fileUri);
          if (canOpen) {
            await Linking.openURL(fileUri);
          } else {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, {
                mimeType: 'application/pdf',
                dialogTitle: 'PDF ашу',
                UTI: 'com.adobe.pdf',
              });
            }
          }
        }
      }

      if (DEVICE_ID) {
        await updateReadingProgress(DEVICE_ID, parseInt(book.id), 1);
      }

    } catch (error) {
      console.log('Open error:', error);
      Alert.alert('Qate', 'PDF ашу мүмкін болмады');
    }
  };

  const shareBook = async (book: BookItem) => {
    try {
      const fileUri = downloadedBooks.get(book.id);

      if (fileUri) {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (fileInfo.exists) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/pdf',
              dialogTitle: book.title
            });
          } else {
            Alert.alert('Aqparat', 'Bolisu múmkin emes');
          }
        } else {
          Alert.alert('Qate', 'PDF faıly tabylmady');
        }
      } else {
        Alert.alert('Aqparat', 'Aldymen kitapty júkteńiz');
      }
    } catch (error) {
      console.log('Share error:', error);
      Alert.alert('Qate', 'Bolisu múmkin bolmady');
    }
  };

  const getCoverColor = (category: string) => {
    const colors: Record<string, string> = {
      'sign_language': '#6C5CE7',
      'education': '#00B894',
      'dictionary': '#45B7D1',
      'children': '#FF7675',
      'grammar': '#96CEB4',
    };
    return colors[category] || '#6C5CE7';
  };

  const renderCategoryChip = (category: { id: string; name: string; count: number }) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryChip,
        selectedCategory === category.id && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Text
        style={[
          styles.categoryChipText,
          selectedCategory === category.id && styles.categoryChipTextActive,
        ]}
      >
        {category.name}
      </Text>
      <Text
        style={[
          styles.categoryChipCount,
          selectedCategory === category.id && styles.categoryChipCountActive,
        ]}
      >
        {category.count}
      </Text>
    </TouchableOpacity>
  );

  const renderBookItem = ({ item }: { item: BookItem }) => {
    const isDownloading = downloadingIds.includes(item.id);
    const isDownloaded = downloadedIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.bookCard}
        onPress={() => openBook(item)}
        activeOpacity={0.7}
      >
        <View style={styles.bookCover}>
          <View style={[styles.bookCoverPlaceholder, { backgroundColor: getCoverColor(item.category) }]}>
            <Ionicons name="book" size={32} color="#FFFFFF" />
            <Text style={styles.bookCoverText}>{item.title.substring(0, 2)}</Text>
          </View>
          {isDownloaded && (
            <View style={styles.downloadedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#00B894" />
            </View>
          )}
        </View>

        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bookAuthor}>{item.author}</Text>
          <Text style={styles.bookDescription} numberOfLines={2}>{item.description}</Text>

          <View style={styles.bookMeta}>
            <View style={styles.bookMetaItem}>
              <Ionicons name="document-text" size={14} color="#95A5A6" />
              <Text style={styles.bookMetaText}>{item.pages} bet</Text>
            </View>
            {item.fileSize && (
              <View style={styles.bookMetaItem}>
                <Ionicons name="cloud-download" size={14} color="#95A5A6" />
                <Text style={styles.bookMetaText}>{item.fileSize}</Text>
              </View>
            )}
          </View>

          <View style={styles.bookActions}>
            {isDownloaded ? (
              <>
                <TouchableOpacity
                  style={styles.bookActionButton}
                  onPress={() => openBook(item)}
                >
                  <Ionicons name="eye" size={18} color="#6C5CE7" />
                  <Text style={styles.bookActionText}>Ashu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bookActionButton}
                  onPress={() => shareBook(item)}
                >
                  <Ionicons name="share-social" size={18} color="#6C5CE7" />
                  <Text style={styles.bookActionText}>Bolisu</Text>
                </TouchableOpacity>
                {/* Өшіру опциясы (қажет болса) */}
                <TouchableOpacity
                  style={styles.bookActionButton}
                  onPress={() => {
                    Alert.alert(
                      'Óshiru',
                      `"${item.title}" kitabyn júklemelerden óshiruge sensiz be?`,
                      [
                        { text: 'Boldyrma', style: 'cancel' },
                        { text: 'Óshiru', onPress: () => deleteDownloadedBook(item.id), style: 'destructive' }
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF7675" />
                  <Text style={[styles.bookActionText, { color: '#FF7675' }]}>Óshiru</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
                onPress={() => downloadBook(item)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>Júktelude...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download" size={18} color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>Júkteu</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Kitaphanany júktep jatyrmyz...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kitaphana</Text>
        <Text style={styles.headerSubtitle}>PDF kitaptar men materyaldar</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#95A5A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Kitap nemese avtor izdeu..."
            placeholderTextColor="#95A5A6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#95A5A6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoriesContent}>
            {categories.map(renderCategoryChip)}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={filteredBooks}
        renderItem={renderBookItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.booksList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={64} color="#BDC3C7" />
            <Text style={styles.emptyTitle}>Kitaptar tabylmady</Text>
            <Text style={styles.emptySubtitle}>
              Basqa sanatty tańdańyz nemese izdeudy ozgertiníz
            </Text>
          </View>
        }
        ListFooterComponent={<View style={styles.bottomPadding} />}
        refreshing={isLoading}
        onRefresh={loadData}
      />
    </View>
  );
}

// Стильдер өзгеріссіз қалады
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    color: '#7F8C8D',
    fontSize: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#6C5CE7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#2C3E50',
  },
  categoriesContainer: {
    paddingBottom: 8,
  },
  categoriesContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#6C5CE7',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  categoryChipCount: {
    fontSize: 12,
    color: '#95A5A6',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryChipCountActive: {
    color: '#6C5CE7',
    backgroundColor: '#FFFFFF',
  },
  booksList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bookCover: {
    width: 100,
    height: 140,
    position: 'relative',
  },
  bookCoverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCoverText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  downloadedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  bookInfo: {
    flex: 1,
    padding: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  bookDescription: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 8,
    lineHeight: 16,
  },
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  bookMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookMetaText: {
    fontSize: 11,
    color: '#95A5A6',
  },
  bookActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bookActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  bookActionText: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C5CE7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  downloadButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  downloadButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});