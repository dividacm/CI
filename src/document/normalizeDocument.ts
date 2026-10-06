import { normalizeGraphicConnectors } from '../graphics/GraphicConnectorModel';
import { normalizeGraphicElements } from '../graphics/GraphicElementModel';
import { sanitizeHtml } from '../security/sanitizer';
import type { CommunicationDocument } from '../types/document';

type LegacyDocument = Partial<CommunicationDocument> & {
  from?: unknown;
  to?: unknown;
  subject?: unknown;
};

export function normalizeCommunicationDocument(value: unknown): CommunicationDocument | null {
  if (!value || typeof value !== 'object') return null;

  const document = value as LegacyDocument;
  if (typeof document.id !== 'string' || !document.id.trim()) return null;
  if (typeof document.number !== 'number' || !Number.isInteger(document.number) || document.number < 0) {
    return null;
  }
  if (typeof document.year !== 'number' || !Number.isInteger(document.year) || document.year < 1) {
    return null;
  }
  if (typeof document.templateId !== 'string' || !document.templateId.trim()) return null;
  if (typeof document.createdAt !== 'string' || !document.createdAt) return null;
  if (typeof document.updatedAt !== 'string' || !document.updatedAt) return null;

  const fields = normalizeFields(document);
  const graphics = normalizeGraphicElements(document.graphics);
  const elementIds = new Set(graphics.map((element) => element.id));

  return {
    id: document.id,
    number: document.number,
    year: document.year,
    fields,
    bodyHtml: typeof document.bodyHtml === 'string' ? sanitizeHtml(document.bodyHtml) : '',
    graphics,
    connectors: normalizeGraphicConnectors(document.connectors, elementIds),
    templateId: document.templateId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function normalizeFields(document: LegacyDocument): Record<string, string> {
  if (document.fields && typeof document.fields === 'object' && !Array.isArray(document.fields)) {
    return Object.fromEntries(
      Object.entries(document.fields).filter(([, value]) => typeof value === 'string'),
    ) as Record<string, string>;
  }

  return Object.fromEntries(
    [
      ['from', document.from],
      ['to', document.to],
      ['subject', document.subject],
    ].filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
}
