import { http } from '../../../shared/infrastructure/http/api-client.js';
import { nowISO } from '../../../shared/utils/date-format.js';

function getReadingDate(reading) {
  return new Date(reading.createdAt || reading.timestamp || reading.recordedAt || 0);
}

function getReadingGas(reading) {
  return reading.gasValue ?? reading.gasLevel ?? reading.gas ?? null;
}

function getReadingTemperature(reading) {
  return reading.temperatureValue ?? reading.temperature ?? null;
}

function formatLastReading(sensor, reading) {
  if (!reading) {
    return '—';
  }

  const sensorType = String(sensor.type || '').toLowerCase();
  const gas = getReadingGas(reading);
  const temperature = getReadingTemperature(reading);

  if (sensorType.includes('temperature')) {
    return temperature != null ? `Temp: ${temperature} °C` : '—';
  }

  if (sensorType === 'gas' || sensorType.includes('gas')) {
    return gas != null ? `Gas: ${gas} ppm` : '—';
  }

  if (gas != null && temperature != null) {
    return `Gas: ${gas} ppm / Temp: ${temperature} °C`;
  }

  if (gas != null) {
    return `Gas: ${gas} ppm`;
  }

  if (temperature != null) {
    return `Temp: ${temperature} °C`;
  }

  return '—';
}

function findLatestReadingForSensor(sensor, readings) {
  return readings
      .filter(reading =>
          reading.sensorId === sensor.id ||
          String(reading.sensorCode || '').toUpperCase() === String(sensor.code || '').toUpperCase()
      )
      .sort((a, b) => getReadingDate(b) - getReadingDate(a))[0] || null;
}

function normalizeSensor(sensor, readings = []) {
  const latestReading = findLatestReadingForSensor(sensor, readings);

  return {
    ...sensor,
    battery: sensor.battery ?? sensor.batteryLevel ?? 100,
    batteryLevel: sensor.batteryLevel ?? sensor.battery ?? 100,
    lastReading: formatLastReading(sensor, latestReading),
    lastConnected:
        latestReading?.createdAt ??
        latestReading?.timestamp ??
        sensor.lastConnected ??
        sensor.updatedAt ??
        sensor.createdAt ??
        nowISO(),
    status: sensor.status || 'Online'
  };
}

function normalizeZone(zone) {
  return {
    ...zone,
    status: zone.status || 'Safe',
    sensitivity: zone.sensitivity || 'Medium'
  };
}

function normalizePlanFromSubscription(subscription) {
  return {
    id: subscription.planId ?? subscription.id ?? 1,
    name: subscription.planName ?? subscription.currentPlan ?? 'Básico',
    price: subscription.price ?? 0,
    maxZones: subscription.maxZones ?? 0,
    maxSensors: subscription.maxSensors ?? 0,
    status: subscription.status ?? 'Active'
  };
}

function normalizeSensorPayload(data) {
  return {
    accountId: Number(data.accountId),
    zoneId: Number(data.zoneId),
    code: String(data.code || '').trim().toUpperCase(),
    name: String(data.name || '').trim(),
    type: data.type
  };
}

export class SensorService {
  async getSensors(accountId) {
    const [sensorsResponse, readingsResponse] = await Promise.all([
      http.get('/sensors', {
        params: { accountId }
      }),
      http.get('/sensor-readings', {
        params: { accountId }
      })
    ]);

    const readings = readingsResponse.data || [];

    return sensorsResponse.data.map(sensor => normalizeSensor(sensor, readings));
  }

  async getZones(accountId) {
    const response = await http.get('/zones', {
      params: { accountId }
    });

    return response.data.map(normalizeZone);
  }

  async getPlanForAccount(accountId) {
    const response = await http.get(`/subscriptions/current/${accountId}`);
    return normalizePlanFromSubscription(response.data);
  }

  async createSensor(data) {
    const payload = normalizeSensorPayload(data);

    if (!payload.code) {
      const error = new Error('EMPTY_SENSOR_CODE');
      error.code = 'EMPTY_SENSOR_CODE';
      throw error;
    }

    if (!payload.name) {
      const error = new Error('EMPTY_SENSOR_NAME');
      error.code = 'EMPTY_SENSOR_NAME';
      throw error;
    }

    if (!payload.type) {
      const error = new Error('EMPTY_SENSOR_TYPE');
      error.code = 'EMPTY_SENSOR_TYPE';
      throw error;
    }

    if (!payload.zoneId) {
      const error = new Error('EMPTY_ZONE_ID');
      error.code = 'EMPTY_ZONE_ID';
      throw error;
    }

    const currentSensors = await this.getSensors(payload.accountId);

    const codeExists = currentSensors.some(sensor =>
        String(sensor.code || '').trim().toUpperCase() === payload.code
    );

    if (codeExists) {
      const error = new Error('CODE_EXISTS');
      error.code = 'CODE_EXISTS';
      throw error;
    }

    const plan = await this.getPlanForAccount(payload.accountId);
    const maxSensors = plan?.maxSensors;

    if (
        maxSensors !== 'Unlimited' &&
        Number(maxSensors || 0) > 0 &&
        currentSensors.length >= Number(maxSensors)
    ) {
      const error = new Error('SENSOR_LIMIT_REACHED');
      error.code = 'SENSOR_LIMIT_REACHED';
      throw error;
    }

    const response = await http.post('/sensors', payload);
    return normalizeSensor(response.data);
  }

  async updateSensor(id, data) {
    const response = await http.patch(`/sensors/${id}`, data);
    return normalizeSensor(response.data);
  }

  async deactivateSensor(id) {
    const response = await http.patch(`/sensors/${id}`, {
      status: 'Offline'
    });

    return normalizeSensor(response.data);
  }

  async reactivateSensor(id) {
    const response = await http.patch(`/sensors/${id}`, {
      status: 'Online'
    });

    return normalizeSensor(response.data);
  }
}