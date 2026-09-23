import { getObservability } from '../observability/Observability';
import { sanitizeHtml } from '../security/sanitizer';
import type { CommunicationDocument } from '../types/document';
import type { DocumentStorage } from './DocumentStorage';

const PREFIX = 'ci:document:';

type StoredDocument = CommunicationDocument & {
  from?: string;
  to?: string;
  subject?: string;
};

export class LocalStorageDocumentStorage implements DocumentStorage {
  public load(id: string): CommunicationDocument | null {
    const raw = localStorage.getItem(`${PREFIX}${id}`);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as StoredDocument;
      return {
        id: parsed.id,
        number: parsed.number,
        year: parsed.year,
        fields: normalizeFields(parsed),
        bodyHtml: sanitizeHtml(parsed.bodyHtml),
        templateId: parsed.templateId,
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
      };
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
    const normalized: CommunicationDocument = {
      ...document,
      fields: { ...document.fields },
      bodyHtml: sanitizeHtml(document.bodyHtml),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`${PREFIX}${document.id}`, JSON.stringify(normalized));
  }

  public remove(id: string): void {
    localStorage.removeItem(`${PREFIX}${id}`);
  }
}

function normalizeFields(document: StoredDocument): Record<string, string> {
  if (document.fields && typeof document.fields === 'object') {
    return Object.fromEntries(
      Object.entries(document.fields).filter(([, value]) => typeof value === 'string'),
    ) as Record<string, string>;
  }

  return {
    ...(document.from !== undefined ? { from: document.from } : {}),
    ...(document.to !== undefined ? { to: document.to } : {}),
    ...(document.subject !== undefined ? { subject: document.subject } : {}),
  };
}
