import { describe, expect, it } from 'vitest';
import { resetDocument, updateDocument, type AppState } from '../../src/app/AppState';
import type { OrganizationConfig, TemplateConfig } from '../../src/types/configuration';
import { createDocument } from '../../src/document/createDocument';

const template: TemplateConfig = {
  id: 'default',
  name: 'Comunicação Interna',
  fields: [
    { id: 'from', label: 'De', required: true, defaultValue: 'GCCOB' },
    { id: 'to', label: 'Para', required: true, defaultValue: 'Cristiane Schwarz' },
  ],
};

const organization: OrganizationConfig = {
  id: 'org',
  name: 'Organização',
  branding: {
    organizationName: 'Organização',
    primaryColor: '#000',
    secondaryColor: '#fff',
    fontFamily: 'Carlito',
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

function makeState(): AppState {
  return {
    document: createDocument({ template, number: 0, year: 2026 }),
    template,
    organization,
  };
}

describe('AppState contract', () => {
  it('merges document patches without dropping existing fields', () => {
    const state = makeState();
    const previousUpdatedAt = Date.parse(state.document.updatedAt);

    updateDocument(state, {
      fields: { to: 'Novo destinatário' },
      bodyHtml: '<p>Conteúdo</p>',
    });

    expect(state.document.fields).toEqual({
      from: 'GCCOB',
      to: 'Novo destinatário',
    });
    expect(state.document.bodyHtml).toBe('<p>Conteúdo</p>');
    expect(Date.parse(state.document.updatedAt)).toBeGreaterThanOrEqual(previousUpdatedAt);
  });

  it('resets the editable document to template defaults', () => {
    const state = makeState();
    state.document.number = 17;
    state.document.fields.to = 'Alterado';
    state.document.bodyHtml = '<p>Conteúdo</p>';

    resetDocument(state);

    expect(state.document.number).toBe(0);
    expect(state.document.fields).toEqual({
      from: 'GCCOB',
      to: 'Cristiane Schwarz',
    });
    expect(state.document.bodyHtml).toBe('');
  });
});
