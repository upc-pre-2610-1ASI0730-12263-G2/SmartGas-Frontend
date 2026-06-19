# SmartGas App Web V1

SmartGas es una aplicación web para monitorear sensores IoT de gas y temperatura, gestionar zonas, detectar incidentes de seguridad y visualizar alertas en cocinas domésticas o comerciales.

## Tecnologías

Vue 3, Vite, PrimeVue, Vue Router, Vue I18n y Axios.

## Backend

La aplicación consume datos desde el backend `SmartGas.Api`, desarrollado con ASP.NET Core y PostgreSQL.

URL local esperada:

```env
VITE_API_BASE_URL=http://localhost:5048/api/v1
```

## Instalación

```bash
npm install
```

## Ejecutar la aplicación

```bash
npm run dev
```

## Generar build

```bash
npm run build
```

## Cuenta de prueba

```txt
usuario@smartgas.com
smartgas
```

## Funcionalidades principales

* Monitoreo de zonas y sensores IoT.
* Registro de lecturas de prueba.
* Generación automática de incidentes, alertas y notificaciones.
* Gestión de dispositivos.
* Reportes de incidentes.
* Cambio de plan de suscripción.
* Perfil, configuración, idioma y contacto de emergencia.
* Consumo de API externa de clima mediante Open-Meteo.

## Organización por bounded contexts

* `iam`: autenticación, perfil y configuración.
* `kitchen-monitoring`: zonas, sensores y lecturas IoT.
* `incident-detection`: incidentes generados por lecturas.
* `incident-prevention-notification`: alertas y notificaciones.
* `post-incident-procedures`: reportes e historial.
* `payment-management`: planes y suscripciones.
