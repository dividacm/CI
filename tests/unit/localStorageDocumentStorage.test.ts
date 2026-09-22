import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageDocumentStorage } from '../../src/storage/LocalStorageDocumentStorage';
import type { CommunicationDocument } from '../../src/types/document';

const document: CommunicationDocument = {
  id: 'doc-1',
  number: 1,
  year: 2026,
  fields: { from: 'Origem', to: 'Destino', subject: 'Assunto' },
  bodyHtml: '<p>Olá<script>alert(1)</script></p>',
  templateId: 'default',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('LocalStorageDocumentStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna null para documento inexistente e dados JSON inválidos', () => {
    const storage = new LocalStorageDocumentStorage();
    expect(storage.load('missing')).toBeNull();
    localStorage.setItem('ci:document:doc-1', '{invalid');
    expect(storage.load('doc-1')).toBeNull();
  });

  it('salva, carrega, remove e sanitiza o documento', () => {
    const storage = new LocalStorageDocumentStorage();
    storage.save(document);
    const loaded = storage.load(document.id);
    expect(loaded?.bodyHtml).toBe('<p>Olá</p>');
    expect(loaded?.fields).toEqual(document.fields);
    expect(loaded?.updatedAt).not.toBe(document.updatedAt);

    storage.remove(document.id);
    expect(storage.load(document.id)).toBeNull();
  });

  it('migra documentos legados e filtra campos que não são texto', () => {
    localStorage.setItem(
      'ci:document:legacy-1',
      JSON.stringify({
        ...document,
        id: 'legacy-1',
        fields: { from: 'Origem', invalid: 123, empty: null },
        from: 'Origem legada',
        to: 'Destino legado',
        subject: 'Assunto legado',
      }),
    );
    expect(new LocalStorageDocumentStorage().load('legacy-1')?.fields).toEqual({
      from: 'Origem',
    });

    localStorage.setItem(
      'ci:document:legacy-2',
      JSON.stringify({
        ...document,
        id: 'legacy-2',
        fields: undefined,
        from: 'Origem legada',
        to: 'Destino legado',
        subject: 'Assunto legado',
      }),
    );
    expect(new LocalStorageDocumentStorage().load('legacy-2')?.fields).toEqual({
      from: 'Origem legada',
      to: 'Destino legado',
      subject: 'Assunto legado',
    });
  });
});
