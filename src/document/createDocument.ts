import type { TemplateConfig } from '../types/configuration';
import type { CommunicationDocument, DocumentComposition } from '../types/document';

export interface CreateDocumentInput {
  template: TemplateConfig;
  number: number;
  year: number;
  fields?: Record<string, string>;
  composition?: DocumentComposition;
}

export function createDocument(input: CreateDocumentInput): CommunicationDocument {
  const now = new Date().toISOString();
  const fields = Object.fromEntries(
    input.template.fields.map((field) => [field.id, input.fields?.[field.id] ?? field.defaultValue ?? '']),
  );

  return {
    id: crypto.randomUUID(),
    number: input.number,
    year: input.year,
    fields,
    bodyHtml: '',
    graphics: [],
    connectors: [],
    templateId: input.template.id,
    composition: input.composition,
    createdAt: now,
    updatedAt: now,
  };
}
