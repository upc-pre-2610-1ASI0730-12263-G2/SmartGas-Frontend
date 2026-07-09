import { ProfileService } from '../infrastructure/profile.service.js';

const service = new ProfileService();

export const profileStore = {
  getProfile: (accountId) => service.getProfile(accountId),
  updateProfile: (profileId, data) => service.updateProfile(profileId, data),
  getPlan: (planId) => service.getPlan(planId),
  getSubscription: (accountId) => service.getSubscription(accountId),
  getActivity: (accountId) => service.getActivity(accountId),
  getStats: (accountId) => service.getStats(accountId),
  changePassword: (accountId, password) => service.changePassword(accountId, password)
};
