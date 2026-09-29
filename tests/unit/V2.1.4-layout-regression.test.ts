import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from '../../src/app/App';
import type { OrganizationConfig, TemplateConfig } from '../../src/types/configuration';

const template: TemplateConfig = {
  id: 'default',
  name: 'Comunicação Interna',
  fields: [
    { id: 'from', label: 'De', required: true, defaultValue: 'GCCOB' },
    { id: 'to', label: 'Para', required: true, defaultValue: 'Cristiane Schwarz' },
  ],
};

function createOrganization(): OrganizationConfig {
  return {
    id: 'org',
    name: 'Organização',
    branding: {
      organizationName: 'Organização',
      primaryColor: '#111111',
      secondaryColor: '#ffffff',
      fontFamily: 'Carlito',
      headerAsset: '/assets/cab.png',
      footerAsset: '/assets/rodape.png',
      signatureName: 'Cristiane Schwarz',
      signatureRole: 'Gerente',
      signatureLocation: 'Campo Mourão',
    },
    layout: {
      marginTopMm: 10,
      marginRightMm: 20,
      marginBottomMm: 20,
      marginLeftMm: 20,
    },
    defaultTemplateId: 'default',
    templates: [template],
    features: {
      pdfExport: true,
      autosave: true,
      history: true,
      clipboardFormatting: true,
    },
  };
}

describe('V2.1.4 layout regression contract', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('propagates ruler keyboard changes through layout persistence and preview', () => {
    const root = document.createElement('div');
    const organization = createOrganization();

    renderApp(root, organization);

    const ruler = root.querySelector<HTMLElement>('#horizontal-ruler');
    const left = root.querySelector<HTMLElement>('.ruler-margin-left');
    if (!ruler || !left) throw new Error('Estrutura de layout não encontrada.');

    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    const saved = JSON.parse(localStorage.getItem('ci:layout-config') ?? '{}') as {
      marginLeftMm?: number;
    };
    const updatedLeft = root.querySelector<HTMLElement>('.ruler-margin-left');
    const updatedContent = root.querySelector<HTMLElement>('.paper-page-content');

    if (!updatedLeft || !updatedContent) {
      throw new Error('Layout atualizado não encontrado.');
    }

    expect(saved.marginLeftMm).toBe(21);
    expect(updatedLeft.getAttribute('aria-valuenow')).toBe('21');
    expect(updatedLeft.style.left).toBe('79.37007874015748px');
    expect(updatedContent.style.paddingLeft).toBe('21mm');
  });

  it('restores persisted ruler margins on a fresh app render', () => {
    const firstRoot = document.createElement('div');
    const organization = createOrganization();

    renderApp(firstRoot, organization);

    const left = firstRoot.querySelector<HTMLElement>('.ruler-margin-left');
    if (!left) throw new Error('Marcador de margem esquerda não encontrado.');

    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    const secondRoot = document.createElement('div');
    renderApp(secondRoot, createOrganization());

    const restoredLeft = secondRoot.querySelector<HTMLElement>('.ruler-margin-left');
    const restoredContent = secondRoot.querySelector<HTMLElement>('.paper-page-content');
    if (!restoredLeft || !restoredContent) throw new Error('Layout restaurado não encontrado.');

    expect(restoredLeft.getAttribute('aria-valuenow')).toBe('21');
    expect(restoredContent.style.paddingLeft).toBe('21mm');
  });

  it('preserves header, footer and PDF availability while layout changes', () => {
    const root = document.createElement('div');
    const organization = createOrganization();

    renderApp(root, organization);

    const left = root.querySelector<HTMLElement>('.ruler-margin-left');
    if (!left) throw new Error('Marcador de margem esquerda não encontrado.');

    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(root.querySelector('.paper-header img')?.getAttribute('src')).toBe('/assets/cab.png');
    expect(root.querySelector('.paper-footer img')?.getAttribute('src')).toBe('/assets/rodape.png');

    const pdfButton = root.querySelector<HTMLButtonElement>('[data-action="pdf"]');
    expect(pdfButton?.hidden).toBe(false);
  });
});
