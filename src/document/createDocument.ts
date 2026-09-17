import type { TemplateConfig } from '../types/configuration';
import type { CommunicationDocument } from '../types/document';

export interface CreateDocumentInput {
  template: TemplateConfig;
  number: number;
  year: number;
  fields?: Record<string, string>;
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
    templateId: input.template.id,
    createdAt: now,
    updatedAt: now,
  };
}
