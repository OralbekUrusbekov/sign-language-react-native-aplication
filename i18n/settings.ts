import { useSettings } from '@/context/SettingsContext';

export const settingsTranslations = {
  kz: {
    // Тақырыптар
    title: 'Баптаулар',
    subtitle: 'Қосымшаны баптау',
    
    // Жүктеу
    loading: 'Баптауларды жүктеп жатырмыз...',
    saving: 'Сақталуда...',
    
    // Секциялар
    general: 'Жалпы',
    speech: 'Сөйлеу',
    notifications: 'Хабарландырулар',
    about: 'Қосымша туралы',
    
    // Жалпы баптаулар
    language: 'Тіл',
    theme: 'Тақырып',
    cameraQuality: 'Камера сапасы',
    
    // Тілдер
    languages: {
      kz: 'Қазақша',
      ru: 'Орысша',
      en: 'Ағылшынша',
    },
    
    // Тақырыптар
    themes: {
      light: 'Жарық',
      dark: 'Қараңғы',
      system: 'Жүйе',
    },
    
    // Камера сапасы
    qualities: {
      low: 'Төмен (480p)',
      medium: 'Орташа (720p)',
      high: 'Жоғары (1080p)',
    },
    
    // Сөйлеу баптаулары
    speechLanguage: 'Сөйлеу тілі',
    speechRate: 'Сөйлеу жылдамдығы',
    speechPitch: 'Дауыс биіктігі',
    autoSpeak: 'Автоматты сөйлеу',
    
    // Хабарландырулар
    notificationsEnabled: 'Хабарландырулар',
    notificationSound: 'Дыбыс',
    notificationVibration: 'Діріл',
    
    // Қосымша туралы
    appName: 'Қолданба атауы',
    appVersion: 'Нұсқа',
    deviceId: 'Құрылғы ID',
    copyright: 'Барлық құқықтар қорғалған',
    
    // Әкімші
    adminPanel: 'Админ панелге кіру',
    
    // Диалогтар
    selectLanguage: 'Тілді таңдаңыз',
    selectTheme: 'Тақырыпты таңдаңыз',
    selectQuality: 'Камера сапасын таңдаңыз',
    selectSpeechLanguage: 'Сөйлеу тілін таңдаңыз',
    cancel: 'Болдырмау',
    
    // Alert тақырыптары
    appLanguageTitle: 'Қолданба тілі',
    speechLanguageTitle: 'Сөйлеу тілі',
    themeTitle: 'Тақырыпты таңдаңыз',
    qualityTitle: 'Камера сапасы',
    
    // Қателер
    error: 'Қате',
    errorLoading: 'Баптауларды жүктеу кезінде қате орын алды',
    errorSaving: 'Баптауларды сақтау кезінде қате орын алды',
  },
  
  ru: {
    // Заголовки
    title: 'Настройки',
    subtitle: 'Настройка приложения',
    
    // Загрузка
    loading: 'Загрузка настроек...',
    saving: 'Сохранение...',
    
    // Секции
    general: 'Общие',
    speech: 'Речь',
    notifications: 'Уведомления',
    about: 'О приложении',
    
    // Общие настройки
    language: 'Язык',
    theme: 'Тема',
    cameraQuality: 'Качество камеры',
    
    // Языки
    languages: {
      kz: 'Казахский',
      ru: 'Русский',
      en: 'Английский',
    },
    
    // Темы
    themes: {
      light: 'Светлая',
      dark: 'Темная',
      system: 'Системная',
    },
    
    // Качество камеры
    qualities: {
      low: 'Низкое (480p)',
      medium: 'Среднее (720p)',
      high: 'Высокое (1080p)',
    },
    
    // Настройки речи
    speechLanguage: 'Язык речи',
    speechRate: 'Скорость речи',
    speechPitch: 'Высота голоса',
    autoSpeak: 'Автоматическая речь',
    
    // Уведомления
    notificationsEnabled: 'Уведомления',
    notificationSound: 'Звук',
    notificationVibration: 'Вибрация',
    
    // О приложении
    appName: 'Название приложения',
    appVersion: 'Версия',
    deviceId: 'ID устройства',
    copyright: 'Все права защищены',
    
    // Админ
    adminPanel: 'Войти в админ панель',
    
    // Диалоги
    selectLanguage: 'Выберите язык',
    selectTheme: 'Выберите тему',
    selectQuality: 'Выберите качество камеры',
    selectSpeechLanguage: 'Выберите язык речи',
    cancel: 'Отмена',
    
    // Заголовки Alert
    appLanguageTitle: 'Язык приложения',
    speechLanguageTitle: 'Язык речи',
    themeTitle: 'Выберите тему',
    qualityTitle: 'Качество камеры',
    
    // Ошибки
    error: 'Ошибка',
    errorLoading: 'Ошибка при загрузке настроек',
    errorSaving: 'Ошибка при сохранении настроек',
  },
  
  en: {
    // Headers
    title: 'Settings',
    subtitle: 'Configure your app',
    
    // Loading
    loading: 'Loading settings...',
    saving: 'Saving...',
    
    // Sections
    general: 'General',
    speech: 'Speech',
    notifications: 'Notifications',
    about: 'About',
    
    // General settings
    language: 'Language',
    theme: 'Theme',
    cameraQuality: 'Camera Quality',
    
    // Languages
    languages: {
      kz: 'Kazakh',
      ru: 'Russian',
      en: 'English',
    },
    
    // Themes
    themes: {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
    
    // Camera quality
    qualities: {
      low: 'Low (480p)',
      medium: 'Medium (720p)',
      high: 'High (1080p)',
    },
    
    // Speech settings
    speechLanguage: 'Speech Language',
    speechRate: 'Speech Rate',
    speechPitch: 'Speech Pitch',
    autoSpeak: 'Auto Speak',
    
    // Notifications
    notificationsEnabled: 'Notifications',
    notificationSound: 'Sound',
    notificationVibration: 'Vibration',
    
    // About
    appName: 'App Name',
    appVersion: 'Version',
    deviceId: 'Device ID',
    copyright: 'All rights reserved',
    
    // Admin
    adminPanel: 'Go to Admin Panel',
    
    // Dialogs
    selectLanguage: 'Select language',
    selectTheme: 'Select theme',
    selectQuality: 'Select camera quality',
    selectSpeechLanguage: 'Select speech language',
    cancel: 'Cancel',
    
    // Alert titles
    appLanguageTitle: 'App Language',
    speechLanguageTitle: 'Speech Language',
    themeTitle: 'Select Theme',
    qualityTitle: 'Camera Quality',
    
    // Errors
    error: 'Error',
    errorLoading: 'Error loading settings',
    errorSaving: 'Error saving settings',
  },
};

// Аударманы алу функциясы
export const useSettingsTranslation = () => {
  const { appLanguage } = useSettings();
  
  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: any = settingsTranslations[appLanguage];
    
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