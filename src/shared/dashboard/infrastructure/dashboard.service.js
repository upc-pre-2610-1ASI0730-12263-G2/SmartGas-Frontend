import { http } from '../../infrastructure/http/api-client.js';

function normalizeStatus(status) {
  if (status === 'Active') return 'Warning';
  return status || 'Safe';
}

function normalizeIncident(incident) {
  return {
    ...incident,
    code: incident.code || `INC-${String(incident.id).padStart(3, '0')}`,
    zoneName: incident.zoneName || incident.zone?.name || `Zone ${incident.zoneId}`,
    sensorCode: incident.sensorCode || incident.sensor?.code || ''
  };
}

function normalizeReading(reading) {
  return {
    ...reading,
    gasValue: reading.gasValue ?? reading.gasLevel ?? null,
    temperatureValue: reading.temperatureValue ?? reading.temperature ?? null,
    timestamp: reading.timestamp ?? reading.createdAt
  };
}

function getReadingTime(reading) {
  const value = reading?.timestamp ?? reading?.createdAt;

  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export class DashboardService {
  async getDashboardData(accountId) {
    const [
      sensorsResponse,
      zonesResponse,
      incidentsResponse,
      alertsResponse,
      sensorReadingsResponse,
      subscriptionResponse,
      plansResponse
    ] = await Promise.all([
      http.get('/sensors', { params: { accountId } }),
      http.get('/zones', { params: { accountId } }),
      http.get('/incidents', { params: { accountId } }),
      http.get('/alerts', { params: { accountId } }),
      http.get('/sensor-readings', { params: { accountId } }),
      http.get(`/subscriptions/current/${accountId}`),
      http.get('/plans')
    ]);

    const sensors = sensorsResponse.data;
    const incidents = incidentsResponse.data.map(normalizeIncident);
    const alerts = alertsResponse.data;
    const sensorReadings = sensorReadingsResponse.data
        .map(normalizeReading)
        .sort((a, b) => getReadingTime(b) - getReadingTime(a));

    const latestReadingByZoneId = new Map();

    sensorReadings.forEach(reading => {
      const zoneId = reading.zoneId ?? reading.zone?.id;

      if (!zoneId) {
        return;
      }

      const normalizedZoneId = Number(zoneId);
      const currentReading = latestReadingByZoneId.get(normalizedZoneId);

      if (!currentReading || getReadingTime(reading) >= getReadingTime(currentReading)) {
        latestReadingByZoneId.set(normalizedZoneId, reading);
      }
    });

    const zones = zonesResponse.data.map(zone => {
      const latestReading = latestReadingByZoneId.get(Number(zone.id));

      return {
        ...zone,
        gasLevel: latestReading?.gasValue ?? zone.gasLevel ?? '—',
        temperature: latestReading?.temperatureValue ?? zone.temperature ?? '—',
        status: normalizeStatus(zone.status)
      };
    });

    const subscription = subscriptionResponse.data;
    const plans = plansResponse.data;

    const activeIncidents = incidents.filter(incident =>
        incident.status === 'Active' || incident.status === 'Reviewed'
    );

    const pendingAlerts = alerts.filter(alert =>
        alert.status === 'Active' || alert.status === 'Pending'
    );

    let overallStatus = 'Safe';

    if (activeIncidents.some(incident => incident.severity === 'Critical')) {
      overallStatus = 'Critical';
    } else if (activeIncidents.length > 0 || pendingAlerts.length > 0) {
      overallStatus = 'Warning';
    }

    const plan = plans.find(plan =>
        plan.id === subscription.planId ||
        plan.name === subscription.planName ||
        plan.name === subscription.currentPlan
    ) || {
      id: subscription.planId,
      name: subscription.planName || subscription.currentPlan || 'Basic',
      price: subscription.price,
      maxZones: subscription.maxZones,
      maxSensors: subscription.maxSensors,
      features: []
    };

    const lastReading = sensorReadings.length > 0
        ? sensorReadings[0]
        : null;

    const criticalZone = zones.find(zone => zone.status === 'Critical') ||
        zones.find(zone => zone.status === 'Warning') ||
        null;

    return {
      sensors,
      zones,
      activeIncidents,
      pendingAlerts,
      overallStatus,
      plan,
      subscription,
      lastReading,
      criticalZone
    };
  }
}