import type { CommunicationDocument } from '../types/document';
import { sanitizeHtml } from '../security/sanitizer';
import type { DocumentStorage } from './DocumentStorage';

const PREFIX = 'ci:document:';

export class LocalStorageDocumentStorage implements DocumentStorage {
  public load(id: string): CommunicationDocument | null {
    const raw = localStorage.getItem(`${PREFIX}${id}`);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CommunicationDocument;
      return {
        ...parsed,
        bodyHtml: sanitizeHtml(parsed.bodyHtml),
      };
    } catch {
      return null;
    }
  }

  public save(document: CommunicationDocument): void {
    const normalized: CommunicationDocument = {
      ...document,
      bodyHtml: sanitizeHtml(document.bodyHtml),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`${PREFIX}${document.id}`, JSON.stringify(normalized));
  }

  public remove(id: string): void {
    localStorage.removeItem(`${PREFIX}${id}`);
  }
}
