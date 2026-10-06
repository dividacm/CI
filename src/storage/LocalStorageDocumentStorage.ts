import { normalizeCommunicationDocument } from '../document/normalizeDocument';
import { getObservability } from '../observability/Observability';
import type { CommunicationDocument } from '../types/document';
import type { DocumentStorage } from './DocumentStorage';

const PREFIX = 'ci:document:';

export class LocalStorageDocumentStorage implements DocumentStorage {
  public load(id: string): CommunicationDocument | null {
    const raw = localStorage.getItem(`${PREFIX}${id}`);
    if (!raw) {
      return null;
    }

    try {
      return normalizeCommunicationDocument(JSON.parse(raw));
    } catch (error) {
      getObservability().captureError(error, {
        operation: 'load',
        component: 'LocalStorageDocumentStorage',
        documentId: id,
      });
      return null;
    }
  }

  public save(document: CommunicationDocument): void {
    const normalized = normalizeCommunicationDocument(document);
    if (!normalized) {
      throw new Error('Documento inválido para persistência.');
    }

    localStorage.setItem(`${PREFIX}${document.id}`, JSON.stringify({
      ...normalized,
      updatedAt: new Date().toISOString(),
    }));
  }

  public remove(id: string): void {
    localStorage.removeItem(`${PREFIX}${id}`);
  }
}
