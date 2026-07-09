import { onMounted } from 'vue';

export default {
  name: 'App',
  setup() {
    onMounted(() => {
      const savedTheme = localStorage.getItem('smartgas-theme');
      document.body.classList.toggle('dark-mode', savedTheme === 'dark');
      document.body.classList.toggle('compact-view', localStorage.getItem('smartgas-compact') === 'true');
    });
  },
  template: '<router-view />'
};
