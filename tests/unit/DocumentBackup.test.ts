import { describe, expect, it, vi } from 'vitest';
import { createDocument } from '../../src/document/createDocument';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';
import {
  DocumentBackupError,
  MAX_DOCUMENT_BACKUP_BYTES,
  parseDocumentBackup,
  resolveImportedDocumentId,
  serializeDocumentBackup,
} from '../../src/storage/DocumentBackup';

function sampleDocument() {
  const template = defaultOrganization.templates[0];
  if (!template) throw new Error('Template de teste não encontrado.');
  const document = createDocument({ template, year: 2026, number: 0 });
  document.fields.subject = 'Backup de teste';
  document.bodyHtml = '<p>Conteúdo <script>alert(1)</script> seguro</p>';
  document.composition = {
    headerAsset: '/cab.png',
    footerAsset: '/rodape.png',
    signatureName: 'Responsável',
    signatureRole: 'Gerência',
    signatureLocation: 'Campo Mourão',
  };
  return document;
}

describe('DocumentBackup', () => {
  it('exports and restores a normalized document while sanitizing HTML', () => {
    const original = sampleDocument();
    const json = serializeDocumentBackup(original, '2026-10-15T12:00:00.000Z');
    const restored = parseDocumentBackup(json, original.templateId);

    expect(restored).toMatchObject({
      id: original.id,
      templateId: original.templateId,
      fields: original.fields,
      composition: original.composition,
    });
    expect(restored.bodyHtml).not.toContain('<script>');
    expect(restored.bodyHtml).toContain('Conteúdo');
  });

  it('rejects invalid JSON, wrong format, unknown schema and invalid document data', () => {
    const original = sampleDocument();
    expect(() => parseDocumentBackup('{', original.templateId)).toThrow(DocumentBackupError);
    expect(() => parseDocumentBackup(JSON.stringify({ format: 'other', schemaVersion: 1 }), original.templateId)).toThrow(/não é um backup/);
    expect(() => parseDocumentBackup(JSON.stringify({ format: 'ci-communication-document', schemaVersion: 99, exportedAt: 'now', document: original }), original.templateId)).toThrow(/não é compatível/);
    expect(() => parseDocumentBackup(JSON.stringify({ format: 'ci-communication-document', schemaVersion: 1, exportedAt: 'now', document: { id: '' } }), original.templateId)).toThrow(/validação/);
  });

  it('rejects a backup for a different template and oversized files', () => {
    const original = sampleDocument();
    const json = serializeDocumentBackup(original);
    expect(() => parseDocumentBackup(json, 'different-template')).toThrow(/outro modelo/);
    expect(() => parseDocumentBackup(' '.repeat(MAX_DOCUMENT_BACKUP_BYTES + 1), original.templateId)).toThrow(/2 MB/);
  });

  it('assigns a new ID when restoring would collide and never overwrites the original', () => {
    const original = sampleDocument();
    const createId = vi.fn().mockReturnValueOnce('restored-id');
    const restored = resolveImportedDocumentId(original, (id) => id === original.id, createId);

    expect(restored.id).toBe('restored-id');
    expect(original.id).not.toBe(restored.id);
    expect(createId).toHaveBeenCalledTimes(1);
  });

  it('retries ID generation if the generated ID is also taken', () => {
    const original = sampleDocument();
    const createId = vi.fn().mockReturnValueOnce('taken').mockReturnValueOnce('available');
    const restored = resolveImportedDocumentId(original, (id) => id === original.id || id === 'taken', createId);
    expect(restored.id).toBe('available');
  });
});
