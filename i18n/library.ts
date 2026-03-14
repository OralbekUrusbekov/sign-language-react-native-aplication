import { useSettings } from '@/context/SettingsContext';

export const libraryTranslations = {
  kz: {
    // Тақырыптар
    title: 'Кітапхана',
    subtitle: 'PDF кітаптар мен материалдар',
    
    // Іздеу
    searchPlaceholder: 'Кітап немесе автор іздеу...',
    
    // Категориялар
    categories: {
      all: 'Барлығы',
      sign_language: 'Ым тіл',
      education: 'Білім',
      dictionary: 'Сөздік',
      children: 'Балалар',
      grammar: 'Грамматика',
    },
    
    // Кітап карточкасы
    pages: 'бет',
    download: 'Жүктеу',
    downloading: 'Жүктелуде...',
    open: 'Ашу',
    share: 'Бөлісу',
    delete: 'Өшіру',
    
    // Хабарламалар
    downloadSuccess: '"{title}" сәтті жүктелді!',
    downloadError: 'Кітапты жүктеу мүмкін болмады',
    deleteConfirm: 'Өшіру',
    deleteConfirmMessage: '"{title}" кітабын жүктемелерден өшіруге сенімдісіз бе?',
    deleteSuccess: 'Кітап жүктемелерден өшірілді',
    deleteError: 'Кітап өшірілмеді',
    
    // PDF ашу
    downloadRequired: 'Жүктеу қажет',
    downloadRequiredMessage: 'Бұл кітап әлі жүктелмеген.',
    cancel: 'Болдырмау',
    
    // Қателер
    error: 'Қате',
    fileNotFound: 'PDF файлы табылмады',
    openError: 'PDF ашу мүмкін болмады',
    shareError: 'Бөлісу мүмкін болмады',
    shareNotAvailable: 'Бөлісу мүмкін емес',
    
    // Бос тізім
    emptyTitle: 'Кітаптар табылмады',
    emptySubtitle: 'Басқа санатты таңдаңыз немесе іздеуді өзгертіңіз',
    
    // Жүктеу
    loading: 'Кітапхананы жүктеу...',
    
    // Кітап ақпараты
    author: 'Автор',
    description: 'Сипаттама',
    category: 'Санат',
    pages_count: 'Бет саны',
    file_size: 'Файл өлшемі',
  },
  
  ru: {
    // Заголовки
    title: 'Библиотека',
    subtitle: 'PDF книги и материалы',
    
    // Поиск
    searchPlaceholder: 'Поиск книги или автора...',
    
    // Категории
    categories: {
      all: 'Все',
      sign_language: 'Язык жестов',
      education: 'Образование',
      dictionary: 'Словарь',
      children: 'Детские',
      grammar: 'Грамматика',
    },
    
    // Карточка книги
    pages: 'стр',
    download: 'Скачать',
    downloading: 'Загрузка...',
    open: 'Открыть',
    share: 'Поделиться',
    delete: 'Удалить',
    
    // Сообщения
    downloadSuccess: '"{title}" успешно загружена!',
    downloadError: 'Не удалось загрузить книгу',
    deleteConfirm: 'Удалить',
    deleteConfirmMessage: 'Вы уверены, что хотите удалить "{title}" из загрузок?',
    deleteSuccess: 'Книга удалена из загрузок',
    deleteError: 'Книга не удалена',
    
    // Открытие PDF
    downloadRequired: 'Требуется загрузка',
    downloadRequiredMessage: 'Эта книга еще не загружена.',
    cancel: 'Отмена',
    
    // Ошибки
    error: 'Ошибка',
    fileNotFound: 'PDF файл не найден',
    openError: 'Не удалось открыть PDF',
    shareError: 'Не удалось поделиться',
    shareNotAvailable: 'Поделиться невозможно',
    
    // Пустой список
    emptyTitle: 'Книги не найдены',
    emptySubtitle: 'Выберите другую категорию или измените поиск',
    
    // Загрузка
    loading: 'Загрузка библиотеки...',
    
    // Информация о книге
    author: 'Автор',
    description: 'Описание',
    category: 'Категория',
    pages_count: 'Страниц',
    file_size: 'Размер файла',
  },
  
  en: {
    // Headers
    title: 'Library',
    subtitle: 'PDF books and materials',
    
    // Search
    searchPlaceholder: 'Search for book or author...',
    
    // Categories
    categories: {
      all: 'All',
      sign_language: 'Sign Language',
      education: 'Education',
      dictionary: 'Dictionary',
      children: 'Children',
      grammar: 'Grammar',
    },
    
    // Book card
    pages: 'pages',
    download: 'Download',
    downloading: 'Downloading...',
    open: 'Open',
    share: 'Share',
    delete: 'Delete',
    
    // Messages
    downloadSuccess: '"{title}" downloaded successfully!',
    downloadError: 'Failed to download book',
    deleteConfirm: 'Delete',
    deleteConfirmMessage: 'Are you sure you want to delete "{title}" from downloads?',
    deleteSuccess: 'Book deleted from downloads',
    deleteError: 'Book not deleted',
    
    // PDF opening
    downloadRequired: 'Download Required',
    downloadRequiredMessage: 'This book is not downloaded yet.',
    cancel: 'Cancel',
    
    // Errors
    error: 'Error',
    fileNotFound: 'PDF file not found',
    openError: 'Could not open PDF',
    shareError: 'Could not share',
    shareNotAvailable: 'Sharing not available',
    
    // Empty list
    emptyTitle: 'No books found',
    emptySubtitle: 'Choose another category or change search',
    
    // Loading
    loading: 'Loading library...',
    
    // Book info
    author: 'Author',
    description: 'Description',
    category: 'Category',
    pages_count: 'Pages',
    file_size: 'File size',
  },
};

// Аударманы алу функциясы
export const useLibraryTranslation = () => {
  const { appLanguage } = useSettings();
  
  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: any = libraryTranslations[appLanguage];
    
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