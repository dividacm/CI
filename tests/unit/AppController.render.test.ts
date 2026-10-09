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


describe('AppController additional UI flows', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('clamps zoom, resets it, handles page navigation, and persists both brand assets', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const organization = structuredClone(defaultOrganization);

    // jsdom does not implement the browser scrolling API used by preview navigation.
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    new AppController(root, organization).render();

    for (let i = 0; i < 20; i += 1) {
      root.querySelector<HTMLButtonElement>('[data-action="zoom-in"]')?.click();
    }
    expect(root.querySelector('#preview-zoom')?.textContent).toBe('150%');

    for (let i = 0; i < 20; i += 1) {
      root.querySelector<HTMLButtonElement>('[data-action="zoom-out"]')?.click();
    }
    expect(root.querySelector('#preview-zoom')?.textContent).toBe('50%');

    root.querySelector<HTMLButtonElement>('[data-action="zoom-reset"]')?.click();
    expect(root.querySelector('#preview-zoom')?.textContent).toBe('100%');

    const paper = root.querySelector<HTMLElement>('#paper');
    expect(paper).not.toBeNull();
    paper?.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }));
    paper?.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }));
    root.querySelector<HTMLButtonElement>('[data-action="page-next"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="page-prev"]')?.click();

    const footerAsset = root.querySelector<HTMLInputElement>('#footer-asset');
    expect(footerAsset).not.toBeNull();
    if (footerAsset) {
      footerAsset.value = '  /custom/footer.png  ';
      footerAsset.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(organization.branding.footerAsset).toBe('/custom/footer.png');
    expect(JSON.parse(localStorage.getItem('ci:layout-config') ?? '{}').footerAsset).toBe('/custom/footer.png');
  });

  it('recovers from malformed saved layout settings and wires typography controls', () => {
    localStorage.setItem('ci:layout-config', '{invalid json');
    const root = document.createElement('div');
    document.body.appendChild(root);
    const organization = structuredClone(defaultOrganization);

    new AppController(root, organization).render();

    expect(localStorage.getItem('ci:layout-config')).toBeNull();
    const fontFamily = root.querySelector<HTMLSelectElement>('#font-family');
    const fontSize = root.querySelector<HTMLSelectElement>('#font-size');
    const fontColor = root.querySelector<HTMLInputElement>('#font-color');

    expect(fontFamily).not.toBeNull();
    expect(fontSize).not.toBeNull();
    expect(fontColor).not.toBeNull();

    if (fontFamily) {
      fontFamily.value = 'Arial, sans-serif';
      fontFamily.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (fontSize) {
      fontSize.value = '16px';
      fontSize.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (fontColor) {
      fontColor.value = '#123456';
      fontColor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
});
