import { createDocument } from '../document/createDocument';
import type { TemplateConfig } from '../types/configuration';
import type { CommunicationDocument } from '../types/document';
import type { DocumentStorage } from './DocumentStorage';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const ACTIVE_DOCUMENT_KEY_PREFIX = 'ci:active-document:';
const LEGACY_ACTIVE_DOCUMENT_KEY = 'ci:active-document';

export class DocumentRepository {
  public constructor(
    private readonly storage: DocumentStorage,
    private readonly activeStore: KeyValueStorage = globalThis.localStorage,
  ) {}

  public loadActive(template: TemplateConfig): CommunicationDocument {
    const key = getActiveDocumentKey(template.id);
    const activeId = this.activeStore.getItem(key);
    if (activeId) {
      const loaded = this.storage.load(activeId);
      if (loaded?.templateId === template.id) return loaded;
      this.activeStore.removeItem(key);
    }

    const legacyId = this.activeStore.getItem(LEGACY_ACTIVE_DOCUMENT_KEY);
    if (legacyId) {
      const legacyDocument = this.storage.load(legacyId);
      if (legacyDocument?.templateId === template.id) {
        this.activeStore.setItem(key, legacyDocument.id);
        this.activeStore.removeItem(LEGACY_ACTIVE_DOCUMENT_KEY);
        return legacyDocument;
      }
    }

    const document = createDocument({
      template,
      year: new Date().getFullYear(),
      number: 0,
    });
    this.setActive(document);
    return document;
  }

  public setActive(document: CommunicationDocument): void {
    this.activeStore.setItem(getActiveDocumentKey(document.templateId), document.id);
    this.activeStore.setItem(LEGACY_ACTIVE_DOCUMENT_KEY, document.id);
  }

  public clearActive(template?: TemplateConfig): void {
    if (template) {
      const key = getActiveDocumentKey(template.id);
      const activeId = this.activeStore.getItem(key);
      this.activeStore.removeItem(key);
      if (activeId && this.activeStore.getItem(LEGACY_ACTIVE_DOCUMENT_KEY) === activeId) {
        this.activeStore.removeItem(LEGACY_ACTIVE_DOCUMENT_KEY);
      }
      return;
    }

    this.activeStore.removeItem(LEGACY_ACTIVE_DOCUMENT_KEY);
  }
}

function getActiveDocumentKey(templateId: string): string {
  return `${ACTIVE_DOCUMENT_KEY_PREFIX}${templateId}`;
}
