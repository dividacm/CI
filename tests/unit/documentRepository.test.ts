import { describe, expect, it } from 'vitest';
import { DocumentRepository, type KeyValueStorage } from '../../src/storage/DocumentRepository';
import type { DocumentStorage } from '../../src/storage/DocumentStorage';
import type { TemplateConfig } from '../../src/types/configuration';
import type { CommunicationDocument } from '../../src/types/document';

const template: TemplateConfig = {
  id: 'default',
  name: 'Padrão',
  fields: [],
};

const document: CommunicationDocument = {
  id: 'doc-1',
  number: 0,
  year: 2026,
  fields: {},
  bodyHtml: '',
  templateId: 'default',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createStorage(initial?: CommunicationDocument): DocumentStorage {
  let value = initial;
  return {
    load: () => value ?? null,
    save: (next) => { value = next; },
    remove: () => { value = undefined; },
  };
}

function createKeyValueStore(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe('DocumentRepository', () => {
  it('carrega o documento ativo quando pertence ao template atual', () => {
    const keys = createKeyValueStore();
    keys.setItem('ci:active-document', document.id);
    const repository = new DocumentRepository(createStorage(document), keys);

    expect(repository.loadActive(template)).toBe(document);
  });

  it('cria e registra um documento quando não há documento ativo compatível', () => {
    const keys = createKeyValueStore();
    const repository = new DocumentRepository(createStorage(), keys);

    const loaded = repository.loadActive(template);

    expect(loaded.templateId).toBe(template.id);
    expect(loaded.number).toBe(0);
    expect(keys.getItem('ci:active-document')).toBe(loaded.id);
  });

  it('permite trocar e limpar o documento ativo sem conhecer a implementação da persistência', () => {
    const keys = createKeyValueStore();
    const repository = new DocumentRepository(createStorage(), keys);

    repository.setActive(document);
    expect(keys.getItem('ci:active-document')).toBe(document.id);

    repository.clearActive();
    expect(keys.getItem('ci:active-document')).toBeNull();
  });
});