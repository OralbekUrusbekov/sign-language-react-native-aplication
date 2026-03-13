import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { WordItem, Category } from '@/types';
import { getWords, getCategories, textToSpeech, addFavorite, removeFavorite, getFavorites } from '@/services/api';
import { DEVICE_ID } from '@/config/api';

// Тіл опциялары
const LANGUAGE_OPTIONS = [
  { id: 'kz', label: 'Қазақша', flag: '🇰🇿' },
  { id: 'ru', label: 'Русский', flag: '🇷🇺' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
];

// Сөйлеу жылдамдығы опциялары
const SPEED_OPTIONS = [
  { value: 0.7, label: 'Баяу', icon: 'speedometer-outline' },
  { value: 0.9, label: 'Орташа', icon: 'speedometer-outline' },
  { value: 1.1, label: 'Жылдам', icon: 'speedometer-outline' },
];

// Дауыс биіктігі опциялары
const PITCH_OPTIONS = [
  { value: 0.8, label: 'Төмен', icon: 'contrast-outline' },
  { value: 1.0, label: 'Орташа', icon: 'contrast-outline' },
  { value: 1.2, label: 'Жоғары', icon: 'contrast-outline' },
];

export default function TextToSpeechScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [words, setWords] = useState<WordItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recentWords, setRecentWords] = useState<string[]>([]);
  const [sentence, setSentence] = useState<string[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // TTS параметрлері
  const [selectedLanguage, setSelectedLanguage] = useState('kz');
  const [speechRate, setSpeechRate] = useState(0.9);
  const [speechPitch, setSpeechPitch] = useState(1.0);

  useEffect(() => {
    loadData();
    return () => {
      Speech.stop();
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [wordsData, categoriesData, favoritesData] = await Promise.all([
        getWords(),
        getCategories(),
        DEVICE_ID ? getFavorites(DEVICE_ID) : Promise.resolve([]),
      ]);
      
      setWords(wordsData);
      setCategories(categoriesData);
      setFavorites(new Set(favoritesData.map(f => f.id)));
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const speakWord = async (word: string) => {
    try {
      if (isSpeaking) {
        await Speech.stop();
        if (sound) {
          await sound.stopAsync();
        }
      }

      setIsSpeaking(true);
      
      // Add to recent words
      setRecentWords(prev => {
        const newRecent = [word, ...prev.filter(w => w !== word)].slice(0, 8);
        return newRecent;
      });

      // Backend TTS API-ға жіберу
      try {
        const audioUrl = await textToSpeech(word, selectedLanguage, speechRate, speechPitch);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );
        setSound(newSound);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsSpeaking(false);
          }
        });
      } catch (error) {
        console.log('TTS API error, falling back to local:', error);
        // Егер backend жұмыс істемесе, жергілікті TTS қолдану
        await speakLocal(word);
      }
    } catch (error) {
      console.log('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const speakLocal = async (word: string) => {
    const languageMap = {
      'kz': 'kk-KZ',
      'ru': 'ru-RU',
      'en': 'en-US'
    };
    
    await Speech.speak(word, {
      language: languageMap[selectedLanguage as keyof typeof languageMap] || 'kk-KZ',
      pitch: speechPitch,
      rate: speechRate,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const addToSentence = (word: string) => {
    setSentence(prev => [...prev, word]);
  };

  const speakSentence = async () => {
    if (sentence.length === 0) return;
    await speakWord(sentence.join(' '));
  };

  const clearSentence = () => {
    setSentence([]);
  };

  const speakCustomText = async () => {
    if (customText.trim()) {
      await speakWord(customText.trim());
      setCustomText('');
    }
  };

  const toggleFavorite = async (wordItem: WordItem) => {
    if (!DEVICE_ID) return;
    
    const wordId = parseInt(wordItem.id);
    if (favorites.has(wordItem.id)) {
      await removeFavorite(DEVICE_ID, wordId);
      setFavorites(prev => {
        const newSet = new Set(prev);
        newSet.delete(wordItem.id);
        return newSet;
      });
    } else {
      await addFavorite(DEVICE_ID, wordId);
      setFavorites(prev => new Set(prev).add(wordItem.id));
    }
  };

  const filteredWords = selectedCategory
    ? words.filter(w => w.category === selectedCategory)
    : [];

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        selectedCategory === item.id && styles.categoryCardActive,
      ]}
      onPress={() => setSelectedCategory(
        selectedCategory === item.id ? null : item.id
      )}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color || Colors.primary }]}>
        <Ionicons name={item.icon as any} size={24} color={Colors.white} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
      {item.count !== undefined && (
        <Text style={styles.categoryCount}>{item.count}</Text>
      )}
    </TouchableOpacity>
  );

  const renderWordItem = ({ item }: { item: WordItem }) => {
  const displayWord =
    selectedLanguage === 'ru'
      ? item.textRu || item.word
      : selectedLanguage === 'en'
      ? item.textEn || item.word
      : item.word;

  return (
    <TouchableOpacity
      style={styles.wordCard}
      onPress={() => speakWord(displayWord)}
      onLongPress={() => addToSentence(displayWord)}
    >
      <View style={styles.wordContent}>
        <Text style={styles.wordText}>{displayWord}</Text>

        {selectedLanguage === 'kz' && item.textRu && (
          <Text style={styles.wordTranslation}>{item.textRu}</Text>
        )}

        {selectedLanguage === 'ru' && item.textEn && (
          <Text style={styles.wordTranslation}>{item.textEn}</Text>
        )}
      </View>

      <View style={styles.wordActions}>
        <TouchableOpacity onPress={() => toggleFavorite(item)}>
          <Ionicons
            name={favorites.has(item.id) ? "heart" : "heart-outline"}
            size={20}
            color={favorites.has(item.id) ? Colors.error : Colors.gray400}
          />
        </TouchableOpacity>

        <Ionicons name="volume-high" size={20} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Derekterdi júktep jatyrmyz...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Soıleu</Text>
        <Text style={styles.headerSubtitle}>Sozderdi basyp dybystańyz</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* TTS Settings - Тіл, жылдамдық және биіктік таңдау */}
        <View style={styles.settingsContainer}>
          {/* Тіл таңдау */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Til:</Text>
            <View style={styles.languageButtons}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.languageButton,
                    selectedLanguage === lang.id && styles.languageButtonActive
                  ]}
                  onPress={() => setSelectedLanguage(lang.id)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageText,
                    selectedLanguage === lang.id && styles.languageTextActive
                  ]}>{lang.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Сөйлеу жылдамдығы */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Jýldamdyq:</Text>
            <View style={styles.speedButtons}>
              {SPEED_OPTIONS.map((speed) => (
                <TouchableOpacity
                  key={speed.value}
                  style={[
                    styles.speedButton,
                    speechRate === speed.value && styles.speedButtonActive
                  ]}
                  onPress={() => setSpeechRate(speed.value)}
                >
                  <Ionicons 
                    name={speed.icon as any} 
                    size={18} 
                    color={speechRate === speed.value ? Colors.white : Colors.textPrimary} 
                  />
                  <Text style={[
                    styles.speedText,
                    speechRate === speed.value && styles.speedTextActive
                  ]}>{speed.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Дауыс биіктігі */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Dauys biiktigi:</Text>
            <View style={styles.pitchButtons}>
              {PITCH_OPTIONS.map((pitch) => (
                <TouchableOpacity
                  key={pitch.value}
                  style={[
                    styles.pitchButton,
                    speechPitch === pitch.value && styles.pitchButtonActive
                  ]}
                  onPress={() => setSpeechPitch(pitch.value)}
                >
                  <Ionicons 
                    name={pitch.icon as any} 
                    size={18} 
                    color={speechPitch === pitch.value ? Colors.white : Colors.textPrimary} 
                  />
                  <Text style={[
                    styles.pitchText,
                    speechPitch === pitch.value && styles.pitchTextActive
                  ]}>{pitch.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Sentence Builder */}
        <View style={styles.sentenceContainer}>
          <View style={styles.sentenceHeader}>
            <Text style={styles.sectionTitle}>Soılem quru</Text>
            {sentence.length > 0 && (
              <TouchableOpacity onPress={clearSentence}>
                <Ionicons name="close-circle" size={24} color={Colors.gray400} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.sentenceContent}>
            {sentence.length > 0 ? (
              <View style={styles.sentenceWords}>
                {sentence.map((word, index) => (
                  <View key={index} style={styles.sentenceWord}>
                    <Text style={styles.sentenceWordText}>{word}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sentencePlaceholder}>
                Sozderdi uzaq basyp soılem quryńyz
              </Text>
            )}
          </View>
          {sentence.length > 0 && (
            <TouchableOpacity
              style={styles.speakSentenceButton}
              onPress={speakSentence}
            >
              <Ionicons name="volume-high" size={24} color={Colors.white} />
              <Text style={styles.speakSentenceText}>Soılemdi aıtu</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Custom Text Input */}
        <View style={styles.customInputContainer}>
          <Text style={styles.sectionTitle}>Oz sozińizdi jazyńyz</Text>
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Mátin jazyńyz..."
              placeholderTextColor={Colors.gray400}
              value={customText}
              onChangeText={setCustomText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.customInputButton,
                !customText.trim() && styles.customInputButtonDisabled,
              ]}
              onPress={speakCustomText}
              disabled={!customText.trim()}
            >
              <Ionicons
                name="volume-high"
                size={24}
                color={customText.trim() ? Colors.white : Colors.gray400}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Words */}
        {recentWords.length > 0 && (
          <View style={styles.recentContainer}>
            <Text style={styles.sectionTitle}>Sońǵy qoldanylǵan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.recentWords}>
                {recentWords.map((word, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentWordChip}
                    onPress={() => speakWord(word)}
                  >
                    <Text style={styles.recentWordText}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Sanattar</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Words Grid */}
        {selectedCategory && (
          <View style={styles.wordsContainer}>
            <Text style={styles.sectionTitle}>
              {categories.find(c => c.id === selectedCategory)?.name} sozderi
            </Text>
            <FlatList
              data={filteredWords}
              renderItem={renderWordItem}
              keyExtractor={item => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.wordsRow}
              contentContainerStyle={styles.wordsList}
            />
          </View>
        )}

        {/* Speaking Indicator */}
        {isSpeaking && (
          <View style={styles.speakingIndicator}>
            <ActivityIndicator size="small" color={Colors.secondary} />
            <Text style={styles.speakingText}>Soılep jatyr...</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.md,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.secondary,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.white,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  // Settings styles
  settingsContainer: {
    margin: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  settingSection: {
    marginBottom: Spacing.md,
  },
  settingLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray200,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  languageButtonActive: {
    backgroundColor: Colors.primary,
  },
  languageFlag: {
    fontSize: Typography.fontSizes.md,
  },
  languageText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  languageTextActive: {
    color: Colors.white,
  },
  speedButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  speedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray200,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  speedButtonActive: {
    backgroundColor: Colors.primary,
  },
  speedText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  speedTextActive: {
    color: Colors.white,
  },
  pitchButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pitchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray200,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  pitchButtonActive: {
    backgroundColor: Colors.primary,
  },
  pitchText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  pitchTextActive: {
    color: Colors.white,
  },
  sentenceContainer: {
    margin: Spacing.md,
    marginTop: 0,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  sentenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sentenceContent: {
    minHeight: 60,
    justifyContent: 'center',
  },
  sentenceWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  sentenceWord: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  sentenceWordText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
  },
  sentencePlaceholder: {
    color: Colors.gray400,
    fontSize: Typography.fontSizes.md,
    fontStyle: 'italic',
  },
  speakSentenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  speakSentenceText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  customInputContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
    minHeight: 50,
    ...Shadows.sm,
  },
  customInputButton: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  customInputButtonDisabled: {
    backgroundColor: Colors.gray200,
  },
  recentContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  recentWords: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  recentWordChip: {
    backgroundColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  recentWordText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
  },
  categoriesContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoriesList: {
    gap: Spacing.sm,
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    width: 100,
    ...Shadows.sm,
  },
  categoryCardActive: {
    backgroundColor: Colors.gray100,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryName: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  wordsContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  wordsList: {
    gap: Spacing.sm,
  },
  wordsRow: {
    gap: Spacing.sm,
  },
  wordCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  wordContent: {
    flex: 1,
  },
  wordText: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  wordTranslation: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  wordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  speakingText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },
  bottomPadding: {
    height: 100,
  },
});