import { beforeEach, describe, expect, it } from 'vitest';
import { createDocument } from '../../src/document/createDocument';
import { DocumentRepository } from '../../src/storage/DocumentRepository';
import type { DocumentStorage } from '../../src/storage/DocumentStorage';
import type { TemplateConfig } from '../../src/types/configuration';
import type { CommunicationDocument } from '../../src/types/document';

const communicationTemplate: TemplateConfig = {
  id: 'comunicacao-interna-v2',
  name: 'Comunicação Interna',
  fields: [],
};

const memorandumTemplate: TemplateConfig = {
  id: 'memorando',
  name: 'Memorando',
  fields: [],
};

class MemoryDocumentStorage implements DocumentStorage {
  private readonly documents = new Map<string, CommunicationDocument>();

  load(id: string): CommunicationDocument | null {
    return this.documents.get(id) ?? null;
  }

  save(document: CommunicationDocument): void {
    this.documents.set(document.id, document);
  }

  remove(id: string): void {
    this.documents.delete(id);
  }
}

describe('DocumentRepository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mantém um documento ativo independente para cada template', () => {
    const storage = new MemoryDocumentStorage();
    const repository = new DocumentRepository(storage);

    const communication = createDocument({
      template: communicationTemplate,
      year: 2026,
      number: 0,
    });
    communication.fields.subject = 'Comunicação preservada';
    storage.save(communication);
    repository.setActive(communication);

    const memorandum = repository.loadActive(memorandumTemplate);
    memorandum.fields.subject = 'Memorando preservado';
    storage.save(memorandum);
    repository.setActive(memorandum);

    expect(repository.loadActive(communicationTemplate)).toEqual(communication);
    expect(repository.loadActive(memorandumTemplate)).toEqual(memorandum);
    expect(localStorage.getItem('ci:active-document:comunicacao-interna-v2')).toBe(communication.id);
    expect(localStorage.getItem('ci:active-document:memorando')).toBe(memorandum.id);
  });

  it('não reutiliza um documento de outro template como ativo', () => {
    const storage = new MemoryDocumentStorage();
    const repository = new DocumentRepository(storage);

    const communication = createDocument({
      template: communicationTemplate,
      year: 2026,
      number: 0,
    });
    storage.save(communication);
    localStorage.setItem('ci:active-document:memorando', communication.id);

    const memorandum = repository.loadActive(memorandumTemplate);

    expect(memorandum.id).not.toBe(communication.id);
    expect(memorandum.templateId).toBe(memorandumTemplate.id);
    expect(localStorage.getItem('ci:active-document:memorando')).toBe(memorandum.id);
  });

  it('migra o documento ativo legado quando o template corresponde', () => {
    const storage = new MemoryDocumentStorage();
    const repository = new DocumentRepository(storage);
    const communication = createDocument({
      template: communicationTemplate,
      year: 2026,
      number: 0,
    });
    storage.save(communication);
    localStorage.setItem('ci:active-document', communication.id);

    const loaded = repository.loadActive(communicationTemplate);

    expect(loaded).toEqual(communication);
    expect(localStorage.getItem('ci:active-document:comunicacao-interna-v2')).toBe(communication.id);
    expect(localStorage.getItem('ci:active-document')).toBeNull();
  });

  it('limpa apenas o documento ativo do template informado', () => {
    const storage = new MemoryDocumentStorage();
    const repository = new DocumentRepository(storage);
    const communication = repository.loadActive(communicationTemplate);
    const memorandum = repository.loadActive(memorandumTemplate);

    repository.clearActive(communicationTemplate);

    expect(localStorage.getItem('ci:active-document:comunicacao-interna-v2')).toBeNull();
    expect(localStorage.getItem('ci:active-document:memorando')).toBe(memorandum.id);
  });
});
