import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

export default {
  name: 'NotFoundPage',
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    return { t, router };
  },
  template: `
    <section class="not-found-page" aria-label="Page not found">
      <div class="not-found-content">
        <i class="pi pi-exclamation-circle not-found-icon" aria-hidden="true"></i>
        <h1>404</h1>
        <h2>{{ t('notFound') }}</h2>
        <p>{{ t('notFoundText') }}</p>
        <Button :label="t('goHome')" icon="pi pi-home" @click="router.push('/app/dashboard')" />
      </div>
    </section>`
};
