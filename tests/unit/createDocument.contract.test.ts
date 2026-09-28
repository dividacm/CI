import { describe, expect, it } from 'vitest';
import { createDocument } from '../../src/document/createDocument';
import type { TemplateConfig } from '../../src/types/configuration';

const template: TemplateConfig = {
  id: 'default',
  name: 'Comunicação Interna',
  fields: [
    { id: 'from', label: 'De', required: true, defaultValue: 'GCCOB' },
    { id: 'to', label: 'Para', required: true, defaultValue: 'Cristiane Schwarz' },
  ],
};

describe('createDocument contract', () => {
  it('creates a document with template defaults and empty body', () => {
    const document = createDocument({ template, number: 0, year: 2026 });

    expect(document.id).toBeTruthy();
    expect(document.number).toBe(0);
    expect(document.year).toBe(2026);
    expect(document.templateId).toBe('default');
    expect(document.fields).toEqual({
      from: 'GCCOB',
      to: 'Cristiane Schwarz',
    });
    expect(document.bodyHtml).toBe('');
    expect(document.createdAt).toBe(document.updatedAt);
  });

  it('allows explicit field values while preserving template fields', () => {
    const document = createDocument({
      template,
      number: 12,
      year: 2026,
      fields: { to: 'Outro destinatário' },
    });

    expect(document.fields).toEqual({
      from: 'GCCOB',
      to: 'Outro destinatário',
    });
  });
});
