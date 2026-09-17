import { describe, expect, it } from 'vitest';
import { createDocument } from '../../src/document/createDocument';
import type { TemplateConfig } from '../../src/types/configuration';

const template: TemplateConfig = {
  id: 'comunicacao-interna-v2',
  name: 'Comunicação Interna',
  page: {
    width: '210mm',
    height: '297mm',
    margin: '20mm',
  },
  fields: [
    { id: 'from', label: 'De', type: 'text', defaultValue: 'Origem' },
    { id: 'to', label: 'Para', type: 'text', defaultValue: 'Destino' },
    { id: 'subject', label: 'Assunto', type: 'text', defaultValue: 'Assunto padrão' },
  ],
};

describe('createDocument', () => {
  it('cria um documento com os defaults do template', () => {
    const document = createDocument({ template, number: 0, year: 2026 });

    expect(document.id).toEqual(expect.any(String));
    expect(document.number).toBe(0);
    expect(document.year).toBe(2026);
    expect(document.from).toBe('Origem');
    expect(document.to).toBe('Destino');
    expect(document.subject).toBe('Assunto padrão');
    expect(document.bodyHtml).toBe('');
    expect(document.templateId).toBe(template.id);
    expect(document.createdAt).toEqual(expect.any(String));
    expect(document.updatedAt).toEqual(expect.any(String));
  });

  it('permite sobrescrever defaults ao criar o documento', () => {
    const document = createDocument({
      template,
      number: 12,
      year: 2026,
      from: 'Área A',
      to: 'Área B',
      subject: 'Comunicado específico',
    });

    expect(document.number).toBe(12);
    expect(document.from).toBe('Área A');
    expect(document.to).toBe('Área B');
    expect(document.subject).toBe('Comunicado específico');
  });
});
