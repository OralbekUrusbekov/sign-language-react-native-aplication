import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { 
  API_ENDPOINTS, 
  PREDICTION_INTERVAL,
} from '@/config/api';

interface Prediction {
  label: string;
  confidence: number;
}

interface PredictionResponse {
  status: 'success' | 'waiting' | 'error';
  current_prediction?: string;
  top3?: Prediction[];
  message?: string;
}

interface RecognitionStatus {
  is_running: boolean;
}

export default function SignLanguageScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isRunning, setIsRunning] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<string>('Waiting...');
  const [top3Predictions, setTop3Predictions] = useState<Prediction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [videoFeedUrl, setVideoFeedUrl] = useState<string>('');
  const [isStreamLoading, setIsStreamLoading] = useState(true);
  
  const predictionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Видео ағынының URL-ін жаңарту
  useEffect(() => {
    if (isRunning) {
      // Кэшті болдырмау үшін timestamp қосу
      setVideoFeedUrl(`${API_ENDPOINTS.VIDEO_FEED}?t=${Date.now()}`);
      setIsStreamLoading(true);
    }
  }, [isRunning]);


  
  // Backend-пен байланысты тексеру (веб нұсқадағы checkInitialStatus функциясы)
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.RECOGNITION_STATUS, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data: RecognitionStatus = await response.json();
        setIsConnected(true);
        setConnectionError(null);
        
        // Веб нұсқадағыдай backend күйін синхрондау
        if (data.is_running !== isRunning) {
          setIsRunning(data.is_running);
          if (data.is_running) {
            startPredictionUpdates();
          } else {
            stopPredictionUpdates();
          }
        }
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      setIsConnected(false);
      setConnectionError('Backend-пен байланыс жоқ. Сервердің IP адресін тексеріңіз.');
      console.log('[Connection] Error:', error);
    }
  }, [isRunning]);

  // Бет жүктелгенде байланысты тексеру (веб нұсқадағы DOMContentLoaded)
  useEffect(() => {
    checkConnection();
    
    // Әр 10 секунд сайын байланысты тексеру
    const connectionInterval = setInterval(checkConnection, 10000);
    
    return () => {
      clearInterval(connectionInterval);
      stopPredictionUpdates();
    };
  }, [checkConnection]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkConnection();
    setRefreshing(false);
  }, [checkConnection]);

  // Веб нұсқадағы updatePredictions функциясы
  const updatePredictions = async () => {
    if (!isConnected) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.CURRENT_PREDICTIONS);
      const data: PredictionResponse = await response.json();
      
      if (data.status === 'waiting') {
        setCurrentPrediction('Collecting frames...');
        setTop3Predictions([]);
      } else if (data.status === 'success') {
        setCurrentPrediction(data.current_prediction || 'Unknown');
        setTop3Predictions(data.top3 || []);
        
        // Веб нұсқадағыдай историяға қосу
        if (data.current_prediction && data.current_prediction !== 'Unknown') {
          setHistory(prev => {
            const newHistory = [...prev];
            if (newHistory[newHistory.length - 1] !== data.current_prediction) {
              newHistory.push(data.current_prediction!);
            }
            return newHistory.slice(-20);
          });
        }
      }
    } catch (error) {
      console.log('[Predictions] Error:', error);
    }
  };

  // Веб нұсқадағы startPredictionUpdates функциясы
  const startPredictionUpdates = () => {
    // Алдыңғы интервалды тазалау
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
    }
    // Әр 500ms сайын жаңарту (веб нұсқадағыдай)
    predictionIntervalRef.current = setInterval(updatePredictions, PREDICTION_INTERVAL);
    updatePredictions(); // Бірінші жаңарту
  };

  // Веб нұсқадағы stopPredictionUpdates функциясы
  const stopPredictionUpdates = () => {
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
      predictionIntervalRef.current = null;
    }
    setCurrentPrediction('Stopped');
    setTop3Predictions([]);
  };

  // Веб нұсқадағы toggleRecognition функциясы
  const toggleRecognition = async () => {
    if (isToggling || !isConnected) return;
    
    setIsToggling(true);
    const action = isRunning ? 'stop' : 'start';
    
    try {
      const response = await fetch(API_ENDPOINTS.TOGGLE_RECOGNITION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsRunning(!isRunning);
        
        if (!isRunning) {
          // Бастау - веб нұсқадағыдай prediction жаңартуды бастау
          startPredictionUpdates();
        } else {
          // Тоқтату - веб нұсқадағыдай prediction жаңартуды тоқтату
          stopPredictionUpdates();
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to ' + action + ' recognition');
      }
    } catch (error) {
      console.log('[Toggle] Error:', error);
      Alert.alert('Connection Error', 'Could not connect to server');
    } finally {
      setIsToggling(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const retryConnection = () => {
    setConnectionError(null);
    checkConnection();
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera" size={64} color={Colors.primary} />
          <Text style={styles.permissionTitle}>Camera Required</Text>
          <Text style={styles.permissionText}>
            Please grant camera permission to use sign language recognition
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - веб нұсқадағыдай */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sign Language Recognition</Text>
        <View style={styles.connectionStatus}>
          <View style={[
            styles.connectionDot,
            { backgroundColor: isConnected ? Colors.success : Colors.error }
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Connection Error */}
      {connectionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{connectionError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Camera Card - веб нұсқадағыдай */}
        <View style={styles.cameraCard}>
          <View style={styles.cameraCardHeader}>
            <Text style={styles.cameraCardTitle}>Live Camera Feed</Text>
          </View>
          <View style={styles.cameraContainer}>
            {isRunning ? (
              <>
                <Image
                  source={{ uri: videoFeedUrl }}
                  style={styles.camera}
                  resizeMode="cover"
                  onLoadStart={() => setIsStreamLoading(true)}
                  onLoad={() => setIsStreamLoading(false)}
                  onError={(e) => {
                    console.log('[Video] Stream error:', e.nativeEvent.error);
                    setIsStreamLoading(false);
                    // Қате болғанда қайта қосу
                    setTimeout(() => {
                      if (isRunning) {
                        setVideoFeedUrl(`${API_ENDPOINTS.VIDEO_FEED}?t=${Date.now()}`);
                      }
                    }, 2000);
                  }}
                />
                {isStreamLoading && (
                  <View style={styles.streamLoading}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                  </View>
                )}
              </>
            ) : (
              <CameraView
                style={styles.camera}
                facing={facing}
              />
            )}
            
            {/* Recording Indicator - веб нұсқадағыдай */}
            {isRunning && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>REC</Text>
              </View>
            )}
            
            {/* Camera Flip Button - веб нұсқадағыдай */}
            {!isRunning && (
              <TouchableOpacity
                style={styles.flipButton}
                onPress={toggleCameraFacing}
              >
                <Ionicons name="camera-reverse" size={24} color={Colors.white} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Toggle Button - веб нұсқадағыдай */}
          <TouchableOpacity
            style={[
              styles.toggleButton,
              isRunning ? styles.toggleButtonStop : styles.toggleButtonStart,
              (isToggling || !isConnected) && styles.toggleButtonDisabled,
            ]}
            onPress={toggleRecognition}
            disabled={isToggling || !isConnected}
          >
            {isToggling ? (
              <>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.toggleButtonText}>Processing...</Text>
              </>
            ) : (
              <>
                <Ionicons 
                  name={isRunning ? "stop-circle" : "play-circle"} 
                  size={24} 
                  color={Colors.white} 
                />
                <Text style={styles.toggleButtonText}>
                  {isRunning ? 'Stop Recognition' : 'Start Recognition'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Recognition Results Card - веб нұсқадағыдай */}
        <View style={styles.resultsCard}>
          <Text style={styles.resultsCardTitle}>Recognition Results</Text>
          
          {/* Current Prediction */}
          <View style={styles.currentPrediction}>
            <Text style={styles.currentPredictionLabel}>Current Prediction</Text>
            <View style={[styles.currentPredictionBox, 
              currentPrediction === 'Collecting frames...' && styles.waitingBox
            ]}>
              <Text style={[
                styles.currentPredictionText,
                currentPrediction === 'Collecting frames...' && styles.waitingText,
                currentPrediction === 'Stopped' && styles.stoppedText
              ]}>
                {currentPrediction}
              </Text>
            </View>
          </View>
          
          {/* Top 3 Predictions - веб нұсқадағыдай */}
          <View style={styles.top3Container}>
            <Text style={styles.top3Title}>Top 3 Predictions</Text>
            {[0, 1, 2].map((index) => {
              const pred = top3Predictions[index];
              const colors = [Colors.primary, Colors.gray500, Colors.secondary];
              return (
                <View key={index} style={styles.predictionItem}>
                  <View style={styles.predictionLabelRow}>
                    <Text style={styles.predictionRank}>
                      {index + 1}. {pred?.label || '-'}
                    </Text>
                    <View style={[styles.confidenceBadge, { backgroundColor: colors[index] }]}>
                      <Text style={styles.confidenceText}>
                        {pred ? `${pred.confidence.toFixed(1)}%` : '0%'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          width: `${pred?.confidence || 0}%`,
                          backgroundColor: colors[index],
                        }
                      ]} 
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* History Card */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recognition History</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Ionicons name="trash-outline" size={20} color={Colors.gray500} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.historyContent}>
            {history.length > 0 ? (
              <Text style={styles.historyText}>{history.join(' ')}</Text>
            ) : (
              <Text style={styles.historyPlaceholder}>
                No words recognized yet
              </Text>
            )}
          </View>
        </View>

        {/* Instructions Card - веб нұсқадағыдай */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Instructions</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>Position yourself in front of the camera</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="sunny-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>Ensure good lighting conditions</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="hand-left-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>Keep your hands and upper body visible</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>~2.5 seconds of video needed</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
    flex: 1,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
  },
  connectionText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.white,
  },
  errorBanner: {
    backgroundColor: Colors.error,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    flex: 1,
  },
  retryButton: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.error,
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.sm,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  permissionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  permissionTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
  },
  permissionText: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  permissionButtonText: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.white,
  },
  cameraCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  cameraCardHeader: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  cameraCardTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  cameraContainer: {
    height: 300,
    backgroundColor: Colors.gray800,
    position: 'relative',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  streamLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  recordingIndicator: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
    marginRight: Spacing.xs,
  },
  recordingText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  flipButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  toggleButtonStart: {
    backgroundColor: Colors.success,
  },
  toggleButtonStop: {
    backgroundColor: Colors.error,
  },
  toggleButtonDisabled: {
    opacity: 0.6,
  },
  toggleButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  resultsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  resultsCardTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  currentPrediction: {
    marginBottom: Spacing.lg,
  },
  currentPredictionLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  currentPredictionBox: {
    backgroundColor: 'rgba(13, 110, 253, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(13, 110, 253, 0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  waitingBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  currentPredictionText: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  waitingText: {
    color: Colors.warning,
    fontSize: Typography.fontSizes.lg,
  },
  stoppedText: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.lg,
  },
  top3Container: {
    marginTop: Spacing.sm,
  },
  top3Title: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  predictionItem: {
    marginBottom: Spacing.md,
  },
  predictionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  predictionRank: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
  },
  confidenceBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  confidenceText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  historyTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  historyContent: {
    minHeight: 40,
    justifyContent: 'center',
  },
  historyText: {
    fontSize: Typography.fontSizes.lg,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  historyPlaceholder: {
    fontSize: Typography.fontSizes.md,
    color: Colors.gray400,
    fontStyle: 'italic',
  },
  instructionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  instructionsTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  instructionText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
});