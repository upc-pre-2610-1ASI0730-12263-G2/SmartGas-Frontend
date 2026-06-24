import { onMounted, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { monitoringStore } from '../../application/monitoring.store.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import { formatDate } from '../../../../shared/utils/date-format.js';
import { trZone, trStatus, trSeverity, trSensorType, trIncidentType, trPlanName } from '../../../../shared/utils/domain-translations.js';

export default {
  name: 'MonitoringPage',
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const toast = useToast();
    const session = new SessionService().getCurrentUser();

    const zones = ref([]);
    const sensors = ref([]);
    const currentPlan = ref(null);
    const activeFilter = ref('All');
    const loadingData = ref(true);
    const errorMsg = ref('');
    const zoneSaveLoading = ref(false);
    const showZoneDialog = ref(false);
    const zoneDraft = ref({ name: '', sensitivity: 'Medium' });

    const showSimulateDialog = ref(false);
    const simSensorId = ref(null);
    const simGas = ref(20);
    const simTemp = ref(28);
    const simLoading = ref(false);

    const filters = computed(() => [
      t('allZones'), t('filterSafe'), t('filterWarning'), t('filterCritical'), t('filterOffline')
    ]);

    const sensitivityOptions = computed(() => [
      { label: t('high'), value: 'High' },
      { label: t('medium'), value: 'Medium' },
      { label: t('low'), value: 'Low' }
    ]);

    const filteredZones = computed(() => {
      if (activeFilter.value === 'All' || activeFilter.value === t('allZones')) return zones.value;

      return zones.value.filter(z => {
        if (activeFilter.value === t('filterSafe') || activeFilter.value === 'Safe') return z.status === 'Safe';
        if (activeFilter.value === t('filterWarning') || activeFilter.value === 'Warning') return z.status === 'Warning';
        if (activeFilter.value === t('filterCritical') || activeFilter.value === 'Critical') return z.status === 'Critical';
        if (activeFilter.value === t('filterOffline') || activeFilter.value === 'Offline') return z.status === 'Offline';
        return true;
      });
    });

    const hasZones = computed(() => zones.value.length > 0);
    const hasSensors = computed(() => sensors.value.length > 0);
    const maxZones = computed(() => currentPlan.value?.maxZones || 3);
    const maxZonesLabel = computed(() => maxZones.value === 'Unlimited' ? t('unlimitedShort') : String(maxZones.value));
    const canAddZone = computed(() => maxZones.value === 'Unlimited' || zones.value.length < Number(maxZones.value || 0));
    const zoneLimitExceeded = computed(() => maxZones.value !== 'Unlimited' && zones.value.length > Number(maxZones.value || 0));
    const zoneLimitReached = computed(() => maxZones.value !== 'Unlimited' && zones.value.length >= Number(maxZones.value || 0));
    const remainingZones = computed(() => maxZones.value === 'Unlimited' ? t('unlimitedShort') : Math.max(Number(maxZones.value || 0) - zones.value.length, 0));

    const sensorOptions = computed(() => sensors.value.filter(s => s.status !== 'Offline').map(s => ({
      label: `${s.code} – ${s.name} (${trSensorType(t, s.type)})`,
      value: s.id
    })));
    const selectedSensor = computed(() =>
        sensors.value.find(sensor => sensor.id === simSensorId.value) || null
    );

    const selectedSensorType = computed(() =>
        String(selectedSensor.value?.type || '').toLowerCase()
    );

    const allowsGasValue = computed(() =>
        selectedSensorType.value === 'gas' ||
        selectedSensorType.value === 'multisensor'
    );

    const allowsTemperatureValue = computed(() =>
        selectedSensorType.value === 'temperature' ||
        selectedSensorType.value === 'multisensor'
    );

    watch(simSensorId, () => {
      if (!allowsGasValue.value) {
        simGas.value = null;
      } else if (simGas.value === null || simGas.value === undefined || simGas.value === '') {
        simGas.value = 20;
      }

      if (!allowsTemperatureValue.value) {
        simTemp.value = null;
      } else if (simTemp.value === null || simTemp.value === undefined || simTemp.value === '') {
        simTemp.value = 28;
      }
    });

    const zoneForSensor = computed(() => {
      if (!simSensorId.value) return null;

      const sensor = sensors.value.find(item => item.id === simSensorId.value);
      return sensor ? zones.value.find(zone => zone.id === sensor.zoneId) : null;
    });

    const statusSeverity = status => ({
      Safe: 'success',
      Warning: 'warning',
      Critical: 'danger',
      Offline: 'secondary'
    }[status] || 'info');

    const riskSeverity = risk => ({
      Low: 'success',
      Medium: 'warning',
      High: 'danger',
      Critical: 'danger'
    }[risk] || 'info');

    const loadData = async () => {
      loadingData.value = true;
      errorMsg.value = '';

      try {
        [zones.value, sensors.value, currentPlan.value] = await Promise.all([
          monitoringStore.getZones(session.id),
          monitoringStore.getSensors(session.id),
          monitoringStore.getPlanForAccount(session.id)
        ]);
      } catch {
        errorMsg.value = t('apiError');
      } finally {
        loadingData.value = false;
      }
    };

    const resetZoneDraft = () => {
      zoneDraft.value = { name: '', sensitivity: 'Medium' };
    };

    const openZoneDialog = () => {
      resetZoneDraft();
      showZoneDialog.value = true;
    };

    const saveZone = async () => {
      if (!String(zoneDraft.value.name || '').trim()) {
        toast.add({ severity: 'warning', summary: t('emptyFields'), life: 3000 });
        return;
      }

      if (!canAddZone.value) {
        toast.add({ severity: 'warning', summary: t('zoneLimitReached'), life: 3500 });
        return;
      }

      zoneSaveLoading.value = true;

      try {
        await monitoringStore.createZone(session.id, zoneDraft.value);
        resetZoneDraft();
        await loadData();

        if (showZoneDialog.value) {
          showZoneDialog.value = false;
        }

        toast.add({ severity: 'success', summary: t('zoneSaved'), life: 3000 });
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: error?.code === 'ZONE_LIMIT_REACHED' ? t('zoneLimitReached') : t('errorSaving'),
          life: 3000
        });
      } finally {
        zoneSaveLoading.value = false;
      }
    };

    const randomize = () => {
      if (allowsGasValue.value) {
        simGas.value = Math.floor(Math.random() * 70) + 5;
      }

      if (allowsTemperatureValue.value) {
        simTemp.value = Math.floor(Math.random() * 50) + 20;
      }
    };

    const openSimulate = () => {
      if (!sensorOptions.value.length) return;

      simSensorId.value = sensorOptions.value[0]?.value || null;
      simGas.value = 20;
      simTemp.value = 28;
      showSimulateDialog.value = true;
    };

    const processReading = async () => {
      if (!simSensorId.value) return;

      simLoading.value = true;

      try {
        const gasValue = allowsGasValue.value ? simGas.value : null;
        const temperatureValue = allowsTemperatureValue.value ? simTemp.value : null;

        const result = await monitoringStore.processReading(
            session.id,
            simSensorId.value,
            gasValue,
            temperatureValue
        );

        showSimulateDialog.value = false;
        await loadData();

        toast.add({ severity: 'success', summary: t('readingSaved'), life: 3000 });

        if (result.incidentCreated) {
          toast.add({
            severity: result.severity === 'Critical' ? 'error' : 'warning',
            summary: t('incidentCreated'),
            detail: `${trIncidentType(t, result.incidentType)} – ${trSeverity(t, result.severity)}`,
            life: 5000
          });
        } else {
          toast.add({ severity: 'info', summary: t('noIncidentCreated'), life: 3000 });
        }
      } catch {
        toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 });
      } finally {
        simLoading.value = false;
      }
    };

    const sensorsForZone = zoneId =>
        sensors.value.filter(sensor => sensor.zoneId === zoneId && sensor.status !== 'Offline').length;

    onMounted(loadData);

    return {
      t,
      router,
      trZone,
      trStatus,
      trSeverity,
      trSensorType,
      trIncidentType,
      trPlanName,
      zones,
      sensors,
      currentPlan,
      activeFilter,
      filters,
      filteredZones,
      sensorOptions,
      zoneForSensor,
      hasZones,
      hasSensors,
      sensitivityOptions,
      zoneDraft,
      loadingData,
      errorMsg,
      zoneLimitExceeded,
      zoneLimitReached,
      zoneSaveLoading,
      showZoneDialog,
      showSimulateDialog,
      simSensorId,
      simGas,
      simTemp,
      simLoading,
      allowsGasValue,
      allowsTemperatureValue,
      maxZonesLabel,
      canAddZone,
      remainingZones,
      statusSeverity,
      riskSeverity,
      loadData,
      resetZoneDraft,
      openZoneDialog,
      saveZone,
      randomize,
      openSimulate,
      processReading,
      sensorsForZone,
      formatDate
    };
  },

  template: `
    <section class="content-page" aria-label="Monitoring">
      <div class="page-header">
        <div>
          <h1>{{ t('monitoringTitle') }}</h1>
          <p>{{ t('monitoringSubtitle') }}</p>
        </div>

        <div class="header-actions">
          <Button
              :label="t('refreshReadings')"
              icon="pi pi-refresh"
              severity="secondary"
              @click="loadData"
              :loading="loadingData"
              aria-label="Refresh readings"
          />

          <Button
              :label="t('addZone')"
              icon="pi pi-plus"
              severity="secondary"
              :disabled="loadingData || !canAddZone"
              @click="openZoneDialog"
              aria-label="Add monitored zone"
          />

          <Button
              class="iot-reading-button"
              :label="t('simulateReading')"
              icon="pi pi-bolt"
              @click="openSimulate"
              :disabled="!hasSensors"
              aria-label="Simulate IoT reading"
          />
        </div>
      </div>

      <div v-if="errorMsg" class="alert-banner" role="alert">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i> {{ errorMsg }}
      </div>

      <div v-if="!loadingData && zoneLimitExceeded" class="plan-limit-banner warning" role="alert">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i> {{ t('zoneLimitExceeded', { max: maxZonesLabel }) }}
      </div>

      <div v-else-if="!loadingData && hasZones && zoneLimitReached" class="plan-limit-banner info" role="status">
        <i class="pi pi-info-circle" aria-hidden="true"></i> {{ t('zoneLimitReachedInfo', { max: maxZonesLabel }) }}
      </div>

      <div v-else-if="!loadingData && currentPlan" class="plan-limit-banner info" role="status">
        <i class="pi pi-info-circle" aria-hidden="true"></i>
        {{ t('zonePlanLimitText', { plan: trPlanName(t, currentPlan), max: maxZonesLabel }) }}
      </div>

      <div class="filter-bar" role="group" :aria-label="t('filterSafe')">
        <button
            v-for="filter in ['All', 'Safe', 'Warning', 'Critical', 'Offline']"
            :key="filter"
            class="filter-btn"
            :class="{ active: activeFilter === filter }"
            @click="activeFilter = filter"
            :aria-pressed="activeFilter === filter"
        >
          {{ filter === 'All' ? t('allZones') : filter === 'Safe' ? t('filterSafe') : filter === 'Warning' ? t('filterWarning') : filter === 'Critical' ? t('filterCritical') : t('filterOffline') }}
        </button>
      </div>

      <div v-if="loadingData" class="loading-state" aria-live="polite">
        <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> {{ t('loading') }}
      </div>

      <div v-if="!loadingData && !hasSensors" class="monitoring-empty-state zone-setup-state" aria-live="polite">
        <div class="monitoring-empty-icon">
          <i :class="hasZones ? 'pi pi-microchip' : 'pi pi-map-marker'"></i>
        </div>

        <h2>{{ hasZones ? t('monitoringNoSensorsTitle') : t('monitoringEmptyTitle') }}</h2>
        <p>{{ hasZones ? t('monitoringNoSensorsText') : t('monitoringEmptyText') }}</p>

        <div class="zone-plan-note" v-if="currentPlan">
          <i class="pi pi-info-circle" aria-hidden="true"></i>
          <span>{{ t('zonePlanLimitText', { plan: trPlanName(t, currentPlan), max: maxZonesLabel }) }}</span>
        </div>

        <div v-if="hasZones" class="created-zones-panel">
          <div class="created-zones-header">
            <h3>{{ t('createdZonesTitle') }}</h3>
            <span>{{ zones.length }} / {{ maxZonesLabel }}</span>
          </div>

          <div class="created-zones-list">
            <article
                v-for="zone in zones"
                :key="zone.id"
                class="created-zone-card"
            >
              <div>
                <strong>{{ trZone(t, zone.name) }}</strong>
                <small>{{ t('zoneSensitivity') }}: {{ trSeverity(t, zone.sensitivity || 'Medium') }}</small>
              </div>

              <Tag
                  :value="trStatus(t, zone.status)"
                  :severity="statusSeverity(zone.status)"
              />
            </article>
          </div>
        </div>

        <div v-if="canAddZone" class="zone-create-panel">
          <div class="zone-create-heading">
            <h3>{{ hasZones ? t('addAnotherZone') : t('createFirstZone') }}</h3>
            <p>{{ t('createZoneHint') }}</p>
          </div>

          <div class="zone-create-grid">
            <div class="field-group">
              <label for="zone-name-input">{{ t('zoneName') }}</label>
              <InputText
                  id="zone-name-input"
                  v-model="zoneDraft.name"
                  class="w-full"
                  :placeholder="t('zoneNamePlaceholder')"
              />
            </div>

            <div class="field-group">
              <label for="zone-sensitivity-input">{{ t('zoneSensitivity') }}</label>
              <Dropdown
                  id="zone-sensitivity-input"
                  v-model="zoneDraft.sensitivity"
                  :options="sensitivityOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
              />
            </div>
          </div>

          <div class="zone-create-actions">
            <small>{{ t('remainingZonesText', { count: remainingZones }) }}</small>
            <Button
                :label="hasZones ? t('saveNewZone') : t('saveFirstZone')"
                icon="pi pi-check"
                :loading="zoneSaveLoading"
                @click="saveZone"
            />
          </div>
        </div>

        <div v-else class="zone-limit-card">
          <i class="pi pi-lock" aria-hidden="true"></i>
          <span>{{ t('zoneLimitReachedDetail', { max: maxZonesLabel }) }}</span>
        </div>

        <div class="monitoring-setup-steps">
          <div class="setup-step">
            <strong>1.</strong>
            <span>{{ t('monitoringStepCreateZones') }}</span>
          </div>

          <div class="setup-step">
            <strong>2.</strong>
            <span>{{ t('monitoringStepAddSensor') }}</span>
          </div>

          <div class="setup-step">
            <strong>3.</strong>
            <span>{{ t('monitoringStepSimulate') }}</span>
          </div>

          <div class="setup-step">
            <strong>4.</strong>
            <span>{{ t('monitoringStepReview') }}</span>
          </div>
        </div>

        <div class="monitoring-empty-actions">
          <Button
              :label="t('addFirstDevice')"
              icon="pi pi-plus"
              severity="secondary"
              :disabled="!hasZones"
              @click="router.push('/app/devices')"
          />
        </div>
      </div>

      <div v-if="!loadingData && hasSensors" class="zones-grid" aria-label="Zone monitoring cards">
        <article
            v-for="zone in filteredZones"
            :key="zone.id"
            class="zone-monitor-card"
            :class="'zone-' + String(zone.status || 'Safe').toLowerCase()"
            tabindex="0"
            :aria-label="trZone(t, zone.name) + ' – ' + trStatus(t, zone.status)"
        >
          <header class="zone-card-header">
            <h2>{{ trZone(t, zone.name) }}</h2>
            <Tag
                :value="trStatus(t, zone.status)"
                :severity="statusSeverity(zone.status)"
            />
          </header>

          <div class="zone-readings">
            <div class="reading-item">
              <i class="pi pi-fire" aria-hidden="true"></i>
              <span>{{ t('gasLevel') }}</span>
              <strong>{{ zone.gasLevel }} ppm</strong>
            </div>

            <div class="reading-item">
              <i class="pi pi-sun" aria-hidden="true"></i>
              <span>{{ t('temperature') }}</span>
              <strong>{{ zone.temperature }}°C</strong>
            </div>

            <div class="reading-item">
              <i class="pi pi-wifi" aria-hidden="true"></i>
              <span>{{ t('sensorsConnected') }}</span>
              <strong>{{ sensorsForZone(zone.id) }}</strong>
            </div>
          </div>

          <div class="zone-footer">
            <Tag
                :value="(t('riskLevel') + ': ' + trSeverity(t, zone.riskLevel || 'Low'))"
                :severity="riskSeverity(zone.riskLevel)"
            />
            <span class="last-updated">{{ formatDate(zone.lastUpdated) }}</span>
          </div>
        </article>

        <p v-if="!filteredZones.length" class="empty-msg">{{ t('noData') }}</p>
      </div>

      <Dialog
          v-model:visible="showZoneDialog"
          :header="t('addZoneTitle')"
          modal
          :style="{ width: '560px' }"
          :aria-label="t('addZoneTitle')"
      >
        <div class="zone-dialog-content">
          <p class="dialog-subtitle">{{ t('createZoneHint') }}</p>

          <div v-if="currentPlan" class="zone-plan-note compact-note">
            <i class="pi pi-info-circle" aria-hidden="true"></i>
            <span>{{ t('zonePlanLimitText', { plan: trPlanName(t, currentPlan), max: maxZonesLabel }) }}</span>
          </div>

          <div v-if="canAddZone" class="zone-create-grid dialog-zone-grid">
            <div class="field-group">
              <label for="dialog-zone-name-input">{{ t('zoneName') }}</label>
              <InputText
                  id="dialog-zone-name-input"
                  v-model="zoneDraft.name"
                  class="w-full"
                  :placeholder="t('zoneNamePlaceholder')"
              />
            </div>

            <div class="field-group">
              <label for="dialog-zone-sensitivity-input">{{ t('zoneSensitivity') }}</label>
              <Dropdown
                  id="dialog-zone-sensitivity-input"
                  v-model="zoneDraft.sensitivity"
                  :options="sensitivityOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
              />
            </div>
          </div>

          <div v-else class="zone-limit-card">
            <i class="pi pi-lock" aria-hidden="true"></i>
            <span>{{ t('zoneLimitReachedDetail', { max: maxZonesLabel }) }}</span>
          </div>
        </div>

        <template #footer>
          <Button
              :label="t('cancelAction')"
              severity="secondary"
              @click="showZoneDialog = false"
          />

          <Button
              :label="t('saveNewZone')"
              icon="pi pi-check"
              :loading="zoneSaveLoading"
              :disabled="!canAddZone"
              @click="saveZone"
          />
        </template>
      </Dialog>

      <Dialog
          v-model:visible="showSimulateDialog"
          :header="t('simulateTitle')"
          modal
          :style="{ width: '520px' }"
          :aria-label="t('simulateTitle')"
      >
        <p class="dialog-subtitle">{{ t('simulateSubtitle') }}</p>

        <div class="simulate-form">
          <div class="field-group">
            <label for="sim-sensor">{{ t('selectSensor') }}</label>
            <Dropdown
                id="sim-sensor"
                v-model="simSensorId"
                :options="sensorOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('selectSensor')"
                class="w-full"
            />
          </div>

          <div class="sim-zone-info" v-if="zoneForSensor">
            <Tag
                :value="trZone(t, zoneForSensor.name)"
                severity="info"
            />&nbsp;
            <Tag
                :value="trStatus(t, zoneForSensor.status)"
                :severity="statusSeverity(zoneForSensor.status)"
            />
          </div>

          <div class="sim-values-row">
            <div class="field-group">
              <label for="sim-gas">{{ t('gasValueLabel') }}</label>
              <InputText
                  id="sim-gas"
                  v-model.number="simGas"
                  type="number"
                  min="0"
                  max="200"
                  class="w-full"
                  :disabled="!allowsGasValue"
              />
            </div>

            <div class="field-group">
              <label for="sim-temp">{{ t('tempValueLabel') }}</label>
              <InputText
                  id="sim-temp"
                  v-model.number="simTemp"
                  type="number"
                  min="0"
                  max="150"
                  class="w-full"
                  :disabled="!allowsTemperatureValue"
              />
            </div>
          </div>

          <Button
              :label="t('randomizeValues')"
              icon="pi pi-random"
              severity="secondary"
              size="small"
              @click="randomize"
          />
        </div>

        <template #footer>
          <Button
              :label="t('cancelAction')"
              severity="secondary"
              @click="showSimulateDialog = false"
          />

          <Button
              :label="t('processReading')"
              icon="pi pi-bolt"
              :loading="simLoading"
              :disabled="!simSensorId"
              @click="processReading"
          />
        </template>
      </Dialog>
    </section>`
};