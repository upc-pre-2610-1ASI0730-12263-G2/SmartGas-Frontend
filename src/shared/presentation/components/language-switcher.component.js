import { useI18n } from 'vue-i18n';
import { setSmartGasLocale } from '../../../i18n/index.js';

export default {
  name: 'LanguageSwitcher',

  setup() {
    const { locale } = useI18n();

    const changeLanguage = lang => {
      locale.value = setSmartGasLocale(lang);
    };

    return {
      locale,
      changeLanguage
    };
  },

  template: `
    <div
        class="lang-switcher"
        aria-label="Language selector"
        role="group"
    >
      <button
          type="button"
          class="lang-btn"
          :class="{ active: locale === 'en' }"
          aria-label="Switch to English"
          @click.stop.prevent="changeLanguage('en')"
      >
        EN
      </button>

      <button
          type="button"
          class="lang-btn"
          :class="{ active: locale === 'es' }"
          aria-label="Cambiar a Español"
          @click.stop.prevent="changeLanguage('es')"
      >
        ES
      </button>
    </div>
  `
};