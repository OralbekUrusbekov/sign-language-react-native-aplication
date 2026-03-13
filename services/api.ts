import { AI_MODEL_URL, API_BASE_URL, API_ENDPOINTS, DEFAULT_HEADERS, DEVICE_ID } from '@/config/api';
import { 
  WordItem, 
  BookItem, 
  Category, 
  UserSettings,
  SpeechResult,
  BookCategory
} from '@/types';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';







// ==========================================
// Error Handling Helper
// ==========================================

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  return response.json();
};

// ==========================================
// Health Check
// ==========================================

export const checkHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(API_ENDPOINTS.HEALTH, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('Health check failed:', error);
    return false;
  }
};



// ==========================================
// Camera Management API
// ==========================================

export interface CameraInfo {
  id: number;
  status: 'working' | 'no_frame' | 'not_available';
  frame_size?: number[];
}

export interface CamerasResponse {
  status: string;
  cameras: CameraInfo[];
  current_camera: number;
}

export interface SetCameraResponse {
  status: string;
  cam_id: number;
  message: string;
}

// Барлық камераларды алу
export const getAvailableCameras = async (): Promise<CamerasResponse> => {
  const response = await fetch(`${AI_MODEL_URL}/cameras`, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Камераны өзгерту
export const setCamera = async (camId: number): Promise<SetCameraResponse> => {
  const response = await fetch(`${AI_MODEL_URL}/camera/set`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ cam_id: camId }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Бір камераны тексеру
export const testCamera = async (camId: number): Promise<any> => {
  const response = await fetch(`${AI_MODEL_URL}/camera/test/${camId}`, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};



// ==========================================
// Recognition API - Flask AI Model
// ==========================================
// ==========================================
// Recognition API - Flask AI Model
// ==========================================

export interface Prediction {
  label: string;
  confidence: number;
}

export interface PredictionResponse {
  status: 'success' | 'waiting' | 'error';
  current_prediction?: string;
  top3?: Prediction[];
  message?: string;
  landmarks?: {
    pose: {
      x: number;
      y: number;
      z: number;
      visibility?: number;
    }[];
    hand_0: {
      x: number;
      y: number;
      z: number;
      visibility?: number;
    }[];
    hand_1: {
      x: number;
      y: number;
      z: number;
      visibility?: number;
    }[];
  };
}

export interface RecognitionStatusResponse {
  is_running: boolean;
}

export interface ToggleResponse {
  success: boolean;
  message?: string;
}

// Recognition статусын алу
export const getRecognitionStatus = async (): Promise<RecognitionStatusResponse> => {
  const response = await fetch(API_ENDPOINTS.RECOGNITION_STATUS, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Тануды бастау/тоқтату
export const toggleRecognition = async (action: 'start' | 'stop'): Promise<ToggleResponse> => {
  const response = await fetch(API_ENDPOINTS.TOGGLE_RECOGNITION, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ action }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// // === ЖАҢА: Бір кадрды жіберу және болжам алу ===
// export const predictFrame = async (frameUri: string): Promise<PredictionResponse> => {
//   const formData = new FormData();
  
//   // Файлды дайындау
//   const filename = frameUri.split('/').pop() || 'frame.jpg';
  
//   // Android үшін URI түзету
//   const normalizedUri = Platform.OS === 'android' 
//     ? frameUri 
//     : frameUri.replace('file://', '');
  
//   formData.append('frame', {
//     uri: normalizedUri,
//     type: 'image/jpeg',
//     name: filename,
//   } as any);
  
//   // Уақыт шектеуі
//   const controller = new AbortController();
//   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд
  
//   try {
//     const response = await fetch(API_ENDPOINTS.PREDICT_FRAME, {
//       method: 'POST',
//       body: formData,
//       signal: controller.signal,
//       headers: {
//         'Accept': 'application/json',
//         // Content-Type автоматты түрде FormData орнатады
//       },
//     });
    
//     clearTimeout(timeoutId);
    
//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
//     }
    
//     return response.json();
//   } catch (error) {
//     clearTimeout(timeoutId);
//     throw error;
//   }
// };

// ==========================================
// Recognition API - Flask AI Model
// ==========================================

export const predictFrame = async (frameUri: string): Promise<PredictionResponse> => {
  // ==================== ЛОГТАР ====================
  const logAPIDebug = (message: string, data?: any) => {
    console.log('🟣 [API DEBUG]', message, data ? data : '');
  };
  
  const logAPISuccess = (message: string, data?: any) => {
    console.log('🟢 [API SUCCESS]', message, data ? data : '');
  };
  
  const logAPIError = (message: string, error?: any) => {
    console.log('🔴 [API ERROR]', message, error ? error : '');
  };
  
  const logAPIWarn = (message: string, data?: any) => {
    console.log('🟡 [API WARN]', message, data ? data : '');
  };

  // ==================== БАСТАЛУЫ ====================
  logAPIDebug('🚀 predictFrame шақырылды', {
    frameUri,
    platform: Platform.OS,
    endpoint: API_ENDPOINTS.PREDICT_FRAME
  });

  // ==================== FORMData ДАЙЫНДАУ ====================
  try {
    const formData = new FormData();
    
    // Файл атын алу
    const filename = frameUri.split('/').pop() || 'frame.jpg';
    logAPIDebug('📁 Файл аты:', filename);
    
    // URI түзету (платформаға байланысты)
    const normalizedUri = Platform.OS === 'android' 
      ? frameUri 
      : frameUri.replace('file://', '');
    
    logAPIDebug('📁 Нормалданған URI:', {
      original: frameUri,
      normalized: normalizedUri,
      platform: Platform.OS
    });

    // Файлдың бар-жоғын тексеру (тек Android емес жағдайда)
    if (Platform.OS !== 'android') {
      try {
        const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
        logAPIDebug('📁 Файл ақпараты:', {
          exists: fileInfo.exists,
          size: fileInfo.exists ? fileInfo.size : 'N/A',
          uri: fileInfo.uri
        });
        
        if (!fileInfo.exists) {
          logAPIError('❌ Файл табылмады!');
        }
      } catch (fsError) {
        logAPIWarn('⚠️ Файл ақпаратын алу мүмкін емес:', fsError);
      }
    }

    // FormData құру
    formData.append('frame', {
      uri: normalizedUri,
      type: 'image/jpeg',
      name: filename,
    } as any);
    
    logAPISuccess('✅ FormData дайын');

    // FormData мазмұнын тексеру (мүмкін болса)
    logAPIDebug('📦 FormData мазмұны:', {
      hasFrame: formData.has('frame'),
      // @ts-ignore - тек тексеру үшін
      frameValue: formData._parts?.find(p => p[0] === 'frame')?.[1]
    });

    // ==================== FETCH СҰРАУЫ ====================
    logAPIDebug('📡 Серверге сұрау жіберілуде:', {
      url: API_ENDPOINTS.PREDICT_FRAME,
      method: 'POST',
      timeout: 10000
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logAPIError('⏱️ Request timeout (10 секунд)');
      controller.abort();
    }, 10000);

    const startTime = Date.now();
    
    const response = await fetch(API_ENDPOINTS.PREDICT_FRAME, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        // Content-Type автоматты түрде FormData орнатады
      },
    });

    const endTime = Date.now();
    clearTimeout(timeoutId);

    logAPISuccess('📥 Жауап алынды:', {
      status: response.status,
      statusText: response.statusText,
      time: `${endTime - startTime}ms`,
      headers: Object.fromEntries(response.headers.entries())
    });

    // ==================== ЖАУАПТЫ ӨҢДЕУ ====================
    if (!response.ok) {
      const errorText = await response.text();
      logAPIError('❌ HTTP қатесі:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 500) // Ұзын болса кесеміз
      });
      
      throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const responseText = await response.text();
    logAPIDebug('📄 Жауап мәтіні (алғашқы 200 символ):', responseText.substring(0, 200));

    let data: PredictionResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logAPIError('❌ JSON парсинг қатесі:', {
        error: parseError,
        text: responseText.substring(0, 200)
      });
      throw new Error('JSON парсинг қатесі');
    }

    logAPISuccess('✅ Жауап сәтті:', {
      status: data.status,
      current_prediction: data.current_prediction,
      top3_count: data.top3?.length || 0,
      message: data.message
    });

    if (data.top3 && data.top3.length > 0) {
      logAPIDebug('📊 Top 3 болжамдар:', data.top3);
    }

    return data;

  } catch (error) {
    logAPIError('❌ predictFrame қатесі:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n')[0] : undefined
    });
    
    // Қосымша желі қателерін тексеру
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      logAPIError('🌐 Желі қатесі: Серверге қосылу мүмкін емес');
    }
    
    throw error;
  }
};


// ==========================================
// Words API - FastAPI Backend
// ==========================================

interface WordResponse {
  id: number;
  text_kz: string;
  text_ru: string | null;
  text_en: string | null;
  category: string;
  icon: string | null;
  audio_url: string | null;
  is_active: boolean;
  order_index: number;
}

interface CategoryResponse {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface CategoryGroupResponse {
  category: string;
  category_name: string;
  icon: string;
  words: WordResponse[];
}

// Get all words
export const getWords = async (category?: string, search?: string): Promise<WordItem[]> => {
  try {
    let url = API_ENDPOINTS.WORDS;
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    const data = await handleResponse<WordResponse[]>(response);
    
    return data.map(w => ({
      id: w.id.toString(),
      word: w.text_kz,
      category: w.category,
      audioUrl: w.audio_url || '',
      textRu: w.text_ru,
      textEn: w.text_en,
      icon: w.icon,
    }));
  } catch (error) {
    console.log('Get words error, using defaults:', error);
    return getDefaultWords();
  }
};

// Get words grouped by category
export const getWordsGrouped = async (): Promise<CategoryGroupResponse[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.WORDS_GROUPED, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    return handleResponse<CategoryGroupResponse[]>(response);
  } catch (error) {
    console.log('Get grouped words error:', error);
    return [];
  }
};

// Get word categories
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.WORDS_CATEGORIES, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    const data = await handleResponse<CategoryResponse[]>(response);
    
    return data.map(c => ({
      id: c.id,
      name: c.name,
      icon: mapIconName(c.icon),
      count: c.count,
    }));
  } catch (error) {
    console.log('Get categories error, using defaults:', error);
    return getDefaultCategories();
  }
};

// Get favorites
export const getFavorites = async (deviceId: string): Promise<WordItem[]> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.FAVORITES}/${deviceId}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    const data = await handleResponse<any[]>(response);
    
    return data.map(f => ({
      id: f.word.id.toString(),
      word: f.word.text_kz,
      category: f.word.category,
      audioUrl: f.word.audio_url || '',
      icon: f.word.icon,
      textRu: f.word.text_ru,
      textEn: f.word.text_en,
    }));
  } catch (error) {
    console.log('Get favorites error:', error);
    return [];
  }
};

// Add to favorites
export const addFavorite = async (deviceId: string, wordId: number): Promise<void> => {
  await fetch(API_ENDPOINTS.FAVORITES, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ device_id: deviceId, word_id: wordId }),
  });
};

// Remove from favorites
export const removeFavorite = async (deviceId: string, wordId: number): Promise<void> => {
  await fetch(`${API_ENDPOINTS.FAVORITES}/${deviceId}/${wordId}`, {
    method: 'DELETE',
    headers: DEFAULT_HEADERS,
  });
};

// ==========================================
// Books API - FastAPI Backend
// ==========================================

interface BookResponse {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  category: string;
  cover_url: string | null;
  pdf_url: string;
  file_size: number;
  page_count: number;
  download_count: number;
}

// Get all books
export const getBooks = async (category?: string, search?: string): Promise<BookItem[]> => {
  try {
    let url = API_ENDPOINTS.BOOKS;
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    const data = await handleResponse<BookResponse[]>(response);
    
    return data.map(b => ({
      id: b.id.toString(),
      title: b.title,
      author: b.author || '',
      description: b.description || '',
      coverUrl: b.cover_url || '',
      pdfUrl: b.pdf_url,
      category: b.category,
      pages: b.page_count,
      fileSize: formatFileSize(b.file_size),
      downloadCount: b.download_count,
    }));
  } catch (error) {
    console.log('Get books error, using defaults:', error);
    return getDefaultBooks();
  }
};

// Get book categories
export const getBookCategories = async (): Promise<{ id: string; name: string; count: number; icon: string }[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.BOOKS_CATEGORIES, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    const data = await handleResponse<CategoryResponse[]>(response);
    
    return data.map(c => ({
      id: c.id,
      name: c.name,
      icon: mapIconName(c.icon),
      count: c.count,
    }));
  } catch (error) {
    console.log('Get book categories error:', error);
    return [];
  }
};

// Get popular books
export const getPopularBooks = async (limit: number = 10): Promise<BookItem[]> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.BOOKS_POPULAR}?limit=${limit}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    const data = await handleResponse<BookResponse[]>(response);
    
    return data.map(b => ({
      id: b.id.toString(),
      title: b.title,
      author: b.author || '',
      description: b.description || '',
      coverUrl: b.cover_url || '',
      pdfUrl: b.pdf_url,
      category: b.category,
      pages: b.page_count,
      fileSize: formatFileSize(b.file_size),
    }));
  } catch (error) {
    console.log('Get popular books error:', error);
    return [];
  }
};

// Get downloaded books for device
export const getDownloadedBooks = async (deviceId: string): Promise<BookItem[]> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.BOOKS_DOWNLOADS}/${deviceId}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    const data = await handleResponse<any[]>(response);
    
    return data.map(d => ({
      id: d.book.id.toString(),
      title: d.book.title,
      author: d.book.author || '',
      description: d.book.description || '',
      coverUrl: d.book.cover_url || '',
      pdfUrl: d.book.pdf_url,
      category: d.book.category,
      pages: d.book.page_count,
      fileSize: formatFileSize(d.book.file_size),
      lastPage: d.last_page,
      isDownloaded: true,
    }));
  } catch (error) {
    console.log('Get downloaded books error:', error);
    return [];
  }
};

// Mark book as downloaded
export const markBookDownloaded = async (deviceId: string, bookId: number): Promise<void> => {
  await fetch(API_ENDPOINTS.BOOKS_DOWNLOADS, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ device_id: deviceId, book_id: bookId }),
  });
};

// Update reading progress
export const updateReadingProgress = async (deviceId: string, bookId: number, lastPage: number): Promise<void> => {
  await fetch(`${API_ENDPOINTS.BOOKS_DOWNLOADS}/${deviceId}/${bookId}`, {
    method: 'PUT',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ last_page: lastPage }),
  });
};

// ==========================================
// Speech API - FastAPI Backend
// ==========================================


// ==========================================
// Speech API - FastAPI Backend
// ==========================================

interface TTSResponse {
  audio_url: string;
  text: string;
  duration_ms: number | null;
}

// Text to Speech
// Text to Speech
export const textToSpeech = async (
  text: string,
  language: string = 'kz',
  speechRate: number = 1.0,
  speechPitch: number = 1.0
): Promise<string> => {
  try {
    const response = await fetch(API_ENDPOINTS.TEXT_TO_SPEECH, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        text,
        language,
        speech_rate: speechRate,
        speech_pitch: speechPitch,
      }),
    });
    const data = await handleResponse<TTSResponse>(response);
    return `${API_BASE_URL}${data.audio_url}`;
  } catch (error) {
    console.log('TTS error:', error);
    throw error;
  }
};




// services/api.ts - speechToText функциясының жөнделген нұсқасы

// services/api.ts - speechToText функциясына қосымша логтар

export const speechToText = async (audioUri: string, language: string = 'kz'): Promise<string> => {
  const componentName = 'speechToText';
  

  
  try {
    const fileInfo = await FileSystem.getInfoAsync(audioUri);

    if (!fileInfo.exists) {
      throw new Error(`Аудио файл табылмады: ${audioUri}`);
    }

    // FormData құру
    const formData = new FormData();
    
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    const mimeType = 'audio/m4a';
    
    
    const normalizedUri =
  Platform.OS === 'android'
    ? audioUri
    : audioUri.replace('file://', '');

    formData.append('audio', {
      uri: normalizedUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    
    formData.append('language', language);
    
    
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[${componentName}] Request timeout (30s)`);
      controller.abort();
    }, 30000);

    const response = await fetch(API_ENDPOINTS.SPEECH_TO_TEXT, {
  method: 'POST',
  body: formData,
  signal: controller.signal,
});

    clearTimeout(timeoutId);


    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`STT API қатесі: ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[${componentName}] JSON парсинг қатесі:`, e);
      throw new Error('Сервер жауабын парсингтеу мүмкін емес');
    }
    

    
    return data.text || data.transcription || data.result || JSON.stringify(data);

  } catch (error: any) {
    console.error(`[${componentName}] ҚАТЕ:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Get speech history
export const getSpeechHistory = async (deviceId: string, limit: number = 50): Promise<any[]> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.SPEECH_HISTORY}/${deviceId}?limit=${limit}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    return handleResponse<any[]>(response);
  } catch (error) {
    console.log('Get speech history error:', error);
    return [];
  }
};

// Save speech to history
export const saveSpeechHistory = async (
  deviceId: string,
  text: string,
  language: string = 'kz',
  confidence?: number
): Promise<void> => {
  try {
    await fetch(API_ENDPOINTS.SPEECH_HISTORY, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        device_id: deviceId,
        text,
        language,
        confidence,
      }),
    });
  } catch (error) {
    console.log('Save speech history error:', error);
  }
};

// Get quick phrases
export const getQuickPhrases = async (): Promise<any> => {
  try {
    const response = await fetch(API_ENDPOINTS.QUICK_PHRASES, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    return handleResponse<any>(response);
  } catch (error) {
    console.log('Get quick phrases error:', error);
    return null;
  }
};

// ==========================================
// Settings API - FastAPI Backend
// ==========================================

// Get user settings
export const getUserSettings = async (deviceId: string): Promise<UserSettings> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.SETTINGS}/${deviceId}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
    });
    return handleResponse<UserSettings>(response);
  } catch (error) {
    console.log('Get settings error, using defaults:', error);
    return getDefaultSettings();
  }
};

// Update user settings
export const updateUserSettings = async (deviceId: string, settings: Partial<UserSettings>): Promise<UserSettings> => {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/${deviceId}`, {
    method: 'PUT',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(settings),
  });
  return handleResponse<UserSettings>(response);
};

// Reset settings
export const resetUserSettings = async (deviceId: string): Promise<void> => {
  await fetch(`${API_ENDPOINTS.SETTINGS}/${deviceId}`, {
    method: 'DELETE',
    headers: DEFAULT_HEADERS,
  });
};

// ==========================================
// Video API - Flask AI Model
// ==========================================

export const saveVideo = async (videoUri: string, label: string): Promise<any> => {
  const formData = new FormData();
  formData.append('label', label);
  formData.append('video', {
    uri: videoUri,
    type: 'video/mp4',
    name: 'video.mp4',
  } as any);
  
  const response = await fetch(API_ENDPOINTS.SAVE_VIDEO, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<any>(response);
};

export const processVideo = async (
  videoId: string,
  startTime: number,
  endTime: number,
  mirror: boolean = true
): Promise<any> => {
  const formData = new FormData();
  formData.append('video_id', videoId);
  formData.append('start_time', startTime.toString());
  formData.append('end_time', endTime.toString());
  formData.append('mirror', mirror.toString());
  
  const response = await fetch(API_ENDPOINTS.PROCESS_VIDEO, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<any>(response);
};

export const getTaskStatus = async (taskId: string): Promise<any> => {
  const response = await fetch(`${API_ENDPOINTS.TASK_STATUS}/${taskId}`, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
  });
  return handleResponse<any>(response);
};

export const deleteVideo = async (videoId: string): Promise<any> => {
  const response = await fetch(`${API_ENDPOINTS.DELETE_VIDEO}/${videoId}`, {
    method: 'DELETE',
    headers: DEFAULT_HEADERS,
  });
  return handleResponse<any>(response);
};

export const getGallery = async (): Promise<any> => {
  const response = await fetch(API_ENDPOINTS.GALLERY, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
  });
  return handleResponse<any>(response);
};

export const sendFrame = async (frameUri: string): Promise<void> => {
  const formData = new FormData();
  formData.append('frame', {
    uri: frameUri,
    type: 'image/jpeg',
    name: 'frame.jpg',
  } as any);
  
  await fetch(API_ENDPOINTS.PREDICT_FRAME, {
    method: 'POST',
    body: formData,
  });
};

// ==========================================
// Helper Functions
// ==========================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const mapIconName = (icon: string): string => {
  const iconMap: Record<string, string> = {
    'hand-wave': 'hand-left-outline',
    'hand': 'hand-left-outline',
    'users': 'people-outline',
    'user': 'person-outline',
    'utensils': 'restaurant-outline',
    'hash': 'keypad-outline',
    'palette': 'color-palette-outline',
    'smile': 'happy-outline',
    'frown': 'sad-outline',
    'activity': 'pulse-outline',
    'help-circle': 'help-circle-outline',
    'clock': 'time-outline',
    'map-pin': 'location-outline',
    'book': 'book-outline',
    'book-open': 'book-outline',
    'baby': 'people-outline',
    'file-text': 'document-text-outline',
  };
  return iconMap[icon] || 'ellipse-outline';
};

const getDefaultSettings = (): UserSettings => ({
  id: 0,
  device_id: DEVICE_ID || '',
  language: 'kz',
  speech_rate: 1.0,
  speech_pitch: 1.0,
  speech_voice: 'default',
  theme: 'light',
  notifications_enabled: true,
  auto_speak: true,
  camera_quality: 'high',
});

// ==========================================
// Default Data Functions
// ==========================================

const getDefaultWords = (): WordItem[] => [
  { id: '1', word: 'Salam', category: 'greeting', audioUrl: '', icon: 'hand-left-outline', textRu: 'Привет', textEn: 'Hello' },
  { id: '2', word: 'Qaıyrly tan', category: 'greeting', audioUrl: '', icon: 'sunny-outline', textRu: 'Доброе утро', textEn: 'Good morning' },
  { id: '3', word: 'Qaıyrly kún', category: 'greeting', audioUrl: '', icon: 'sunny-outline', textRu: 'Добрый день', textEn: 'Good afternoon' },
  { id: '4', word: 'Qaıyrly kesh', category: 'greeting', audioUrl: '', icon: 'moon-outline', textRu: 'Добрый вечер', textEn: 'Good evening' },
  { id: '5', word: 'Sau bol', category: 'greeting', audioUrl: '', icon: 'hand-left-outline', textRu: 'До свидания', textEn: 'Goodbye' },
  { id: '6', word: 'Rahmet', category: 'greeting', audioUrl: '', icon: 'heart-outline', textRu: 'Спасибо', textEn: 'Thank you' },
  { id: '7', word: 'Ia', category: 'response', audioUrl: '', icon: 'checkmark-outline', textRu: 'Да', textEn: 'Yes' },
  { id: '8', word: 'Joq', category: 'response', audioUrl: '', icon: 'close-outline', textRu: 'Нет', textEn: 'No' },
  { id: '9', word: 'Keshirińiz', category: 'response', audioUrl: '', icon: 'alert-circle-outline', textRu: 'Извините', textEn: 'Sorry' },
  { id: '10', word: 'Jaqsy', category: 'response', audioUrl: '', icon: 'thumbs-up-outline', textRu: 'Хорошо', textEn: 'Good' },
  { id: '11', word: 'Ne?', category: 'question', audioUrl: '', icon: 'help-circle-outline', textRu: 'Что?', textEn: 'What?' },
  { id: '12', word: 'Kim?', category: 'question', audioUrl: '', icon: 'person-outline', textRu: 'Кто?', textEn: 'Who?' },
  { id: '13', word: 'Qaıda?', category: 'question', audioUrl: '', icon: 'location-outline', textRu: 'Где?', textEn: 'Where?' },
  { id: '14', word: 'Qashan?', category: 'question', audioUrl: '', icon: 'time-outline', textRu: 'Когда?', textEn: 'When?' },
  { id: '15', word: 'Nege?', category: 'question', audioUrl: '', icon: 'help-circle-outline', textRu: 'Почему?', textEn: 'Why?' },
  { id: '16', word: 'Komek', category: 'needs', audioUrl: '', icon: 'medkit-outline', textRu: 'Помощь', textEn: 'Help' },
  { id: '17', word: 'Sý', category: 'needs', audioUrl: '', icon: 'water-outline', textRu: 'Вода', textEn: 'Water' },
  { id: '18', word: 'Tamaq', category: 'needs', audioUrl: '', icon: 'restaurant-outline', textRu: 'Еда', textEn: 'Food' },
  { id: '19', word: 'Ana', category: 'family', audioUrl: '', icon: 'woman-outline', textRu: 'Мама', textEn: 'Mother' },
  { id: '20', word: 'Ake', category: 'family', audioUrl: '', icon: 'man-outline', textRu: 'Папа', textEn: 'Father' },
  { id: '21', word: 'Aǵa', category: 'family', audioUrl: '', icon: 'man-outline', textRu: 'Брат', textEn: 'Brother' },
  { id: '22', word: 'Ápe', category: 'family', audioUrl: '', icon: 'woman-outline', textRu: 'Сестра', textEn: 'Sister' },
];

const getDefaultCategories = (): Category[] => [
  { id: 'greeting', name: 'Sálemdesý', icon: 'hand-left-outline', count: 6 },
  { id: 'response', name: 'Jaýaptar', icon: 'chatbubble-outline', count: 4 },
  { id: 'question', name: 'Suraqtar', icon: 'help-circle-outline', count: 5 },
  { id: 'needs', name: 'Qajettilikter', icon: 'heart-outline', count: 3 },
  { id: 'emotions', name: 'Sezimder', icon: 'happy-outline', count: 0 },
  { id: 'family', name: 'Otbasy', icon: 'people-outline', count: 4 },
];

const getDefaultBooks = (): BookItem[] => [
  {
    id: '1',
    title: 'Qazaq ym tiliniń negizderi',
    author: 'A. Baıtursunov',
    description: 'Qazaq ym tilin uırenuǵa arnalǵan negizgi oqýlyq',
    coverUrl: 'https://placehold.co/200x280/1a365d/ffffff?text=KSL+Book',
    pdfUrl: '',
    category: 'education',
    pages: 120,
    fileSize: '2.5 MB',
  },
  {
    id: '2',
    title: 'Ym tili sozdigi',
    author: 'B. Qasymova',
    description: '1000+ ym belgileriniń sozdigi',
    coverUrl: 'https://placehold.co/200x280/2c5282/ffffff?text=Dictionary',
    pdfUrl: '',
    category: 'dictionary',
    pages: 250,
    fileSize: '5.2 MB',
  },
  {
    id: '3',
    title: 'Balalarga arnalǵan ym tili',
    author: 'S. Alimjanova',
    description: 'Balalarga arnalǵan qyzyqty sýrettermen',
    coverUrl: 'https://placehold.co/200x280/2b6cb0/ffffff?text=Kids+Book',
    pdfUrl: '',
    category: 'children',
    pages: 80,
    fileSize: '8.1 MB',
  },
];