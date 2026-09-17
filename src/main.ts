import './styles/main.css';

import { renderApp } from './app/App';
import { defaultOrganization } from './configuration/defaultOrganization';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Elemento #app não encontrado.');
}

renderApp(app, defaultOrganization);
