import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../../src/app/AppController';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';

describe('AppController render flow', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the editor and wires zoom, save, layout settings, and clear actions', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const organization = structuredClone(defaultOrganization);

    new AppController(root, organization).render();

    expect(root.querySelector('#editor')).not.toBeNull();
    expect(root.querySelector('[data-action="save"]')).not.toBeNull();
    expect(root.querySelector('#preview-zoom')?.textContent).toBe('100%');

    root.querySelector<HTMLButtonElement>('[data-action="zoom-in"]')?.click();
    expect(root.querySelector('#preview-zoom')?.textContent).toBe('110%');

    const margin = root.querySelector<HTMLInputElement>('#margin-top');
    expect(margin).not.toBeNull();
    if (margin) {
      margin.value = '75';
      margin.dispatchEvent(new Event('change', { bubbles: true }));
      expect(margin.value).toBe('60');
      expect(organization.layout.marginTopMm).toBe(60);
      expect(JSON.parse(localStorage.getItem('ci:layout-config') ?? '{}').marginTopMm).toBe(60);
    }

    const headerAsset = root.querySelector<HTMLInputElement>('#header-asset');
    expect(headerAsset).not.toBeNull();
    if (headerAsset) {
      headerAsset.value = '  /custom/header.png  ';
      headerAsset.dispatchEvent(new Event('change', { bubbles: true }));
      expect(organization.branding.headerAsset).toBe('/custom/header.png');
    }

    root.querySelector<HTMLButtonElement>('[data-action="save"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="clear"]')?.click();
    expect(root.querySelector('#editor-document-number')?.textContent).toBe('Rascunho');
  });
});
