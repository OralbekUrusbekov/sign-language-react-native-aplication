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
  const { appLanguage } = useSettings();
  const { t } = useSignTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isRunning, setIsRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<string>('Ready');
  const [top3Predictions, setTop3Predictions] = useState<Prediction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fps, setFps] = useState(0);
  const [landmarks, setLandmarks] = useState<any>(null);
  const [bufferStatus, setBufferStatus] = useState<{ frames: number; needed: number } | null>(null);
  const [landmarksDetected, setLandmarksDetected] = useState({ pose: false, hands: false });
  const cameraRef = useRef<any>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsTimerRef = useRef<number>(Date.now());
  const lastPredictionRef = useRef<string>('');
  const isRunningRef = useRef(false);
  const isProcessingRef = useRef(false);

  const poseConnections = [
    [11, 12], 
    [11, 13], [13, 15], 
    [12, 14], [14, 16], 
    [11, 23], [12, 24], 
    [23, 24], 
    [23, 25], [25, 27], 
    [24, 26], [26, 28], 
  ];

  const handConnections = [
    [0,1],[1,2],[2,3],[3,4], 
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12], 
    [0,13],[13,14],[14,15],[15,16], 
    [0,17],[17,18],[18,19],[19,20] 
  ];
  
  const checkConnection = useCallback(async () => {
    log('🌐 Checking server connection...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logWarn('⏱️ Connection timeout');
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
        logSuccess('✅ Connected to server', data);
        setIsConnected(true);
        setConnectionError(null);
      } else {
        logError('❌ Server error:', response.status);
        throw new Error('Server error');
      }
    } catch (error) {
      logError('❌ Cannot connect to server:', error);
      setIsConnected(false);
      setConnectionError('Cannot connect to server. Check IP address.');
    }
  }, []);

  useEffect(() => {
    log('🔄 Initial connection check');
    checkConnection();
    const connectionInterval = setInterval(() => {
      log('🔄 Rechecking server connection');
      checkConnection();
    }, 10000);
    
    return () => {
      log('🧹 Cleaning up');
      clearInterval(connectionInterval);
      stopFrameCapture();
    };
  }, [checkConnection]);

  // ==================== CAPTURE AND SEND FRAME ====================
  const captureAndSendFrame = useCallback(async () => {
    if (!cameraRef.current) {
      logWarn('⚠️ Camera ref is null');
      return;
    }
    if (!isRunningRef.current) {
      logWarn('⚠️ Not running');
      return;
    }
    if (isProcessingRef.current) {
      logWarn('⚠️ Already processing');
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      // Take photo with HIGH QUALITY for better landmark detection
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,  // High quality for better hand detection
        base64: false,
        skipProcessing: false,
        shutterSound: false,
        imageType: 'jpg',
        exif: false,
        scale: 1.0,
      });

      if (!photo?.uri) {
        logWarn('⚠️ No photo URI');
        return;
      }

      log(`📸 Sending frame at ${new Date().toISOString().slice(11, 23)}`);
      
      const startTime = Date.now();
      
      // Create form data
      const formData = new FormData();
      formData.append('frame', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `frame_${Date.now()}.jpg`,
      } as any);
      
      const response = await fetch(API_ENDPOINTS.PREDICT_FRAME, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Let fetch set Content-Type automatically for FormData
        },
      });
      
      const latency = Date.now() - startTime;
      log(`📊 Response time: ${latency}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        logError('❌ HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('📥 Response data:', data.status, data.current_prediction);

      if (!isRunningRef.current) return;

      // Update buffer status
      if (data.buffer_status) {
        setBufferStatus({
          frames: data.buffer_status.frames || 0,
          needed: data.buffer_status.needed || 15
        });
        log(`📊 Buffer: ${data.buffer_status.frames}/${data.buffer_status.needed || 15}`);
      }

      // Update landmark detection status
      if (data.landmarks_detected) {
        setLandmarksDetected(data.landmarks_detected);
        
        // Debug hand detection
        if (data.landmarks) {
          const hand0Count = data.landmarks.hand_0?.filter((p: any) => p.x !== 0 || p.y !== 0 || p.z !== 0).length || 0;
          const hand1Count = data.landmarks.hand_1?.filter((p: any) => p.x !== 0 || p.y !== 0 || p.z !== 0).length || 0;
          log(`🖐️ Hand 0: ${hand0Count}/21 points, Hand 1: ${hand1Count}/21 points`);
        }
      }

      if (data.status === 'success' && data.current_prediction) {
        setCurrentPrediction(data.current_prediction);
        setTop3Predictions(data.top3 || []);
        setLandmarks(data.landmarks ?? null);
        
        // Add to history (avoid duplicates)
        if (data.current_prediction !== lastPredictionRef.current) {
          setHistory(prev => [data.current_prediction!, ...prev.slice(0, 9)]);
          lastPredictionRef.current = data.current_prediction;
        }
        
        // Calculate FPS
        const now = Date.now();
        const elapsed = now - fpsTimerRef.current;
        const currentFps = Math.round(1000 / elapsed);
        setFps(Math.min(currentFps, 30));
        fpsTimerRef.current = now;
        
      } else if (data.status === 'waiting') {
        setCurrentPrediction(data.message || 'Collecting frames...');
        setLandmarks(data.landmarks ?? null);
        
        // Show specific messages if landmarks not detected
        if (data.landmarks_detected && !data.landmarks_detected.pose) {
          setCurrentPrediction('❗ No pose detected');
        } else if (data.landmarks_detected && !data.landmarks_detected.hands) {
          setCurrentPrediction('✋ No hands detected');
        }
      } else if (data.status === 'error') {
        logError('❌ Prediction error:', data.message);
        setCurrentPrediction('Error');
      }

    } catch (e: any) {
      logError('❌ FRAME ERROR:', e.message);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  // ==================== FRAME CAPTURE LOOP ====================
  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    log('🚀 Starting frame capture (15 FPS, 66ms interval)');
    
    // 66ms = ~15 FPS
    frameIntervalRef.current = setInterval(() => {
      if (isRunningRef.current && !isProcessingRef.current) {
        captureAndSendFrame();
      }
    }, 66);
  }, [captureAndSendFrame]);

  const stopFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    isProcessingRef.current = false;
    setIsProcessing(false);
    setCurrentPrediction('Stopped');
    setBufferStatus(null);
    setLandmarksDetected({ pose: false, hands: false });
    setLandmarks(null);
    log('🛑 Frame capture stopped');
  }, []);

  // ==================== TOGGLE RECOGNITION ====================
  const toggleRecognitionHandler = async () => {
    log('🎮 Toggle recognition called');
    
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server');
      return;
    }
    
    try {
      const action = isRunning ? 'stop' : 'start';
      log(`▶️ Action: ${action}`);
      
      const result = await toggleRecognition(action);
      
      if (result.success) {
        if (action === 'start') {
          setIsRunning(true);
          isRunningRef.current = true;  
          startFrameCapture();
          setCurrentPrediction('Collecting frames...');
          setBufferStatus(null);
          logSuccess('✅ Started');
        } else {
          stopFrameCapture();
          setIsRunning(false);
          isRunningRef.current = false; 
          logSuccess('✅ Stopped');
        }
      } else {
        Alert.alert('Error', result.message || 'Action failed');
      }
    } catch (error) {
      logError('❌ Error:', error);
      Alert.alert('Error', 'Server communication error');
    }
  };

  // ==================== TEST FUNCTIONS ====================
  const testCapture = async () => {
    log('🧪 TEST: Manual capture');
    Alert.alert('Test', 'Sending frame...');
    await captureAndSendFrame();
  };

  const testConnection = async () => {
    log('🧪 TEST: Checking server');
    await checkConnection();
  };

  // ==================== TOGGLE CAMERA ====================
  const toggleCameraFacing = () => {
    log('🔄 Toggle camera:', facing === 'back' ? 'front' : 'back');
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // ==================== CLEAR HISTORY ====================
  const clearHistory = () => {
    log('🗑️ History cleared');
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

  // ==================== RENDER LANDMARKS ====================
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
          // Check if points have valid coordinates
          if (p1.x === 0 && p1.y === 0 && p2.x === 0 && p2.y === 0) return null;
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
          if (point.x === 0 && point.y === 0) return null;
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

        {/* Hand 0 lines */}
        {handConnections.map(([start, end], index) => {
          const p1 = landmarks?.hand_0?.[start];
          const p2 = landmarks?.hand_0?.[end];
          if (!p1 || !p2) return null;
          if (p1.x === 0 && p1.y === 0 && p2.x === 0 && p2.y === 0) return null;
          return (
            <Line
              key={`hand0-line-${index}`}
              x1={xOffset + (1 - p1.x) * cameraActualWidth}
              y1={p1.y * CAMERA_HEIGHT}
              x2={xOffset + (1 - p2.x) * cameraActualWidth}
              y2={p2.y * CAMERA_HEIGHT}
              stroke={hand0IsLeft ? '#FFD700' : '#00CED1'}
              strokeWidth="2.5"
            />
          );
        })}

        {/* Hand 0 points */}
        {landmarks?.hand_0?.map((point: any, index: number) => {
          if (point.x === 0 && point.y === 0) return null;
          // Highlight wrist (index 0)
          if (index === 0) {
            return (
              <Circle
                key={`hand0-wrist-${index}`}
                cx={xOffset + (1 - point.x) * cameraActualWidth}
                cy={point.y * CAMERA_HEIGHT}
                r="6"
                fill={hand0IsLeft ? '#FFD700' : '#00CED1'}
                stroke="white"
                strokeWidth="2"
              />
            );
          }
          return (
            <Circle
              key={`hand0-point-${index}`}
              cx={xOffset + (1 - point.x) * cameraActualWidth}
              cy={point.y * CAMERA_HEIGHT}
              r="3"
              fill={hand0IsLeft ? '#FFD700' : '#00CED1'}
            />
          );
        })}

        {/* Hand 1 lines */}
        {handConnections.map(([start, end], index) => {
          const p1 = landmarks?.hand_1?.[start];
          const p2 = landmarks?.hand_1?.[end];
          if (!p1 || !p2) return null;
          if (p1.x === 0 && p1.y === 0 && p2.x === 0 && p2.y === 0) return null;
          return (
            <Line
              key={`hand1-line-${index}`}
              x1={xOffset + (1 - p1.x) * cameraActualWidth}
              y1={p1.y * CAMERA_HEIGHT}
              x2={xOffset + (1 - p2.x) * cameraActualWidth}
              y2={p2.y * CAMERA_HEIGHT}
              stroke={hand0IsLeft ? '#00CED1' : '#FFD700'}
              strokeWidth="2.5"
            />
          );
        })}

        {/* Hand 1 points */}
        {landmarks?.hand_1?.map((point: any, index: number) => {
          if (point.x === 0 && point.y === 0) return null;
          if (index === 0) {
            return (
              <Circle
                key={`hand1-wrist-${index}`}
                cx={xOffset + (1 - point.x) * cameraActualWidth}
                cy={point.y * CAMERA_HEIGHT}
                r="6"
                fill={hand0IsLeft ? '#00CED1' : '#FFD700'}
                stroke="white"
                strokeWidth="2"
              />
            );
          }
          return (
            <Circle
              key={`hand1-point-${index}`}
              cx={xOffset + (1 - point.x) * cameraActualWidth}
              cy={point.y * CAMERA_HEIGHT}
              r="3"
              fill={hand0IsLeft ? '#00CED1' : '#FFD700'}
            />
          );
        })}
      </Svg>
    );
  };

  // ==================== RENDER ====================
  log('🎨 Render:', { isConnected, isRunning, isProcessing, currentPrediction });
  
  if (!permission) {
    log('⏳ Waiting for camera permission...');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    logWarn('⚠️ Camera permission not granted');
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

            {/* Flip camera button */}
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Ionicons 
                name="camera-reverse-outline" 
                size={24} 
                color={Colors.white} 
              />
            </TouchableOpacity>

            {/* Processing indicator */}
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
                <Text style={styles.detectionText}>Pose</Text>
                <View style={[
                  styles.detectionDot,
                  { backgroundColor: landmarksDetected.hands ? Colors.success : Colors.gray500, marginLeft: 8 }
                ]} />
                <Text style={styles.detectionText}>Hands</Text>
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
            
            {/* Test buttons for debugging */}
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
              currentPrediction === 'Collecting frames...' && styles.waitingBox,
              currentPrediction === 'Stopped' && styles.stoppedBox,
              currentPrediction?.startsWith('❗') && styles.warningBox,
              currentPrediction?.startsWith('✋') && styles.warningBox,
            ]}>
              <Text style={[
                styles.currentPredictionText,
                currentPrediction === 'Collecting frames...' && styles.waitingText,
                currentPrediction === 'Stopped' && styles.stoppedText,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    color: Colors.white,
  },
  errorBanner: {
    backgroundColor: Colors.error,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.white,
    fontSize: 12,
    flex: 1,
  },
  retryButton: {
    backgroundColor: Colors.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  permissionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    ...Shadows.lg,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  cameraCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  cameraCardHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cameraCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fpsText: {
    fontSize: 11,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  bufferContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bufferText: {
    fontSize: 11,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  testButton: {
    padding: 6,
    backgroundColor: Colors.primary + '20',
    borderRadius: 20,
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
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  detectionStatus: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  detectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  detectionText: {
    color: Colors.white,
    fontSize: 10,
    marginRight: 4,
  },
  controlButtons: {
    padding: 16,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
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
    fontSize: 16,
    fontWeight: '600',
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    gap: 12,
  },
  testSmallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  testButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  resultsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  resultsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  currentPrediction: {
    marginBottom: 20,
  },
  currentPredictionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  currentPredictionBox: {
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.2)',
    borderRadius: 12,
    padding: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  waitingText: {
    color: Colors.warning,
    fontSize: 16,
  },
  stoppedText: {
    color: Colors.gray500,
    fontSize: 16,
  },
  warningText: {
    color: Colors.error,
    fontSize: 14,
  },
  top3Container: {
    marginTop: 8,
  },
  top3Title: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  predictionItem: {
    marginBottom: 12,
  },
  predictionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  predictionRank: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  confidenceBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  confidenceText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  historyCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyContent: {
    minHeight: 40,
    justifyContent: 'center',
  },
  historyText: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  historyPlaceholder: {
    fontSize: 14,
    color: Colors.gray400,
    fontStyle: 'italic',
  },
  instructionsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 120,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
});