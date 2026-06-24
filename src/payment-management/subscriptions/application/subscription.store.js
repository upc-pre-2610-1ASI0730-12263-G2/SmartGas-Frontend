import { SubscriptionService } from '../infrastructure/subscription.service.js';

const service = new SubscriptionService();

export const subscriptionStore = {
  getPlans: () => service.getPlans(),
  getSubscription: (accountId) => service.getSubscription(accountId),
  getPendingRequest: (accountId) => service.getPendingRequest(accountId),
  getAllRequests: (accountId) => service.getAllRequests(accountId),
  createRequest: (accountId, currentPlanId, targetPlanId) => service.createRequest(accountId, currentPlanId, targetPlanId),
  cancelRequest: (requestId) => service.cancelRequest(requestId),
  approveRequest: (requestId, subscriptionId, targetPlanId, accountId) =>
    service.approveRequest(requestId, subscriptionId, targetPlanId, accountId)
};
