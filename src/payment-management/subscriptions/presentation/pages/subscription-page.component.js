import { onMounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { subscriptionStore } from '../../application/subscription.store.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import { formatDate } from '../../../../shared/utils/date-format.js';
import { trPlanName, trPlanDescription, trPlanFeature, trStatus, trLimit } from '../../../../shared/utils/domain-translations.js';

export default {
  name: 'SubscriptionPage',

  setup() {
    const { t } = useI18n();
    const toast = useToast();
    const session = new SessionService().getCurrentUser();

    const plans = ref([]);
    const subscription = ref(null);
    const loading = ref(true);
    const errorMsg = ref('');

    const showConfirmDialog = ref(false);
    const selectedPlan = ref(null);
    const confirmLoading = ref(false);

    const accountId = computed(() =>
        session?.accountId ?? session?.id ?? 1
    );

    const currentPlan = computed(() =>
        plans.value.find(plan => subscription.value && plan.id === subscription.value.planId) || null
    );

    const loadData = async () => {
      loading.value = true;
      errorMsg.value = '';

      try {
        const [plansResponse, subscriptionResponse] = await Promise.all([
          subscriptionStore.getPlans(),
          subscriptionStore.getSubscription(accountId.value)
        ]);

        plans.value = plansResponse;
        subscription.value = subscriptionResponse;
      } catch {
        errorMsg.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    const openRequest = plan => {
      selectedPlan.value = plan;
      showConfirmDialog.value = true;
    };

    const confirmRequest = async () => {
      if (!selectedPlan.value) {
        return;
      }

      confirmLoading.value = true;

      try {
        await subscriptionStore.createRequest({
          accountId: accountId.value,
          planId: selectedPlan.value.id
        });

        showConfirmDialog.value = false;
        selectedPlan.value = null;

        await loadData();

        toast.add({
          severity: 'success',
          summary: t('planChangeApplied'),
          life: 4000
        });
      } catch {
        toast.add({
          severity: 'error',
          summary: t('errorSaving'),
          life: 3000
        });
      } finally {
        confirmLoading.value = false;
      }
    };

    onMounted(loadData);

    return {
      t,
      plans,
      subscription,
      loading,
      errorMsg,
      showConfirmDialog,
      selectedPlan,
      confirmLoading,
      currentPlan,
      loadData,
      openRequest,
      confirmRequest,
      formatDate,
      trPlanName,
      trPlanDescription,
      trPlanFeature,
      trStatus,
      trLimit
    };
  },

  template: `
    <section class="content-page subscription-page" aria-label="Subscription">
      <div class="page-header">
        <div>
          <h1>{{ t('subscriptionTitle') }}</h1>
          <p>{{ t('subscriptionSubtitle') }}</p>
        </div>

        <Button
          :label="t('refreshAction')"
          icon="pi pi-refresh"
          severity="secondary"
          @click="loadData"
          :loading="loading"
        />
      </div>

      <div v-if="errorMsg" class="alert-banner">
        <i class="pi pi-exclamation-triangle"></i> {{ errorMsg }}
      </div>

      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i> {{ t('loading') }}
      </div>

      <template v-if="!loading">
        <article class="current-plan-banner modern-plan-banner">
          <div class="current-plan-info">
            <span class="small-label">{{ t('activePlan') }}</span>
            <h2>{{ currentPlan ? trPlanName(t, currentPlan) : '—' }}</h2>
            <p>{{ currentPlan ? trPlanDescription(t, currentPlan) : '' }}</p>
          </div>

          <div class="current-plan-meta">
            <Tag
              :value="subscription ? trStatus(t, subscription.status) : '—'"
              severity="success"
            />

            <span v-if="subscription" class="renewal-info">
              <i class="pi pi-calendar"></i>
              {{ t('renewalDate') }}: {{ formatDate(subscription.renewalDate) }}
            </span>
          </div>
        </article>

        <div class="section-title-row">
          <h2>{{ t('availablePlans') }}</h2>
        </div>

        <div class="plans-grid enhanced-plans-grid">
          <article
            v-for="plan in plans"
            :key="plan.id"
            class="plan-card enhanced-plan-card"
            :class="{ 'plan-current': currentPlan && currentPlan.id === plan.id }"
            tabindex="0"
          >
            <div class="plan-badge-row">
              <Tag
                v-if="currentPlan && currentPlan.id === plan.id"
                :value="t('activePlan')"
                severity="success"
              />
            </div>

            <h3>{{ trPlanName(t, plan) }}</h3>

            <div class="plan-price">
              <strong>PEN {{ plan.price }}</strong>
              <span>{{ t('perMonth') }}</span>
            </div>

            <p class="plan-desc">
              {{ trPlanDescription(t, plan) }}
            </p>

            <div class="plan-limits">
              <div>
                <small>{{ t('maxSensors') }}</small>
                <strong>{{ trLimit(t, plan.maxSensors, 'sensors') }}</strong>
              </div>

              <div>
                <small>{{ t('maxZones') }}</small>
                <strong>{{ trLimit(t, plan.maxZones, 'zones') }}</strong>
              </div>

              <div>
                <small>{{ t('reportLevel') }}</small>
                <strong>{{ plan.reportLevel === 'Advanced' ? t('advancedReports') : t('basicReports') }}</strong>
              </div>
            </div>

            <ul class="plan-features">
              <li
                v-for="feature in plan.features"
                :key="feature"
              >
                <i class="pi pi-check"></i>
                {{ trPlanFeature(t, feature) }}
              </li>
            </ul>

            <Button
              v-if="!currentPlan || currentPlan.id !== plan.id"
              :label="t('requestPlanChange')"
              icon="pi pi-arrow-right"
              @click="openRequest(plan)"
              class="w-full plan-cta"
            />

            <Button
              v-else
              :label="t('activePlan')"
              icon="pi pi-check"
              severity="success"
              class="w-full plan-cta"
              disabled
            />
          </article>
        </div>
      </template>

      <Dialog
        v-model:visible="showConfirmDialog"
        :header="t('planChangeTitle')"
        modal
        :style="{ width: '560px' }"
      >
        <div v-if="selectedPlan" class="plan-confirm-body">
          <div class="confirm-row">
            <span>{{ t('fromPlan') }}</span>
            <strong>{{ currentPlan ? trPlanName(t,currentPlan) : '—' }}</strong>
          </div>

          <div class="confirm-row">
            <span>{{ t('toPlan') }}</span>
            <strong>{{ trPlanName(t, selectedPlan) }}</strong>
          </div>

          <div class="confirm-row">
            <span>{{ t('price') }}</span>
            <strong>PEN {{ selectedPlan.price }}{{ t('perMonth') }}</strong>
          </div>

          <div class="confirm-benefits">
            <strong>{{ t('benefits') }}:</strong>

            <ul>
              <li
                v-for="feature in selectedPlan.features"
                :key="feature"
              >
                <i class="pi pi-check"></i>
                {{ trPlanFeature(t, feature) }}
              </li>
            </ul>
          </div>

          <div class="confirm-note">
            <i class="pi pi-info-circle"></i>
            {{ t('planChangeNote') }}
          </div>
        </div>

        <template #footer>
          <Button
            :label="t('cancelAction')"
            severity="secondary"
            @click="showConfirmDialog = false"
          />

          <Button
            :label="t('confirmRequest')"
            icon="pi pi-check"
            :loading="confirmLoading"
            @click="confirmRequest"
          />
        </template>
      </Dialog>
    </section>`
};