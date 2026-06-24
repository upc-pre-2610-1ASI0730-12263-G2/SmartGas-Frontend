import { http } from '../../../shared/infrastructure/http/api-client.js';

function parseFeatures(features) {
  if (Array.isArray(features)) {
    return features;
  }

  if (!features) {
    return [];
  }

  return String(features)
      .split(',')
      .map(feature => feature.trim())
      .filter(Boolean);
}

function normalizePlan(plan) {
  return {
    ...plan,
    features: parseFeatures(plan.features),
    reportLevel: plan.reportLevel || (plan.name === 'Basic' ? 'Basic' : 'Advanced')
  };
}

function normalizeSubscription(subscription, plans) {
  const matchedPlan = plans.find(plan =>
      plan.id === subscription.planId ||
      plan.name === subscription.planName ||
      plan.name === subscription.currentPlan
  );

  return {
    ...subscription,
    id: subscription.id ?? subscription.subscriptionId ?? 1,
    planId: subscription.planId ?? matchedPlan?.id ?? 1,
    planName: subscription.planName ?? subscription.currentPlan ?? matchedPlan?.name ?? 'Basic',
    currentPlan: subscription.currentPlan ?? subscription.planName ?? matchedPlan?.name ?? 'Basic',
    status: subscription.status ?? 'Active',
    renewalDate: subscription.renewalDate ?? subscription.endDate ?? subscription.startDate ?? null,
    price: subscription.price ?? matchedPlan?.price ?? 0,
    maxZones: subscription.maxZones ?? matchedPlan?.maxZones ?? 0,
    maxSensors: subscription.maxSensors ?? matchedPlan?.maxSensors ?? 0,
    features: parseFeatures(subscription.features ?? matchedPlan?.features)
  };
}

function getPlanIdFromRequest(accountIdOrRequest, planOrPlanId) {
  if (typeof accountIdOrRequest === 'object' && accountIdOrRequest !== null) {
    return Number(
        accountIdOrRequest.planId ??
        accountIdOrRequest.targetPlanId ??
        accountIdOrRequest.targetPlan?.id ??
        accountIdOrRequest.plan?.id ??
        0
    );
  }

  if (typeof planOrPlanId === 'object' && planOrPlanId !== null) {
    return Number(planOrPlanId.id ?? planOrPlanId.planId ?? 0);
  }

  return Number(planOrPlanId ?? 0);
}

function getAccountIdFromRequest(accountIdOrRequest) {
  if (typeof accountIdOrRequest === 'object' && accountIdOrRequest !== null) {
    return Number(accountIdOrRequest.accountId ?? 1);
  }

  return Number(accountIdOrRequest ?? 1);
}

export class SubscriptionService {
  async getPlans() {
    const response = await http.get('/plans');
    return response.data.map(normalizePlan);
  }

  async getSubscription(accountId) {
    const [plans, subscriptionResponse] = await Promise.all([
      this.getPlans(),
      http.get(`/subscriptions/current/${accountId}`)
    ]);

    return normalizeSubscription(subscriptionResponse.data, plans);
  }

  async getPendingRequest() {
    return null;
  }

  async getAllRequests() {
    return [];
  }

  async createRequest(accountIdOrRequest, planOrPlanId) {
    const accountId = getAccountIdFromRequest(accountIdOrRequest);
    const planId = getPlanIdFromRequest(accountIdOrRequest, planOrPlanId);

    if (!planId) {
      const error = new Error('PLAN_REQUIRED');
      error.code = 'PLAN_REQUIRED';
      throw error;
    }

    const [plans, response] = await Promise.all([
      this.getPlans(),
      http.patch(`/subscriptions/current/${accountId}/change-plan`, {
        planId
      })
    ]);

    return normalizeSubscription(response.data, plans);
  }

  async cancelRequest() {
    return null;
  }

  async approveRequest(accountIdOrRequest, planOrPlanId) {
    return this.createRequest(accountIdOrRequest, planOrPlanId);
  }
}