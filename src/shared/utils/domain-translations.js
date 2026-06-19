const zoneKeys = {
  'Main Kitchen': 'zoneMainKitchen',
  'Cocina principal': 'zoneMainKitchen',
  'Cocina Principal': 'zoneMainKitchen',
  Kitchen: 'zoneMainKitchen',

  'Storage Room': 'zoneWarehouse',
  Warehouse: 'zoneWarehouse',
  Almacén: 'zoneWarehouse',

  'Dining Area': 'zoneDiningArea',
  Comedor: 'zoneDiningArea'
};

const zoneDescriptionKeys = {
  'Primary cooking area': 'zoneMainKitchenDescription',
  'Storage and supply area': 'zoneWarehouseDescription',
  'Customer dining space': 'zoneDiningAreaDescription'
};

const statusKeys = {
  Safe: 'statusSafe',
  Seguro: 'statusSafe',

  Warning: 'statusWarning',
  Advertencia: 'statusWarning',

  Critical: 'statusCritical',
  Crítico: 'statusCritical',
  Critico: 'statusCritical',

  Offline: 'statusOffline',
  'Sin conexión': 'statusOffline',

  Online: 'statusOnline',
  'En línea': 'statusOnline',

  Maintenance: 'statusMaintenance',
  Detected: 'statusDetected',
  Reviewed: 'statusReviewed',
  Resolved: 'statusResolved',
  'False Alarm': 'statusFalseAlarm',
  FalseAlarm: 'statusFalseAlarm',

  Pending: 'pending',
  Active: 'active',
  Inactive: 'inactive',
  Approved: 'statusApproved',
  Cancelled: 'statusCancelled'
};

const severityKeys = {
  Low: 'low',
  Bajo: 'low',

  Medium: 'medium',
  Medio: 'medium',

  High: 'high',
  Alto: 'high',

  Warning: 'warning',
  Advertencia: 'warning',

  Critical: 'critical',
  Crítico: 'critical',
  Critico: 'critical'
};

const typeKeys = {
  GasLeak: 'gasLeak',
  'Gas Leak': 'gasLeak',
  'Fuga de Gas': 'gasLeak',
  'Fuga de gas': 'gasLeak',

  HighTemperature: 'highTemperature',
  'High Temperature': 'highTemperature',
  'Temperatura Alta': 'highTemperature',
  'Temperatura alta': 'highTemperature',

  GasLeakAndHighTemperature: 'gasLeakAndHighTemperature',
  'Gas Leak And High Temperature': 'gasLeakAndHighTemperature',
  'Gas Leak and High Temperature': 'gasLeakAndHighTemperature',
  'Fuga de gas y temperatura alta': 'gasLeakAndHighTemperature',

  SmokeRisk: 'smokeRisk',
  'Smoke Risk': 'smokeRisk',

  CORisk: 'coRisk',
  'CO Risk': 'coRisk'
};

const sensorTypeKeys = {
  Gas: 'sensorTypeGas',
  'Gas LP': 'sensorTypeGas',
  Temperature: 'sensorTypeTemperature',
  Temperatura: 'sensorTypeTemperature',
  CO: 'sensorTypeCo',
  Smoke: 'sensorTypeSmoke',
  Humo: 'sensorTypeSmoke',
  MultiSensor: 'sensorTypeMulti',
  'Multi-sensor': 'sensorTypeMulti',
  Multisensor: 'sensorTypeMulti'
};

const sensorNameKeys = {
  'Main Kitchen Sensor': 'sensorMainKitchen',
  'Gas Sensor': 'sensorGasGeneric',
  'Storage Gas Sensor': 'sensorStorageGas',
  'Storage Temperature Sensor': 'sensorStorageTemperature',
  'Backup-MultiSensor': 'sensorBackupMulti',
  'Backup MultiSensor': 'sensorBackupMulti',

  'Gas Sensor Alpha': 'sensorGasAlpha',
  'Temp Sensor Alpha': 'sensorTempAlpha',
  'Gas Sensor Beta': 'sensorGasBeta',
  'Temp Sensor Beta': 'sensorTempBeta',
  'Gas Sensor Gamma': 'sensorGasGamma'
};

const locationKeys = {
  'Near stove': 'locationNearStove',
  'Ceiling mount': 'locationCeilingMount',
  'Near storage tanks': 'locationNearStorageTanks',
  'Wall mount east': 'locationWallMountEast',
  'Entrance wall': 'locationEntranceWall'
};

const planNameKeys = {
  Basic: 'planBasicName',
  Básico: 'planBasicName',
  Professional: 'planProfessionalName',
  Profesional: 'planProfessionalName',
  Corporate: 'planCorporateName',
  Corporativo: 'planCorporateName'
};

const planDescriptionKeys = {
  Basic: 'planBasicDescription',
  Professional: 'planProfessionalDescription',
  Corporate: 'planCorporateDescription'
};

const planFeatureKeys = {
  'Basic monitoring': 'planFeatureBasicMonitoring',
  'Web notifications': 'planFeatureWebNotifications',
  'Incident history and response tracking': 'planFeatureIncidentHistory',

  'Advanced monitoring': 'planFeatureAdvancedMonitoring',
  Reports: 'planFeatureReports',
  'Priority alerts and escalation': 'planFeaturePriorityAlerts',

  'Multi-zone monitoring': 'planFeatureMultiZone',
  'Advanced reports': 'planFeatureAdvancedReports',
  'Extended support': 'planFeatureExtendedSupport',

  'Up to 5 sensors': 'planBasicFeatureSensors',
  'Web alerts': 'planBasicFeatureWebAlerts',
  'Basic incident reports': 'planBasicFeatureReports',
  'Up to 3 zones': 'planBasicFeatureZones',
  'Email support': 'planBasicFeatureSupport',
  'Up to 12 sensors': 'planProfessionalFeatureSensors',
  'SMS and email notifications': 'planProfessionalFeatureChannels',
  'Incident history': 'planProfessionalFeatureHistory',
  'Up to 5 zones': 'planProfessionalFeatureZones',
  'Team access': 'planProfessionalFeatureTeam',
  'Unlimited sensors': 'planCorporateFeatureSensors',
  'Priority alerts': 'planCorporateFeatureAlerts',
  'Advanced analytics': 'planCorporateFeatureAnalytics',
  'Unlimited zones': 'planCorporateFeatureZones',
  'Dedicated support': 'planCorporateFeatureSupport',
  'Multiple locations': 'planCorporateFeatureLocations'
};

const activityDetailKeys = {
  'Web browser · Lima, PE': 'activityDetailWebLogin',
  'Chrome · Lima, PE': 'activityDetailChromeLogin',
  'SG-005 · Dining Area': 'activityDetailSensorGamma',
  'INC-001 · Warehouse': 'activityDetailIncidentWarehouse',
  'Safety thresholds': 'activityDetailSafetyThresholds',
  'Safety preferences': 'activityDetailSafetyPreferences',
  'Password updated': 'activityDetailPasswordUpdated',
  'SmartGas Basic': 'activityDetailSmartGasBasic'
};

export const translateValue = (t, value, dictionary) => {
  if (value === null || value === undefined || value === '') {
    return value || '—';
  }

  const key = dictionary[value];

  return key ? t(key) : value;
};

export const trZone = (t, name) => translateValue(t, name, zoneKeys);
export const trZoneDescription = (t, description) => translateValue(t, description, zoneDescriptionKeys);
export const trStatus = (t, status) => translateValue(t, status, statusKeys);
export const trSeverity = (t, severity) => translateValue(t, severity, severityKeys);
export const trIncidentType = (t, type) => translateValue(t, type, typeKeys);
export const trSensorType = (t, type) => translateValue(t, type, sensorTypeKeys);
export const trSensorName = (t, name) => translateValue(t, name, sensorNameKeys);
export const trLocationDetail = (t, detail) => translateValue(t, detail, locationKeys);
export const trPlanName = (t, plan) => translateValue(t, typeof plan === 'string' ? plan : plan?.name, planNameKeys);
export const trPlanDescription = (t, plan) => translateValue(t, typeof plan === 'string' ? plan : plan?.name, planDescriptionKeys);
export const trPlanFeature = (t, feature) => translateValue(t, feature, planFeatureKeys);
export const trAccountType = (t, type) => ({ commercial: t('commercialAccount'), domestic: t('domesticAccount') }[type] || type || '—');
export const trActivityDetail = (t, detail) => translateValue(t, detail, activityDetailKeys);

export const trLimit = (t, value, noun = '') => {
  if (value === 'Unlimited') {
    return noun === 'zones' ? t('unlimitedZonesShort') : t('unlimitedShort');
  }

  return value;
};

export const translatedMessageParams = (t, params = {}) => ({
  ...params,
  severity: trSeverity(t, params.severity),
  type: trIncidentType(t, params.type),
  zone: trZone(t, params.zone)
});

export const formatIncidentNotification = (t, notification) => {
  if (!notification) {
    return '';
  }

  if (notification.messageKey) {
    return t(notification.messageKey, translatedMessageParams(t, notification.messageParams || {}));
  }

  const message = notification.message || '';

  const match = message.match(/^Sensor (.+?) detected a (.+?) event in zone (.+?)\.$/i);

  if (match) {
    return t('notificationIncidentDetected', {
      sensor: match[1],
      type: trIncidentType(t, match[2]),
      zone: trZone(t, match[3])
    });
  }

  return message;
};