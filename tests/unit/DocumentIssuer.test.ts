import { describe, expect, it, beforeEach } from 'vitest';
import { DocumentIssuer } from '../../src/document/DocumentIssuer';
import { DocumentNumbering } from '../../src/storage/DocumentNumbering';
import type { CommunicationDocument } from '../../src/types/document';
import type { DocumentStorage } from '../../src/storage/DocumentStorage';

class MemoryStorage implements DocumentStorage {
  public documents = new Map<string, CommunicationDocument>();

  load(id: string): CommunicationDocument | null {
    return this.documents.get(id) ?? null;
  }

  save(document: CommunicationDocument): void {
    this.documents.set(document.id, { ...document });
  }

  remove(id: string): void {
    this.documents.delete(id);
  }
}

function createDraft(): CommunicationDocument {
  return {
    id: 'draft-1',
    number: 0,
    year: 2026,
    from: 'GCCOB',
    to: 'Equipe',
    subject: 'Teste',
    bodyHtml: '<p>Conteúdo</p>',
    templateId: 'comunicacao-interna-v2',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('DocumentIssuer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allocates a definitive number and persists the issued document', () => {
    const storage = new MemoryStorage();
    const issuer = new DocumentIssuer({
      numbering: new DocumentNumbering(),
      storage,
    });

    const issued = issuer.issue(createDraft());

    expect(issued.number).toBe(1);
    expect(storage.load(issued.id)?.number).toBe(1);
    expect(issued.bodyHtml).toBe('<p>Conteúdo</p>');
  });

  it('does not silently issue an already numbered document', () => {
    const storage = new MemoryStorage();
    const issuer = new DocumentIssuer({ storage });
    const document = { ...createDraft(), number: 7 };

    expect(() => issuer.issue(document)).toThrow(
      'O documento já possui numeração definitiva.',
    );
    expect(new DocumentNumbering().peek(2026)).toBe(0);
  });
});
