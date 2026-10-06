import type { OrganizationConfig } from '../types/configuration';
import { AppController } from './AppController';

export function renderApp(root: HTMLElement, organization: OrganizationConfig): void {
  new AppController(root, organization).render();
}
