import type { TemplateConfig } from '../types/configuration';
import type { CommunicationDocument } from '../types/document';

export interface CreateDocumentInput {
  template: TemplateConfig;
  number: number;
  year: number;
  from?: string;
  to?: string;
  subject?: string;
}

export function createDocument(input: CreateDocumentInput): CommunicationDocument {
  const now = new Date().toISOString();
  const field = (id: string) => input.template.fields.find((item) => item.id === id);

  return {
    id: crypto.randomUUID(),
    number: input.number,
    year: input.year,
    from: input.from ?? field('from')?.defaultValue ?? '',
    to: input.to ?? field('to')?.defaultValue ?? '',
    subject: input.subject ?? field('subject')?.defaultValue ?? '',
    bodyHtml: '',
    templateId: input.template.id,
    createdAt: now,
    updatedAt: now,
  };
}
