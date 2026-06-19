import ToolbarContent from './toolbar-content.component.js';

export default {
  name: 'LayoutComponent',
  components: { ToolbarContent },
  template: `
    <div class="app-shell">
      <Toast position="top-right" />
      <ToolbarContent />
      <main class="page-shell" id="main-content">
        <router-view />
      </main>
    </div>`
};
