import { onMounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { sensorStore } from '../../application/sensor.store.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import { formatDate } from '../../../../shared/utils/date-format.js';
import { trZone, trStatus, trSensorType, trSensorName, trLocationDetail } from '../../../../shared/utils/domain-translations.js';

const defaultForm = () => ({
  name: '',
  code: '',
  type: 'Gas',
  zoneId: null,
  locationDetail: ''
});

export default {
  name: 'DevicesPage',

  setup() {
    const { t } = useI18n();
    const toast = useToast();
    const session = new SessionService().getCurrentUser();

    const sensors = ref([]);
    const zones = ref([]);
    const currentPlan = ref(null);
    const loading = ref(true);
    const errorMsg = ref('');

    const showFormDialog = ref(false);
    const editingId = ref(null);
    const form = ref(defaultForm());
    const formError = ref('');
    const formLoading = ref(false);

    const showDetailDialog = ref(false);
    const selectedSensor = ref(null);

    const sensorTypes = ['Gas', 'Temperature', 'MultiSensor', 'CO', 'Smoke'];

    const maxSensors = computed(() => currentPlan.value?.maxSensors || 5);
    const maxSensorsLabel = computed(() => maxSensors.value === 'Unlimited' ? t('unlimitedShort') : String(maxSensors.value));
    const canAddSensor = computed(() => maxSensors.value === 'Unlimited' || sensors.value.length < Number(maxSensors.value || 0));
    const sensorLimitExceeded = computed(() => maxSensors.value !== 'Unlimited' && sensors.value.length > Number(maxSensors.value || 0));
    const sensorLimitReached = computed(() => maxSensors.value !== 'Unlimited' && sensors.value.length >= Number(maxSensors.value || 0));

    const sensorTypeOptions = computed(() =>
        sensorTypes.map(value => ({
          value,
          label: trSensorType(t, value)
        }))
    );

    const zoneOptions = computed(() =>
        zones.value.map(zone => ({
          label: trZone(t, zone.name),
          value: zone.id
        }))
    );

    const zoneName = zoneId =>
        trZone(t, zones.value.find(zone => zone.id === zoneId)?.name) || '—';

    const statusSeverity = status => ({
      Online: 'success',
      Offline: 'secondary',
      Warning: 'warning',
      Critical: 'danger'
    }[status] || 'info');

    const nextCode = () => {
      const nums = sensors.value.map(sensor =>
          Number(String(sensor.code || '').replace(/\D/g, '')) || 0
      );

      return `SG-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
    };

    const loadData = async () => {
      loading.value = true;
      errorMsg.value = '';

      try {
        [sensors.value, zones.value, currentPlan.value] = await Promise.all([
          sensorStore.getSensors(session.id),
          sensorStore.getZones(session.id),
          sensorStore.getPlanForAccount(session.id)
        ]);
      } catch {
        errorMsg.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    const openAdd = () => {
      if (!zones.value.length) {
        toast.add({ severity: 'warning', summary: t('createZoneFirst'), life: 3500 });
        return;
      }

      if (!canAddSensor.value) {
        toast.add({ severity: 'warning', summary: t('sensorLimitReached'), life: 3500 });
        return;
      }

      editingId.value = null;
      form.value = {
        ...defaultForm(),
        code: nextCode(),
        zoneId: zones.value[0]?.id || null
      };
      formError.value = '';
      showFormDialog.value = true;
    };

    const openEdit = sensor => {
      editingId.value = sensor.id;
      form.value = {
        name: sensor.name,
        code: sensor.code,
        type: sensor.type,
        zoneId: sensor.zoneId,
        locationDetail: sensor.locationDetail || ''
      };
      formError.value = '';
      showFormDialog.value = true;
    };

    const openDetail = sensor => {
      selectedSensor.value = sensor;
      showDetailDialog.value = true;
    };

    const saveSensor = async () => {
      formError.value = '';

      if (!form.value.name || !form.value.code || !form.value.type || !form.value.zoneId) {
        formError.value = t('emptyFields');
        return;
      }

      formLoading.value = true;

      try {
        if (!editingId.value && !canAddSensor.value) {
          formError.value = t('sensorLimitReached');
          return;
        }

        if (editingId.value) {
          await sensorStore.updateSensor(editingId.value, {
            name: form.value.name,
            code: form.value.code,
            type: form.value.type,
            zoneId: form.value.zoneId,
            locationDetail: form.value.locationDetail
          });
        } else {
          await sensorStore.createSensor({
            ...form.value,
            accountId: session.id
          });
        }

        showFormDialog.value = false;
        await loadData();

        toast.add({ severity: 'success', summary: t('deviceSaved'), life: 3000 });
      } catch (err) {
        if (err.message === 'CODE_EXISTS') {
          formError.value = t('codeDuplicate');
        } else if (err.message === 'SENSOR_LIMIT_REACHED' || err.code === 'SENSOR_LIMIT_REACHED') {
          formError.value = t('sensorLimitReached');
        } else {
          formError.value = t('errorSaving');
        }
      } finally {
        formLoading.value = false;
      }
    };

    const deactivate = async sensor => {
      try {
        await sensorStore.deactivateSensor(sensor.id);
        await loadData();

        toast.add({ severity: 'info', summary: t('deviceDeactivated'), life: 3000 });
      } catch {
        toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 });
      }
    };

    const reactivate = async sensor => {
      try {
        await sensorStore.reactivateSensor(sensor.id);
        await loadData();

        toast.add({ severity: 'success', summary: t('deviceReactivated'), life: 3000 });
      } catch {
        toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 });
      }
    };

    onMounted(loadData);

    return {
      t,
      trStatus,
      trSensorType,
      trSensorName,
      trLocationDetail,
      sensors,
      zones,
      currentPlan,
      loading,
      errorMsg,
      showFormDialog,
      editingId,
      form,
      formError,
      formLoading,
      showDetailDialog,
      selectedSensor,
      sensorTypes,
      sensorTypeOptions,
      zoneOptions,
      zoneName,
      statusSeverity,
      maxSensorsLabel,
      canAddSensor,
      sensorLimitExceeded,
      sensorLimitReached,
      loadData,
      openAdd,
      openEdit,
      openDetail,
      saveSensor,
      deactivate,
      reactivate,
      formatDate
    };
  },

  template: `
    <section class="content-page" aria-label="Devices">
      <div class="page-header">
        <div>
          <h1>{{ t('devicesTitle') }}</h1>
          <p>{{ t('devicesSubtitle') }}</p>
        </div>

        <Button
            :label="t('addDevice')"
            icon="pi pi-plus"
            @click="openAdd"
            :disabled="!zones.length || !canAddSensor"
            aria-label="Add new device"
        />
      </div>

      <div v-if="errorMsg" class="alert-banner" role="alert">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i> {{ errorMsg }}
      </div>

      <div v-if="!loading && !zones.length" class="plan-limit-banner info" role="status">
        <i class="pi pi-info-circle" aria-hidden="true"></i> {{ t('createZoneBeforeDevice') }}
      </div>

      <div v-if="!loading && sensorLimitExceeded" class="plan-limit-banner warning" role="alert">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i> {{ t('sensorLimitExceeded', { max: maxSensorsLabel }) }}
      </div>

      <div v-else-if="!loading && sensorLimitReached" class="plan-limit-banner info" role="status">
        <i class="pi pi-info-circle" aria-hidden="true"></i> {{ t('sensorLimitReachedInfo', { max: maxSensorsLabel }) }}
      </div>

      <div v-else-if="!loading && currentPlan" class="plan-limit-banner info" role="status">
        <i class="pi pi-info-circle" aria-hidden="true"></i>
        {{ t('sensorPlanLimitText', { max: maxSensorsLabel }) }}
      </div>

      <div v-if="loading" class="loading-state" aria-live="polite">
        <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> {{ t('loading') }}
      </div>

      <div v-if="!loading" class="panel-card">
        <DataTable
            :value="sensors"
            stripedRows
            :aria-label="t('devicesTitle')"
            responsiveLayout="scroll"
        >
          <Column
              :header="t('sensorCode')"
              field="code"
              sortable
          />

          <Column
              :header="t('sensorName')"
              sortable
          >
            <template #body="{ data }">
              {{ trSensorName(t, data.name) }}
            </template>
          </Column>

          <Column
              :header="t('sensorType')"
              sortable
          >
            <template #body="{ data }">
              {{ trSensorType(t, data.type) }}
            </template>
          </Column>

          <Column
              :header="t('zone')"
              sortable
          >
            <template #body="{ data }">
              {{ zoneName(data.zoneId) }}
            </template>
          </Column>

          <Column :header="t('status')">
            <template #body="{ data }">
              <Tag
                  :value="trStatus(t, data.status)"
                  :severity="statusSeverity(data.status)"
              />
            </template>
          </Column>

          <Column :header="t('battery')">
            <template #body="{ data }">
              {{ data.battery }}%
            </template>
          </Column>

          <Column
              :header="t('lastReadingLabel')"
              field="lastReading"
          />

          <Column :header="t('lastConnection')">
            <template #body="{ data }">
              {{ formatDate(data.lastConnected) }}
            </template>
          </Column>

          <Column header="">
            <template #body="{ data }">
              <div class="row-actions">
                <Button
                    icon="pi pi-info-circle"
                    severity="secondary"
                    size="small"
                    :aria-label="t('viewDetails')"
                    :title="t('viewDetails')"
                    @click="openDetail(data)"
                />

                <Button
                    icon="pi pi-pencil"
                    severity="secondary"
                    size="small"
                    :aria-label="t('editDevice')"
                    :title="t('editDevice')"
                    @click="openEdit(data)"
                />

                <Button
                    v-if="data.status !== 'Offline'"
                    icon="pi pi-ban"
                    severity="warning"
                    size="small"
                    :aria-label="t('deactivate')"
                    :title="t('deactivate')"
                    @click="deactivate(data)"
                />

                <Button
                    v-else
                    icon="pi pi-check-circle"
                    severity="success"
                    size="small"
                    :aria-label="t('reactivate')"
                    :title="t('reactivate')"
                    @click="reactivate(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>

        <p v-if="!sensors.length" class="empty-msg padded">
          {{ t('noData') }}
        </p>
      </div>

      <Dialog
          v-model:visible="showFormDialog"
          :header="editingId ? t('editDevice') : t('addDevice')"
          modal
          :style="{ width: '480px' }"
          :aria-label="editingId ? t('editDevice') : t('addDevice')"
      >
        <div class="dialog-form">
          <div class="field-group">
            <label for="dev-name">{{ t('sensorName') }} *</label>
            <InputText
                id="dev-name"
                v-model="form.name"
                class="w-full"
                :aria-required="true"
            />
          </div>

          <div class="field-group">
            <label for="dev-code">{{ t('sensorCode') }} *</label>
            <InputText
                id="dev-code"
                v-model="form.code"
                class="w-full"
                :aria-required="true"
            />
          </div>

          <div class="field-group">
            <label for="dev-type">{{ t('sensorType') }} *</label>
            <Dropdown
                id="dev-type"
                v-model="form.type"
                :options="sensorTypeOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                :aria-required="true"
            />
          </div>

          <div class="field-group">
            <label for="dev-zone">{{ t('zone') }} *</label>
            <Dropdown
                id="dev-zone"
                v-model="form.zoneId"
                :options="zoneOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                :aria-required="true"
            />
          </div>

          <div class="field-group">
            <label for="dev-location">{{ t('locationDetail') }}</label>
            <InputText
                id="dev-location"
                v-model="form.locationDetail"
                class="w-full"
            />
          </div>

          <p v-if="formError" class="form-error" role="alert">
            <i class="pi pi-times-circle" aria-hidden="true"></i> {{ formError }}
          </p>
        </div>

        <template #footer>
          <Button
              :label="t('cancelAction')"
              severity="secondary"
              @click="showFormDialog = false"
          />

          <Button
              :label="t('saveAction')"
              icon="pi pi-check"
              :loading="formLoading"
              @click="saveSensor"
          />
        </template>
      </Dialog>

      <Dialog
          v-model:visible="showDetailDialog"
          :header="selectedSensor ? trSensorName(t, selectedSensor.name) : ''"
          modal
          :style="{ width: '420px' }"
          aria-label="Sensor details"
      >
        <div v-if="selectedSensor" class="detail-grid">
          <div class="detail-row">
            <span>{{ t('sensorCode') }}</span>
            <strong>{{ selectedSensor.code }}</strong>
          </div>

          <div class="detail-row">
            <span>{{ t('sensorType') }}</span>
            <strong>{{ trSensorType(t, selectedSensor.type) }}</strong>
          </div>

          <div class="detail-row">
            <span>{{ t('zone') }}</span>
            <strong>{{ zoneName(selectedSensor.zoneId) }}</strong>
          </div>

          <div class="detail-row">
            <span>{{ t('locationDetail') }}</span>
            <strong>{{ trLocationDetail(t, selectedSensor.locationDetail) }}</strong>
          </div>

          <div class="detail-row">
            <span>{{ t('status') }}</span>
            <Tag
                :value="trStatus(t, selectedSensor.status)"
                :severity="statusSeverity(selectedSensor.status)"
            />
          </div>

          <div class="detail-row">
            <span>{{ t('battery') }}</span>
            <strong>{{ selectedSensor.battery }}%</strong>
          </div>

          <div class="detail-row">
            <span>{{ t('lastReadingLabel') }}</span>
            <strong>{{ selectedSensor.lastReading }}</strong>
          </div>

          <div class="detail-row">
            <span>{{ t('lastConnection') }}</span>
            <strong>{{ formatDate(selectedSensor.lastConnected) }}</strong>
          </div>
        </div>

        <template #footer>
          <Button
              :label="t('closeAction')"
              severity="secondary"
              @click="showDetailDialog = false"
          />
        </template>
      </Dialog>
    </section>`
};