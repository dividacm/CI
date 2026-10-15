import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../../src/app/AppController';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';
import { createDocument } from '../../src/document/createDocument';
import { parseDocumentBackup, serializeDocumentBackup } from '../../src/storage/DocumentBackup';

describe('JSON backup UI', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('exposes explicit export and import controls', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new AppController(root, structuredClone(defaultOrganization)).render();

    expect(root.querySelector('[data-action="backup-export"]')).not.toBeNull();
    expect(root.querySelector('[data-action="backup-import"]')).not.toBeNull();
    expect(root.querySelector<HTMLInputElement>('#backup-import-file')?.accept).toContain('.json');
  });

  it('restores an imported document as a new copy when its ID already exists', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const organization = structuredClone(defaultOrganization);
    new AppController(root, organization).render();

    const template = organization.templates[0];
    if (!template) throw new Error('Template de teste não encontrado.');
    const activeKey = `ci:active-document:${template.id}`;
    const originalId = localStorage.getItem(activeKey);
    expect(originalId).toBeTruthy();
    if (!originalId) return;

    const originalRaw = localStorage.getItem(`ci:document:${originalId}`);
    expect(originalRaw).not.toBeNull();
    const backupDocument = createDocument({ template, year: 2026, number: 0 });
    backupDocument.id = originalId;
    backupDocument.fields.subject = 'Documento restaurado em cópia';
    backupDocument.bodyHtml = '<p>Conteúdo recuperado</p>';
    const json = serializeDocumentBackup(backupDocument);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const file = new File([json], 'backup.json', { type: 'application/json' });
    const input = root.querySelector<HTMLInputElement>('#backup-import-file');
    expect(input).not.toBeNull();
    if (!input) return;
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(localStorage.getItem(activeKey)).not.toBe(originalId);
    });

    const restoredId = localStorage.getItem(activeKey);
    expect(restoredId).toBeTruthy();
    expect(localStorage.getItem(`ci:document:${originalId}`)).toBe(originalRaw);
    const restoredRaw = localStorage.getItem(`ci:document:${restoredId}`);
    expect(restoredRaw).not.toBeNull();
    expect(JSON.parse(restoredRaw ?? '{}').fields.subject).toBe('Documento restaurado em cópia');
    expect(parseDocumentBackup(json, template.id).fields.subject).toBe('Documento restaurado em cópia');
  });

  it('does not import when the user cancels confirmation', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const organization = structuredClone(defaultOrganization);
    new AppController(root, organization).render();

    const template = organization.templates[0];
    if (!template) throw new Error('Template de teste não encontrado.');
    const backupDocument = createDocument({ template, year: 2026, number: 0 });
    backupDocument.fields.subject = 'Não deve ser importado';
    const json = serializeDocumentBackup(backupDocument);
    const activeKey = `ci:active-document:${template.id}`;
    const activeIdBefore = localStorage.getItem(activeKey);

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const input = root.querySelector<HTMLInputElement>('#backup-import-file');
    expect(input).not.toBeNull();
    if (!input) return;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File([json], 'backup.json', { type: 'application/json' })],
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(localStorage.getItem(activeKey)).toBe(activeIdBefore);
  });
});
