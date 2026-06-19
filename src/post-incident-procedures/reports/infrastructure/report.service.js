import { http } from '../../../shared/infrastructure/http/api-client.js';

export class ReportService {
  async getReportData(accountId) {
    const [incidents, alerts, zones] = await Promise.all([
      http.get('/incidents', { params: { accountId } }),
      http.get('/alerts', { params: { accountId } }),
      http.get('/zones', { params: { accountId } })
    ]);
    return {
      incidents: incidents.data,
      alerts: alerts.data,
      zones: zones.data
    };
  }
}
