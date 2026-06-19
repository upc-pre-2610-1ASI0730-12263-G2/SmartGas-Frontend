import { DashboardService } from '../infrastructure/dashboard.service.js';

const service = new DashboardService();

export const dashboardStore = {
  getDashboardData: (accountId) => service.getDashboardData(accountId)
};
