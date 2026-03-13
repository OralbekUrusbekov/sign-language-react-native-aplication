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




export default function SpeechToTextScreen() {
  const [isListening, setIsListening] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [history, setHistory] = useState<SpeechResult[]>([]);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(__DEV__);

  const componentName = 'SpeechToTextScreen';





  useEffect(() => {
    initializeComponent();
  }, []);

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
    }
  };

  const startListening = async () => {
    
    try {
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Қате', 'Микрофонға рұқсат беріңіз');
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
      Alert.alert('Қате', 'Жазбаны бастау мүмкін болмады');
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
        Alert.alert('Қате', 'Жазба файлы табылмады');
      }
    } catch (error) {
      Alert.alert('Қате', 'Жазбаны тоқтату кезінде қате пайда болды');
    } finally {
      setIsProcessing(false);
    }
  };


// app/(tabs)/speech-to-text.tsx - processRecording функциясы

const processRecording = async (uri: string) => {
  
  try {
    // Файлды тексеру
    const fileInfo = await FileSystem.getInfoAsync(uri);
  

    if (!fileInfo.exists) {
      throw new Error('Аудио файл табылмады');
    }
    
    const text = await speechToText(uri, 'kz');
        
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
      
      // Backend-ке сақтау
      if (DEVICE_ID) {
        try {
          await saveSpeechHistory(DEVICE_ID, text, 'kz', 0.9);
        } catch (saveError) {
        }
      }
    }
  } catch (error: any) {
    
    // Қате туралы толық ақпарат
    Alert.alert(
      'Қате',
      `Қате түрі: ${error.name || 'Unknown'}\n` +
      `Хабарлама: ${error.message || 'Жоқ'}\n\n` +
      `API URL: ${API_ENDPOINTS.SPEECH_TO_TEXT}`,
      [
        { text: 'Демо режим', onPress: simulateSpeechRecognition },
        { text: 'OK' }
      ]
    );
  }
};

  const simulateSpeechRecognition = useCallback(() => {
    
    const demoTexts = [
      'Сәлеметсіз бе',
      'Мен сізді түсінемін',
      'Рахмет көмегіңіз үшін',
      'Қандай жаңалықтар бар?',
      'Бүгін ауа райы қандай?',
      'Кездескенше',
      'Жақсы күн тілеймін',
      'Маған көмектесіңізші',
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
  }, []);

  const clearHistory = async () => {
    
    Alert.alert(
      'Тарихты тазалау',
      'Барлық жазбаларды өшіруге сенімдісіз бе?',
      [
        { text: 'Болдырмау', style: 'cancel' },
        {
          text: 'Иә, өшіру',
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
    Alert.alert('Көшірілді', text);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('kk-KZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };



  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Жүктелуде...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Тыңдау</Text>
  
        </View>
        <Text style={styles.headerSubtitle}>Дауысты текстке айналдыру</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Recognition */}
        <View style={styles.currentContainer}>
          <View style={styles.currentHeader}>
            <Text style={styles.sectionTitle}>Қазіргі мәтін</Text>
            {(isListening || isProcessing) && (
              <View style={styles.listeningBadge}>
                <View style={[styles.listeningDot, isProcessing && styles.processingDot]} />
                <Text style={styles.listeningText}>
                  {isProcessing ? 'Өңдеуде...' : 'Тыңдап жатыр'}
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
                  ? 'Сөйлеңіз...'
                  : 'Микрофонды басып сөйлей бастаңыз'}
              </Text>
            )}
          </View>

          {currentText && !isListening && !isProcessing && (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyText(currentText)}
            >
              <Ionicons name="copy-outline" size={20} color={Colors.primary} />
              <Text style={styles.copyButtonText}>Көшіру</Text>
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
              ? 'Өңделіп жатыр...' 
              : (isListening ? 'Тоқтату үшін басыңыз' : 'Бастау үшін басыңыз')}
          </Text>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Кеңестер</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.tipText}>Анық және баяу сөйлеңіз</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.tipText}>Тыныш жерде қолданыңыз</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.tipText}>Микрофонға жақын сөйлеңіз</Text>
          </View>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Тарих</Text>
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
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.accent,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  debugButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  currentContainer: {
    margin: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    marginRight: Spacing.xs,
  },
  processingDot: {
    backgroundColor: Colors.warning,
  },
  listeningText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  currentTextContainer: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
  },
  currentText: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
  },
  placeholderText: {
    fontSize: Typography.fontSizes.md,
    color: Colors.gray400,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  copyButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  microphoneContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  microphoneRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microphoneRingActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  microphoneButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  tipsContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  tipsTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  historyContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  historyItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  historyItemContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  historyText: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  historyTime: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.gray400,
  },
  historyItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  confidenceBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  confidenceText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  bottomPadding: {
    height: 100,
  },
});