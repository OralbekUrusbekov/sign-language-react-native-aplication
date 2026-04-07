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
import { useSettings } from '@/context/SettingsContext';
import { useLibraryTranslation } from '@/i18n/library';

const STORAGE_KEYS = {
  DOWNLOADED_BOOKS: '@library_downloaded_books',
};

export default function LibraryScreen() {
  const { appLanguage } = useSettings();
  const { t } = useLibraryTranslation();
  
  const [books, setBooks] = useState<BookItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadedBooks, setDownloadedBooks] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const getCategoryName = useCallback((categoryId: string, originalName: string) => {
    const categoryKey = categoryId.replace(/-/g, '_');
    const translated = t(`categories.${categoryKey}`);
    return translated !== `categories.${categoryKey}` ? translated : originalName;
  }, [t]);

  useEffect(() => {
    loadData();
  }, [appLanguage]); 
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
        if (fileInfo.exists && fileInfo.size && fileInfo.size > 1000) {
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
      
      // Категорияларды аударылған атаулармен орнату
      const translatedCategories = [
        { 
          id: 'all', 
          name: t('categories.all'), 
          count: booksData.length 
        },
        ...categoriesData.map(cat => ({
          ...cat,
          name: getCategoryName(cat.id, cat.name)
        }))
      ];
      
      setCategories(translatedCategories);

      // Сақталған жүктеулерді тексеру
      const validMap = await validateDownloadedFiles(downloadedBooks);
      
      if (validMap.size !== downloadedBooks.size) {
        setDownloadedBooks(validMap);
        setDownloadedIds(new Set(validMap.keys()));
        await saveDownloads(validMap);
      }

    } catch (error) {
      console.log('Error loading library data:', error);
      Alert.alert(t('error'), t('downloadError'));
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

      Alert.alert(t('downloadSuccess', { title: book.title }));

    } catch (error) {
      console.log('Download error:', error);
      Alert.alert(t('error'), t('downloadError'));
    } finally {
      setDownloadingIds(prev => prev.filter(id => id !== book.id));
    }
  };

  // Жүктелген кітапты өшіру функциясы
  const deleteDownloadedBook = async (book: BookItem) => {
    try {
      const filePath = downloadedBooks.get(book.id);
      if (filePath) {
        await FileSystem.deleteAsync(filePath);
        
        const newDownloadedBooks = new Map(downloadedBooks);
        newDownloadedBooks.delete(book.id);
        
        const newDownloadedIds = new Set(downloadedIds);
        newDownloadedIds.delete(book.id);
        
        setDownloadedBooks(newDownloadedBooks);
        setDownloadedIds(newDownloadedIds);
        
        await saveDownloads(newDownloadedBooks);
        
        Alert.alert(t('deleteSuccess'));
      }
    } catch (error) {
      console.log('Delete error:', error);
      Alert.alert(t('error'), t('deleteError'));
    }
  };

  const openBook = async (book: BookItem) => {
    try {
      const fileUri = downloadedBooks.get(book.id);

      if (!fileUri) {
        Alert.alert(
          t('downloadRequired'),
          t('downloadRequiredMessage'),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('download'), onPress: () => downloadBook(book) },
          ]
        );
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists) {
        Alert.alert(t('error'), t('fileNotFound'));
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
                dialogTitle: 'PDF Open',
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
      Alert.alert(t('error'), t('openError'));
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
            Alert.alert(t('error'), t('shareNotAvailable'));
          }
        } else {
          Alert.alert(t('error'), t('fileNotFound'));
        }
      } else {
        Alert.alert(t('error'), t('downloadRequiredMessage'));
      }
    } catch (error) {
      console.log('Share error:', error);
      Alert.alert(t('error'), t('shareError'));
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
              <Text style={styles.bookMetaText}>{item.pages} {t('pages')}</Text>
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
                  <Text style={styles.bookActionText}>{t('open')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bookActionButton}
                  onPress={() => shareBook(item)}
                >
                  <Ionicons name="share-social" size={18} color="#6C5CE7" />
                  <Text style={styles.bookActionText}>{t('share')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bookActionButton}
                  onPress={() => {
                    Alert.alert(
                      t('deleteConfirm'),
                      t('deleteConfirmMessage', { title: item.title }),
                      [
                        { text: t('cancel'), style: 'cancel' },
                        { text: t('delete'), onPress: () => deleteDownloadedBook(item), style: 'destructive' }
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF7675" />
                  <Text style={[styles.bookActionText, { color: '#FF7675' }]}>{t('delete')}</Text>
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
                    <Text style={styles.downloadButtonText}>{t('downloading')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download" size={18} color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>{t('download')}</Text>
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
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('title')}</Text>
        <Text style={styles.headerSubtitle}>{t('subtitle')}</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#95A5A6" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
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
            <Text style={styles.emptyTitle}>{t('emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('emptySubtitle')}</Text>
          </View>
        }
        ListFooterComponent={<View style={styles.bottomPadding} />}
        refreshing={isLoading}
        onRefresh={loadData}
      />
    </View>
  );
}

// app/library.tsx (жаңартылған стильдер)
import {
  scaleWidth,
  scaleHeight,
  scaleFont,
  spacing,
  borderRadius,
  isSmallDevice,
  isTablet,
  fontSize,
} from '@/constants/responsive';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  loadingText: {
    marginTop: spacing.md,
    color: '#64748B',
    fontSize: fontSize.md,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? scaleHeight(60) : scaleHeight(40),
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: '#1E3A5F',
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerTitle: {
    fontSize: isSmallDevice ? fontSize.xl : fontSize.xxxl,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: isSmallDevice ? fontSize.xs : fontSize.sm,
    color: '#4ECDC4',
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.05,
    shadowRadius: scaleWidth(4),
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: scaleHeight(14),
    paddingHorizontal: spacing.xs,
    fontSize: isSmallDevice ? fontSize.sm : fontSize.md,
    color: '#2C3E50',
  },
  categoriesContainer: {
    paddingBottom: spacing.xs,
  },
  categoriesContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: scaleHeight(10),
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xxl,
    gap: spacing.xs,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.06,
    shadowRadius: scaleWidth(4),
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  categoryChipText: {
    fontSize: isSmallDevice ? fontSize.xs : fontSize.sm,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  categoryChipCount: {
    fontSize: isSmallDevice ? fontSize.xs : fontSize.sm,
    color: '#94A3B8',
    backgroundColor: '#F0F4F8',
    paddingHorizontal: spacing.sm,
    paddingVertical: scaleHeight(2),
    borderRadius: borderRadius.lg,
  },
  categoryChipCountActive: {
    color: '#1E3A5F',
    backgroundColor: '#4ECDC4',
  },
  booksList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: scaleHeight(4) },
    shadowOpacity: 0.08,
    shadowRadius: scaleWidth(12),
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookCover: {
    width: isSmallDevice ? scaleWidth(80) : scaleWidth(100),
    height: isSmallDevice ? scaleHeight(112) : scaleHeight(140),
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
    fontSize: isSmallDevice ? fontSize.md : fontSize.lg,
    fontWeight: 'bold',
    marginTop: spacing.xxs,
  },
  downloadedBadge: {
    position: 'absolute',
    top: spacing.xxs,
    right: spacing.xxs,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
  },
  bookInfo: {
    flex: 1,
    padding: isSmallDevice ? spacing.sm : spacing.md,
  },
  bookTitle: {
    fontSize: isSmallDevice ? fontSize.sm : fontSize.md,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: spacing.xxs,
  },
  bookAuthor: {
    fontSize: isSmallDevice ? fontSize.xs : fontSize.sm,
    color: '#7F8C8D',
    marginBottom: spacing.xxs,
  },
  bookDescription: {
    fontSize: isSmallDevice ? fontSize.xs : fontSize.sm,
    color: '#95A5A6',
    marginBottom: spacing.xs,
    lineHeight: scaleHeight(16),
  },
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bookMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  bookMetaText: {
    fontSize: isSmallDevice ? fontSize.xs : fontSize.sm,
    color: '#95A5A6',
  },
  bookActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  bookActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: scaleHeight(6),
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: borderRadius.md,
  },
  bookActionText: {
    fontSize: isSmallDevice ? fontSize.xs : fontSize.sm,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#4ECDC4',
    paddingVertical: scaleHeight(8),
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  downloadButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  downloadButtonText: {
    fontSize: isSmallDevice ? fontSize.xs : fontSize.sm,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(60),
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: '#7F8C8D',
    marginTop: spacing.xxs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  bottomPadding: {
    height: scaleHeight(100),
  },
});