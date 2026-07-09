import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { authStore } from '../../application/authentication.store.js';
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.component.js';

export default {
  name: 'LoginPage',
  components: { LanguageSwitcher },
  setup() {
    const router = useRouter();
    const { t } = useI18n();
    const email = ref('');
    const password = ref('');
    const remember = ref(true);
    const error = ref('');
    const loading = ref(false);

    const login = async () => {
      error.value = '';
      if (!email.value || !password.value) {
        error.value = t('emptyFields');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value)) {
        error.value = t('emailInvalid');
        return;
      }
      loading.value = true;
      try {
        const account = await authStore.login(email.value, password.value);
        if (account) router.push('/app/dashboard');
        else error.value = t('invalidCredentials');
      } catch {
        error.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    return { t, email, password, remember, error, loading, login, router };
  },
  template: `
    <section class="auth-page auth-page-polished" aria-label="Login">
      <div class="auth-visual-panel">
        <div class="auth-brand-line">
          <img src="/images/logo.png" alt="SmartGas logo" class="auth-mini-logo" />
          <strong>SmartGas</strong>
        </div>
        <div class="auth-visual-copy">
          <span class="eyebrow">{{ t('appTagline') }}</span>
          <h1>{{ t('loginTitle') }}</h1>
          <p>{{ t('loginBrandText') }}</p>
        </div>
        <div class="auth-benefit-card glass-card">
          <div class="auth-benefit-row">
            <span class="benefit-icon"><i class="pi pi-bolt"></i></span>
            <div><strong>{{ t('authBenefitRealtime') }}</strong><small>{{ t('authBenefitRealtimeText') }}</small></div>
          </div>
          <div class="auth-benefit-row">
            <span class="benefit-icon"><i class="pi pi-bell"></i></span>
            <div><strong>{{ t('authBenefitAlerts') }}</strong><small>{{ t('authBenefitAlertsText') }}</small></div>
          </div>
          <div class="auth-benefit-row">
            <span class="benefit-icon"><i class="pi pi-map-marker"></i></span>
            <div><strong>{{ t('authBenefitZones') }}</strong><small>{{ t('authBenefitZonesText') }}</small></div>
          </div>
        </div>
      </div>

      <div class="auth-form-panel">
        <div class="auth-lang-row">
          <span>{{ t('language') }}</span>
          <LanguageSwitcher />
        </div>
        <div class="auth-card-form">
          <p class="auth-switch top-switch">
            {{ t('needAccount') }}
            <button type="button" class="link-btn" @click="router.push('/register')">{{ t('register') }}</button>
          </p>
          <h2>{{ t('login') }}</h2>
          <p class="form-subtitle">{{ t('loginSubtitle') }}</p>
          <form aria-label="Login form" @submit.prevent="login">
            <div class="field-group input-with-icon">
              <label for="login-email">{{ t('email') }}</label>
              <i class="pi pi-envelope" aria-hidden="true"></i>
              <InputText id="login-email" v-model="email" type="email" :placeholder="t('emailPlaceholder')" aria-required="true" class="w-full" />
            </div>
            <div class="field-group input-with-icon">
              <div class="field-line"><label for="login-password">{{ t('password') }}</label><button type="button" class="link-btn tiny">{{ t('forgotPassword') }}</button></div>
              <i class="pi pi-lock" aria-hidden="true"></i>
              <InputText id="login-password" v-model="password" type="password" :placeholder="t('passwordPlaceholder')" aria-required="true" class="w-full" />
            </div>
            <label class="check-line"><input type="checkbox" v-model="remember" /> <span>{{ t('rememberDevice') }}</span></label>
            <p v-if="error" class="form-error" role="alert" aria-live="polite"><i class="pi pi-times-circle"></i> {{ error }}</p>
            <Button type="submit" :label="loading ? t('loading') : t('login')" icon="pi pi-arrow-right" iconPos="right" :loading="loading" class="auth-submit w-full" />
          </form>
          <p class="demo-hint"><strong>{{ t('demoAccess') }}:</strong> usuario@smartgas.com / smartgas</p>
        </div>
      </div>
    </section>`
};
