import { ReportService } from '../infrastructure/report.service.js';

const service = new ReportService();

export const reportStore = {
  getReportData: (accountId) => service.getReportData(accountId)
};
