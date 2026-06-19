import { createRouter, createWebHistory } from 'vue-router';
import { SessionService } from '../../shared/infrastructure/session.service.js';

import LayoutComponent from '../../shared/presentation/components/layout.component.js';
import NotFoundPage from '../../shared/presentation/pages/not-found-page.component.js';

import LoginPage from '../../iam/presentation/pages/login-page.component.js';
import RegisterPage from '../../iam/presentation/pages/register-page.component.js';

import DashboardPage from '../../shared/dashboard/presentation/pages/dashboard-page.component.js';
import MonitoringPage from '../../kitchen-monitoring/monitoring/presentation/pages/monitoring-page.component.js';
import DevicesPage from '../../kitchen-monitoring/devices/presentation/pages/devices-page.component.js';
import IncidentsPage from '../../incident-detection/incidents/presentation/pages/incidents-page.component.js';
import ReportsPage from '../../post-incident-procedures/reports/presentation/pages/reports-page.component.js';
import SubscriptionPage from '../../payment-management/subscriptions/presentation/pages/subscription-page.component.js';
import ProfilePage from '../../iam/profile/presentation/pages/profile-page.component.js';
import SettingsPage from '../../iam/settings/presentation/pages/settings-page.component.js';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  {
    path: '/app',
    component: LayoutComponent,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/app/dashboard' },
      { path: 'dashboard', component: DashboardPage },
      { path: 'monitoring', component: MonitoringPage },
      { path: 'devices', component: DevicesPage },
      { path: 'incidents', component: IncidentsPage },
      { path: 'reports', component: ReportsPage },
      { path: 'subscription', component: SubscriptionPage },
      { path: 'profile', component: ProfilePage },
      { path: 'settings', component: SettingsPage }
    ]
  },
  { path: '/:pathMatch(.*)*', component: NotFoundPage }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

const sessionService = new SessionService();

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !sessionService.isLoggedIn()) {
    return '/login';
  }
  if ((to.path === '/login' || to.path === '/register') && sessionService.isLoggedIn()) {
    return '/app/dashboard';
  }
});

export default router;
