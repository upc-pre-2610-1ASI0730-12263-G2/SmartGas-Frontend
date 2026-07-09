import { onMounted, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { settingsStore } from '../../application/settings.store.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import { trZone, trStatus, trSensorType, trSensorName } from '../../../../shared/utils/domain-translations.js';
import { setSmartGasLocale, getSmartGasLocale } from '../../../../i18n/index.js';

export default {
  name: 'SettingsPage',

  setup() {
    const { t, locale } = useI18n();
    const router = useRouter();
    const toast = useToast();
    const sessionService = new SessionService();

    const loading = ref(true);
    const saveLoading = ref(false);
    const errorMsg = ref('');

    const form = ref({
      gasThreshold: 50,
      temperatureThreshold: 45,
      notificationsEnabled: true,
      language: getSmartGasLocale(),
      darkMode: false
    });

    const emergencyContact = ref({
      name: '',
      phone: '',
      email: ''
    });

    const originalForm = ref({ ...form.value });
    const originalEmergencyContact = ref({ ...emergencyContact.value });

    const zones = ref([]);
    const sensors = ref([]);

    const zoneRows = computed(() =>
        zones.value.map(zone => ({
          ...zone,
          sensorCountReal: sensors.value.filter(sensor => sensor.zoneId === zone.id).length
        }))
    );

    const getAccountId = () => {
      const currentUser = sessionService.getCurrentUser();
      return currentUser?.accountId ?? currentUser?.id ?? 1;
    };

    const applyVisualPreferences = () => {
      const isDarkMode = Boolean(form.value.darkMode);

      document.body.classList.toggle('dark-mode', isDarkMode);
      document.documentElement.classList.toggle('dark-mode', isDarkMode);
      localStorage.setItem('smartgas-theme', isDarkMode ? 'dark' : 'light');
    };

    const normalizeLanguage = language => {
      if (language === 'es-419' || language === 'es') {
        return 'es';
      }

      return 'en';
    };

    const getStoredTheme = () => {
      return localStorage.getItem('smartgas-theme') === 'dark';
    };

    const getStoredLanguage = () => {
      return normalizeLanguage(localStorage.getItem('smartgas-language') || getSmartGasLocale());
    };

    const applyLanguage = language => {
      const normalizedLanguage = setSmartGasLocale(normalizeLanguage(language));
      locale.value = normalizedLanguage;
      form.value.language = normalizedLanguage;
    };

    const loadData = async () => {
      loading.value = true;
      errorMsg.value = '';

      try {
        const accountId = getAccountId();

        const [
          settingsResponse,
          emergencyContactResponse,
          zonesResponse,
          sensorsResponse
        ] = await Promise.all([
          settingsStore.getSettings(accountId),
          settingsStore.getEmergencyContact(accountId),
          settingsStore.getZones(accountId),
          settingsStore.getSensors(accountId)
        ]);

        form.value = {
          gasThreshold: Number(settingsResponse.gasThreshold ?? settingsResponse.gasWarningLimit ?? 50),
          temperatureThreshold: Number(settingsResponse.temperatureThreshold ?? settingsResponse.temperatureWarningLimit ?? 45),
          notificationsEnabled: Boolean(settingsResponse.notificationsEnabled ?? settingsResponse.webAlerts ?? true),
          language: getStoredLanguage(),
          darkMode: getStoredTheme()
        };

        emergencyContact.value = {
          name: emergencyContactResponse.name || '',
          phone: emergencyContactResponse.phone || '',
          email: emergencyContactResponse.email || ''
        };

        originalForm.value = { ...form.value };
        originalEmergencyContact.value = { ...emergencyContact.value };

        zones.value = zonesResponse;
        sensors.value = sensorsResponse;

        applyLanguage(form.value.language);
        applyVisualPreferences();
      } catch {
        errorMsg.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    const validateSettings = () => {
      if (Number(form.value.gasThreshold) <= 0) {
        toast.add({
          severity: 'warning',
          summary: t('emptyFields'),
          life: 3000
        });
        return false;
      }

      if (Number(form.value.temperatureThreshold) <= 0) {
        toast.add({
          severity: 'warning',
          summary: t('emptyFields'),
          life: 3000
        });
        return false;
      }

      if (!emergencyContact.value.name.trim()) {
        toast.add({
          severity: 'warning',
          summary: t('emptyFields'),
          life: 3000
        });
        return false;
      }

      if (!emergencyContact.value.phone.trim()) {
        toast.add({
          severity: 'warning',
          summary: t('emptyFields'),
          life: 3000
        });
        return false;
      }

      if (!emergencyContact.value.email.trim()) {
        toast.add({
          severity: 'warning',
          summary: t('emptyFields'),
          life: 3000
        });
        return false;
      }

      return true;
    };

    const saveAll = async () => {
      if (!validateSettings()) {
        return;
      }

      saveLoading.value = true;

      try {
        const accountId = getAccountId();

        const [savedSettings, savedEmergencyContact] = await Promise.all([
          settingsStore.saveSettings(accountId, {
            accountId,
            gasThreshold: Number(form.value.gasThreshold),
            temperatureThreshold: Number(form.value.temperatureThreshold),
            gasWarningLimit: Number(form.value.gasThreshold),
            temperatureWarningLimit: Number(form.value.temperatureThreshold),
            notificationsEnabled: Boolean(form.value.notificationsEnabled),
            webAlerts: Boolean(form.value.notificationsEnabled),
            emailAlerts: Boolean(form.value.notificationsEnabled),
            language: form.value.language,
            darkMode: Boolean(form.value.darkMode)
          }),
          settingsStore.saveEmergencyContact(accountId, {
            name: emergencyContact.value.name.trim(),
            phone: emergencyContact.value.phone.trim(),
            email: emergencyContact.value.email.trim()
          })
        ]);

        form.value = {
          gasThreshold: Number(savedSettings.gasThreshold ?? savedSettings.gasWarningLimit ?? form.value.gasThreshold),
          temperatureThreshold: Number(savedSettings.temperatureThreshold ?? savedSettings.temperatureWarningLimit ?? form.value.temperatureThreshold),
          notificationsEnabled: Boolean(savedSettings.notificationsEnabled ?? form.value.notificationsEnabled),
          language: normalizeLanguage(form.value.language),
          darkMode: Boolean(form.value.darkMode)
        };

        emergencyContact.value = {
          name: savedEmergencyContact.name || '',
          phone: savedEmergencyContact.phone || '',
          email: savedEmergencyContact.email || ''
        };

        originalForm.value = { ...form.value };
        originalEmergencyContact.value = { ...emergencyContact.value };

        applyLanguage(form.value.language);
        applyVisualPreferences();

        toast.add({
          severity: 'success',
          summary: t('settingsSaved'),
          life: 3000
        });
      } catch {
        toast.add({
          severity: 'error',
          summary: t('errorSaving'),
          life: 3000
        });
      } finally {
        saveLoading.value = false;
      }
    };

    const resetAll = () => {
      form.value = { ...originalForm.value };
      emergencyContact.value = { ...originalEmergencyContact.value };

      applyLanguage(form.value.language);
      applyVisualPreferences();

      toast.add({
        severity: 'info',
        summary: t('resetApplied'),
        life: 2200
      });
    };

    watch(() => form.value.darkMode, applyVisualPreferences);

    watch(() => form.value.language, value => {
      if (value) {
        applyLanguage(value);
      }
    });

    onMounted(loadData);

    return {
      t,
      router,
      loading,
      saveLoading,
      errorMsg,
      form,
      emergencyContact,
      zoneRows,
      sensors,
      saveAll,
      resetAll,
      trZone,
      trStatus,
      trSensorType,
      trSensorName
    };
  },

  template: `
    <section class="content-page settings-page" aria-label="Settings">
      <div class="page-header settings-header">
        <div>
          <h1>{{ t('settingsTitle') }}</h1>
          <p>{{ t('settingsSubtitle') }}</p>
        </div>

        <div class="header-actions">
          <Button
              :label="t('saveAction')"
              icon="pi pi-check"
              :loading="saveLoading"
              @click="saveAll"
          />

          <Button
              :label="t('resetAction')"
              icon="pi pi-undo"
              severity="secondary"
              @click="resetAll"
          />
        </div>
      </div>

      <div v-if="errorMsg" class="alert-banner" role="alert">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
        {{ errorMsg }}
      </div>

      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
        {{ t('loading') }}
      </div>

      <div v-if="!loading" class="settings-balanced-grid">
        <div class="settings-column">
          <article class="settings-card detection-card">
            <header>
              <span class="settings-icon">
                <i class="pi pi-shield" aria-hidden="true"></i>
              </span>

              <div>
                <h2>{{ t('safetyThresholds') }}</h2>
                <p>{{ t('thresholdsHelp') }}</p>
              </div>
            </header>

            <div class="settings-form-grid clean-thresholds">
              <div class="field-group">
                <label for="settings-gas-threshold">{{ t('gasWarningLimit') }}</label>

                <InputText
                    id="settings-gas-threshold"
                    v-model.number="form.gasThreshold"
                    type="number"
                    class="w-full"
                    :aria-label="t('gasWarningLimit')"
                />
              </div>

              <div class="field-group">
                <label for="settings-temperature-threshold">{{ t('temperatureWarningLimit') }}</label>

                <InputText
                    id="settings-temperature-threshold"
                    v-model.number="form.temperatureThreshold"
                    type="number"
                    class="w-full"
                    :aria-label="t('temperatureWarningLimit')"
                />
              </div>
            </div>

            <p class="settings-note">
              {{ t('thresholdsHelp') }}
            </p>
          </article>

          <article class="settings-card zones-card-balanced">
            <header>
              <span class="settings-icon">
                <i class="pi pi-map-marker" aria-hidden="true"></i>
              </span>

              <div>
                <h2>{{ t('zoneConfiguration') }}</h2>
                <p>{{ t('monitoredZones') }}</p>
              </div>
            </header>

            <div class="zone-settings-list">
              <div
                  v-for="zone in zoneRows"
                  :key="zone.id"
                  class="zone-settings-row"
              >
                <div>
                  <strong>{{ trZone(t, zone.name) }}</strong>
                  <small>
                    {{ t('sensorCountText', { count: zone.sensorCountReal }) }}
                    ·
                    {{ zone.sensitivity || 'Medium' }}
                  </small>
                </div>

                <Tag
                    :value="zone.status === 'Safe' ? t('activeZone') : t('attentionZone')"
                    :severity="zone.status === 'Safe' ? 'success' : zone.status === 'Critical' ? 'danger' : 'warning'"
                />
              </div>
            </div>

            <div class="settings-card-actions">
              <Button
                  :label="t('openMonitoring')"
                  severity="secondary"
                  @click="router.push('/app/monitoring')"
              />

              <Button
                  :label="t('manageDevices')"
                  severity="secondary"
                  @click="router.push('/app/devices')"
              />
            </div>
          </article>

          <article class="settings-card">
            <header>
              <span class="settings-icon">
                <i class="pi pi-phone" aria-hidden="true"></i>
              </span>

              <div>
                <h2>{{ t('emergencyContact') }}</h2>
                <p>{{ t('notifyEmergencyContact') }}</p>
              </div>
            </header>

            <div class="settings-form-grid">
              <div class="field-group">
                <label for="settings-emergency-name">{{ t('emergencyName') }}</label>

                <InputText
                    id="settings-emergency-name"
                    v-model="emergencyContact.name"
                    class="w-full"
                    :aria-label="t('emergencyName')"
                />
              </div>

              <div class="field-group">
                <label for="settings-emergency-phone">{{ t('emergencyPhone') }}</label>

                <InputText
                    id="settings-emergency-phone"
                    v-model="emergencyContact.phone"
                    class="w-full"
                    :aria-label="t('emergencyPhone')"
                />
              </div>

              <div class="field-group">
                <label for="settings-emergency-email">{{ t('emergencyEmail') }}</label>

                <InputText
                    id="settings-emergency-email"
                    v-model="emergencyContact.email"
                    class="w-full"
                    :aria-label="t('emergencyEmail')"
                />
              </div>
            </div>

            <p class="settings-note">
              {{ t('notifyEmergencyContact') }}
            </p>
          </article>
        </div>

        <div class="settings-column">
          <article class="settings-card">
            <header>
              <span class="settings-icon">
                <i class="pi pi-bell" aria-hidden="true"></i>
              </span>

              <div>
                <h2>{{ t('notificationPreferences') }}</h2>
                <p>{{ t('notificationChannels') }}</p>
              </div>
            </header>

            <div class="settings-list">
              <label for="settings-notifications-enabled">
                <span>{{ t('notificationPreferences') }}</span>

                <input
                    id="settings-notifications-enabled"
                    type="checkbox"
                    v-model="form.notificationsEnabled"
                    role="switch"
                    :aria-label="t('notificationPreferences')"
                />
              </label>
            </div>

            <p class="settings-note">
              {{ t('latestNotifications') }}
            </p>
          </article>

          <article class="settings-card">
            <header>
              <span class="settings-icon">
                <i class="pi pi-microchip" aria-hidden="true"></i>
              </span>

              <div>
                <h2>{{ t('connectedSensors') }}</h2>
                <p>{{ t('sensorPreferencesHelp') }}</p>
              </div>
            </header>

            <div v-if="sensors.length === 0" class="empty-state">
              {{ t('noData') }}
            </div>

            <div
                v-for="sensor in sensors"
                :key="sensor.id"
                class="zone-settings-row"
            >
              <div>
                <strong>{{ trSensorName(t, sensor.name) }}</strong>
                <small>{{ sensor.code }} · {{ trSensorType(t, sensor.type) }}</small>
              </div>

              <Tag
                  :value="trStatus(t, sensor.status)"
                  :severity="sensor.status === 'Online' ? 'success' : sensor.status === 'Critical' ? 'danger' : 'warning'"
              />
            </div>
          </article>

          <article class="settings-card compact-interface-card">
            <header>
              <span class="settings-icon">
                <i class="pi pi-globe" aria-hidden="true"></i>
              </span>

              <div>
                <h2>{{ t('interfacePreferences') }}</h2>
                <p>{{ t('languagePreference') }}</p>
              </div>
            </header>

            <div class="settings-list">
              <label for="settings-language-preference">
                <span>{{ t('languagePreference') }}</span>

                <Dropdown
                    inputId="settings-language-preference"
                    v-model="form.language"
                    :options="[
                    { label: 'English', value: 'en' },
                    { label: 'Español', value: 'es' }
                  ]"
                    optionLabel="label"
                    optionValue="value"
                    class="medium-input"
                    :aria-label="t('languagePreference')"
                />
              </label>

              <label for="settings-dark-mode">
                <span>{{ t('darkMode') }}</span>

                <input
                    id="settings-dark-mode"
                    type="checkbox"
                    v-model="form.darkMode"
                    role="switch"
                    :aria-label="t('darkMode')"
                />
              </label>
            </div>
          </article>
        </div>
      </div>
    </section>
  `
};