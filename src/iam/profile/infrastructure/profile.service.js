import { http } from '../../../shared/infrastructure/http/api-client.js';
import { SessionService } from '../../../shared/infrastructure/session.service.js';

const sessionService = new SessionService();

function roleToAccountType(role) {
  const normalizedRole = String(role || '').toLowerCase();

  if (
      normalizedRole.includes('restaurant') ||
      normalizedRole.includes('commercial') ||
      normalizedRole.includes('administrator')
  ) {
    return 'commercial';
  }

  if (
      normalizedRole.includes('home') ||
      normalizedRole.includes('domestic')
  ) {
    return 'domestic';
  }

  return '';
}

function normalizeProfile(profile, subscription = null) {
  const session = sessionService.getCurrentUser() || {};
  const role = profile.role || session.role || '';

  return {
    ...profile,
    id: profile.accountId ?? session.accountId ?? session.id,
    profileId: profile.id,
    email: profile.email || session.email || '',
    role,
    accountType: profile.accountType || session.accountType || roleToAccountType(role),
    memberSince: profile.createdAt || null,
    planId: subscription?.planId || null,
    planName: subscription?.planName || subscription?.currentPlan || ''
  };
}

function normalizeSubscription(subscription, plans = []) {
  const matchedPlan = plans.find(plan =>
      plan.id === subscription.planId ||
      plan.name === subscription.planName ||
      plan.name === subscription.currentPlan
  );

  return {
    ...subscription,
    id: subscription.id ?? subscription.subscriptionId ?? 1,
    planId: subscription.planId ?? matchedPlan?.id ?? null,
    planName: subscription.planName ?? subscription.currentPlan ?? matchedPlan?.name ?? 'Basic',
    status: subscription.status ?? 'Active',
    price: subscription.price ?? matchedPlan?.price ?? 0,
    maxZones: subscription.maxZones ?? matchedPlan?.maxZones ?? 0,
    maxSensors: subscription.maxSensors ?? matchedPlan?.maxSensors ?? 0,
    renewalDate: subscription.renewalDate ?? subscription.startDate ?? null
  };
}

export class ProfileService {
  async getProfile(accountId) {
    const [profileResponse, subscriptionResponse] = await Promise.all([
      http.get(`/profiles/${accountId}`),
      http.get(`/subscriptions/current/${accountId}`).catch(() => ({ data: null }))
    ]);

    return normalizeProfile(profileResponse.data, subscriptionResponse.data);
  }

  async updateProfile(accountId, data) {
    const response = await http.patch(`/profiles/${accountId}`, {
      fullName: data.fullName,
      businessName: data.businessName,
      phone: data.phone,
      district: data.district,
      address: data.address || ''
    });

    return normalizeProfile(response.data);
  }

  async getPlan(planId) {
    if (!planId) return null;

    const response = await http.get('/plans');
    return response.data.find(plan => plan.id === planId) || null;
  }

  async getSubscription(accountId) {
    const [plansResponse, subscriptionResponse] = await Promise.all([
      http.get('/plans'),
      http.get(`/subscriptions/current/${accountId}`)
    ]);

    return normalizeSubscription(subscriptionResponse.data, plansResponse.data);
  }

  async getActivity() {
    return [];
  }

  async getStats(accountId) {
    const [sensors, zones, incidents] = await Promise.all([
      http.get('/sensors', { params: { accountId } }),
      http.get('/zones', { params: { accountId } }),
      http.get('/incidents', { params: { accountId } })
    ]);

    return {
      sensors: sensors.data,
      zones: zones.data,
      activeIncidents: incidents.data.filter(incident =>
          incident.status === 'Active' || incident.status === 'Reviewed'
      )
    };
  }

  async changePassword() {
    throw new Error('Password change is not available in the current backend.');
  }
}