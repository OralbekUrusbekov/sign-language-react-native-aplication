import { useSettings } from '@/context/SettingsContext';

export const ttsTranslations = {
  kz: {
    // Тақырыптар
    title: 'Сөйлеу',
    subtitle: 'Сөздерді басып дыбыстаңыз',
    
    // Жүктеу
    loading: 'Деректерді жүктеп жатырмыз...',
    
    // Сөйлем құру
    sentenceBuilder: 'Сөйлем құру',
    sentencePlaceholder: 'Сөздерді ұзақ басып сөйлем құрыңыз',
    speakSentence: 'Сөйлемді айту',
    clearSentence: 'Тазалау',
    
    // Өз мәтіні
    yourText: 'Өз сөзіңізді жазыңыз',
    textPlaceholder: 'Мәтін жазыңыз...',
    
    // Соңғы қолданылған
    recentWords: 'Соңғы қолданылған',
    
    // Категориялар
    categories: 'Санаттар',
    
    // Сөздер
    words: 'сөздері',
    
    // Күйлер
    speaking: 'Сөйлеп жатыр...',
    
    // Қателер
    error: 'Қате',
    speechError: 'Дыбыстау кезінде қате пайда болды',
    
    // Батырмалар
    speak: 'Айту',
    add: 'Қосу',
    clear: 'Тазалау',
    
    // Категория атаулары (егер серверден келмесе)
    categories_default: {
      greetings: 'Амандасу',
      common: 'Жиі қолданылатын',
      family: 'Отбасы',
      food: 'Тамақ',
      numbers: 'Сандар',
      colors: 'Түстер',
      animals: 'Жануарлар',
      verbs: 'Етістіктер',
      adjectives: 'Сын есімдер',
    },
  },
  
  ru: {
    // Заголовки
    title: 'Речь',
    subtitle: 'Нажимайте на слова для озвучивания',
    
    // Загрузка
    loading: 'Загрузка данных...',
    
    // Построение предложений
    sentenceBuilder: 'Построение предложения',
    sentencePlaceholder: 'Долгое нажатие на слова для построения предложения',
    speakSentence: 'Произнести предложение',
    clearSentence: 'Очистить',
    
    // Свой текст
    yourText: 'Напишите свой текст',
    textPlaceholder: 'Введите текст...',
    
    // Недавние
    recentWords: 'Недавние',
    
    // Категории
    categories: 'Категории',
    
    // Слова
    words: 'слова',
    
    // Состояния
    speaking: 'Говорит...',
    
    // Ошибки
    error: 'Ошибка',
    speechError: 'Ошибка при озвучивании',
    
    // Кнопки
    speak: 'Сказать',
    add: 'Добавить',
    clear: 'Очистить',
    
    // Названия категорий
    categories_default: {
      greetings: 'Приветствия',
      common: 'Часто используемые',
      family: 'Семья',
      food: 'Еда',
      numbers: 'Числа',
      colors: 'Цвета',
      animals: 'Животные',
      verbs: 'Глаголы',
      adjectives: 'Прилагательные',
    },
  },
  
  en: {
    // Headers
    title: 'Speech',
    subtitle: 'Tap words to hear them spoken',
    
    // Loading
    loading: 'Loading data...',
    
    // Sentence Builder
    sentenceBuilder: 'Sentence Builder',
    sentencePlaceholder: 'Long press words to build a sentence',
    speakSentence: 'Speak Sentence',
    clearSentence: 'Clear',
    
    // Custom Text
    yourText: 'Write your own text',
    textPlaceholder: 'Enter text...',
    
    // Recent Words
    recentWords: 'Recent',
    
    // Categories
    categories: 'Categories',
    
    // Words
    words: 'words',
    
    // States
    speaking: 'Speaking...',
    
    // Errors
    error: 'Error',
    speechError: 'Error during speech',
    
    // Buttons
    speak: 'Speak',
    add: 'Add',
    clear: 'Clear',
    
    // Category names
    categories_default: {
      greetings: 'Greetings',
      common: 'Common',
      family: 'Family',
      food: 'Food',
      numbers: 'Numbers',
      colors: 'Colors',
      animals: 'Animals',
      verbs: 'Verbs',
      adjectives: 'Adjectives',
    },
  },
};

// Аударманы алу функциясы
export const useTTSTranslation = () => {
  const { appLanguage } = useSettings();
  
  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: any = ttsTranslations[appLanguage];
    
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