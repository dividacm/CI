import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageDocumentStorage } from '../../src/storage/LocalStorageDocumentStorage';
import type { CommunicationDocument } from '../../src/types/document';

const document: CommunicationDocument = {
  id: 'doc-1',
  number: 1,
  year: 2026,
  from: 'Origem',
  to: 'Destino',
  subject: 'Assunto',
  bodyHtml: '<p>Olá<script>alert(1)</script></p>',
  templateId: 'default',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('LocalStorageDocumentStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('salva e carrega o documento sanitizado', () => {
    const storage = new LocalStorageDocumentStorage();

    storage.save(document);
    const loaded = storage.load(document.id);

    expect(loaded?.bodyHtml).toBe('<p>Olá</p>');
    expect(loaded?.updatedAt).not.toBe(document.updatedAt);
  });

  it('retorna null para dados JSON inválidos', () => {
    localStorage.setItem('ci:document:doc-1', '{invalid');

    expect(new LocalStorageDocumentStorage().load('doc-1')).toBeNull();
  });
});
