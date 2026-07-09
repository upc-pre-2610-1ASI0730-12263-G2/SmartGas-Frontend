import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { dashboardStore } from '../../application/dashboard.store.js';
import { SessionService } from '../../../infrastructure/session.service.js';
import { formatDate } from '../../../utils/date-format.js';
import { trZone, trStatus, trSeverity, trIncidentType, trPlanName, trPlanDescription } from '../../../utils/domain-translations.js';
import { ExternalWeatherService } from '../../infrastructure/external-weather.service.js';

export default {
  name: 'DashboardPage',

  setup() {
    const router = useRouter();
    const { t, locale } = useI18n();
    const session = new SessionService().getCurrentUser();
    const externalWeatherService = new ExternalWeatherService();

    const loading = ref(true);
    const weatherLoading = ref(false);
    const error = ref('');
    const weatherError = ref('');

    const data = ref({
      sensors: [],
      zones: [],
      activeIncidents: [],
      pendingAlerts: [],
      overallStatus: 'Safe',
      plan: null,
      subscription: null,
      lastReading: null,
      criticalZone: null
    });

    const weather = ref(null);

    const weatherText = computed(() => {
      const isSpanish = locale.value === 'es';

      return {
        title: isSpanish ? 'Clima externo' : 'External Weather',
        temperature: isSpanish ? 'Temperatura' : 'Temperature',
        humidity: isSpanish ? 'Humedad' : 'Humidity',
        wind: isSpanish ? 'Viento' : 'Wind',
        source: isSpanish ? 'Fuente' : 'Source',
        loading: isSpanish ? 'Cargando datos del clima externo...' : 'Loading external weather data...',
        unavailable: isSpanish ? 'Los datos del clima externo no están disponibles.' : 'External weather data is not available.'
      };
    });

    const normalizeStatus = status =>
        String(status || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');

    const effectiveOverallStatus = computed(() => {
      const zoneStatuses = data.value.zones.map(zone => normalizeStatus(zone.status));

      const hasCriticalZone = zoneStatuses.includes('critical');
      const hasWarningZone = zoneStatuses.includes('warning');

      if (hasCriticalZone) {
        return 'Critical';
      }

      if (hasWarningZone) {
        return 'Warning';
      }

      if (data.value.activeIncidents.length > 0 || data.value.pendingAlerts.length > 0) {
        return 'Warning';
      }

      return data.value.overallStatus || 'Safe';
    });

    const statusClass = status => ({
      Safe: 'status-safe',
      Warning: 'status-warning',
      Critical: 'status-critical'
    }[status] || 'status-safe');

    const statusIcon = status => ({
      Safe: 'pi pi-check-circle',
      Warning: 'pi pi-exclamation-triangle',
      Critical: 'pi pi-times-circle'
    }[status] || 'pi pi-check-circle');

    const loadWeather = async () => {
      weatherLoading.value = true;
      weatherError.value = '';

      try {
        weather.value = await externalWeatherService.getCurrentWeather(-12.0464, -77.0428);
      } catch {
        weather.value = null;
        weatherError.value = weatherText.value.unavailable;
      } finally {
        weatherLoading.value = false;
      }
    };

    const loadData = async () => {
      loading.value = true;
      error.value = '';

      try {
        const accountId = session?.accountId ?? session?.id ?? 1;

        const [dashboardData] = await Promise.all([
          dashboardStore.getDashboardData(accountId),
          loadWeather()
        ]);

        data.value = dashboardData;
      } catch {
        error.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    onMounted(loadData);

    return {
      t,
      router,
      loading,
      weatherLoading,
      error,
      weatherError,
      data,
      weather,
      weatherText,
      effectiveOverallStatus,
      formatDate,
      statusClass,
      statusIcon,
      loadData,
      trZone,
      trStatus,
      trSeverity,
      trIncidentType,
      trPlanName,
      trPlanDescription
    };
  },

  template: `
    <section class="content-page" aria-label="Dashboard">
      <div class="page-header">
        <div>
          <h1>{{ t('dashboardTitle') }}</h1>
          <p>{{ t('dashboardSubtitle') }}</p>
        </div>

        <Button
            :label="t('refreshData')"
            icon="pi pi-refresh"
            severity="secondary"
            @click="loadData"
            :loading="loading"
            aria-label="Refresh dashboard data"
        />
      </div>

      <div v-if="error" class="alert-banner" role="alert">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i> {{ error }}
      </div>

      <div v-if="loading && !error" class="loading-state" aria-live="polite">
        <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> {{ t('loading') }}
      </div>

      <template v-if="!loading">
        <div
            class="overall-status-card"
            :class="statusClass(effectiveOverallStatus)"
            role="status"
            :aria-label="'Overall status: ' + trStatus(t, effectiveOverallStatus)"
        >
          <i
              :class="statusIcon(effectiveOverallStatus)"
              class="status-icon-large"
              aria-hidden="true"
          ></i>

          <div>
            <strong class="status-label">{{ t('overallStatus') }}</strong>
            <span class="status-value">{{ trStatus(t, effectiveOverallStatus) }}</span>
          </div>
        </div>

        <div class="metrics-row">
          <article class="metric-card" tabindex="0" aria-label="Connected sensors">
            <div class="metric-icon blue">
              <i class="pi pi-wifi" aria-hidden="true"></i>
            </div>

            <div>
              <strong>{{ data.sensors.filter(s => s.status !== 'Offline').length }}</strong>
              <span>{{ t('connectedSensors') }}</span>
              <small>{{ data.sensors.length }} {{ t('devices') }}</small>
            </div>
          </article>

          <article class="metric-card" tabindex="0" aria-label="Monitored zones">
            <div class="metric-icon blue">
              <i class="pi pi-map-marker" aria-hidden="true"></i>
            </div>

            <div>
              <strong>{{ data.zones.length }}</strong>
              <span>{{ t('monitoredZones') }}</span>
              <small>{{ data.zones.filter(z => z.status === 'Safe').length }} {{ t('statusSafe') }}</small>
            </div>
          </article>

          <article
              class="metric-card"
              :class="data.activeIncidents.length > 0 ? 'orange' : ''"
              tabindex="0"
              aria-label="Active incidents"
          >
            <div class="metric-icon" :class="data.activeIncidents.length > 0 ? 'orange' : 'blue'">
              <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
            </div>

            <div>
              <strong>{{ data.activeIncidents.length }}</strong>
              <span>{{ t('activeIncidents') }}</span>
              <small>{{ t('pending') }}</small>
            </div>
          </article>

          <article
              class="metric-card"
              :class="data.pendingAlerts.length > 0 ? 'red' : ''"
              tabindex="0"
              aria-label="Pending alerts"
          >
            <div class="metric-icon" :class="data.pendingAlerts.length > 0 ? 'red' : 'blue'">
              <i class="pi pi-bell" aria-hidden="true"></i>
            </div>

            <div>
              <strong>{{ data.pendingAlerts.length }}</strong>
              <span>{{ t('pendingAlerts') }}</span>
              <small>{{ t('pending') }}</small>
            </div>
          </article>
        </div>

        <div class="dashboard-detail-grid">
          <article class="panel-card">
            <header>
              <h2>
                <i class="pi pi-map" aria-hidden="true"></i> {{ t('monitoredZones') }}
              </h2>
            </header>

            <div class="zone-list">
              <div
                  v-for="zone in data.zones"
                  :key="zone.id"
                  class="zone-list-item"
                  :class="'zone-' + String(zone.status || 'Safe').toLowerCase()"
              >
                <div class="zone-list-info">
                  <strong>{{ trZone(t, zone.name) }}</strong>
                  <span class="zone-detail">
                    Gas: {{ zone.gasLevel ?? '—' }} ppm &nbsp;|&nbsp; {{ t('temperature') }}: {{ zone.temperature ?? '—' }}°C
                  </span>
                </div>

                <Tag
                    :value="trStatus(t, zone.status)"
                    :severity="zone.status === 'Safe' ? 'success' : zone.status === 'Warning' ? 'warning' : zone.status === 'Critical' ? 'danger' : 'secondary'"
                />
              </div>

              <p v-if="!data.zones.length" class="empty-msg">{{ t('noData') }}</p>
            </div>

            <div class="panel-footer">
              <Button
                  :label="t('viewMonitoring')"
                  icon="pi pi-eye"
                  severity="secondary"
                  size="small"
                  @click="router.push('/app/monitoring')"
              />
            </div>
          </article>

          <article class="panel-card">
            <header>
              <h2>
                <i class="pi pi-exclamation-triangle" aria-hidden="true"></i> {{ t('activeIncidents') }}
              </h2>
            </header>

            <div class="incident-list">
              <div
                  v-for="inc in data.activeIncidents.slice(0, 5)"
                  :key="inc.id"
                  class="incident-list-item"
              >
                <div>
                  <strong>{{ inc.code }}</strong>
                  <span class="incident-detail">
                    {{ trZone(t, inc.zoneName) }} — {{ trIncidentType(t, inc.type) }}
                  </span>
                </div>

                <Tag
                    :value="trSeverity(t, inc.severity)"
                    :severity="inc.severity === 'Critical' ? 'danger' : 'warning'"
                />
              </div>

              <p v-if="!data.activeIncidents.length" class="empty-msg safe-msg">
                <i class="pi pi-check-circle" aria-hidden="true"></i> {{ t('noCriticalZone') }}
              </p>
            </div>

            <div class="panel-footer">
              <Button
                  :label="t('reviewIncidents')"
                  icon="pi pi-list"
                  severity="secondary"
                  size="small"
                  @click="router.push('/app/incidents')"
              />
            </div>
          </article>

          <article class="panel-card">
            <header>
              <h2>
                <i class="pi pi-credit-card" aria-hidden="true"></i> {{ t('currentPlan') }}
              </h2>
            </header>

            <div class="plan-info">
              <strong class="plan-name">{{ data.plan ? trPlanName(t, data.plan) : '—' }}</strong>
              <p class="plan-desc">{{ data.plan ? trPlanDescription(t, data.plan) : '' }}</p>
              <Tag v-if="data.subscription" :value="t('active')" severity="success" />
            </div>

            <div class="panel-footer">
              <Button
                  :label="t('subscription')"
                  icon="pi pi-credit-card"
                  severity="secondary"
                  size="small"
                  @click="router.push('/app/subscription')"
              />
            </div>
          </article>

          <article class="panel-card">
            <header>
              <h2>
                <i class="pi pi-chart-line" aria-hidden="true"></i> {{ t('lastReading') }}
              </h2>
            </header>

            <div class="last-reading">
              <template v-if="data.lastReading">
                <div class="reading-row">
                  <i class="pi pi-fire" aria-hidden="true"></i>
                  <span>Gas: <strong>{{ data.lastReading.gasValue }} ppm</strong></span>
                </div>

                <div class="reading-row">
                  <i class="pi pi-sun" aria-hidden="true"></i>
                  <span>{{ t('temperature') }}: <strong>{{ data.lastReading.temperatureValue }}°C</strong></span>
                </div>

                <div class="reading-row reading-time">
                  <i class="pi pi-clock" aria-hidden="true"></i>
                  <span>{{ formatDate(data.lastReading.timestamp) }}</span>
                </div>
              </template>

              <p v-else class="empty-msg">{{ t('noData') }}</p>
            </div>

            <div class="panel-footer">
              <Button
                  :label="t('viewReports')"
                  icon="pi pi-chart-bar"
                  severity="secondary"
                  size="small"
                  @click="router.push('/app/reports')"
              />
            </div>
          </article>

          <article class="panel-card">
            <header>
              <h2>
                <i class="pi pi-cloud-sun" aria-hidden="true"></i> {{ weatherText.title }}
              </h2>
            </header>

            <div class="last-reading">
              <div v-if="weatherLoading" class="reading-row">
                <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                <span>{{ weatherText.loading }}</span>
              </div>

              <template v-else-if="weather">
                <div class="reading-row">
                  <i class="pi pi-sun" aria-hidden="true"></i>
                  <span>
                    {{ weatherText.temperature }}:
                    <strong>{{ weather.temperature }} {{ weather.temperatureUnit || '°C' }}</strong>
                  </span>
                </div>

                <div class="reading-row">
                  <i class="pi pi-cloud" aria-hidden="true"></i>
                  <span>
                    {{ weatherText.humidity }}:
                    <strong>{{ weather.relativeHumidity }} {{ weather.relativeHumidityUnit || '%' }}</strong>
                  </span>
                </div>

                <div class="reading-row">
                  <i class="pi pi-compass" aria-hidden="true"></i>
                  <span>
                    {{ weatherText.wind }}:
                    <strong>{{ weather.windSpeed }} {{ weather.windSpeedUnit || 'km/h' }}</strong>
                  </span>
                </div>

                <div class="reading-row reading-time">
                  <i class="pi pi-database" aria-hidden="true"></i>
                  <span>{{ weatherText.source }}: {{ weather.source || 'Open-Meteo' }}</span>
                </div>
              </template>

              <p v-else class="empty-msg">
                {{ weatherError || weatherText.unavailable }}
              </p>
            </div>
          </article>
        </div>
      </template>
    </section>`
};