import { http } from '../../../shared/infrastructure/http/api-client.js';

function normalizeReading(reading) {
  return {
    ...reading,
    gasValue: reading.gasValue ?? reading.gasLevel ?? 0,
    temperatureValue: reading.temperatureValue ?? reading.temperature ?? 0,
    timestamp: reading.timestamp ?? reading.createdAt,
    createdAt: reading.createdAt ?? reading.timestamp
  };
}

function normalizeSensor(sensor) {
  return {
    ...sensor,
    battery: sensor.battery ?? sensor.batteryLevel ?? 100,
    batteryLevel: sensor.batteryLevel ?? sensor.battery ?? 100,
    lastConnected: sensor.lastConnected ?? sensor.updatedAt ?? sensor.createdAt,
    lastReading: sensor.lastReading ?? '—'
  };
}

function normalizeZone(zone, readings = [], sensors = []) {
  const zoneReadings = readings
      .filter(reading => reading.zoneId === zone.id)
      .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));

  const latestReading = zoneReadings[0] || null;

  const gasLevel = latestReading
      ? latestReading.gasValue ?? latestReading.gasLevel ?? 0
      : zone.gasLevel ?? 0;

  const temperature = latestReading
      ? latestReading.temperatureValue ?? latestReading.temperature ?? 0
      : zone.temperature ?? 0;

  const sensorCount = sensors.filter(sensor => sensor.zoneId === zone.id).length;

  const status = String(zone.status || '').toLowerCase();

  const riskLevel =
      status === 'critical'
          ? 'Critical'
          : status === 'warning'
              ? 'High'
              : 'Low';

  return {
    ...zone,
    gasLevel,
    temperature,
    sensorCount,
    riskLevel,
    lastUpdated: latestReading?.createdAt ?? latestReading?.timestamp ?? zone.updatedAt ?? zone.createdAt
  };
}

function normalizePlan(plan) {
  return {
    ...plan,
    maxZones: plan.maxZones ?? plan.zoneLimit ?? 0,
    maxSensors: plan.maxSensors ?? plan.sensorLimit ?? 0
  };
}

export class MonitoringService {
  async getZones(accountId) {
    const [zonesResponse, sensorsResponse, readingsResponse] = await Promise.all([
      http.get('/zones', { params: { accountId } }),
      http.get('/sensors', { params: { accountId } }),
      http.get('/sensor-readings', { params: { accountId } })
    ]);

    const sensors = sensorsResponse.data.map(normalizeSensor);
    const readings = readingsResponse.data.map(normalizeReading);

    return zonesResponse.data.map(zone => normalizeZone(zone, readings, sensors));
  }

  async getSensors(accountId) {
    const response = await http.get('/sensors', {
      params: { accountId }
    });

    return response.data.map(normalizeSensor);
  }

  async getSensorReadings(accountId) {
    const response = await http.get('/sensor-readings', {
      params: { accountId }
    });

    return response.data.map(normalizeReading);
  }

  async getSettings(accountId) {
    const response = await http.get(`/settings/${accountId}`);
    return response.data;
  }

  async processReading(accountId, sensorId, gasValue, temperatureValue) {
    const sensors = await this.getSensors(accountId);
    const sensor = sensors.find(item => item.id === sensorId);

    if (!sensor) {
      throw new Error('SENSOR_NOT_FOUND');
    }

    const response = await http.post('/sensor-readings', {
      sensorCode: sensor.code,
      gasLevel: Number(gasValue),
      temperature: Number(temperatureValue)
    });

    return {
      ...response.data,
      incidentCreated: Boolean(response.data.incidentCreated),
      severity: response.data.severity || response.data.incidentSeverity || null,
      incidentType: response.data.incidentType || response.data.type || null
    };
  }

  async getPlanForAccount(accountId) {
    const [subscriptionResponse, plansResponse] = await Promise.all([
      http.get(`/subscriptions/current/${accountId}`),
      http.get('/plans')
    ]);

    const subscription = subscriptionResponse.data;
    const plans = plansResponse.data;

    const plan = plans.find(item =>
        item.id === subscription.planId ||
        item.name === subscription.planName ||
        item.name === subscription.currentPlan
    );

    return normalizePlan(plan || {
      id: subscription.planId ?? 1,
      name: subscription.planName ?? subscription.currentPlan ?? 'Básico',
      maxZones: subscription.maxZones ?? 0,
      maxSensors: subscription.maxSensors ?? 0
    });
  }

  async createZone(accountId, zoneDraft) {
    const name = String(zoneDraft?.name || '').trim();

    if (!name) {
      const error = new Error('EMPTY_ZONE_NAME');
      error.code = 'EMPTY_ZONE_NAME';
      throw error;
    }

    try {
      const response = await http.post('/zones', {
        accountId,
        name,
        description: zoneDraft?.description || '',
        sensitivity: zoneDraft?.sensitivity || 'Medium'
      });

      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || '';

      if (
          error.response?.status === 409 ||
          message.toLowerCase().includes('limit') ||
          message.toLowerCase().includes('plan')
      ) {
        const planLimitError = new Error('ZONE_LIMIT_REACHED');
        planLimitError.code = 'ZONE_LIMIT_REACHED';
        throw planLimitError;
      }

      throw error;
    }
  }

  async saveStarterZones(accountId, zonesDraft) {
    const created = [];

    for (const draft of zonesDraft || []) {
      if (String(draft?.name || '').trim()) {
        created.push(await this.createZone(accountId, draft));
      }
    }

    return created;
  }
}