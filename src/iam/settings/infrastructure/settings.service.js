import { http } from '../../../shared/infrastructure/http/api-client.js';
import i18n from '../../../i18n/index.js';

function toUiLanguage(language) {
  if (language === 'es-419' || language === 'es') {
    return 'es';
  }

  return 'en';
}

function toApiLanguage(language) {
  if (language === 'es' || language === 'es-419') {
    return 'es-419';
  }

  return 'en-US';
}

function normalizeSettings(settings) {
  const gasThreshold = Number(settings.gasThreshold ?? 50);
  const temperatureThreshold = Number(settings.temperatureThreshold ?? 45);
  const language = toUiLanguage(settings.language);

  return {
    ...settings,
    language,
    locale: language,
    darkMode: Boolean(settings.darkMode),
    notificationsEnabled: Boolean(settings.notificationsEnabled),
    gasThreshold,
    temperatureThreshold,
    gasWarningLimit: gasThreshold,
    temperatureWarningLimit: temperatureThreshold,
    webAlerts: Boolean(settings.notificationsEnabled)
  };
}

function buildSettingsPayload(data) {
  return {
    language: toApiLanguage(data.language),
    darkMode: Boolean(data.darkMode),
    notificationsEnabled: Boolean(data.notificationsEnabled ?? data.webAlerts),
    gasThreshold: Number(data.gasThreshold ?? data.gasWarningLimit),
    temperatureThreshold: Number(data.temperatureThreshold ?? data.temperatureWarningLimit)
  };
}

function normalizeEmergencyContact(contact, accountId) {
  return {
    id: contact?.id ?? 0,
    accountId: contact?.accountId ?? accountId,
    name: contact?.name ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    createdAt: contact?.createdAt ?? null,
    updatedAt: contact?.updatedAt ?? null
  };
}

export class SettingsService {
  async getSettings(accountId) {
    const response = await http.get(`/settings/${accountId}`);
    return normalizeSettings(response.data);
  }

  async saveSettings(accountId, data) {
    const payload = buildSettingsPayload(data);
    const response = await http.patch(`/settings/${accountId}`, payload);

    const normalizedSettings = normalizeSettings(response.data);
    i18n.global.locale.value = normalizedSettings.language;

    return normalizedSettings;
  }

  async getEmergencyContact(accountId) {
    const response = await http.get(`/emergency-contacts/${accountId}`);
    return normalizeEmergencyContact(response.data, accountId);
  }

  async saveEmergencyContact(accountId, data) {
    const response = await http.patch(`/emergency-contacts/${accountId}`, {
      name: data.name,
      phone: data.phone,
      email: data.email
    });

    return normalizeEmergencyContact(response.data, accountId);
  }

  async getZones(accountId) {
    const response = await http.get('/zones', {
      params: { accountId }
    });

    return response.data;
  }

  async getSensors(accountId) {
    const response = await http.get('/sensors', {
      params: { accountId }
    });

    return response.data;
  }
}