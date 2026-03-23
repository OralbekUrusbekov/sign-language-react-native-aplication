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
  Dimensions,
} from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { useSignTranslation } from '@/i18n/sign';

import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { 
  API_ENDPOINTS, 
  FRAME_CAPTURE_INTERVAL 
} from '@/config/api';
import Svg, { Circle, Line } from 'react-native-svg';
import { predictFrame, toggleRecognition } from '@/services/reqognition';


const { width } = Dimensions.get('window');
const CAMERA_HEIGHT = width * 0.75;
const overlayWidth = width - 32;
const cameraActualWidth = CAMERA_HEIGHT * (3 / 4);
const xOffset = (overlayWidth - cameraActualWidth) / 2;

// ==================== ЛОГТАР ====================
const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) {
    console.log('🔵 [SIGN]', ...args);
  }
};
const logError = (...args: any[]) => console.log('🔴 [SIGN ERROR]', ...args);
const logSuccess = (...args: any[]) => console.log('🟢 [SIGN SUCCESS]', ...args);
const logWarn = (...args: any[]) => console.log('🟡 [SIGN WARN]', ...args);

interface Prediction {
  label: string;
  confidence: number;
}

export default function SignLanguageScreen() {
  log('📱 Компонент жүктелді');

  const { appLanguage } = useSettings();
  const { t } = useSignTranslation();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isRunning, setIsRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<string>('Дайын');
  const [top3Predictions, setTop3Predictions] = useState<Prediction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [landmarks, setLandmarks] = useState<any>(null);
  const [bufferStatus, setBufferStatus] = useState<{ frames: number; needed: number } | null>(null);
  const [landmarksDetected, setLandmarksDetected] = useState({ pose: false, hands: false });
  
  const cameraRef = useRef<any>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsTimerRef = useRef<number>(Date.now());
  const lastPredictionRef = useRef<string>('');
  const isRunningRef = useRef(false);
  const isProcessingRef = useRef(false);

  // ==================== САУЫТ КОННЕКЦИЯЛАРЫ ====================
  const poseConnections = [
    [11, 12], // shoulders
    [11, 13], [13, 15], // left arm
    [12, 14], [14, 16], // right arm
    [11, 23], [12, 24], // torso
    [23, 24], // hips
    [23, 25], [25, 27], // left leg
    [24, 26], [26, 28], // right leg
  ];

  const handConnections = [
    [0,1],[1,2],[2,3],[3,4], // thumb
    [0,5],[5,6],[6,7],[7,8], // index
    [0,9],[9,10],[10,11],[11,12], // middle
    [0,13],[13,14],[14,15],[15,16], // ring
    [0,17],[17,18],[18,19],[19,20] // pinky
  ];
  
  // ==================== БАЙЛАНЫСТЫ ТЕКСЕРУ ====================
  
  const checkConnection = useCallback(async () => {
    log('🌐 Серверге қосылу тексерілуде...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logWarn('⏱️ Серверге қосылу уақыты өтті');
        controller.abort();
      }, 5000);
      
      const response = await fetch(API_ENDPOINTS.RECOGNITION_STATUS, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        logSuccess('✅ Серверге қосылды', data);
        setIsConnected(true);
        setConnectionError(null);
      } else {
        logError('❌ Сервер қатесі:', response.status);
        throw new Error('Server error');
      }
    } catch (error) {
      logError('❌ Серверге қосылу мүмкін емес:', error);
      setIsConnected(false);
      setConnectionError('Серверге қосылу мүмкін емес. IP адресті тексеріңіз.');
    }
  }, []);

  useEffect(() => {
    log('🔄 useEffect - бастапқы тексеру');
    checkConnection();
    const connectionInterval = setInterval(() => {
      log('🔄 Серверді қайта тексеру');
      checkConnection();
    }, 10000);
    
    return () => {
      log('🧹 Компонент жойылды - тазалау');
      clearInterval(connectionInterval);
      stopFrameCapture();
    };
  }, [checkConnection]);

  // ==================== КАДРЛАРДЫ ЖІБЕРУ (15 FPS) ====================

  const captureAndSendFrame = useCallback(async () => {
    if (!cameraRef.current) return;
    if (!isRunningRef.current) return;
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      // Жоғары сапалы фото (жақсы landmark detection үшін)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,  // Жоғары сапа (0.8)
        base64: false,
        skipProcessing: false,
        shutterSound: false,
        imageType: 'jpg',
      });

      if (!photo?.uri) {
        logWarn('⚠️ Фото URI жоқ');
        return;
      }

      log(`📸 Кадр жіберілуде: ${new Date().toISOString().slice(11, 23)}`);
      
      const startTime = Date.now();
      const data = await predictFrame(photo.uri);
      const latency = Date.now() - startTime;
      
      log(`📊 Жауап уақыты: ${latency}ms`);

      if (!isRunningRef.current) return;

      // Buffer статусын жаңарту
      if (data.buffer_status) {
        setBufferStatus({
          frames: data.buffer_status.frames || 0,
          needed: data.buffer_status.needed || 15
        });
        log(`📊 Buffer: ${data.buffer_status.frames}/${data.buffer_status.needed || 15}`);
      }

      // Landmark detection статусы
      if (data.landmarks_detected) {
        setLandmarksDetected(data.landmarks_detected);
      }

      if (data.status === 'success' && data.current_prediction) {
        setCurrentPrediction(data.current_prediction);
        setTop3Predictions(data.top3 || []);
        setLandmarks(data.landmarks ?? null);
        
        // Историяға қосу (бірдей сөзді қайталамау)
        if (data.current_prediction !== lastPredictionRef.current) {
          setHistory(prev => [data.current_prediction!, ...prev.slice(0, 9)]);
          lastPredictionRef.current = data.current_prediction;
        }
        
        // FPS есептеу
        const now = Date.now();
        const elapsed = now - fpsTimerRef.current;
        const currentFps = Math.round(1000 / elapsed);
        setFps(Math.min(currentFps, 30));
        fpsTimerRef.current = now;
        
      } else if (data.status === 'waiting') {
        setCurrentPrediction(data.message || 'Кадрлар жиналуда...');
        setLandmarks(data.landmarks ?? null);
        
        // Егер pose немесе hands табылмаса, көрсету
        if (data.landmarks_detected && !data.landmarks_detected.pose) {
          setCurrentPrediction('❗ Поза табылмады');
        } else if (data.landmarks_detected && !data.landmarks_detected.hands) {
          setCurrentPrediction('✋ Қол табылмады');
        }
      } else if (data.status === 'error') {
        logError('❌ Prediction error:', data.message);
        setCurrentPrediction('Қате');
      }

    } catch (e) {
      logError('❌ FRAME ERROR:', e);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  // ==================== КАДРЛАРДЫ ЖИНАУ ЛУПАСЫ (15 FPS = 66ms) ====================
  
  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    log('🚀 Кадр жинау басталды (15 FPS, 66ms интервал)');
    
    // 66ms = ~15 FPS
    frameIntervalRef.current = setInterval(() => {
      if (isRunningRef.current && !isProcessingRef.current) {
        captureAndSendFrame();
      }
    }, 66);  // FIXED: 80ms → 66ms (15 FPS)
  }, [captureAndSendFrame]);

  const stopFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    isProcessingRef.current = false;
    setIsProcessing(false);
    setCurrentPrediction('Тоқтатылды');
    setBufferStatus(null);
    setLandmarksDetected({ pose: false, hands: false });
    log('🛑 Кадр жинау тоқтатылды');
  }, []);

  // ==================== ТАНУДЫ БАСҚАРУ ====================
  
  const toggleRecognitionHandler = async () => {
    log('🎮 toggleRecognitionHandler шақырылды');
    
    if (!isConnected) {
      Alert.alert('Қате', 'Серверге қосылмаған');
      return;
    }
    
    try {
      const action = isRunning ? 'stop' : 'start';
      log(`▶️ ${action} әрекеті`);
      
      const result = await toggleRecognition(action);
      
      if (result.success) {
        if (action === 'start') {
          setIsRunning(true);
          isRunningRef.current = true;  
          startFrameCapture();
          setCurrentPrediction('Кадрлар жиналуда...');
          setBufferStatus(null);
          logSuccess('✅ Басталды, isRunning = true');
        } else {
          stopFrameCapture();
          setIsRunning(false);
          isRunningRef.current = false; 
          logSuccess('✅ Тоқтатылды, isRunning = false');
        }
      } else {
        Alert.alert('Қате', result.message || 'Әрекет сәтсіз аяқталды');
      }
    } catch (error) {
      logError('❌ Қате:', error);
      Alert.alert('Қате', 'Сервермен байланыс қатесі');
    }
  };

  // ==================== ТЕСТ ФУНКЦИЯЛАРЫ ====================
  
  const testCapture = async () => {
    log('🧪 ТЕСТ: captureAndSendFrame тікелей шақыру');
    Alert.alert('Тест', 'Кадр жіберілуде...');
    await captureAndSendFrame();
  };

  const testConnection = async () => {
    log('🧪 ТЕСТ: Серверді тексеру');
    await checkConnection();
  };

  // ==================== КАМЕРАНЫ АУЫСТЫРУ ====================
  
  const toggleCameraFacing = () => {
    log('🔄 Камера ауыстырылды:', facing === 'back' ? 'front' : 'back');
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // ==================== ИСТОРИЯНЫ ТАЗАЛАУ ====================
  
  const clearHistory = () => {
    log('🗑️ История тазаланды');
    setHistory([]);
    lastPredictionRef.current = '';
  };

  // ==================== PULL-TO-REFRESH ====================
  
  const onRefresh = useCallback(async () => {
    log('🔄 Pull-to-refresh');
    setRefreshing(true);
    await checkConnection();
    setRefreshing(false);
  }, [checkConnection]);

  // ==================== КОМПОНЕНТТІ ТАЗАЛАУ ====================
  
  useEffect(() => {
    log('🔄 useEffect - компонент жүктелді');
    return () => {
      log('🧹 useEffect - компонент жойылды');
      stopFrameCapture();
    };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      setCurrentPrediction(t('ready'));
    } else if (currentPrediction === t('stopped')) {
      setCurrentPrediction(t('stopped'));
    } else if (currentPrediction === t('collecting')) {
      setCurrentPrediction(t('collecting'));
    }
  }, [appLanguage, isRunning]);

  // ==================== ЛАНДМАРКТЫ САЛУ ====================
  
  const renderLandmarks = () => {
    if (!landmarks) return null;
    
    const hand0IsLeft = landmarks?.hand_labels?.[0] === 'Left';
    
    return (
      <Svg width={overlayWidth} height={CAMERA_HEIGHT}>
        {/* Pose lines */}
        {poseConnections.map(([start, end], index) => {
          const p1 = landmarks?.pose?.[start];
          const p2 = landmarks?.pose?.[end];
          if (!p1 || !p2) return null;
          return (
            <Line
              key={`pose-line-${index}`}
              x1={xOffset + (1 - p1.x) * cameraActualWidth}
              y1={p1.y * CAMERA_HEIGHT}
              x2={xOffset + (1 - p2.x) * cameraActualWidth}
              y2={p2.y * CAMERA_HEIGHT}
              stroke="lime"
              strokeWidth="3"
            />
          );
        })}

        {/* Pose points */}
        {[11,12,13,14,15,16,23,24,25,26,27,28].map((index) => {
          const point = landmarks?.pose?.[index];
          if (!point) return null;
          return (
            <Circle
              key={`pose-${index}`}
              cx={xOffset + (1 - point.x) * cameraActualWidth}
              cy={point.y * CAMERA_HEIGHT}
              r="4"
              fill="red"
            />
          );
        })}

        {/* Hand 0 (left or right) */}
        {landmarks?.hand_0?.map((point: any, idx: number) => {
          if (idx === 0) {
            // Wrist marker
            return (
              <Circle
                key={`hand0-wrist`}
                cx={xOffset + (1 - point.x) * cameraActualWidth}
                cy={point.y * CAMERA_HEIGHT}
                r="6"
                fill={hand0IsLeft ? '#FFD700' : '#00CED1'}
                stroke="white"
                strokeWidth="2"
              />
            );
          }
          return null;
        })}
        
        {/* Hand 0 lines */}
        {handConnections.map(([start, end], index) => {
          const p1 = landmarks?.hand_0?.[start];
          const p2 = landmarks?.hand_0?.[end];
          if (!p1 || !p2) return null;
          return (
            <Line
              key={`hand0-line-${index}`}
              x1={xOffset + (1 - p1.x) * cameraActualWidth}
              x2={xOffset + (1 - p2.x) * cameraActualWidth}
              y1={p1.y * CAMERA_HEIGHT}
              y2={p2.y * CAMERA_HEIGHT}
              stroke={hand0IsLeft ? '#FFD700' : '#00CED1'}
              strokeWidth="2.5"
            />
          );
        })}

        {/* Hand 0 points */}
        {landmarks?.hand_0?.map((point: any, index: number) => (
          <Circle
            key={`hand0-point-${index}`}
            cx={xOffset + (1 - point.x) * cameraActualWidth}
            cy={point.y * CAMERA_HEIGHT}
            r="3"
            fill={hand0IsLeft ? '#FFD700' : '#00CED1'}
          />
        ))}

        {/* Hand 1 lines */}
        {handConnections.map(([start, end], index) => {
          const p1 = landmarks?.hand_1?.[start];
          const p2 = landmarks?.hand_1?.[end];
          if (!p1 || !p2) return null;
          return (
            <Line
              key={`hand1-line-${index}`}
              x1={xOffset + (1 - p1.x) * cameraActualWidth}
              x2={xOffset + (1 - p2.x) * cameraActualWidth}
              y1={p1.y * CAMERA_HEIGHT}
              y2={p2.y * CAMERA_HEIGHT}
              stroke={hand0IsLeft ? '#00CED1' : '#FFD700'}
              strokeWidth="2.5"
            />
          );
        })}

        {/* Hand 1 points */}
        {landmarks?.hand_1?.map((point: any, index: number) => (
          <Circle
            key={`hand1-point-${index}`}
            cx={xOffset + (1 - point.x) * cameraActualWidth}
            cy={point.y * CAMERA_HEIGHT}
            r="3"
            fill={hand0IsLeft ? '#00CED1' : '#FFD700'}
          />
        ))}
      </Svg>
    );
  };

  // ==================== РЕНДЕР ====================
  
  log('🎨 Рендер:', { isConnected, isRunning, isProcessing, currentPrediction });
  
  if (!permission) {
    log('⏳ Камера рұқсаты күтілуде...');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    logWarn('⚠️ Камера рұқсаты жоқ');
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera" size={64} color={Colors.primary} />
          <Text style={styles.permissionTitle}>{t('cameraRequired')}</Text>
          <Text style={styles.permissionText}>{t('cameraPermissionText')}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('grantPermission')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('signLanguage')}</Text>
        <View style={styles.connectionStatus}>
          <View style={[
            styles.connectionDot,
            { backgroundColor: isConnected ? Colors.success : Colors.error }
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? t('connected') : t('disconnected')}
          </Text>
        </View>
      </View>

      {/* Connection Error */}
      {connectionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{connectionError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={checkConnection}>
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
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
        {/* Camera Card */}
        <View style={styles.cameraCard}>
          <View style={styles.cameraCardHeader}>
            <Text style={styles.cameraCardTitle}>{t('liveStream')}</Text>
            <View style={styles.headerButtons}>
              {isRunning && (
                <View style={styles.fpsContainer}>
                  <Ionicons name="speedometer-outline" size={16} color={Colors.primary} />
                  <Text style={styles.fpsText}>{fps} FPS</Text>
                </View>
              )}
              {bufferStatus && (
                <View style={styles.bufferContainer}>
                  <Ionicons name="cube-outline" size={14} color={Colors.primary} />
                  <Text style={styles.bufferText}>
                    {bufferStatus.frames}/{bufferStatus.needed}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.testButton} onPress={testConnection}>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              ratio="4:3"
              pictureSize="640x480"
            />

            {/* Камераны ауыстыру батырмасы */}
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Ionicons 
                name="camera-reverse-outline" 
                size={24} 
                color={Colors.white} 
              />
            </TouchableOpacity>

            {/* Өңдеу индикаторы */}
            {isProcessing && (
              <View style={styles.processingIndicator}>
                <ActivityIndicator size="small" color={Colors.white} />
              </View>
            )}

            {/* Landmark overlay */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {renderLandmarks()}
            </View>

            {/* Landmark detection status */}
            {isRunning && landmarksDetected && (
              <View style={styles.detectionStatus}>
                <View style={[
                  styles.detectionDot,
                  { backgroundColor: landmarksDetected.pose ? Colors.success : Colors.gray500 }
                ]} />
                <Text style={styles.detectionText}>Поза</Text>
                <View style={[
                  styles.detectionDot,
                  { backgroundColor: landmarksDetected.hands ? Colors.success : Colors.gray500, marginLeft: 8 }
                ]} />
                <Text style={styles.detectionText}>Қол</Text>
              </View>
            )}
          </View>
          
          {/* Control Buttons */}
          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[
                styles.mainButton,
                isRunning ? styles.stopButton : styles.startButton,
                (!isConnected || isProcessing) && styles.buttonDisabled,
              ]}
              onPress={toggleRecognitionHandler}
              disabled={!isConnected || isProcessing}
            >
              <Ionicons 
                name={isRunning ? "stop-circle" : "play-circle"} 
                size={24} 
                color={Colors.white} 
              />
              <Text style={styles.mainButtonText}>
                {isRunning ? t('stop') : t('start')}
              </Text>
            </TouchableOpacity>
            
            {/* ТЕСТ БАТЫРМАЛАРЫ (DEBUG үшін) */}
            {__DEV__ && (
              <View style={styles.testButtons}>
                <TouchableOpacity
                  style={[styles.testSmallButton, { backgroundColor: Colors.secondary }]}
                  onPress={testCapture}
                  disabled={!isRunning}
                >
                  <Ionicons name="camera" size={20} color={Colors.white} />
                  <Text style={styles.testButtonText}>{t('frame')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.testSmallButton, { backgroundColor: Colors.info }]}
                  onPress={testConnection}
                >
                  <Ionicons name="wifi" size={20} color={Colors.white} />
                  <Text style={styles.testButtonText}>{t('test')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Recognition Results Card */}
        <View style={styles.resultsCard}>
          <Text style={styles.resultsCardTitle}>{t('recognitionResult')}</Text>
          
          {/* Current Prediction */}
          <View style={styles.currentPrediction}>
            <Text style={styles.currentPredictionLabel}>{t('currentWord')}</Text>
            <View style={[
              styles.currentPredictionBox,
              currentPrediction === t('collecting') && styles.waitingBox,
              currentPrediction === t('stopped') && styles.stoppedBox,
              currentPrediction?.startsWith('❗') && styles.warningBox,
              currentPrediction?.startsWith('✋') && styles.warningBox,
            ]}>
              <Text style={[
                styles.currentPredictionText,
                currentPrediction === t('collecting') && styles.waitingText,
                currentPrediction === t('stopped') && styles.stoppedText,
                currentPrediction?.startsWith('❗') && styles.warningText,
                currentPrediction?.startsWith('✋') && styles.warningText,
              ]}>
                {currentPrediction}
              </Text>
            </View>
          </View>
          
          {/* Top 3 Predictions */}
          <View style={styles.top3Container}>
            <Text style={styles.top3Title}>{t('top3')}</Text>
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
            <Text style={styles.historyTitle}>{t('history')}</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Ionicons name="trash-outline" size={20} color={Colors.gray500} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.historyContent}>
            {history.length > 0 ? (
              <Text style={styles.historyText}>{history.join(' → ')}</Text>
            ) : (
              <Text style={styles.historyPlaceholder}>{t('noWords')}</Text>
            )}
          </View>
        </View>

        {/* Instructions Card */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>{t('instructions')}</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>{t('instruction1')}</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="sunny-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>{t('instruction2')}</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="hand-left-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>{t('instruction3')}</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>{t('instruction4')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ==================== СТИЛЬДЕР - TYNDAU DESIGN ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
    flex: 1,
    letterSpacing: 0.5,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  cameraCardHeader: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraCardTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  fpsText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: Typography.fontWeights.medium,
  },
  bufferContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  bufferText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: Typography.fontWeights.medium,
  },
  testButton: {
    padding: 6,
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.full,
  },
  cameraContainer: {
    height: CAMERA_HEIGHT,
    backgroundColor: Colors.gray800,
    position: 'relative',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  processingIndicator: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  detectionStatus: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  detectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  detectionText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xs,
    marginRight: 4,
  },
  controlButtons: {
    padding: Spacing.md,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  startButton: {
    backgroundColor: Colors.secondary,
  },
  stopButton: {
    backgroundColor: Colors.accent,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  mainButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  testSmallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  testButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  resultsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
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
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  waitingBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  stoppedBox: {
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    borderColor: 'rgba(108, 117, 125, 0.2)',
  },
  warningBox: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    borderColor: 'rgba(220, 53, 69, 0.2)',
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
  warningText: {
    color: Colors.error,
    fontSize: Typography.fontSizes.md,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: 120,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
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
