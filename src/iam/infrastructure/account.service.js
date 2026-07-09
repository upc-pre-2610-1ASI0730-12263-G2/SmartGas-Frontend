import { http } from '../../shared/infrastructure/http/api-client.js';
import { SessionService } from '../../shared/infrastructure/session.service.js';

const sessionService = new SessionService();

function normalizeAccount(data) {
  const accountId = data.accountId ?? data.id ?? data.account?.id;

  return {
    id: accountId,
    accountId,
    email: data.email ?? data.account?.email ?? '',
    name: data.fullName ?? data.name ?? data.profile?.fullName ?? data.email ?? '',
    fullName: data.fullName ?? data.name ?? data.profile?.fullName ?? '',
    businessName: data.businessName ?? data.profile?.businessName ?? '',
    role: data.role ?? data.account?.role ?? '',
    status: data.status ?? data.account?.status ?? 'Active',
    token: data.token ?? data.accessToken ?? null
  };
}

export class AccountService {
  async login(email, password) {
    try {
      const response = await http.post('/auth/sign-in', {
        email,
        password
      });

      const account = normalizeAccount(response.data);
      sessionService.save(account);

      return account;
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async register(email, password, profileData = {}) {
    try {
      const fullName = profileData.fullName || email.split('@')[0];
      const accountType = profileData.accountType || 'commercial';
      const businessName = profileData.businessName || 'SmartGas monitored facility';

      const response = await http.post('/auth/sign-up', {
        email,
        password,
        fullName,
        businessName,
        phone: profileData.phone || '',
        district: profileData.district || '',
        role: accountType === 'commercial' ? 'RestaurantAdministrator' : 'HomeOwner'
      });

      const account = normalizeAccount(response.data);
      sessionService.save(account);

      return account;
    } catch (error) {
      const message = error.response?.data?.message || '';

      if (
          error.response?.status === 409 ||
          message.toLowerCase().includes('email') ||
          message.toLowerCase().includes('already')
      ) {
        throw new Error('EMAIL_EXISTS');
      }

      throw error;
    }
  }
}