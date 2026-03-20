export const API_BASE_URL = 'http://10.123.151.250:8000';
export const AI_MODEL_URL = 'http://10.123.151.250:5001';

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  API_STATUS: `${API_BASE_URL}/api/status`,

  WORDS: `${API_BASE_URL}/api/words`,
  WORDS_GROUPED: `${API_BASE_URL}/api/words/grouped`,
  WORDS_CATEGORIES: `${API_BASE_URL}/api/words/categories`,
  FAVORITES: `${API_BASE_URL}/api/words/favorites`,

  BOOKS: `${API_BASE_URL}/api/books`,
  BOOKS_CATEGORIES: `${API_BASE_URL}/api/books/categories`,
  BOOKS_POPULAR: `${API_BASE_URL}/api/books/popular`,
  BOOKS_DOWNLOADS: `${API_BASE_URL}/api/books/downloads`,

  TEXT_TO_SPEECH: `${API_BASE_URL}/api/speech/text-to-speech`,
  SPEECH_TO_TEXT: `${API_BASE_URL}/api/speech/speech-to-text`,
  SPEECH_AUDIO: `${API_BASE_URL}/api/speech/audio`,
  SPEECH_HISTORY: `${API_BASE_URL}/api/speech/history`,
  QUICK_PHRASES: `${API_BASE_URL}/api/speech/quick-phrases`,

  SETTINGS: `${API_BASE_URL}/api/settings`,

  VIDEO_FEED: `${AI_MODEL_URL}/video_feed`,
  TOGGLE_RECOGNITION: `${AI_MODEL_URL}/toggle_recognition`,
  CURRENT_PREDICTIONS: `${AI_MODEL_URL}/current_predictions`,
  RECOGNITION_STATUS: `${AI_MODEL_URL}/recognition_status`,
  SAVE_VIDEO: `${AI_MODEL_URL}/save_video`,
  PROCESS_VIDEO: `${AI_MODEL_URL}/process_video`,
  DELETE_VIDEO: `${AI_MODEL_URL}/delete_video`,
  TASK_STATUS: `${AI_MODEL_URL}/task_status`,
  IMPORT: `${AI_MODEL_URL}/import`,
  GALLERY: `${AI_MODEL_URL}/gallery`,
  EDIT_VIDEO: `${AI_MODEL_URL}/edit_video`,
  PREDICT_FRAME: `${AI_MODEL_URL}/predict_frame`,
  RECOGNITION_PREDICT: `${AI_MODEL_URL}/predict_frame`,
};

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export const PREDICTION_INTERVAL = 500;
export const FRAME_CAPTURE_INTERVAL = 66;
export const API_TIMEOUT = 30000;

export let DEVICE_ID = '';

export const setDeviceId = (id: string) => {
  DEVICE_ID = id;
};