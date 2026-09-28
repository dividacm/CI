import { describe, expect, it, vi } from 'vitest';
import { createAppActions } from '../../src/app/AppActions';
import type { AppState } from '../../src/app/AppState';
import { createDocument } from '../../src/document/createDocument';
import type { DocumentIssuer } from '../../src/document/DocumentIssuer';
import type { OrganizationConfig, TemplateConfig } from '../../src/types/configuration';
import type { AutosaveController } from '../../src/storage/AutosaveController';

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
  branding: { organizationName: 'Organização', primaryColor: '#000', secondaryColor: '#fff', fontFamily: 'Carlito' },
  layout: { marginTopMm: 10, marginRightMm: 20, marginBottomMm: 20, marginLeftMm: 20 },
  defaultTemplateId: 'default',
  templates: [template],
  features: { pdfExport: true, autosave: true, history: true, clipboardFormatting: true },
};

function makeState(): AppState {
  return {
    document: createDocument({ template, number: 0, year: 2026 }),
    template,
    organization,
  };
}

describe('AppActions contract', () => {
  it('syncs fields and sanitized editor HTML, then marks the document dirty', () => {
    const state = makeState();
    const editor = {
      getHtml: () => '<p>Texto</p><script>alert(1)</script>',
      setHtml: vi.fn(),
    } as unknown as import('../../src/editor/Editor').Editor;
    const autosave = {
      markDirty: vi.fn(),
      saveNow: vi.fn(),
      attach: vi.fn(),
    } as unknown as AutosaveController;
    const issuer = {} as unknown as DocumentIssuer;

    const actions = createAppActions(
      state,
      editor,
      autosave,
      issuer,
      (name) => (name === 'to' ? 'Destinatário' : 'GCCOB'),
    );

    actions.sync();

    expect(state.document.fields).toEqual({ from: 'GCCOB', to: 'Destinatário' });
    expect(state.document.bodyHtml).not.toContain('<script>');
    expect(state.document.bodyHtml).toContain('<p>Texto</p>');
    expect(autosave.markDirty).toHaveBeenCalledWith(state.document);
  });

  it('clear resets the document and editor content', () => {
    const state = makeState();
    state.document.number = 8;
    state.document.bodyHtml = '<p>Texto</p>';
    const editor = {
      getHtml: () => '',
      setHtml: vi.fn(),
    } as unknown as import('../../src/editor/Editor').Editor;
    const autosave = {
      markDirty: vi.fn(),
      saveNow: vi.fn(),
      attach: vi.fn(),
    } as unknown as AutosaveController;
    const issuer = {} as unknown as DocumentIssuer;

    const actions = createAppActions(state, editor, autosave, issuer, () => '');
    actions.clear();

    expect(state.document.number).toBe(0);
    expect(state.document.bodyHtml).toBe('');
    expect(editor.setHtml).toHaveBeenCalledWith('');
    expect(autosave.markDirty).toHaveBeenCalledWith(state.document);
  });
});
