import React, { createContext, useContext, useState } from 'react';

type Language = 'kz' | 'ru' | 'en';


type SettingsContextType = {
  appLanguage: Language;
  speechLanguage: Language;

  speechRate: number;
  speechPitch: number;

  setAppLanguage: (lang: Language) => void;
  setSpeechLanguage: (lang: Language) => void;

  setSpeechRate: (rate: number) => void;
  setSpeechPitch: (pitch: number) => void;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [appLanguage, setAppLanguage] = useState<Language>('kz');
  const [speechLanguage, setSpeechLanguage] = useState<Language>('kz');

  const [speechRate, setSpeechRate] = useState(0.9);
  const [speechPitch, setSpeechPitch] = useState(1.0);

  return (
    <SettingsContext.Provider
      value={{
        appLanguage,
        speechLanguage,

        speechRate,
        speechPitch,

        setAppLanguage,
        setSpeechLanguage,

        setSpeechRate,
        setSpeechPitch,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }
  return context;
};