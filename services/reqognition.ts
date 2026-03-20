import { API_ENDPOINTS, DEFAULT_HEADERS } from "@/config/api";


export interface Prediction {
  label: string;
  confidence: number;
}

export interface PredictionResponse {
  status: 'success' | 'waiting' | 'error' | 'low_confidence';
  current_prediction: string | null;
  top3: Array<{ label: string; confidence: number }>;
  landmarks?: {
    hand_0: Array<{ x: number; y: number; z: number }>;  // z қосылды
    hand_1: Array<{ x: number; y: number; z: number }>;  // z қосылды
    hand_labels: string[];
    pose: Array<{ x: number; y: number; z: number }>;     // z қосылды
  };
  buffer_status?: {
    frames: number;
    needed: number;
  };
  landmarks_detected?: {
    pose: boolean;
    hands: boolean;
  };
  message?: string;
}

export interface RecognitionStatusResponse {
  is_running: boolean;
}

export interface ToggleResponse {
  success: boolean;
  message?: string;
}





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






export async function predictFrame(imageUri: string): Promise<PredictionResponse> {
  try {
    console.log('📤 Sending frame to server...');
    
    // Create form data
    const formData = new FormData();
    
    // === МАҢЫЗДЫ: 'frame' field атын қолдану ===
    formData.append('frame', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'frame.jpg',
    } as any);
    
    console.log('📦 FormData created with frame field');
    
    const response = await fetch(API_ENDPOINTS.PREDICT_FRAME, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Response data:', data);
    return data;
    
  } catch (error) {
    console.log('❌ Predict error:', error);
    return {
      status: 'error',
      current_prediction: null,
      top3: [],
      message: 'Network error'
    };
  }
}


export async function getRecognitionStatus(): Promise<{ success: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(API_ENDPOINTS.RECOGNITION_STATUS, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return { success: true, message: 'Connected' };
    } else {
      return { success: false, message: 'Server error' };
    }
  } catch (error) {
    console.log('Connection error:', error);
    return { success: false, message: 'Cannot connect to server' };
  }
}



export async function resetRecognition(): Promise<boolean> {
  try {
    const response = await fetch(API_ENDPOINTS.RECOGNITION_PREDICT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    return response.ok;
  } catch (error) {
    console.log('Reset error:', error);
    return false;
  }
}


