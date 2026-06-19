import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import 'primevue/resources/themes/lara-light-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Toast from 'primevue/toast';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import ProgressBar from 'primevue/progressbar';

import './styles.css';
import App from './App.js';
import router from './app/router/index.js';
import i18n from './i18n/index.js';

const app = createApp(App);

app.use(PrimeVue, { ripple: true });
app.use(ToastService);
app.use(router);
app.use(i18n);

app.component('Button', Button);
app.component('Card', Card);
app.component('Dialog', Dialog);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('Tag', Tag);
app.component('Toast', Toast);
app.component('InputText', InputText);
app.component('Dropdown', Dropdown);
app.component('Textarea', Textarea);
app.component('ProgressBar', ProgressBar);

app.mount('#app');
