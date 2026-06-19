import { IncidentService } from '../infrastructure/incident.service.js';

const service = new IncidentService();

export const incidentStore = {
  getIncidents: (accountId) => service.getIncidents(accountId),
  getAlerts: (accountId) => service.getAlerts(accountId),
  getNotifications: (accountId) => service.getNotifications(accountId),
  markReviewed: (id) => service.markReviewed(id),
  markResolved: (id) => service.markResolved(id),
  markFalseAlarm: (id) => service.markFalseAlarm(id),
  addNote: (id, note) => service.addNote(id, note),
  markNotificationRead: (id) => service.markNotificationRead(id),
  confirmNotification: (id) => service.confirmNotification(id)
};
