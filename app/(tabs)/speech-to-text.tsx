import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { File } from 'expo-file-system';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { SpeechResult } from '@/types';
import { speechToText, saveSpeechHistory, getSpeechHistory } from '@/services/api';
import { API_BASE_URL, API_ENDPOINTS, DEVICE_ID, setDeviceId } from '@/config/api';
import * as Application from 'expo-application';
import { useSettings } from '@/context/SettingsContext';
import { useSpeechTranslation } from '@/i18n/speech-to-text';

export default function SpeechToTextScreen() {
  const { t } = useSpeechTranslation();
  const { listeningLanguage } = useSettings(); 
  const [isListening, setIsListening] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [history, setHistory] = useState<SpeechResult[]>([]);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(__DEV__);
  const [currentLanguage, setCurrentLanguage] = useState(listeningLanguage); 

  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    setCurrentLanguage(listeningLanguage);
  }, [listeningLanguage]);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const initializeComponent = async () => {
    try {
      await initializeDeviceId();
      await loadHistory();
    } catch (error) {
      console.log('Error initializing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const initializeDeviceId = async () => {
    try {
      let deviceId: string | null = null;
      
      if (Platform.OS === 'android') {
        deviceId = await Application.getAndroidId();
      } else if (Platform.OS === 'ios') {
        deviceId = await Application.getIosIdForVendorAsync();
      }

      if (!deviceId) {
        deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      setDeviceId(deviceId);
    } catch (error) {
      const fallbackId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setDeviceId(fallbackId);
    }
  };

  const loadHistory = async () => { 
    if (!DEVICE_ID) {
      return;
    }

    try {
      const historyData = await getSpeechHistory(DEVICE_ID, 20);
      
      setHistory(historyData.map((item: any) => ({
        text: item.text,
        confidence: item.confidence || 0.9,
        timestamp: new Date(item.created_at),
        isFinal: true,
      })));
    } catch (error) {
      console.log('Error loading history:', error);
    }
  };

  const startListening = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('permissionRequired'), t('permissionMessage'));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsListening(true);
      setCurrentText('');
      
    } catch (error) {
      console.log('Start listening error:', error);
      Alert.alert(t('error'), t('startError'));
    }
  };

  const stopListening = async () => {
    try {
      if (!recording) {
        return;
      }
      
      setIsListening(false);
      setIsProcessing(true);
      
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      
      setRecording(null);

      if (uri) {
        await processRecording(uri);
      } else {
        Alert.alert(t('error'), t('fileNotFound'));
      }
    } catch (error) {
      console.log('Stop listening error:', error);
      Alert.alert(t('error'), t('stopError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const processRecording = async (uri: string) => {
    try {
      // Файлды тексеру
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('File info:', fileInfo);

      if (!fileInfo.exists) {
        throw new Error(t('audioFileNotFound'));
      }
      
      // ЖАҢА: Тыңдау тілін speech-to-text API-ға жіберу
      const text = await speechToText(uri, currentLanguage);
          
      if (text && text.trim()) {
        setCurrentText(text);
        
        // Тарихқа сақтау
        const newResult: SpeechResult = {
          text,
          confidence: 0.9,
          timestamp: new Date(),
          isFinal: true,
        };
        
        setHistory(prev => [newResult, ...prev].slice(0, 20));
        
        // Backend-ке сақтау (тілді де сақтау)
        if (DEVICE_ID) {
          try {
            await saveSpeechHistory(DEVICE_ID, text, currentLanguage, 0.9);
          } catch (saveError) {
            console.log('Error saving to backend:', saveError);
          }
        }
      }
    } catch (error: any) {
      console.log('Process recording error:', error);
      
      Alert.alert(
        t('error'),
        `${t('error')}: ${error.message || t('audioFileNotFound')}`,
        [
          { text: t('demoMode'), onPress: simulateSpeechRecognition },
          { text: 'OK' }
        ]
      );
    }
  };

  const simulateSpeechRecognition = useCallback(() => {
    const demoTexts = [
      t('tip1'),
      t('tip2'),
      t('tip3'),
      t('speakNow'),
      t('startSpeaking'),
    ];

    const randomIndex = Math.floor(Math.random() * demoTexts.length);
    const simulatedText = demoTexts[randomIndex];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= simulatedText.length) {
        setCurrentText(simulatedText.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setCurrentText(simulatedText);
      
      const newHistoryItem = {
        text: simulatedText,
        confidence: 0.85 + Math.random() * 0.1,
        timestamp: new Date(),
        isFinal: true,
      };
      
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 20));
    }, 2000);
  }, [t]);

  const clearHistory = async () => {
    Alert.alert(
      t('clearHistory'),
      t('clearConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            setHistory([]);
            setCurrentText('');
          },
        },
      ]
    );
  };

  const copyText = (text: string) => {
    Alert.alert(t('copied'), text);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(t('timeFormat'), {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Тіл атауын алу
  const getLanguageName = (lang: string) => {
    switch (lang) {
      case 'kz': return 'Қазақша';
      case 'ru': return 'Русский';
      case 'en': return 'English';
      default: return 'Қазақша';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('title')}</Text>
        </View>
        <Text style={styles.headerSubtitle}>{t('subtitle')}</Text>
        {/* ЖАҢА: Ағымдағы тыңдау тілін көрсету */}
        <View style={styles.languageBadge}>
          <Ionicons name="ear-outline" size={16} color={Colors.white} />
          <Text style={styles.languageBadgeText}>
            {t('listening')}: {getLanguageName(currentLanguage)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Recognition */}
        <View style={styles.currentContainer}>
          <View style={styles.currentHeader}>
            <Text style={styles.sectionTitle}>{t('currentText')}</Text>
            {(isListening || isProcessing) && (
              <View style={styles.listeningBadge}>
                <View style={[styles.listeningDot, isProcessing && styles.processingDot]} />
                <Text style={styles.listeningText}>
                  {isProcessing ? t('processing') : t('listening')}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.currentTextContainer}>
            {currentText ? ( 
              <Text style={styles.currentText}>{currentText}</Text>
            ) : (
              <Text style={styles.placeholderText}>
                {isListening
                  ? `${t('speakNow')} (${getLanguageName(currentLanguage)})`
                  : t('startSpeaking')}
              </Text>
            )}
          </View>

          {currentText && !isListening && !isProcessing && (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyText(currentText)}
            >
              <Ionicons name="copy-outline" size={20} color={Colors.primary} />
              <Text style={styles.copyButtonText}>{t('copy')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Microphone Button */}
        <View style={styles.microphoneContainer}>
          <Animated.View
            style={[
              styles.microphoneRing,
              isListening && styles.microphoneRingActive,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.microphoneButton,
                isListening && styles.microphoneButtonActive,
                isProcessing && styles.microphoneButtonProcessing,
              ]}
              onPress={isListening ? stopListening : startListening}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color={Colors.white} />
              ) : (
                <Ionicons
                  name={isListening ? 'stop' : 'mic'}
                  size={40}
                  color={Colors.white}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.microphoneHint}>
            {isProcessing 
              ? t('processingAudio')
              : (isListening ? t('stopToStop') : t('startToStart'))}
          </Text>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>{t('tips')}</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.tipText}>{t('tip1')}</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.tipText}>{t('tip2')}</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.tipText}>{t('tip3')}</Text>
          </View>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>{t('history')}</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Ionicons name="trash-outline" size={22} color={Colors.gray500} />
              </TouchableOpacity>
            </View>
            
            {history.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.historyItem}
                onPress={() => copyText(item.text)}
              >
                <View style={styles.historyItemContent}>
                  <Text style={styles.historyText}>{item.text}</Text>
                  <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
                </View>
                <View style={styles.historyItemActions}>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {(item.confidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <Ionicons name="copy-outline" size={18} color={Colors.gray400} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}


// app/speech-to-text.tsx (стильдер бөлігі)
import { scaleWidth, scaleHeight, scaleFont, spacing, borderRadius, fontSize } from '@/constants/responsive';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: Colors.textSecondary,
  },
  languageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  languageBadgeText: {
    color: Colors.white,
    fontSize: fontSize.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? scaleHeight(60) : scaleHeight(40),
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: Colors.white,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  debugButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  currentContainer: {
    margin: spacing.md,
    backgroundColor: Colors.cardBackground,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  listeningDot: {
    width: scaleWidth(8),
    height: scaleWidth(8),
    borderRadius: scaleWidth(4),
    backgroundColor: Colors.white,
    marginRight: spacing.xs,
  },
  processingDot: {
    backgroundColor: Colors.warning,
  },
  listeningText: {
    color: Colors.white,
    fontSize: fontSize.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  currentTextContainer: {
    minHeight: scaleHeight(100),
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderWidth: 2,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  currentText: {
    fontSize: fontSize.xl,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: scaleHeight(32),
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: Colors.gray400,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  copyButtonText: {
    color: Colors.primary,
    fontSize: fontSize.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  microphoneContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  microphoneRing: {
    width: scaleWidth(120),
    height: scaleWidth(120),
    borderRadius: scaleWidth(60),
    backgroundColor: Colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microphoneRingActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  microphoneButton: {
    width: scaleWidth(100),
    height: scaleWidth(100),
    borderRadius: scaleWidth(50),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  microphoneButtonActive: {
    backgroundColor: Colors.error,
  },
  microphoneButtonProcessing: {
    backgroundColor: Colors.gray400,
  },
  microphoneHint: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
  },
  tipsContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...Shadows.sm,
  },
  tipsTitle: {
    fontSize: fontSize.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
  },
  historyContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyItem: {
    backgroundColor: Colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  historyItemContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  historyText: {
    fontSize: fontSize.md,
    color: Colors.textPrimary,
    marginBottom: spacing.xs,
  },
  historyTime: {
    fontSize: fontSize.xs,
    color: Colors.gray400,
  },
  historyItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confidenceBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: spacing.sm,
    paddingVertical: scaleHeight(2),
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  bottomPadding: {
    height: scaleHeight(100),
  },
});
