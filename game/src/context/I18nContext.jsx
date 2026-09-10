import { createContext, useContext, useMemo, useState } from 'react';

const messages = {
  lv: {
    language: 'Valoda',
    title: 'Liepājas Ekskursija',
    subtitle: 'Iepazīsti 10 Liepājas nozīmīgākās vietas',
    name: 'Tavs vārds',
    namePlaceholder: 'Ievadi vārdu...',
    nameRequired: 'Lūdzu ievadi savu vārdu!',
    start: 'Sākt ekskursiju →',
    about: 'ℹ Par spēli',
    hint: 'Nospied Enter lai sāktu',
    anonymous: 'Spēlē bez konta. Izveido kontu vēlāk, lai saglabātu vietu līderu tabulā.',
  },
  en: {
    language: 'Language',
    title: 'Liepāja Tour',
    subtitle: 'Explore 10 important places in Liepāja',
    name: 'Your name',
    namePlaceholder: 'Enter your name...',
    nameRequired: 'Please enter your name!',
    start: 'Start tour →',
    about: 'ℹ About the game',
    hint: 'Press Enter to start',
    anonymous: 'Play without an account. Create one later to keep your leaderboard place.',
  },
  ru: {
    language: 'Язык',
    title: 'Экскурсия по Лиепае',
    subtitle: 'Познакомьтесь с 10 важными местами Лиепаи',
    name: 'Ваше имя',
    namePlaceholder: 'Введите имя...',
    nameRequired: 'Введите имя!',
    start: 'Начать экскурсию →',
    about: 'ℹ Об игре',
    hint: 'Нажмите Enter, чтобы начать',
    anonymous: 'Играйте без аккаунта. Зарегистрируйтесь позже, чтобы сохранить место в таблице лидеров.',
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('eksk_language');
    return saved && messages[saved] ? saved : (navigator.language.startsWith('ru') ? 'ru' : navigator.language.startsWith('en') ? 'en' : 'lv');
  });
  const value = useMemo(() => ({
    language,
    setLanguage: next => {
      setLanguage(next);
      localStorage.setItem('eksk_language', next);
    },
    t: messages[language],
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
