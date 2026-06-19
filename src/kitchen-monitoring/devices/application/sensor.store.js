import { SensorService } from '../infrastructure/sensor.service.js';

const service = new SensorService();

export const sensorStore = {
  getSensors: (accountId) => service.getSensors(accountId),
  getZones: (accountId) => service.getZones(accountId),
  getPlanForAccount: (accountId) => service.getPlanForAccount(accountId),
  createSensor: (data) => service.createSensor(data),
  updateSensor: (id, data) => service.updateSensor(id, data),
  deactivateSensor: (id) => service.deactivateSensor(id),
  reactivateSensor: (id) => service.reactivateSensor(id)
};
