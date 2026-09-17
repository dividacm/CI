import type { OrganizationConfig, TemplateConfig } from '../types/configuration';
import type { CommunicationDocument } from '../types/document';

export interface AppState {
  document: CommunicationDocument;
  template: TemplateConfig;
  organization: OrganizationConfig;
}

export interface DocumentPatch {
  from?: string;
  to?: string;
  subject?: string;
  bodyHtml?: string;
}

export function updateDocument(state: AppState, patch: DocumentPatch): void {
  Object.assign(state.document, patch, { updatedAt: new Date().toISOString() });
}

export function resetDocument(state: AppState): void {
  const field = (id: string): string => state.template.fields.find((item) => item.id === id)?.defaultValue ?? '';
  Object.assign(state.document, {
    number: 0,
    year: new Date().getFullYear(),
    from: field('from'),
    to: field('to'),
    subject: field('subject'),
    bodyHtml: '',
    updatedAt: new Date().toISOString(),
  });
}

export function replaceDocument(state: AppState, document: CommunicationDocument): void {
  state.document = document;
}
