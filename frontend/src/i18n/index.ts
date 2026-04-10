import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en/translation";
import fa from "../locales/fa/translation";

const STORAGE_KEY = "gym-coach-locale";

function getInitialLng(): string {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "fa" || s === "en") return s;
  } catch {
    /* ignore */
  }
  return "fa";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
  },
  lng: getInitialLng(),
  fallbackLng: ["fa", "en"],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng.startsWith("fa") ? "fa" : "en");
  } catch {
    /* ignore */
  }
});

export default i18n;
