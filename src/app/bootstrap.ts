import { renderApp } from './App';
import { validateOrganizationConfig } from '../configuration/validateOrganizationConfig';
import { getObservability } from '../observability/Observability';
import type { OrganizationConfig } from '../types/configuration';

export function bootstrapApp(
  root: HTMLElement,
  organization: unknown,
  render: (root: HTMLElement, organization: OrganizationConfig) => void = renderApp,
): boolean {
  if (!validateOrganizationConfig(organization)) {
    getObservability().log('error', 'Configuração da organização inválida.', {
      operation: 'bootstrap',
      component: 'App',
    });
    return false;
  }

  try {
    render(root, organization);
    return true;
  } catch (error) {
    getObservability().captureError(error, {
      operation: 'bootstrap',
      component: 'App',
    });
    return false;
  }
}
