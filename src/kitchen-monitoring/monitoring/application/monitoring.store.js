import { MonitoringService } from '../infrastructure/monitoring.service.js';

const service = new MonitoringService();

export const monitoringStore = {
  getZones: (accountId) => service.getZones(accountId),
  getSensors: (accountId) => service.getSensors(accountId),
  getSensorReadings: (accountId) => service.getSensorReadings(accountId),
  processReading: (accountId, sensorId, gas, temp) => service.processReading(accountId, sensorId, gas, temp),
  getPlanForAccount: (accountId) => service.getPlanForAccount(accountId),
  createZone: (accountId, zoneDraft) => service.createZone(accountId, zoneDraft),
  saveStarterZones: (accountId, zonesDraft) => service.saveStarterZones(accountId, zonesDraft)
};
