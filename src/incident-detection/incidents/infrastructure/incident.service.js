import { http } from '../../../shared/infrastructure/http/api-client.js';

function normalizeIncident(incident) {
  return {
    ...incident,
    code: incident.code || `INC-${String(incident.id).padStart(3, '0')}`,
    zoneName: incident.zoneName || incident.zone?.name || `Zone ${incident.zoneId}`,
    sensorCode: incident.sensorCode || incident.sensor?.code || '',
    detectedValue: incident.detectedValue ?? incident.value ?? '—',
    status: incident.status || 'Active',
    detectedAt: incident.detectedAt || incident.createdAt
  };
}

function normalizeAlert(alert) {
  return {
    ...alert,
    message: alert.message || alert.description || '',
    status: alert.status || 'Active',
    createdAt: alert.createdAt || alert.sentAt
  };
}

function normalizeNotification(notification) {
  return {
    ...notification,
    read: notification.read ?? notification.isRead ?? false,
    isRead: notification.isRead ?? notification.read ?? false,
    confirmed: notification.confirmed ?? notification.isConfirmed ?? false,
    isConfirmed: notification.isConfirmed ?? notification.confirmed ?? false,
    channel: notification.channel || 'Web',
    message: notification.message || notification.title || 'SmartGas safety notification',
    createdAt: notification.createdAt || notification.sentAt
  };
}

export class IncidentService {
  async getIncidents(accountId) {
    const response = await http.get('/incidents', {
      params: { accountId }
    });

    return response.data.map(normalizeIncident);
  }

  async getAlerts(accountId) {
    const response = await http.get('/alerts', {
      params: { accountId }
    });

    return response.data.map(normalizeAlert);
  }

  async getNotifications(accountId) {
    const response = await http.get('/notifications', {
      params: { accountId }
    });

    return response.data
        .map(normalizeNotification)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async reviewIncident(incidentId) {
    const response = await http.patch(`/incidents/${incidentId}/review`);
    return normalizeIncident(response.data);
  }

  async resolveIncident(incidentId) {
    const response = await http.patch(`/incidents/${incidentId}/resolve`);
    return normalizeIncident(response.data);
  }

  async markFalseAlarm(incidentId) {
    const response = await http.patch(`/incidents/${incidentId}/false-alarm`);
    return normalizeIncident(response.data);
  }

  async markNotificationRead(notificationId) {
    const response = await http.patch(`/notifications/${notificationId}/read`);
    return normalizeNotification(response.data);
  }

  async confirmNotification(notificationId) {
    const response = await http.patch(`/notifications/${notificationId}/confirm`);
    return normalizeNotification(response.data);
  }

  async markReviewed(incidentId) {
    return this.reviewIncident(incidentId);
  }

  async markResolved(incidentId) {
    return this.resolveIncident(incidentId);
  }

  async markAsReviewed(incidentId) {
    return this.reviewIncident(incidentId);
  }

  async markAsResolved(incidentId) {
    return this.resolveIncident(incidentId);
  }

  async markAsFalseAlarm(incidentId) {
    return this.markFalseAlarm(incidentId);
  }

  async markNotificationAsRead(notificationId) {
    return this.markNotificationRead(notificationId);
  }

  async confirmNotificationReception(notificationId) {
    return this.confirmNotification(notificationId);
  }

  async addNote() {
    throw new Error('Incident notes are not available in the current backend.');
  }
}