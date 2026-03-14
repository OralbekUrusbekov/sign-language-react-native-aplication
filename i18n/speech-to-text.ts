import { useSettings } from '@/context/SettingsContext';

export const speechTranslations = {
  kz: {
    // Тақырыптар
    title: 'Тыңдау',
    subtitle: 'Дауысты текстке айналдыру',
    
    // Жүктеу
    loading: 'Жүктелуде...',
    
    // Ағымдағы мәтін
    currentText: 'Қазіргі мәтін',
    processing: 'Өңдеуде...',
    listening: 'Тыңдап жатыр',
    speakNow: 'Сөйлеңіз...',
    startSpeaking: 'Микрофонды басып сөйлей бастаңыз',
    copy: 'Көшіру',
    copied: 'Көшірілді',
    
    // Микрофон
    stopToStop: 'Тоқтату үшін басыңыз',
    startToStart: 'Бастау үшін басыңыз',
    processingAudio: 'Өңделіп жатыр...',
    
    // Кеңестер
    tips: 'Кеңестер',
    tip1: 'Анық және баяу сөйлеңіз',
    tip2: 'Тыныш жерде қолданыңыз',
    tip3: 'Микрофонға жақын сөйлеңіз',
    
    // Тарих
    history: 'Тарих',
    clearHistory: 'Тарихты тазалау',
    
    // Рұқсаттар
    permissionRequired: 'Қате',
    permissionMessage: 'Микрофонға рұқсат беріңіз',
    
    // Қателер
    error: 'Қате',
    startError: 'Жазбаны бастау мүмкін болмады',
    stopError: 'Жазбаны тоқтату кезінде қате пайда болды',
    fileNotFound: 'Жазба файлы табылмады',
    audioFileNotFound: 'Аудио файл табылмады',
    
    // Диалогтар
    clearConfirm: 'Барлық жазбаларды өшіруге сенімдісіз бе?',
    cancel: 'Болдырмау',
    delete: 'Иә, өшіру',
    
    // Демо режим
    demoMode: 'Демо режим',
    
    // Уақыт
    timeFormat: 'kk-KZ',
  },
  
  ru: {
    // Заголовки
    title: 'Слушать',
    subtitle: 'Преобразование голоса в текст',
    
    // Загрузка
    loading: 'Загрузка...',
    
    // Текущий текст
    currentText: 'Текущий текст',
    processing: 'Обработка...',
    listening: 'Слушаю',
    speakNow: 'Говорите...',
    startSpeaking: 'Нажмите микрофон и начните говорить',
    copy: 'Копировать',
    copied: 'Скопировано',
    
    // Микрофон
    stopToStop: 'Нажмите чтобы остановить',
    startToStart: 'Нажмите чтобы начать',
    processingAudio: 'Обработка...',
    
    // Советы
    tips: 'Советы',
    tip1: 'Говорите четко и медленно',
    tip2: 'Используйте в тихом месте',
    tip3: 'Говорите близко к микрофону',
    
    // История
    history: 'История',
    clearHistory: 'Очистить историю',
    
    // Разрешения
    permissionRequired: 'Ошибка',
    permissionMessage: 'Разрешите доступ к микрофону',
    
    // Ошибки
    error: 'Ошибка',
    startError: 'Не удалось начать запись',
    stopError: 'Ошибка при остановке записи',
    fileNotFound: 'Файл записи не найден',
    audioFileNotFound: 'Аудио файл не найден',
    
    // Диалоги
    clearConfirm: 'Вы уверены, что хотите удалить все записи?',
    cancel: 'Отмена',
    delete: 'Да, удалить',
    
    // Демо режим
    demoMode: 'Демо режим',
    
    // Время
    timeFormat: 'ru-RU',
  },
  
  en: {
    // Headers
    title: 'Listen',
    subtitle: 'Speech to text conversion',
    
    // Loading
    loading: 'Loading...',
    
    // Current text
    currentText: 'Current text',
    processing: 'Processing...',
    listening: 'Listening',
    speakNow: 'Speak now...',
    startSpeaking: 'Press microphone and start speaking',
    copy: 'Copy',
    copied: 'Copied',
    
    // Microphone
    stopToStop: 'Press to stop',
    startToStart: 'Press to start',
    processingAudio: 'Processing...',
    
    // Tips
    tips: 'Tips',
    tip1: 'Speak clearly and slowly',
    tip2: 'Use in a quiet place',
    tip3: 'Speak close to the microphone',
    
    // History
    history: 'History',
    clearHistory: 'Clear history',
    
    // Permissions
    permissionRequired: 'Error',
    permissionMessage: 'Grant microphone permission',
    
    // Errors
    error: 'Error',
    startError: 'Could not start recording',
    stopError: 'Error stopping recording',
    fileNotFound: 'Recording file not found',
    audioFileNotFound: 'Audio file not found',
    
    // Dialogs
    clearConfirm: 'Are you sure you want to delete all recordings?',
    cancel: 'Cancel',
    delete: 'Yes, delete',
    
    // Demo mode
    demoMode: 'Demo mode',
    
    // Time
    timeFormat: 'en-US',
  },
};

// Аударманы алу функциясы
export const useSpeechTranslation = () => {
  const { appLanguage } = useSettings();
  
  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: any = speechTranslations[appLanguage];
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    if (params && typeof value === 'string') {
      return value.replace(/{(\w+)}/g, (_, key) => String(params[key] || ''));
    }
    
    return value;
  };
  
  return { t, language: appLanguage };
};