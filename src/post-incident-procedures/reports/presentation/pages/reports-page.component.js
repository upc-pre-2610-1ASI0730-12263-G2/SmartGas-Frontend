import { onMounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { reportStore } from '../../application/report.store.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import { formatDate } from '../../../../shared/utils/date-format.js';
import { trZone, trStatus, trSeverity, trIncidentType } from '../../../../shared/utils/domain-translations.js';

export default {
  name: 'ReportsPage',
  setup() {
    const { t } = useI18n();
    const session = new SessionService().getCurrentUser();

    const allIncidents = ref([]);
    const allAlerts = ref([]);
    const allZones = ref([]);
    const loading = ref(true);
    const errorMsg = ref('');
    const reportSummary = ref('');
    const generatedReport = ref(null);

    const filterZone = ref('');
    const filterSeverity = ref('');
    const filterStatus = ref('');
    const filterType = ref('');
    const filterFrom = ref('');
    const filterTo = ref('');

    const normalizeStatus = status =>
        String(status || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');

    const isPendingAlert = alert => {
      if (alert.resolvedAt) {
        return false;
      }

      if (alert.isResolved === true) {
        return false;
      }

      const status = normalizeStatus(alert.status);

      return ![
        'resolved',
        'closed',
        'confirmed',
        'dismissed',
        'falsealarm',
        'inactive'
      ].includes(status);
    };

    const isResolvedAlert = alert => {
      if (alert.resolvedAt) {
        return true;
      }

      if (alert.isResolved === true) {
        return true;
      }

      const status = normalizeStatus(alert.status);

      return [
        'resolved',
        'closed'
      ].includes(status);
    };

    const isPendingIncident = incident => {
      const status = normalizeStatus(incident.status);

      return [
        'active',
        'reviewed',
        'detected',
        'open',
        'pending'
      ].includes(status);
    };

    const isResolvedIncident = incident => {
      const status = normalizeStatus(incident.status);

      return [
        'resolved',
        'closed'
      ].includes(status);
    };

    const getIncidentDate = incident =>
        incident.detectedAt || incident.createdAt;

    const getIncidentType = incident =>
        incident.type || incident.incidentType || incident.title || '';

    const zoneOptions = computed(() => [
      { label: t('allZonesOption'), value: '' },
      ...allZones.value.map(z => ({
        label: trZone(t, z.name),
        value: z.name
      }))
    ]);

    const severityOptions = computed(() => [
      { label: t('allSeverities'), value: '' },
      { label: trSeverity(t, 'Warning'), value: 'Warning' },
      { label: trSeverity(t, 'High'), value: 'High' },
      { label: trSeverity(t, 'Critical'), value: 'Critical' }
    ]);

    const statusOptions = computed(() => [
      { label: t('allStatuses'), value: '' },
      { label: trStatus(t, 'Active'), value: 'Active' },
      { label: trStatus(t, 'Detected'), value: 'Detected' },
      { label: trStatus(t, 'Reviewed'), value: 'Reviewed' },
      { label: trStatus(t, 'Resolved'), value: 'Resolved' },
      { label: trStatus(t, 'False Alarm'), value: 'FalseAlarm' }
    ]);

    const typeOptions = computed(() => {
      const types = [...new Set(allIncidents.value.map(getIncidentType).filter(Boolean))];

      if (types.length === 0) {
        return [
          { label: t('allTypes'), value: '' },
          { label: trIncidentType(t, 'Gas Leak'), value: 'Gas Leak' },
          { label: trIncidentType(t, 'High Temperature'), value: 'High Temperature' }
        ];
      }

      return [
        { label: t('allTypes'), value: '' },
        ...types.map(type => ({
          label: trIncidentType(t, type),
          value: type
        }))
      ];
    });

    const filteredIncidents = computed(() =>
        allIncidents.value.filter(inc => {
          const detectedAt = getIncidentDate(inc);
          const incType = getIncidentType(inc);

          return (
              (!filterZone.value || inc.zoneName === filterZone.value) &&
              (!filterSeverity.value || inc.severity === filterSeverity.value) &&
              (!filterStatus.value || normalizeStatus(inc.status) === normalizeStatus(filterStatus.value)) &&
              (!filterType.value || incType === filterType.value) &&
              (!filterFrom.value || new Date(detectedAt) >= new Date(filterFrom.value)) &&
              (!filterTo.value || new Date(detectedAt) <= new Date(filterTo.value + 'T23:59:59'))
          );
        })
    );

    const countBySeverity = computed(() => {
      const c = {};
      filteredIncidents.value.forEach(i => {
        c[i.severity] = (c[i.severity] || 0) + 1;
      });
      return c;
    });

    const countByType = computed(() => {
      const c = {};
      filteredIncidents.value.forEach(i => {
        const type = getIncidentType(i);
        c[type] = (c[type] || 0) + 1;
      });
      return c;
    });

    const mostAffectedZone = computed(() => {
      const c = {};
      filteredIncidents.value.forEach(i => {
        c[i.zoneName] = (c[i.zoneName] || 0) + 1;
      });
      const s = Object.entries(c).sort((a, b) => b[1] - a[1]);
      return s[0]?.[0] || '—';
    });

    const pendingCount = computed(() =>
        allAlerts.value.filter(isPendingAlert).length
    );

    const resolvedCount = computed(() =>
        allAlerts.value.filter(isResolvedAlert).length
    );

    const sevSeverity = s => ({
      Warning: 'warning',
      High: 'warning',
      Critical: 'danger'
    }[s] || 'info');

    const statusSeverity = s => {
      const status = normalizeStatus(s);

      if (status === 'active' || status === 'detected') return 'warning';
      if (status === 'reviewed') return 'info';
      if (status === 'resolved') return 'success';
      if (status === 'falsealarm') return 'secondary';

      return 'info';
    };

    const loadData = async () => {
      loading.value = true;
      errorMsg.value = '';

      try {
        const accountId = session?.accountId ?? session?.id ?? 1;
        const result = await reportStore.getReportData(accountId);

        allIncidents.value = result.incidents;
        allAlerts.value = result.alerts;
        allZones.value = result.zones;
      } catch {
        errorMsg.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    const applyFilters = () => {
      reportSummary.value = `${t('filtersApplied')}: ${filteredIncidents.value.length} ${t('incidentsFound')}.`;
    };

    const clearFilters = () => {
      filterZone.value = '';
      filterSeverity.value = '';
      filterStatus.value = '';
      filterType.value = '';
      filterFrom.value = '';
      filterTo.value = '';
      reportSummary.value = '';
      generatedReport.value = null;
    };

    const generateReport = () => {
      const zoneLabel = filterZone.value ? trZone(t, filterZone.value) : t('allZonesOption');
      const periodLabel = filterFrom.value || filterTo.value
          ? `${filterFrom.value || '—'} - ${filterTo.value || '—'}`
          : t('allPeriods');

      const critical = filteredIncidents.value.filter(i => i.severity === 'Critical').length;
      const warning = filteredIncidents.value.filter(i => i.severity === 'Warning' || i.severity === 'High').length;
      const resolved = filteredIncidents.value.filter(isResolvedIncident).length;
      const pending = filteredIncidents.value.filter(isPendingIncident).length;

      generatedReport.value = {
        zoneLabel,
        periodLabel,
        total: filteredIncidents.value.length,
        critical,
        warning,
        resolved,
        pending,
        mostAffectedZone: trZone(t, mostAffectedZone.value)
      };

      reportSummary.value = t('reportSummaryText', {
        count: filteredIncidents.value.length,
        zone: zoneLabel
      });
    };

    onMounted(loadData);

    return {
      t,
      allIncidents,
      loading,
      errorMsg,
      reportSummary,
      generatedReport,
      filterZone,
      filterSeverity,
      filterStatus,
      filterType,
      filterFrom,
      filterTo,
      zoneOptions,
      severityOptions,
      statusOptions,
      typeOptions,
      filteredIncidents,
      countBySeverity,
      countByType,
      mostAffectedZone,
      pendingCount,
      resolvedCount,
      sevSeverity,
      statusSeverity,
      loadData,
      applyFilters,
      clearFilters,
      generateReport,
      formatDate,
      trZone,
      trStatus,
      trSeverity,
      trIncidentType,
      getIncidentType,
      getIncidentDate
    };
  },

  template: `
    <section class="content-page" aria-label="Reports">
      <div class="page-header">
        <div>
          <h1>{{ t('reportsTitle') }}</h1>
          <p>{{ t('reportsSubtitle') }}</p>
        </div>
        <Button :label="t('refreshAction')" icon="pi pi-refresh" severity="secondary" @click="loadData" :loading="loading" />
      </div>

      <div v-if="errorMsg" class="alert-banner" role="alert">
        <i class="pi pi-exclamation-triangle"></i> {{ errorMsg }}
      </div>

      <div class="metrics-row" v-if="!loading">
        <article class="metric-card">
          <div class="metric-icon blue">
            <i class="pi pi-list"></i>
          </div>
          <div>
            <strong>{{ allIncidents.length }}</strong>
            <span>{{ t('totalIncidents') }}</span>
          </div>
        </article>

        <article class="metric-card orange">
          <div class="metric-icon orange">
            <i class="pi pi-bell"></i>
          </div>
          <div>
            <strong>{{ pendingCount }}</strong>
            <span>{{ t('pendingAlerts') }}</span>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon blue">
            <i class="pi pi-check-circle"></i>
          </div>
          <div>
            <strong>{{ resolvedCount }}</strong>
            <span>{{ t('resolved') }}</span>
          </div>
        </article>

        <article class="metric-card">
          <div class="metric-icon blue">
            <i class="pi pi-map-marker"></i>
          </div>
          <div>
            <strong class="zone-name-badge">{{ trZone(t, mostAffectedZone) }}</strong>
            <span>{{ t('mostAffectedZone') }}</span>
          </div>
        </article>
      </div>

      <div class="panel-card filter-panel" v-if="!loading">
        <header>
          <h2>
            <i class="pi pi-filter"></i> {{ t('filters') }}
          </h2>
        </header>

        <div class="filters-grid">
          <div class="field-group">
            <label for="reports-zone-filter">{{ t('filterZone') }}</label>
            <Dropdown
                inputId="reports-zone-filter"
                v-model="filterZone"
                :options="zoneOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                :aria-label="t('filterZone')"
            />
          </div>

          <div class="field-group">
            <label for="reports-severity-filter">{{ t('filterSeverity') }}</label>
            <Dropdown
                inputId="reports-severity-filter"
                v-model="filterSeverity"
                :options="severityOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                :aria-label="t('filterSeverity')"
            />
          </div>

          <div class="field-group">
            <label for="reports-status-filter">{{ t('filterStatus') }}</label>
            <Dropdown
                inputId="reports-status-filter"
                v-model="filterStatus"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                :aria-label="t('filterStatus')"
            />
          </div>

          <div class="field-group">
            <label for="reports-type-filter">{{ t('filterType') }}</label>
            <Dropdown
                inputId="reports-type-filter"
                v-model="filterType"
                :options="typeOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                :aria-label="t('filterType')"
            />
          </div>

          <div class="field-group">
            <label for="reports-from-date">{{ t('filterDateFrom') }}</label>
            <InputText
                id="reports-from-date"
                v-model="filterFrom"
                type="date"
                class="w-full"
            />
          </div>

          <div class="field-group">
            <label for="reports-to-date">{{ t('filterDateTo') }}</label>
            <InputText
                id="reports-to-date"
                v-model="filterTo"
                type="date"
                class="w-full"
            />
          </div>
        </div>

        <div class="filter-actions">
          <Button :label="t('applyFilters')" icon="pi pi-filter" @click="applyFilters" />
          <Button :label="t('clearFilters')" icon="pi pi-times" severity="secondary" @click="clearFilters" />
          <Button :label="t('generateReport')" icon="pi pi-file" severity="success" @click="generateReport" />
        </div>

        <div v-if="reportSummary" class="report-summary">
          <i class="pi pi-file-check"></i> {{ reportSummary }}
        </div>

        <article v-if="generatedReport" class="generated-report-card">
          <header>
            <h3>{{ t('reportGeneratedTitle') }}</h3>
            <span>{{ generatedReport.periodLabel }}</span>
          </header>

          <div class="generated-report-grid">
            <div>
              <small>{{ t('reportScope') }}</small>
              <strong>{{ generatedReport.zoneLabel }}</strong>
            </div>

            <div>
              <small>{{ t('filteredIncidents') }}</small>
              <strong>{{ generatedReport.total }}</strong>
            </div>

            <div>
              <small>{{ t('criticalIncidents') }}</small>
              <strong>{{ generatedReport.critical }}</strong>
            </div>

            <div>
              <small>{{ t('warningIncidents') }}</small>
              <strong>{{ generatedReport.warning }}</strong>
            </div>

            <div>
              <small>{{ t('pendingIncidents') }}</small>
              <strong>{{ generatedReport.pending }}</strong>
            </div>

            <div>
              <small>{{ t('resolvedIncidents') }}</small>
              <strong>{{ generatedReport.resolved }}</strong>
            </div>
          </div>

          <p>
            <strong>{{ t('mostAffectedZone') }}:</strong> {{ generatedReport.mostAffectedZone }}
          </p>

          <p>
            <strong>{{ t('reportRecommendation') }}:</strong> {{ t('reportRecommendationText') }}
          </p>
        </article>
      </div>

      <div class="reports-analytics" v-if="!loading">
        <article class="panel-card">
          <header>
            <h2>{{ t('incidentsBySeverity') }}</h2>
          </header>

          <div class="analytics-body">
            <div v-for="(count, sev) in countBySeverity" :key="sev" class="analytics-row">
              <Tag :value="trSeverity(t, sev)" :severity="sevSeverity(sev)" />
              <div class="analytics-bar-wrap">
                <div
                  class="analytics-bar"
                  :style="{ width: Math.round((count / Math.max(1, filteredIncidents.length)) * 100) + '%' }"
                  :class="'bar-' + String(sev).toLowerCase()"
                ></div>
              </div>
              <strong>{{ count }}</strong>
            </div>

            <p v-if="!filteredIncidents.length" class="empty-msg">{{ t('noData') }}</p>
          </div>
        </article>

        <article class="panel-card">
          <header>
            <h2>{{ t('incidentsByType') }}</h2>
          </header>

          <div class="analytics-body">
            <div v-for="(count, type) in countByType" :key="type" class="analytics-row">
              <span class="type-label">{{ trIncidentType(t, type) }}</span>
              <div class="analytics-bar-wrap">
                <div
                  class="analytics-bar bar-type"
                  :style="{ width: Math.round((count / Math.max(1, filteredIncidents.length)) * 100) + '%' }"
                ></div>
              </div>
              <strong>{{ count }}</strong>
            </div>

            <p v-if="!filteredIncidents.length" class="empty-msg">{{ t('noData') }}</p>
          </div>
        </article>
      </div>

      <div class="panel-card" v-if="!loading">
        <header>
          <h2>{{ t('incidentHistory') }} ({{ filteredIncidents.length }})</h2>
        </header>

        <DataTable
          :value="filteredIncidents"
          stripedRows
          responsiveLayout="scroll"
          :paginator="filteredIncidents.length > 10"
          :rows="10"
        >
          <Column :header="t('incidentCode')" field="code" sortable />

          <Column :header="t('incidentType')" sortable>
            <template #body="{ data }">
              {{ trIncidentType(t, getIncidentType(data)) }}
            </template>
          </Column>

          <Column :header="t('incidentZone')" sortable>
            <template #body="{ data }">
              {{ trZone(t, data.zoneName) }}
            </template>
          </Column>

          <Column :header="t('detectedValue')" field="detectedValue" />

          <Column :header="t('severity')">
            <template #body="{ data }">
              <Tag :value="trSeverity(t, data.severity)" :severity="sevSeverity(data.severity)" />
            </template>
          </Column>

          <Column :header="t('incidentStatus')">
            <template #body="{ data }">
              <Tag :value="trStatus(t, data.status)" :severity="statusSeverity(data.status)" />
            </template>
          </Column>

          <Column :header="t('detectedAt')">
            <template #body="{ data }">
              {{ formatDate(getIncidentDate(data)) }}
            </template>
          </Column>
        </DataTable>

        <p v-if="!filteredIncidents.length" class="empty-msg padded">
          {{ t('noData') }}
        </p>
      </div>
    </section>
  `
};