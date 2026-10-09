import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../../src/app/AppController';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';
import { PdfExporter } from '../../src/pdf/PdfExporter';

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

  it('dispatches formatting, table, graphic, SmartArt, zoom, and template-change actions', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const organization = structuredClone(defaultOrganization);
    organization.templates.push({
      id: 'alternate-template',
      name: 'Modelo alternativo',
      fields: [{ id: 'subject', label: 'Assunto', defaultValue: 'Novo assunto' }],
    });

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    new AppController(root, organization).render();

    const click = async (action: string) => {
      root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.click();
      await Promise.resolve();
      await Promise.resolve();
    };

    for (const action of [
      'bold', 'italic', 'underline', 'align-left', 'align-center', 'align-right',
      'align-justify', 'list-unordered', 'list-ordered', 'font-inc', 'font-dec',
      'upper', 'lower', 'clear-formatting', 'undo', 'redo',
      'table-insert', 'table-row-select', 'table-column-select', 'table-row-add',
      'table-row-delete', 'table-column-add', 'table-column-delete',
      'table-column-widen', 'table-column-narrow',
      'graphic-insert', 'smartart-insert', 'smartart-node-add', 'smartart-node-remove',
      'smartart-layout-process', 'smartart-layout-hierarchy', 'smartart-layout-cycle',
      'graphic-duplicate', 'graphic-front', 'graphic-back', 'graphic-connect',
      'connector-delete', 'page-prev', 'page-next', 'zoom-out', 'zoom-reset', 'zoom-in',
    ]) {
      await click(action);
    }

    const templateSelector = root.querySelector<HTMLSelectElement>('#template-selector');
    expect(templateSelector).not.toBeNull();
    if (templateSelector) {
      templateSelector.value = 'alternate-template';
      templateSelector.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(root.querySelector('.app-header h1')?.textContent).toBe('Modelo alternativo');
    expect(root.querySelector('[data-field="subject"]')).not.toBeNull();
    expect(root.querySelector('#preview-zoom')?.textContent).toBe('110%');
  });

});


describe('AppController PDF export branches', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('handles successful and failed PDF export without leaving the button disabled', async () => {
    const exportSpy = vi.spyOn(PdfExporter.prototype, 'export')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('PDF export failed'));

    const root = document.createElement('div');
    document.body.appendChild(root);
    new AppController(root, structuredClone(defaultOrganization)).render();

    const pdfButton = root.querySelector<HTMLButtonElement>('[data-action="pdf"]');
    const status = root.querySelector<HTMLElement>('#save-status');
    expect(pdfButton).not.toBeNull();
    expect(status).not.toBeNull();

    pdfButton?.click();
    await vi.waitFor(() => expect(status?.textContent).toBe('PDF gerado com sucesso.'));
    expect(pdfButton?.disabled).toBe(false);
    expect(exportSpy).toHaveBeenCalledTimes(1);

    pdfButton?.click();
    await vi.waitFor(() => expect(status?.textContent).toBe('Falha ao gerar PDF. Tente novamente.'));
    expect(pdfButton?.disabled).toBe(false);
    expect(exportSpy).toHaveBeenCalledTimes(2);
  });

  it('does not invoke the exporter when PDF export is disabled by organization policy', async () => {
    const exportSpy = vi.spyOn(PdfExporter.prototype, 'export').mockResolvedValue(undefined);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const organization = structuredClone(defaultOrganization);
    organization.features.pdfExport = false;

    new AppController(root, organization).render();
    root.querySelector<HTMLButtonElement>('[data-action="pdf"]')?.click();
    await Promise.resolve();

    expect(exportSpy).not.toHaveBeenCalled();
  });

  it('ignores a template selection that is empty or already active and unknown margin controls', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new AppController(root, structuredClone(defaultOrganization)).render();

    const selector = root.querySelector<HTMLSelectElement>('#template-selector');
    expect(selector).not.toBeNull();
    selector?.dispatchEvent(new Event('change', { bubbles: true }));
    if (selector) {
      selector.value = selector.options[0]?.value ?? '';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const unknownMargin = document.createElement('input');
    unknownMargin.id = 'margin-unknown';
    root.appendChild(unknownMargin);
    unknownMargin.value = '20';
    unknownMargin.dispatchEvent(new Event('change', { bubbles: true }));

    expect(localStorage.getItem('ci:layout-config')).toBeNull();
  });
});
