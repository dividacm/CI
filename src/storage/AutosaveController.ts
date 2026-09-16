import type { CommunicationDocument, DocumentStatus } from '../types/document';
import type { DocumentStorage } from './DocumentStorage';

export interface AutosaveControllerOptions {
  storage: DocumentStorage;
  delayMs?: number;
  onStatusChange?: (status: DocumentStatus) => void;
}

export class AutosaveController {
  private readonly storage: DocumentStorage;
  private readonly delayMs: number;
  private readonly onStatusChange?: (status: DocumentStatus) => void;
  private timer: number | undefined;
  private document: CommunicationDocument | null = null;

  public constructor(options: AutosaveControllerOptions) {
    this.storage = options.storage;
    this.delayMs = options.delayMs ?? 300;
    this.onStatusChange = options.onStatusChange;
  }

  public attach(document: CommunicationDocument): void {
    this.document = document;
  }

  public markDirty(document: CommunicationDocument): void {
    this.document = document;
    this.onStatusChange?.('dirty');
    this.schedule();
  }

  public saveNow(): void {
    if (!this.document) {
      return;
    }

    this.clearTimer();
    this.onStatusChange?.('saving');

    try {
      this.storage.save(this.document);
      this.onStatusChange?.('saved');
    } catch {
      this.onStatusChange?.('error');
    }
  }

  public dispose(): void {
    this.clearTimer();
    this.document = null;
  }

  private schedule(): void {
    this.clearTimer();
    this.timer = window.setTimeout(() => this.saveNow(), this.delayMs);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
