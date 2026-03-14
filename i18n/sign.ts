import { useSettings } from '@/context/SettingsContext';


export const signTranslations = {
  kz: {
    // Негізгі
    ready: 'Дайын',
    collecting: 'Кадрлар жиналуда...',
    stopped: 'Тоқтатылды',
    waiting: 'Күтілуде...',
    
    // Камера рұқсаты
    cameraRequired: 'Камера қажет',
    cameraPermissionText: 'Ым тілін тану үшін камера рұқсатын беріңіз',
    grantPermission: 'Рұқсат беру',
    
    // Тақырыптар
    signLanguage: 'Ым тілін тану',
    liveStream: 'Тікелей эфир',
    recognitionResult: 'Тану нәтижесі',
    currentWord: 'Ағымдағы сөз',
    top3: 'Үздік 3 болжам',
    history: 'Тану тарихы',
    instructions: 'Нұсқаулық',
    
    // Күйлер
    connected: 'Қосылды',
    disconnected: 'Қосылмады',
    error: 'Қате',
    retry: 'Қайталау',
    
    // Батырмалар
    start: 'Бастау',
    stop: 'Тоқтату',
    frame: 'Кадр',
    test: 'Тест',
    
    // Нұсқаулық
    instruction1: 'Камера алдына тұрыңыз',
    instruction2: 'Жарық жақсы түсуі керек',
    instruction3: 'Қолдарыңыз көрініп тұруы керек',
    instruction4: '~2.5 секунд видео қажет',
    
    // Хабарламалар
    noWords: 'Әлі ешқандай сөз танылмады',
    serverError: 'Серверге қосылу мүмкін емес. IP адресті тексеріңіз.',
    
    // Жиі қолданылатын сөздер
    words: {
      hello: 'Сәлем',
      thankYou: 'Рахмет',
      yes: 'Иә',
      no: 'Жоқ',
      help: 'Көмек',
      sorry: 'Кешіріңіз',
      please: 'Өтінемін',
      good: 'Жақсы',
      bad: 'Жаман',
      food: 'Тамақ',
      water: 'Су',
      mother: 'Ана',
      father: 'Әке',
      brother: 'Аға/Іні',
      sister: 'Әпке/Қарындас',
    },
  },
  ru: {
    // Основные
    ready: 'Готов',
    collecting: 'Сбор кадров...',
    stopped: 'Остановлено',
    waiting: 'Ожидание...',
    
    // Разрешение камеры
    cameraRequired: 'Требуется камера',
    cameraPermissionText: 'Разрешите доступ к камере для распознавания языка жестов',
    grantPermission: 'Разрешить',
    
    // Заголовки
    signLanguage: 'Распознавание жестов',
    liveStream: 'Прямой эфир',
    recognitionResult: 'Результат распознавания',
    currentWord: 'Текущее слово',
    top3: 'Топ-3 предсказания',
    history: 'История распознавания',
    instructions: 'Инструкция',
    
    // Статусы
    connected: 'Подключено',
    disconnected: 'Не подключено',
    error: 'Ошибка',
    retry: 'Повторить',
    
    // Кнопки
    start: 'Старт',
    stop: 'Стоп',
    frame: 'Кадр',
    test: 'Тест',
    
    // Инструкция
    instruction1: 'Встаньте перед камерой',
    instruction2: 'Обеспечьте хорошее освещение',
    instruction3: 'Руки должны быть видны',
    instruction4: 'Требуется ~2.5 секунды видео',
    
    // Сообщения
    noWords: 'Еще нет распознанных слов',
    serverError: 'Нет подключения к серверу. Проверьте IP адрес.',
    
    // Часто используемые слова
    words: {
      hello: 'Привет',
      thankYou: 'Спасибо',
      yes: 'Да',
      no: 'Нет',
      help: 'Помощь',
      sorry: 'Извините',
      please: 'Пожалуйста',
      good: 'Хорошо',
      bad: 'Плохо',
      food: 'Еда',
      water: 'Вода',
      mother: 'Мама',
      father: 'Папа',
      brother: 'Брат',
      sister: 'Сестра',
    },
  },
  en: {
    // Basic
    ready: 'Ready',
    collecting: 'Collecting frames...',
    stopped: 'Stopped',
    waiting: 'Waiting...',
    
    // Camera permission
    cameraRequired: 'Camera Required',
    cameraPermissionText: 'Grant camera permission for sign language recognition',
    grantPermission: 'Grant Permission',
    
    // Headers
    signLanguage: 'Sign Language',
    liveStream: 'Live Stream',
    recognitionResult: 'Recognition Result',
    currentWord: 'Current Word',
    top3: 'Top 3 Predictions',
    history: 'Recognition History',
    instructions: 'Instructions',
    
    // Statuses
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
    retry: 'Retry',
    
    // Buttons
    start: 'Start',
    stop: 'Stop',
    frame: 'Frame',
    test: 'Test',
    
    // Instructions
    instruction1: 'Stand in front of the camera',
    instruction2: 'Ensure good lighting',
    instruction3: 'Hands should be visible',
    instruction4: '~2.5 seconds of video required',
    
    // Messages
    noWords: 'No words recognized yet',
    serverError: 'Cannot connect to server. Check IP address.',
    
    // Frequently used words
    words: {
      hello: 'Hello',
      thankYou: 'Thank you',
      yes: 'Yes',
      no: 'No',
      help: 'Help',
      sorry: 'Sorry',
      please: 'Please',
      good: 'Good',
      bad: 'Bad',
      food: 'Food',
      water: 'Water',
      mother: 'Mother',
      father: 'Father',
      brother: 'Brother',
      sister: 'Sister',
    },
  },
};

// Аударманы алу функциясы
export const useSignTranslation = () => {
  const { appLanguage } = useSettings();
  
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = signTranslations[appLanguage];
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return value;
  };
  
  return { t, language: appLanguage };
};