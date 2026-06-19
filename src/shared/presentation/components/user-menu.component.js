import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { SessionService } from '../../infrastructure/session.service.js';

export default {
  name: 'UserMenu',
  setup() {
    const router = useRouter();
    const { t } = useI18n();
    const open = ref(false);
    const sessionService = new SessionService();
    const user = sessionService.getCurrentUser();

    const toggle = () => { open.value = !open.value; };
    const close = () => { open.value = false; };

    const goTo = (path) => { close(); router.push(path); };
    const logout = () => {
      sessionService.clear();
      close();
      router.push('/login');
    };

    return { t, user, open, toggle, close, goTo, logout };
  },
  template: `
    <div class="user-menu-wrap" @blur.capture="close" tabindex="-1">
      <button class="user-menu-trigger" :aria-expanded="open" aria-haspopup="true" aria-label="User menu" @click.stop="toggle">
        <i class="pi pi-user"></i>
        <span class="user-email-label">{{ user?.email || user?.name }}</span>
        <i :class="open ? 'pi pi-angle-up' : 'pi pi-angle-down'" class="menu-arrow"></i>
      </button>
      <div v-if="open" class="user-dropdown" role="menu" @click.stop>
        <button class="dropdown-item" role="menuitem" aria-label="Go to profile" @click="goTo('/app/profile')">
          <i class="pi pi-id-card"></i>{{ t('profile') }}
        </button>
        <button class="dropdown-item" role="menuitem" aria-label="Go to settings" @click="goTo('/app/settings')">
          <i class="pi pi-cog"></i>{{ t('settings') }}
        </button>
        <hr class="dropdown-divider"/>
        <button class="dropdown-item danger" role="menuitem" aria-label="Logout" @click="logout">
          <i class="pi pi-sign-out"></i>{{ t('logout') }}
        </button>
      </div>
    </div>`
};
