import { useSettings } from "@/context/SettingsContext";
import { translations } from "./translations";

export const useTranslation = () => {
  const { appLanguage } = useSettings();

  const t = (key: keyof typeof translations.kz) => {
    return translations[appLanguage][key] || key;
  };

  return { t };
};