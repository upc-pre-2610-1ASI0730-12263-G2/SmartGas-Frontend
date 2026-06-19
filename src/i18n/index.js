import { createI18n } from 'vue-i18n';
import en from '../locales/en.json';
import es from '../locales/es.json';

const SUPPORTED_LOCALES = ['en', 'es'];
const STORAGE_KEY = 'smartgas-language';
const DEFAULT_LOCALE = 'en';

function normalizeLocale(locale) {
  if (locale === 'es' || locale === 'es-419') {
    return 'es';
  }

  return 'en';
}

function getInitialLocale() {
  const savedLocale = localStorage.getItem(STORAGE_KEY);

  if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
    return savedLocale;
  }

  return DEFAULT_LOCALE;
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, es }
});

export function setSmartGasLocale(locale) {
  const normalizedLocale = normalizeLocale(locale);

  localStorage.setItem(STORAGE_KEY, normalizedLocale);
  i18n.global.locale.value = normalizedLocale;

  return normalizedLocale;
}

export function getSmartGasLocale() {
  const savedLocale = localStorage.getItem(STORAGE_KEY);

  if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
    return savedLocale;
  }

  return DEFAULT_LOCALE;
}

export default i18n;