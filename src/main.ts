import './styles/main.css';

import { renderApp } from './app/App';
import { defaultOrganization } from './configuration/defaultOrganization';
import { getObservability } from './observability/Observability';
import { validateOrganizationConfig } from './configuration/validateOrganizationConfig';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Elemento #app não encontrado.');
}

if (!validateOrganizationConfig(defaultOrganization)) {
  renderConfigurationError(app);
} else {
  try {
    renderApp(app, defaultOrganization);
  } catch (error) {
    getObservability().captureError(error, {
      operation: 'bootstrap',
      component: 'App',
    });
    renderConfigurationError(app);
  }
}

function renderConfigurationError(root: HTMLElement): void {
  root.innerHTML = '';
  const container = document.createElement('main');
  container.className = 'app-error';
  container.setAttribute('role', 'alert');

  const title = document.createElement('h1');
  title.textContent = 'Não foi possível iniciar o editor';

  const message = document.createElement('p');
  message.textContent =
    'A configuração da organização ou do modelo do documento está inválida. Recarregue a página. Se o problema persistir, contate o suporte.';

  container.append(title, message);
  root.appendChild(container);
}
