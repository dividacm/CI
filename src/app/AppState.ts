import type { OrganizationConfig, TemplateConfig } from '../types/configuration';
import type { CommunicationDocument } from '../types/document';

export interface AppState {
  document: CommunicationDocument;
  template: TemplateConfig;
  organization: OrganizationConfig;
}

export interface DocumentPatch {
  fields?: Record<string, string>;
  bodyHtml?: string;
}

export function updateDocument(state: AppState, patch: DocumentPatch): void {
  Object.assign(state.document, {
    ...patch,
    fields: patch.fields ? { ...state.document.fields, ...patch.fields } : state.document.fields,
    updatedAt: new Date().toISOString(),
  });
}

export function resetDocument(state: AppState): void {
  const fields = Object.fromEntries(
    state.template.fields.map((field) => [field.id, field.defaultValue ?? '']),
  );
  Object.assign(state.document, {
    number: 0,
    year: new Date().getFullYear(),
    fields,
    bodyHtml: '',
    updatedAt: new Date().toISOString(),
  });
}

export function replaceDocument(state: AppState, document: CommunicationDocument): void {
  state.document = document;
}
