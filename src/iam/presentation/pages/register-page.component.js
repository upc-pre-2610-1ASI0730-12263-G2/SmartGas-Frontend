import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { authStore } from '../../application/authentication.store.js';
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.component.js';

export default {
  name: 'RegisterPage',
  components: { LanguageSwitcher },
  setup() {
    const router = useRouter();
    const { t } = useI18n();
    const fullName = ref('');
    const email = ref('');
    const password = ref('');
    const confirmPassword = ref('');
    const accountType = ref('commercial');
    const businessName = ref('');
    const acceptedTerms = ref(false);
    const error = ref('');
    const success = ref(false);
    const loading = ref(false);
    const accountTypeOptions = ref([
      { label: t('commercialAccount'), value: 'commercial' },
      { label: t('domesticAccount'), value: 'domestic' }
    ]);

    const register = async () => {
      error.value = '';
      success.value = false;
      if (!fullName.value || !email.value || !password.value || !confirmPassword.value || !businessName.value) {
        error.value = t('emptyFields');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value)) {
        error.value = t('emailInvalid');
        return;
      }
      if (password.value.length < 6) {
        error.value = t('passwordMin');
        return;
      }
      if (password.value !== confirmPassword.value) {
        error.value = t('passwordMismatch');
        return;
      }
      if (!acceptedTerms.value) {
        error.value = t('acceptTerms');
        return;
      }
      loading.value = true;
      try {
        await authStore.register(email.value, password.value, {
          fullName: fullName.value,
          accountType: accountType.value,
          businessName: businessName.value
        });
        success.value = true;
      } catch (err) {
        error.value = err.message === 'EMAIL_EXISTS' ? t('emailExists') : t('apiError');
      } finally {
        loading.value = false;
      }
    };

    return { t, router, fullName, email, password, confirmPassword, accountType, businessName, acceptedTerms, accountTypeOptions, error, success, loading, register };
  },
  template: `
    <section class="auth-page auth-page-polished" aria-label="Register">
      <div class="auth-visual-panel auth-register-panel">
        <div class="auth-brand-line">
          <img src="/images/logo.png" alt="SmartGas logo" class="auth-mini-logo" />
          <strong>SmartGas</strong>
        </div>
        <div class="auth-visual-copy">
          <span class="eyebrow">{{ t('appTagline') }}</span>
          <h1>{{ t('registerTitle') }}</h1>
          <p>{{ t('registerBrandText') }}</p>
        </div>
        <div class="auth-benefit-card glass-card">
          <div class="auth-benefit-row"><span class="benefit-icon"><i class="pi pi-shield"></i></span><div><strong>{{ t('accountVerified') }}</strong><small>{{ t('authBenefitRealtimeText') }}</small></div></div>
          <div class="auth-benefit-row"><span class="benefit-icon"><i class="pi pi-check-circle"></i></span><div><strong>{{ t('dashboardReady') }}</strong><small>{{ t('authBenefitZonesText') }}</small></div></div>
        </div>
      </div>
      <div class="auth-form-panel">
        <div class="auth-lang-row"><span>{{ t('language') }}</span><LanguageSwitcher /></div>
        <div v-if="success" class="auth-success-card">
          <div class="success-orb"><i class="pi pi-check"></i></div>
          <h2>{{ t('accountCreatedTitle') }}</h2>
          <p>{{ t('accountCreatedText') }}</p>
          <Button :label="t('goToDashboard')" icon="pi pi-arrow-right" iconPos="right" class="w-full" @click="router.push('/app/dashboard')" />
        </div>
        <div v-else class="auth-card-form register-card-form">
          <p class="auth-switch top-switch">{{ t('alreadyAccount') }} <button type="button" class="link-btn" @click="router.push('/login')">{{ t('login') }}</button></p>
          <h2>{{ t('register') }}</h2>
          <p class="form-subtitle">{{ t('registerSubtitle') }}</p>
          <form aria-label="Register form" @submit.prevent="register">
            <div class="field-group input-with-icon"><label for="reg-name">{{ t('fullName') }}</label><i class="pi pi-user"></i><InputText id="reg-name" v-model="fullName" :placeholder="t('fullNamePlaceholder')" class="w-full" /></div>
            <div class="field-group input-with-icon"><label for="reg-email">{{ t('email') }}</label><i class="pi pi-envelope"></i><InputText id="reg-email" v-model="email" type="email" :placeholder="t('emailPlaceholder')" class="w-full" /></div>
            <div class="field-group"><label for="reg-type">{{ t('accountType') }}</label><Dropdown id="reg-type" v-model="accountType" :options="accountTypeOptions" optionLabel="label" optionValue="value" class="w-full" /></div>
            <div class="field-group input-with-icon"><label for="reg-business">{{ t('businessName') }}</label><i class="pi pi-building"></i><InputText id="reg-business" v-model="businessName" :placeholder="t('businessNamePlaceholder')" class="w-full" /></div>
            <div class="auth-two-cols">
              <div class="field-group input-with-icon"><label for="reg-password">{{ t('password') }}</label><i class="pi pi-lock"></i><InputText id="reg-password" v-model="password" type="password" :placeholder="t('password')" class="w-full" /></div>
              <div class="field-group input-with-icon"><label for="reg-confirm">{{ t('confirmPassword') }}</label><i class="pi pi-check-circle"></i><InputText id="reg-confirm" v-model="confirmPassword" type="password" :placeholder="t('confirmPassword')" class="w-full" /></div>
            </div>
            <label class="check-line"><input type="checkbox" v-model="acceptedTerms" /> <span>{{ t('termsText') }}</span></label>
            <p v-if="error" class="form-error" role="alert"><i class="pi pi-times-circle"></i> {{ error }}</p>
            <Button type="submit" :label="loading ? t('loading') : t('register')" icon="pi pi-arrow-right" iconPos="right" :loading="loading" class="auth-submit w-full" />
          </form>
        </div>
      </div>
    </section>`
};
