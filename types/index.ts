// ==========================================
// Sign Language Recognition Types
// ==========================================

// Legacy Prediction Response
export interface PredictionResponse {
  predicted_word: string;
  confidence: number;
  timestamp: string;
}

// Real-time Recognition Types
export interface Prediction {
  label: string;
  confidence: number;
}

export interface PredictionsResponse {
  status: 'success' | 'waiting' | 'error';
  current_prediction?: string;
  top3?: Prediction[];
  message?: string;
}

export interface RecognitionStatusResponse {
  is_running: boolean;
}

export interface ToggleResponse {
  success: boolean;
  message?: string;
}

// ==========================================
// Video Recording Types
// ==========================================

export interface SaveVideoResponse {
  status: 'success' | 'error';
  video_id?: string;
  path?: string;
  message?: string;
}

export interface ProcessVideoResponse {
  status: 'success' | 'error';
  task_id?: string;
  message?: string;
}

export interface TaskStatusResponse {
  state: 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';
  current: number;
  total: number;
}

export interface Video {
  id: string;
  url: string;
  label: string;
  filename: string;
}

export interface GalleryResponse {
  videos: Video[];
}

export interface EditVideoParams {
  video_id: string;
  label: string;
  start_time: number;
  end_time: number;
  mirror: boolean;
}

// ==========================================
// Text-to-Speech Types
// ==========================================

export interface WordItem {
  id: string;
  word: string;
  category: string;
  audioUrl?: string;
  icon?: string | null;  // null мәнін қабылдау үшін
  textRu?: string | null;
  textEn?: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
  count?: number;  // count өрісін қосу (міндетті емес)
}

// ==========================================
// PDF Book Types
// ==========================================

export interface BookItem {
  id: string;
  title: string;
  author: string;
  description: string;
  pdfUrl: string;
  coverUrl?: string;
  coverImage?: string;
  category: string;
  pages: number;
  fileSize?: string;
  isDownloaded?: boolean;
  localPath?: string;
  lastPage?: number;
  downloadCount?: number;
}

export interface BookCategory {
  id: string;
  name: string;
  icon: string;
  count?: number;
}

// ==========================================
// Speech Recognition Types
// ==========================================

export interface SpeechResult {
  text: string;
  confidence: number;
  timestamp: Date;
  isFinal: boolean;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  words?: { word: string; start: number; end: number }[];
}

// ==========================================
// User Settings Types
// ==========================================

export interface UserSettings {
  id?: number;
  device_id?: string;
  language: 'kk' | 'kz' | 'ru' | 'en';  // 'kk' және 'kz' екеуін де қабылдайды
  speech_rate: number;  // speechRate емес, speech_rate
  speech_pitch: number;
  speech_voice?: string;
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;  // notifications емес
  auto_speak: boolean;  // autoSpeak емес
  camera_quality: 'low' | 'medium' | 'high';
}

// ==========================================
// Navigation Types
// ==========================================

export type RootTabParamList = {
  index: undefined;
  'text-to-speech': undefined;
  'speech-to-text': undefined;
  'library': undefined;
  'settings': undefined;
};

// ==========================================
// API Error Types
// ==========================================

export interface ApiError {
  status: 'error';
  message: string;
  code?: string;
}

export type ApiResponse<T> = T | ApiError;

// ==========================================
// Component Props Types
// ==========================================

export interface ProgressBarProps {
  progress: number;
  label?: string;
  color?: string;
}

export interface AlertProps {
  type: 'success' | 'warning' | 'danger' | 'info';
  message: string;
  onClose?: () => void;
}

export interface VideoCardProps {
  video: Video;
  onDelete: (id: string) => void;
  onEdit: (video: Video) => void;
  onDownload: (url: string, filename: string) => void;
}

export interface WordButtonProps {
  word: WordItem;
  onPress: (word: WordItem) => void;
  isSelected?: boolean;
}

export interface BookCardProps {
  book: BookItem;
  onPress: (book: BookItem) => void;
  onDownload: (book: BookItem) => void;
}