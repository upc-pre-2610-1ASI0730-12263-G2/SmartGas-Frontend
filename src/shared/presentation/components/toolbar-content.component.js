import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import LanguageSwitcher from './language-switcher.component.js';
import UserMenu from './user-menu.component.js';
import { SessionService } from '../../infrastructure/session.service.js';
import { incidentStore } from '../../../incident-detection/incidents/application/incident.store.js';
import { formatDate } from '../../utils/date-format.js';
import { formatIncidentNotification } from '../../utils/domain-translations.js';

export default {
  name: 'ToolbarContent',
  components: { LanguageSwitcher, UserMenu },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const toast = useToast();
    const { t } = useI18n();
    const sessionService = new SessionService();
    const user = sessionService.getCurrentUser();
    const notifications = ref([]);
    const notificationOpen = ref(false);

    const navItems = computed(() => [
      { label: t('dashboard'), icon: 'pi pi-th-large', path: '/app/dashboard' },
      { label: t('monitoring'), icon: 'pi pi-eye', path: '/app/monitoring' },
      { label: t('devices'), icon: 'pi pi-wifi', path: '/app/devices' },
      { label: t('incidents'), icon: 'pi pi-exclamation-triangle', path: '/app/incidents' },
      { label: t('reports'), icon: 'pi pi-chart-bar', path: '/app/reports' },
      { label: t('subscription'), icon: 'pi pi-credit-card', path: '/app/subscription' }
    ]);

    const accountItems = computed(() => [
      { label: t('profile'), icon: 'pi pi-id-card', path: '/app/profile' },
      { label: t('settings'), icon: 'pi pi-cog', path: '/app/settings' }
    ]);

    const unreadNotifications = computed(() => notifications.value.filter(n => !n.read || !n.confirmed));
    const latestNotifications = computed(() => notifications.value.slice(0, 4));
    const isActive = (path) => route.path === path || route.path.startsWith(path + '/');
    const logout = () => { sessionService.clear(); router.push('/login'); };

    const loadNotifications = async () => {
      if (!user?.id) return;
      try {
        const data = await incidentStore.getNotifications(user.id);
        notifications.value = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } catch { notifications.value = []; }
    };

    const toggleNotifications = async () => {
      notificationOpen.value = !notificationOpen.value;
      if (notificationOpen.value) await loadNotifications();
    };

    const markRead = async (notification) => {
      try {
        await incidentStore.markNotificationRead(notification.id);
        await loadNotifications();
        toast.add({ severity: 'info', summary: t('notifRead'), life: 1800 });
      } catch { toast.add({ severity: 'error', summary: t('errorSaving'), life: 1800 }); }
    };

    const confirmReception = async (notification) => {
      try {
        await incidentStore.confirmNotification(notification.id);
        await loadNotifications();
        toast.add({ severity: 'success', summary: t('notifConfirmed'), life: 1800 });
      } catch { toast.add({ severity: 'error', summary: t('errorSaving'), life: 1800 }); }
    };

    const viewAll = async () => {
      notificationOpen.value = false;
      sessionStorage.setItem('smartgas-incidents-tab', 'notifications');
      await router.push({ path: '/app/incidents', query: { tab: 'notifications', open: String(Date.now()) } });
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('smartgas-open-notifications'));
        const target = document.querySelector('[data-smartgas-notifications-tab="true"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    };

    onMounted(loadNotifications);

    return { t, user, navItems, accountItems, isActive, logout, notifications, notificationOpen, unreadNotifications, latestNotifications, toggleNotifications, markRead, confirmReception, viewAll, formatDate, formatIncidentNotification };
  },
  template: `
    <aside class="sidebar" aria-label="Application sidebar">
      <a class="sidebar-brand" href="/app/dashboard" @click.prevent="$router.push('/app/dashboard')" aria-label="SmartGas dashboard">
        <img src="/images/logo.png" alt="SmartGas logo" class="sidebar-logo" />
        <span>SmartGas</span>
      </a>

      <div class="sidebar-section-label">{{ t('mainPanel') }}</div>
      <nav class="sidebar-nav" aria-label="Main navigation">
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="sidebar-link"
          :class="{ active: isActive(item.path) }"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          @click="$router.push(item.path)"
        >
          <i :class="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-section-label account-label">{{ t('accountOverview') }}</div>
      <nav class="sidebar-nav" aria-label="Account navigation">
        <button
          v-for="item in accountItems"
          :key="item.path"
          type="button"
          class="sidebar-link"
          :class="{ active: isActive(item.path) }"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          @click="$router.push(item.path)"
        >
          <i :class="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <button class="sidebar-logout" type="button" @click="logout">
        <i class="pi pi-sign-out" aria-hidden="true"></i>{{ t('logout') }}
      </button>
    </aside>

    <header class="app-topbar" role="banner">
      <div class="top-context">
        <i class="pi pi-shield" aria-hidden="true"></i>
        <span>{{ t('topbarContext') }}</span>
      </div>
      <div class="topbar-right">
        <LanguageSwitcher />
        <div class="notification-wrap" @blur.capture="notificationOpen=false" tabindex="-1">
          <button class="notification-dot" type="button" :aria-label="t('notificationCenter')" :aria-expanded="notificationOpen" @click.stop="toggleNotifications">
            <i class="pi pi-bell" aria-hidden="true"></i>
            <span v-if="unreadNotifications.length"></span>
          </button>
          <div v-if="notificationOpen" class="notification-dropdown" @click.stop>
            <header>
              <strong>{{ t('latestNotifications') }}</strong>
              <small>{{ unreadNotifications.length }} {{ t('pendingAlerts').toLowerCase() }}</small>
            </header>
            <div v-if="latestNotifications.length" class="notification-list-mini">
              <article v-for="notification in latestNotifications" :key="notification.id" class="notification-mini-card" :class="{ unread: !notification.read || !notification.confirmed }">
                <p>{{ formatIncidentNotification(t, notification) }}</p>
                <time>{{ formatDate(notification.createdAt) }}</time>
                <div class="notification-mini-actions">
                  <button v-if="!notification.read" type="button" @click="markRead(notification)">{{ t('markRead') }}</button>
                  <button v-if="!notification.confirmed" type="button" @click="confirmReception(notification)">{{ t('confirmReception') }}</button>
                </div>
              </article>
            </div>
            <p v-else class="empty-notifications">{{ t('noUnreadNotifications') }}</p>
            <button class="view-all-notifications" type="button" @mousedown.prevent.stop="viewAll" @click.prevent.stop="viewAll">{{ t('viewAllNotifications') }}</button>
          </div>
        </div>
        <UserMenu />
      </div>
    </header>`
};
