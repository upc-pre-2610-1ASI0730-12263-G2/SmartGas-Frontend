import { SettingsService } from '../infrastructure/settings.service.js';

const settingsService = new SettingsService();

export const settingsStore = {
  async getSettings(accountId) {
    return settingsService.getSettings(accountId);
  },

  async saveSettings(accountId, data) {
    return settingsService.saveSettings(accountId, data);
  },

  async getEmergencyContact(accountId) {
    return settingsService.getEmergencyContact(accountId);
  },

  async saveEmergencyContact(accountId, data) {
    return settingsService.saveEmergencyContact(accountId, data);
  },

  async getZones(accountId) {
    return settingsService.getZones(accountId);
  },

  async getSensors(accountId) {
    return settingsService.getSensors(accountId);
  }
};