import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { IncidentService } from '../../infrastructure/incident.service.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import {
  trZone,
  trStatus,
  trSeverity,
  trIncidentType,
  formatIncidentNotification
} from '../../../../shared/utils/domain-translations.js';

export default {
  name: 'IncidentsPage',

  setup() {
    const { t, locale } = useI18n();
    const toast = useToast();
    const incidentService = new IncidentService();
    const sessionService = new SessionService();

    const loading = ref(true);
    const activeTab = ref('active');
    const incidents = ref([]);
    const notifications = ref([]);

    const pageText = computed(() => {
      const es = locale.value === 'es';

      return {
        title: es ? 'Incidentes' : 'Incidents',
        subtitle: es
            ? 'Incidentes detectados automáticamente por el sistema IoT.'
            : 'Incidents automatically detected by the IoT system.',
        refresh: es ? 'Actualizar' : 'Refresh',
        activeTab: es ? 'Incidentes Activos' : 'Active Incidents',
        historyTab: es ? 'Historial' : 'History',
        notificationsTab: es ? 'Notificaciones' : 'Notifications',

        code: es ? 'Código' : 'Code',
        incident: es ? 'Incidente' : 'Incident',
        type: es ? 'Tipo' : 'Type',
        zone: es ? 'Zona' : 'Zone',
        sensor: es ? 'Sensor' : 'Sensor',
        detectedValue: es ? 'Valor Detectado' : 'Detected Value',
        severity: es ? 'Severidad' : 'Severity',
        status: es ? 'Estado' : 'Status',
        detectedAt: es ? 'Detectado' : 'Detected At',
        actions: es ? 'Acciones' : 'Actions',

        message: es ? 'Mensaje' : 'Message',
        channel: es ? 'Canal' : 'Channel',
        read: es ? 'Leído' : 'Read',
        confirmed: es ? 'Confirmado' : 'Confirmed',

        review: es ? 'Revisar' : 'Review',
        resolve: es ? 'Resolver' : 'Resolve',
        falseAlarm: es ? 'Falsa alarma' : 'False alarm',
        markAsRead: es ? 'Marcar como leído' : 'Mark as read',
        confirmReceipt: es ? 'Confirmar recepción' : 'Confirm receipt',

        yes: es ? 'Sí' : 'Yes',
        no: 'No',

        noActiveIncidents: es ? 'Sin incidentes activos.' : 'No active incidents.',
        noHistoryIncidents: es ? 'No hay incidentes históricos.' : 'No historical incidents.',
        noNotifications: es ? 'No hay notificaciones disponibles.' : 'No notifications available.',

        loadError: es ? 'No se pudieron cargar los incidentes.' : 'Incidents could not be loaded.',
        reviewOk: es ? 'Incidente marcado como revisado.' : 'Incident marked as reviewed.',
        reviewError: es ? 'No se pudo revisar el incidente.' : 'The incident could not be reviewed.',
        resolveOk: es ? 'Incidente resuelto.' : 'Incident resolved.',
        resolveError: es ? 'No se pudo resolver el incidente.' : 'The incident could not be resolved.',
        falseAlarmOk: es ? 'Incidente marcado como falsa alarma.' : 'Incident marked as false alarm.',
        falseAlarmError: es ? 'No se pudo marcar como falsa alarma.' : 'The incident could not be marked as false alarm.',
        readOk: es ? 'Notificación marcada como leída.' : 'Notification marked as read.',
        readError: es ? 'No se pudo marcar la notificación.' : 'The notification could not be marked as read.',
        confirmOk: es ? 'Recepción confirmada.' : 'Receipt confirmed.',
        confirmError: es ? 'No se pudo confirmar la recepción.' : 'Receipt could not be confirmed.'
      };
    });

    const getAccountId = () => {
      const currentUser = sessionService.getCurrentUser();
      return currentUser?.accountId ?? currentUser?.id ?? 1;
    };

    const normalizeStatus = status => String(status || '').toLowerCase();

    const isActiveIncident = incident => {
      const status = normalizeStatus(incident.status);
      return status === 'active' || status === 'reviewed';
    };

    const activeIncidents = computed(() =>
        incidents.value
            .filter(isActiveIncident)
            .sort((a, b) => new Date(b.detectedAt || b.createdAt) - new Date(a.detectedAt || a.createdAt))
    );

    const historyIncidents = computed(() =>
        incidents.value
            .filter(incident => !isActiveIncident(incident))
            .sort((a, b) => new Date(b.detectedAt || b.createdAt) - new Date(a.detectedAt || a.createdAt))
    );

    const unreadNotificationsCount = computed(() =>
        notifications.value.filter(notification => !isRead(notification)).length
    );

    const formatDate = value => {
      if (!value) return '—';

      const localeCode = locale.value === 'es' ? 'es-PE' : 'en-US';

      return new Intl.DateTimeFormat(localeCode, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(value));
    };

    const severityStyle = severity => {
      const value = String(severity || '').toLowerCase();

      if (value === 'critical') return 'danger';
      if (value === 'high') return 'warning';
      if (value === 'medium') return 'info';

      return 'success';
    };

    const statusStyle = status => {
      const value = normalizeStatus(status);

      if (value === 'active') return 'danger';
      if (value === 'reviewed') return 'warning';
      if (value === 'resolved') return 'success';
      if (value === 'falsealarm' || value === 'false alarm') return 'info';

      return 'secondary';
    };

    const incidentCode = incident =>
        incident.code || `INC-${String(incident.id).padStart(3, '0')}`;

    const incidentType = incident =>
        trIncidentType(t, incident.type || incident.incidentType || incident.title || '');

    const incidentZone = incident =>
        trZone(t, incident.zoneName || incident.zone?.name || `Zone ${incident.zoneId ?? '—'}`);

    const incidentSensor = incident =>
        incident.sensorCode || incident.sensor?.code || `Sensor ${incident.sensorId ?? '—'}`;

    const incidentValueLines = incident => {
      const type = String(incident.type || incident.incidentType || '')
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/-/g, '');

      const rawValue = incident.detectedValue || '';

      const gasFromRaw = rawValue.match(/Gas:\s*([\d.]+)/i)?.[1];
      const tempFromRaw = rawValue.match(/Temp:\s*([\d.]+)/i)?.[1];

      const gas = incident.gasLevel ?? incident.gasValue ?? gasFromRaw;
      const temperature = incident.temperature ?? incident.temperatureValue ?? tempFromRaw;

      if (type === 'gasleak') {
        return gas !== null && gas !== undefined
            ? [`Gas: ${gas} ppm`]
            : [rawValue || '—'];
      }

      if (type === 'hightemperature') {
        return temperature !== null && temperature !== undefined
            ? [`Temperatura: ${temperature} °C`]
            : [rawValue || '—'];
      }

      if (type === 'gasleakandhightemperature') {
        const lines = [];

        if (gas !== null && gas !== undefined) {
          lines.push(`Gas: ${gas} ppm`);
        }

        if (temperature !== null && temperature !== undefined) {
          lines.push(`Temperatura: ${temperature} °C`);
        }

        return lines.length ? lines : [rawValue || '—'];
      }

      const lines = [];

      if (gas !== null && gas !== undefined) {
        lines.push(`Gas: ${gas} ppm`);
      }

      if (temperature !== null && temperature !== undefined) {
        lines.push(`Temperatura: ${temperature} °C`);
      }

      return lines.length ? lines : [rawValue || '—'];
    };

    const notificationMessage = notification => {
      const translated = formatIncidentNotification(t, notification);

      if (translated && translated !== notification.message) {
        return translated;
      }

      const message = notification.message || '';

      const match = message.match(/^Sensor (.+?) detected a (.+?) event in zone (.+?)\.$/i);

      if (match) {
        const sensor = match[1];
        const type = trIncidentType(t, match[2]);
        const zone = trZone(t, match[3]);

        return locale.value === 'es'
            ? `El sensor ${sensor} detectó un evento de ${type} en la zona ${zone}.`
            : `Sensor ${sensor} detected a ${type} event in zone ${zone}.`;
      }

      return message || '—';
    };

    const isRead = notification =>
        Boolean(notification.isRead ?? notification.read);

    const isConfirmed = notification =>
        Boolean(notification.isConfirmed ?? notification.confirmed);

    const canReview = incident =>
        normalizeStatus(incident.status) === 'active';

    const canClose = incident => {
      const status = normalizeStatus(incident.status);
      return status === 'active' || status === 'reviewed';
    };

    const loadData = async () => {
      loading.value = true;

      try {
        const accountId = getAccountId();

        const [
          incidentsResponse,
          notificationsResponse
        ] = await Promise.all([
          incidentService.getIncidents(accountId),
          incidentService.getNotifications(accountId)
        ]);

        incidents.value = incidentsResponse;
        notifications.value = notificationsResponse;
      } catch {
        toast.add({
          severity: 'error',
          summary: pageText.value.loadError,
          life: 3000
        });
      } finally {
        loading.value = false;
      }
    };

    const reviewIncident = async incident => {
      try {
        await incidentService.reviewIncident(incident.id);
        await loadData();

        toast.add({
          severity: 'success',
          summary: pageText.value.reviewOk,
          life: 2500
        });
      } catch {
        toast.add({
          severity: 'error',
          summary: pageText.value.reviewError,
          life: 3000
        });
      }
    };

    const resolveIncident = async incident => {
      try {
        await incidentService.resolveIncident(incident.id);
        await loadData();

        toast.add({
          severity: 'success',
          summary: pageText.value.resolveOk,
          life: 2500
        });
      } catch {
        toast.add({
          severity: 'error',
          summary: pageText.value.resolveError,
          life: 3000
        });
      }
    };

    const markFalseAlarm = async incident => {
      try {
        await incidentService.markFalseAlarm(incident.id);
        await loadData();

        toast.add({
          severity: 'info',
          summary: pageText.value.falseAlarmOk,
          life: 2500
        });
      } catch {
        toast.add({
          severity: 'error',
          summary: pageText.value.falseAlarmError,
          life: 3000
        });
      }
    };

    const markNotificationRead = async notification => {
      try {
        await incidentService.markNotificationRead(notification.id);
        await loadData();

        toast.add({
          severity: 'success',
          summary: pageText.value.readOk,
          life: 2500
        });
      } catch {
        toast.add({
          severity: 'error',
          summary: pageText.value.readError,
          life: 3000
        });
      }
    };

    const confirmNotification = async notification => {
      try {
        await incidentService.confirmNotification(notification.id);
        await loadData();

        toast.add({
          severity: 'success',
          summary: pageText.value.confirmOk,
          life: 2500
        });
      } catch {
        toast.add({
          severity: 'error',
          summary: pageText.value.confirmError,
          life: 3000
        });
      }
    };

    onMounted(loadData);

    return {
      t,
      loading,
      activeTab,
      pageText,
      activeIncidents,
      historyIncidents,
      notifications,
      unreadNotificationsCount,
      formatDate,
      severityStyle,
      statusStyle,
      incidentCode,
      incidentType,
      incidentZone,
      incidentSensor,
      incidentValueLines,
      notificationMessage,
      isRead,
      isConfirmed,
      canReview,
      canClose,
      loadData,
      reviewIncident,
      resolveIncident,
      markFalseAlarm,
      markNotificationRead,
      confirmNotification,
      trStatus,
      trSeverity
    };
  },

  template: `
    <section class="content-page incidents-page" aria-label="Incidents">
      <div class="page-header">
        <div>
          <h1>{{ pageText.title }}</h1>
          <p>{{ pageText.subtitle }}</p>
        </div>

        <Button
            :label="pageText.refresh"
            icon="pi pi-refresh"
            severity="secondary"
            :loading="loading"
            @click="loadData"
        />
      </div>

      <div class="tab-bar">
        <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'active' }"
            @click="activeTab = 'active'"
        >
          {{ pageText.activeTab }}
        </button>

        <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'history' }"
            @click="activeTab = 'history'"
        >
          {{ pageText.historyTab }}
        </button>

        <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'notifications' }"
            @click="activeTab = 'notifications'"
        >
          {{ pageText.notificationsTab }}
          <span v-if="unreadNotificationsCount > 0" class="tab-badge unread">
            {{ unreadNotificationsCount }}
          </span>
        </button>
      </div>

      <DataTable
          v-if="activeTab === 'active'"
          :value="activeIncidents"
          :loading="loading"
          responsiveLayout="scroll"
          class="p-datatable-sm"
          dataKey="id"
          :emptyMessage="pageText.noActiveIncidents"
      >
        <Column :header="pageText.code" sortable style="width: 110px">
          <template #body="{ data }">
            <strong>{{ incidentCode(data) }}</strong>
          </template>
        </Column>

        <Column :header="pageText.incident" sortable style="min-width: 280px">
          <template #body="{ data }">
            <div class="detail-grid">
              <strong>{{ incidentType(data) }}</strong>
              <small>{{ incidentZone(data) }} · {{ incidentSensor(data) }}</small>
            </div>
          </template>
        </Column>

        <Column :header="pageText.detectedValue" style="min-width: 220px">
          <template #body="{ data }">
            <div class="detected-value-stack">
  <span
      v-for="line in incidentValueLines(data)"
      :key="line"
  >
    {{ line }}
  </span>
            </div>
          </template>
        </Column>

        <Column :header="pageText.severity" sortable style="width: 130px">
          <template #body="{ data }">
            <Tag
                :value="trSeverity(t, data.severity)"
                :severity="severityStyle(data.severity)"
            />
          </template>
        </Column>

        <Column :header="pageText.status" sortable style="width: 130px">
          <template #body="{ data }">
            <Tag
                :value="trStatus(t, data.status)"
                :severity="statusStyle(data.status)"
            />
          </template>
        </Column>

        <Column :header="pageText.detectedAt" sortable style="min-width: 160px">
          <template #body="{ data }">
            {{ formatDate(data.detectedAt || data.createdAt) }}
          </template>
        </Column>

        <Column :header="pageText.actions" style="min-width: 310px">
          <template #body="{ data }">
            <div class="row-actions">
              <Button
                  v-if="canReview(data)"
                  :label="pageText.review"
                  size="small"
                  severity="secondary"
                  @click="reviewIncident(data)"
              />

              <Button
                  v-if="canClose(data)"
                  :label="pageText.resolve"
                  size="small"
                  severity="success"
                  @click="resolveIncident(data)"
              />

              <Button
                  v-if="canClose(data)"
                  :label="pageText.falseAlarm"
                  size="small"
                  severity="warning"
                  @click="markFalseAlarm(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <DataTable
          v-if="activeTab === 'history'"
          :value="historyIncidents"
          :loading="loading"
          responsiveLayout="scroll"
          class="p-datatable-sm"
          dataKey="id"
          :emptyMessage="pageText.noHistoryIncidents"
      >
        <Column :header="pageText.code" sortable style="min-width: 110px">
          <template #body="{ data }">
            <strong>{{ incidentCode(data) }}</strong>
          </template>
        </Column>

        <Column :header="pageText.type" sortable style="min-width: 230px">
          <template #body="{ data }">
            {{ incidentType(data) }}
          </template>
        </Column>

        <Column :header="pageText.zone" sortable style="min-width: 150px">
          <template #body="{ data }">
            {{ incidentZone(data) }}
          </template>
        </Column>

        <Column :header="pageText.sensor" style="min-width: 120px">
          <template #body="{ data }">
            {{ incidentSensor(data) }}
          </template>
        </Column>

        <Column :header="pageText.detectedValue" style="min-width: 210px">
          <template #body="{ data }">
            <div class="detected-value-stack">
  <span
      v-for="line in incidentValueLines(data)"
      :key="line"
  >
    {{ line }}
  </span>
            </div>
          </template>
        </Column>

        <Column :header="pageText.severity" sortable style="min-width: 130px">
          <template #body="{ data }">
            <Tag
                :value="trSeverity(t, data.severity)"
                :severity="severityStyle(data.severity)"
            />
          </template>
        </Column>

        <Column :header="pageText.status" sortable style="min-width: 130px">
          <template #body="{ data }">
            <Tag
                :value="trStatus(t, data.status)"
                :severity="statusStyle(data.status)"
            />
          </template>
        </Column>

        <Column :header="pageText.detectedAt" sortable style="min-width: 170px">
          <template #body="{ data }">
            {{ formatDate(data.detectedAt || data.createdAt) }}
          </template>
        </Column>
      </DataTable>

      <DataTable
          v-if="activeTab === 'notifications'"
          :value="notifications"
          :loading="loading"
          responsiveLayout="scroll"
          class="p-datatable-sm"
          dataKey="id"
          :emptyMessage="pageText.noNotifications"
      >
        <Column :header="pageText.message" style="min-width: 360px">
          <template #body="{ data }">
            {{ notificationMessage(data) }}
          </template>
        </Column>

        <Column field="channel" :header="pageText.channel" style="min-width: 110px" />

        <Column :header="pageText.read" style="min-width: 120px">
          <template #body="{ data }">
            <Tag
                :value="isRead(data) ? pageText.yes : pageText.no"
                :severity="isRead(data) ? 'success' : 'danger'"
            />
          </template>
        </Column>

        <Column :header="pageText.confirmed" style="min-width: 140px">
          <template #body="{ data }">
            <Tag
                :value="isConfirmed(data) ? pageText.yes : pageText.no"
                :severity="isConfirmed(data) ? 'success' : 'secondary'"
            />
          </template>
        </Column>

        <Column :header="pageText.detectedAt" style="min-width: 170px">
          <template #body="{ data }">
            {{ formatDate(data.createdAt) }}
          </template>
        </Column>

        <Column :header="pageText.actions" style="min-width: 320px">
          <template #body="{ data }">
            <div class="row-actions">
              <Button
                  v-if="!isRead(data)"
                  :label="pageText.markAsRead"
                  size="small"
                  severity="secondary"
                  @click="markNotificationRead(data)"
              />

              <Button
                  v-if="!isConfirmed(data)"
                  :label="pageText.confirmReceipt"
                  size="small"
                  severity="success"
                  @click="confirmNotification(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </section>
  `
};