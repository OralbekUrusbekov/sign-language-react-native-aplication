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
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { 
  API_ENDPOINTS, 
  FRAME_CAPTURE_INTERVAL 
} from '@/config/api';
import Svg, { Circle, Line } from 'react-native-svg';
import { predictFrame, getRecognitionStatus, toggleRecognition, PredictionResponse } from '@/services/api';

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
  
  const cameraRef = useRef<any>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsTimerRef = useRef<number>(Date.now());
  const lastPredictionRef = useRef<string>('');

  const isRunningRef = useRef(false);

  const isProcessingRef = useRef(false);


  const poseConnections = [
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 12],
];

const handConnections = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20]
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

  // ==================== КАДРЛАРДЫ ЖІБЕРУ ====================




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
          isRunningRef.current = true;  // <-- REF-ті жаңарту
          startFrameCapture();
          setCurrentPrediction(result.message || 'Кадрлар жиналуда...');
          logSuccess('✅ Басталды, isRunning = true');
        } else {
          stopFrameCapture();
          setIsRunning(false);
          isRunningRef.current = false; // <-- REF-ті жаңарту
          logSuccess('✅ Тоқтатылды, isRunning = false');
        }
      }
    } catch (error) {
      logError('❌ Қате:', error);
    }
  };

const captureAndSendFrame = useCallback(async () => {
if (!cameraRef.current) return;
if (!isRunningRef.current) return;
if (isProcessingRef.current) return;

isProcessingRef.current = true;
setIsProcessing(true);

try {
const photo = await cameraRef.current.takePictureAsync({
quality: 0.03,
base64: false,
skipProcessing: true,
shutterSound: false,
});


if (!photo?.uri) {
  return;
}

const data = await predictFrame(photo.uri);

if (!isRunningRef.current) return;

if (data.status === 'success' && data.current_prediction) {
  setCurrentPrediction(data.current_prediction);
  setTop3Predictions(data.top3 || []);
  setLandmarks(data.landmarks ?? null);

} else if (data.status === 'waiting') {
  setCurrentPrediction(data.message || 'Кадрлар жиналуда...');
  setLandmarks(data.landmarks ?? null);
}


} catch (e) {
console.log('FRAME ERROR:', e);
} finally {
isProcessingRef.current = false;
setIsProcessing(false);
}
}, []);


const startFrameCapture = useCallback(() => {
  if (frameIntervalRef.current) {
    clearTimeout(frameIntervalRef.current);
  }

  const runLoop = async () => {
    if (!isRunningRef.current) return;

    try {
      await captureAndSendFrame();
    } catch (err) {
      console.log("FRAME LOOP ERROR:", err);
    }

    if (isRunningRef.current) {
      frameIntervalRef.current = setTimeout(() => {
        runLoop();
      }, 80);
    }
  };

  runLoop();
}, [captureAndSendFrame]);

  const stopFrameCapture = useCallback(() => {
  if (frameIntervalRef.current) {
    clearTimeout(frameIntervalRef.current);
    frameIntervalRef.current = null;
  }

  isProcessingRef.current = false;
  setIsProcessing(false);
  setCurrentPrediction('Тоқтатылды');
}, []);


  // ==================== ТЕСТ ФУНКЦИЯСЫ ====================
  
  const testCapture = async () => {
    log('🧪 ТЕСТ: captureAndSendFrame тікелей шақыру');
    Alert.alert('Тест', 'Функция шақырылды');
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

  // ==================== РЕНДЕР ====================
  
  log('🎨 Рендер:', { isConnected, isRunning, isProcessing, currentPrediction });
  const hand0IsLeft = landmarks?.hand_labels?.[0] === 'Left';
  
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
          <Text style={styles.permissionTitle}>Камера қажет</Text>
          <Text style={styles.permissionText}>
            Им тілін тану үшін камера рұқсатын беріңіз
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Рұқсат беру</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Им тілін тану</Text>
        <View style={styles.connectionStatus}>
          <View style={[
            styles.connectionDot,
            { backgroundColor: isConnected ? Colors.success : Colors.error }
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Қосылды' : 'Қосылмады'}
          </Text>
        </View>
      </View>

      {/* Connection Error */}
      {connectionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{connectionError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={checkConnection}>
            <Text style={styles.retryButtonText}>Қайталау</Text>
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
            <Text style={styles.cameraCardTitle}>Тікелей эфир</Text>
            <View style={styles.headerButtons}>
              {isRunning && (
                <View style={styles.fpsContainer}>
                  <Ionicons name="speedometer-outline" size={16} color={Colors.primary} />
                  <Text style={styles.fpsText}>{fps} FPS</Text>
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

  <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
    {[11,12,13,14,15,16].map((index) => {
      const point = landmarks?.pose?.[index];
      if (!point) return null;

      return (
        <Circle
          key={`pose-${index}`}
          cx={xOffset + (1 - point.x) * cameraActualWidth}
          cy={point.y * CAMERA_HEIGHT}
          r="5"
          fill="red"
        />
      );
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
          stroke={hand0IsLeft ? 'yellow' : 'cyan'}
          strokeWidth="2"
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
        fill={hand0IsLeft ? 'yellow' : 'cyan'}
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
      y1={p1.y * CAMERA_HEIGHT}
      x2={xOffset + (1 - p2.x) * cameraActualWidth}
      y2={p2.y * CAMERA_HEIGHT}
      stroke={hand0IsLeft ? 'cyan' : 'yellow'}
      strokeWidth="2"
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
        fill={hand0IsLeft ? 'cyan' : 'yellow'}
      />
    ))}

  </Svg>
</View>
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
                {isRunning ? 'Тоқтату' : 'Бастау'}
              </Text>
            </TouchableOpacity>
            
            {/* ТЕСТ БАТЫРМАЛАРЫ */}
            <View style={styles.testButtons}>
              <TouchableOpacity
                style={[styles.testSmallButton, { backgroundColor: Colors.secondary }]}
                onPress={testCapture}
                disabled={!isRunning}
              >
                <Ionicons name="camera" size={20} color={Colors.white} />
                <Text style={styles.testButtonText}>Кадр</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.testSmallButton, { backgroundColor: Colors.info }]}
                onPress={testConnection}
              >
                <Ionicons name="wifi" size={20} color={Colors.white} />
                <Text style={styles.testButtonText}>Тест</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recognition Results Card */}
        <View style={styles.resultsCard}>
          <Text style={styles.resultsCardTitle}>Тану нәтижесі</Text>
          
          {/* Current Prediction */}
          <View style={styles.currentPrediction}>
            <Text style={styles.currentPredictionLabel}>Ағымдағы сөз</Text>
            <View style={[
              styles.currentPredictionBox,
              currentPrediction === 'Кадрлар жиналуда...' && styles.waitingBox,
              currentPrediction === 'Тоқтатылды' && styles.stoppedBox,
            ]}>
              <Text style={[
                styles.currentPredictionText,
                currentPrediction === 'Кадрлар жиналуда...' && styles.waitingText,
                currentPrediction === 'Тоқтатылды' && styles.stoppedText,
              ]}>
                {currentPrediction}
              </Text>
            </View>
          </View>
          
          {/* Top 3 Predictions */}
          <View style={styles.top3Container}>
            <Text style={styles.top3Title}>Үздік 3 болжам</Text>
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
            <Text style={styles.historyTitle}>Тану тарихы</Text>
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
                Әлі ешқандай сөз танылмады
              </Text>
            )}
          </View>
        </View>

        {/* Instructions Card */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Нұсқаулық</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>Камера алдына тұрыңыз</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="sunny-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>Жарық жақсы түсуі керек</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="hand-left-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>Қолдарыңыз көрініп тұруы керек</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.instructionText}>~2.5 секунд видео қажет</Text>
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
  processingIndicator: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
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
    backgroundColor: Colors.success,
  },
  stopButton: {
    backgroundColor: Colors.error,
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
  stoppedBox: {
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    borderColor: 'rgba(108, 117, 125, 0.2)',
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