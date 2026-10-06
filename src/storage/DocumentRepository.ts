import { createDocument } from '../document/createDocument';
import type { TemplateConfig } from '../types/configuration';
import type { CommunicationDocument } from '../types/document';
import type { DocumentStorage } from './DocumentStorage';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const ACTIVE_DOCUMENT_KEY = 'ci:active-document';

export class DocumentRepository {
  public constructor(
    private readonly storage: DocumentStorage,
    private readonly activeStore: KeyValueStorage = globalThis.localStorage,
  ) {}

  public loadActive(template: TemplateConfig): CommunicationDocument {
    const activeId = this.activeStore.getItem(ACTIVE_DOCUMENT_KEY);
    if (activeId) {
      const loaded = this.storage.load(activeId);
      if (loaded && loaded.templateId === template.id) return loaded;
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
    this.activeStore.setItem(ACTIVE_DOCUMENT_KEY, document.id);
  }

  public clearActive(): void {
    this.activeStore.removeItem(ACTIVE_DOCUMENT_KEY);
  }
}
