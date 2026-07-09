import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { profileStore } from '../../application/profile.store.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import { formatDate } from '../../../../shared/utils/date-format.js';
import {
  trPlanName,
  trPlanDescription,
  trAccountType,
  trZone,
  trActivityDetail
} from '../../../../shared/utils/domain-translations.js';

export default {
  name: 'ProfilePage',
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const toast = useToast();
    const sessionService = new SessionService();
    const session = sessionService.getCurrentUser();

    const profile = ref(null);
    const plan = ref(null);
    const subscription = ref(null);
    const activity = ref([]);
    const stats = ref({ sensors: [], zones: [], activeIncidents: [] });
    const editing = ref(false);
    const loading = ref(true);
    const saveLoading = ref(false);
    const errorMsg = ref('');

    const form = ref({
      fullName: '',
      email: '',
      role: '',
      accountType: '',
      businessName: '',
      phone: '',
      district: '',
      address: ''
    });

    const initials = computed(() =>
        (form.value.fullName || 'SG')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(item => item[0])
            .join('')
            .toUpperCase()
    );
    const accountActivity = computed(() => {
      const rows = [];

      if (plan.value || subscription.value) {
        rows.push({
          id: 'plan-current',
          title: t('activityCurrentPlan'),
          detail: trPlanName(t, plan.value || { name: subscription.value?.planName || 'Basic' }),
          createdAt: subscription.value?.updatedAt || subscription.value?.startDate || subscription.value?.renewalDate || profile.value?.updatedAt || profile.value?.createdAt
        });
      }

      rows.push({
        id: 'sensors-summary',
        title: t('activitySensorsSummary'),
        detail: t('activitySensorsSummaryDetail', { count: stats.value.sensors.length }),
        createdAt: latestDate(stats.value.sensors)
      });

      rows.push({
        id: 'zones-summary',
        title: t('activityZonesSummary'),
        detail: t('activityZonesSummaryDetail', { count: stats.value.zones.length }),
        createdAt: latestDate(stats.value.zones)
      });

      if (stats.value.activeIncidents.length) {
        const latestIncident = [...stats.value.activeIncidents].sort((a, b) =>
            new Date(b.detectedAt || b.createdAt || 0) - new Date(a.detectedAt || a.createdAt || 0)
        )[0];

        rows.push({
          id: 'latest-incident',
          title: t('activityLatestIncident'),
          detail: `${latestIncident.code || 'INC'} · ${latestIncident.type || latestIncident.incidentType || ''}`,
          createdAt: latestIncident.detectedAt || latestIncident.createdAt || latestIncident.updatedAt
        });
      } else {
        rows.push({
          id: 'no-active-incidents',
          title: t('activityNoActiveIncidents'),
          detail: t('activityNoActiveIncidentsDetail'),
          createdAt: profile.value?.updatedAt || profile.value?.createdAt
        });
      }

      return rows
          .filter(item => item.title)
          .slice(0, 5);
    });

    const getAccountId = () => session?.accountId ?? session?.id;

    const latestDate = items => {
      const dates = (items || [])
          .map(item => item.updatedAt || item.createdAt || item.lastUpdated || item.lastConnection || item.detectedAt)
          .filter(Boolean)
          .map(value => new Date(value))
          .filter(date => !Number.isNaN(date.getTime()));

      if (!dates.length) {
        return profile.value?.updatedAt || profile.value?.createdAt || new Date().toISOString();
      }

      return new Date(Math.max(...dates.map(date => date.getTime()))).toISOString();
    };

    const syncFormFromProfile = () => {
      if (!profile.value) return;

      form.value = {
        fullName: profile.value.fullName || '',
        email: profile.value.email || session?.email || '',
        role: profile.value.role || session?.role || '',
        accountType: profile.value.accountType || session?.accountType || '',
        businessName: profile.value.businessName || '',
        phone: profile.value.phone || '',
        district: profile.value.district || '',
        address: profile.value.address || ''
      };
    };

    const loadData = async () => {
      loading.value = true;
      errorMsg.value = '';

      try {
        const accountId = getAccountId();

        if (!accountId) {
          router.push('/login');
          return;
        }

        profile.value = await profileStore.getProfile(accountId);
        subscription.value = await profileStore.getSubscription(accountId);

        if (profile.value) {
          profile.value = {
            ...profile.value,
            planId: profile.value.planId ?? subscription.value?.planId ?? null,
            planName: profile.value.planName ?? subscription.value?.planName ?? ''
          };

          syncFormFromProfile();

          if (profile.value.planId) {
            plan.value = await profileStore.getPlan(profile.value.planId);
          } else {
            plan.value = {
              name: profile.value.planName || subscription.value?.planName || 'Basic'
            };
          }
        }

        [activity.value, stats.value] = await Promise.all([
          profileStore.getActivity(accountId),
          profileStore.getStats(accountId)
        ]);
      } catch {
        errorMsg.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    const startEdit = () => {
      editing.value = true;
    };

    const cancelEdit = () => {
      editing.value = false;
      syncFormFromProfile();
    };

    const saveProfile = async () => {
      if (!form.value.fullName) {
        toast.add({
          severity: 'warning',
          summary: t('emptyFields'),
          life: 3000
        });
        return;
      }

      saveLoading.value = true;

      try {
        const accountId = getAccountId();

        await profileStore.updateProfile(accountId, {
          fullName: form.value.fullName,
          businessName: form.value.businessName,
          phone: form.value.phone,
          district: form.value.district,
          address: form.value.address
        });

        editing.value = false;
        await loadData();

        toast.add({
          severity: 'success',
          summary: t('profileSaved'),
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

    onMounted(loadData);

    return {
      t,
      router,
      profile,
      plan,
      subscription,
      activity,
      accountActivity,
      stats,
      editing,
      loading,
      saveLoading,
      errorMsg,
      form,
      initials,
      trPlanName,
      trPlanDescription,
      trAccountType,
      trZone,
      trActivityDetail,
      formatDate,
      startEdit,
      cancelEdit,
      saveProfile
    };
  },
  template: `
    <section class="content-page profile-page" aria-label="Profile">
      <div class="page-header profile-heading">
        <div>
          <h1>{{ t('profileTitle') }}</h1>
          <p>{{ t('profileSubtitle') }}</p>
        </div>

        <div class="header-actions">
          <Button
            v-if="!editing"
            :label="t('editAction')"
            icon="pi pi-pencil"
            @click="startEdit"
          />

          <Button
            v-if="editing"
            :label="t('saveAction')"
            icon="pi pi-check"
            :loading="saveLoading"
            @click="saveProfile"
          />

          <Button
            v-if="editing"
            :label="t('cancelAction')"
            severity="secondary"
            @click="cancelEdit"
          />
        </div>
      </div>

      <div v-if="errorMsg" class="alert-banner" role="alert">
        <i class="pi pi-exclamation-triangle"></i>
        {{ errorMsg }}
      </div>

      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        {{ t('loading') }}
      </div>

      <template v-if="!loading && profile">
        <article class="profile-hero-card profile-hero-clean">
          <div class="profile-initials">
            {{ initials }}
          </div>

          <div class="profile-hero-info">
            <h2>{{ profile.fullName }}</h2>
            <p>{{ trAccountType(t, form.accountType) }} · {{ trPlanName(t, plan) }}</p>

            <div class="hero-tags">
              <Tag :value="t('activeAccount')" severity="success" />
              <span>{{ t('memberSince') }} {{ profile.memberSince || '2026' }}</span>
            </div>
          </div>

          <div class="profile-hero-metrics profile-metrics-clean">
            <div>
              <strong>{{ stats.sensors.length }}</strong>
              <span>{{ t('devices') }}</span>
            </div>

            <div>
              <strong>{{ stats.zones.length }}</strong>
              <span>{{ t('monitoredZones') }}</span>
            </div>

            <div>
              <strong>{{ stats.activeIncidents.length }}</strong>
              <span>{{ t('activeIncidents') }}</span>
            </div>
          </div>
        </article>

        <div class="profile-main-grid">
          <div class="profile-left-column">
            <article class="panel-card profile-info-card">
              <header>
                <h2>{{ t('personalInformation') }}</h2>

                <Button
                  v-if="!editing"
                  :label="t('editAction')"
                  icon="pi pi-pencil"
                  severity="secondary"
                  size="small"
                  @click="startEdit"
                />
              </header>

              <div class="profile-info-list profile-info-compact">
                <div class="profile-info-row">
                  <span class="info-icon">
                    <i class="pi pi-user"></i>
                  </span>

                  <div>
                    <small>{{ t('fullName') }}</small>

                    <InputText
                      v-if="editing"
                      v-model="form.fullName"
                      class="w-full"
                    />

                    <strong v-else>{{ form.fullName || '—' }}</strong>
                  </div>
                </div>

                <div class="profile-info-row">
                  <span class="info-icon">
                    <i class="pi pi-envelope"></i>
                  </span>

                  <div>
                    <small>{{ t('email') }}</small>
                    <strong>{{ form.email || '—' }}</strong>
                    <Tag :value="t('verified')" severity="success" />
                  </div>
                </div>

                <div class="profile-info-row">
                  <span class="info-icon">
                    <i class="pi pi-briefcase"></i>
                  </span>

                  <div>
                    <small>{{ t('accountType') }}</small>
                    <strong>{{ trAccountType(t, form.accountType) }}</strong>
                  </div>
                </div>

                <div class="profile-info-row">
                  <span class="info-icon">
                    <i class="pi pi-building"></i>
                  </span>

                  <div>
                    <small>{{ t('businessName') }}</small>

                    <InputText
                      v-if="editing"
                      v-model="form.businessName"
                      class="w-full"
                    />

                    <strong v-else>{{ form.businessName || '—' }}</strong>
                  </div>
                </div>

                <div class="profile-info-row">
                  <span class="info-icon">
                    <i class="pi pi-phone"></i>
                  </span>

                  <div>
                    <small>{{ t('phone') }}</small>

                    <InputText
                      v-if="editing"
                      v-model="form.phone"
                      class="w-full"
                    />

                    <strong v-else>{{ form.phone || '—' }}</strong>
                  </div>
                </div>

                <div class="profile-info-row">
                  <span class="info-icon">
                    <i class="pi pi-map-marker"></i>
                  </span>

                  <div>
                    <small>{{ t('district') }}</small>

                    <InputText
                      v-if="editing"
                      v-model="form.district"
                      class="w-full"
                    />

                    <strong v-else>{{ form.district || '—' }}</strong>
                  </div>
                </div>
              </div>
            </article>

            <article class="panel-card security-card security-card-clean">
              <header>
                <h2>{{ t('accountSecurity') }}</h2>
              </header>

              <div class="security-row security-row-info">
                <span class="info-icon">
                  <i class="pi pi-lock"></i>
                </span>

                <div>
                  <strong>{{ t('password') }}</strong>
                  <small>{{ t('verified') }}</small>
                </div>

                <Tag :value="t('verified')" severity="success" />
              </div>

              <div class="security-row security-row-info">
                <span class="info-icon">
                  <i class="pi pi-desktop"></i>
                </span>

                <div>
                  <strong>{{ t('sessionDevices') }}</strong>
                  <small>Web browser · Lima, PE</small>
                </div>

                <Tag :value="t('active')" severity="success" />
              </div>
            </article>
          </div>

          <div class="profile-right-column">
            <article class="plan-profile-card plan-profile-card-clean">
              <div class="plan-card-icon">
                <i class="pi pi-credit-card"></i>
              </div>

              <div>
                <h3>{{ trPlanName(t, plan) }}</h3>
                <p>{{ trPlanDescription(t, plan) }}</p>

                <small v-if="subscription">
                  {{ t('renewalDate') }}: {{ formatDate(subscription.renewalDate) }}
                </small>
              </div>

              <Button
                :label="t('viewPlanDetails')"
                severity="secondary"
                class="w-full"
                @click="router.push('/app/subscription')"
              />
            </article>

            <article class="panel-card activity-card activity-card-clean">
              <header>
                <h2>{{ t('recentActivity') }}</h2>
              </header>

              <div class="activity-list">
                <div
                    v-for="item in accountActivity"
                    :key="item.id"
                    class="activity-row"
                >
                  <span class="activity-dot"></span>

                  <div>
                    <strong>{{ item.title }}</strong>
                    <small>{{ item.detail }}</small>
                  </div>

                  <time>{{ formatDate(item.createdAt) }}</time>
                </div>
              </div>
            </article>
          </div>
        </div>
      </template>
    </section>
  `
};