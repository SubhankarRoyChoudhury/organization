import i18next from "i18next";
import { initReactI18next } from "react-i18next";

let instance;
const supportedLanguages = [
  "as",
  "bn",
  "brx",
  "doi",
  "en",
  "gu",
  "hi",
  "kn",
  "ks",
  "kok",
  "mai",
  "ml",
  "mni",
  "mr",
  "ne",
  "or",
  "pa",
  "sa",
  "sat",
  "sd",
  "ta",
  "te",
  "ur",
];

export default function initI18n() {
  if (instance) {
    return instance;
  }

  instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}
