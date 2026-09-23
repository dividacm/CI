import type { CommunicationDocument, DocumentStatus } from '../types/document';
import type { DocumentStorage } from './DocumentStorage';
import { getObservability } from '../observability/Observability';

export interface AutosaveControllerOptions {
  storage: DocumentStorage;
  delayMs?: number;
  retryDelaysMs?: number[];
  onStatusChange?: (status: DocumentStatus) => void;
}

export class AutosaveController {
  private readonly storage: DocumentStorage;
  private readonly delayMs: number;
  private readonly retryDelaysMs: number[];
  private readonly onStatusChange?: (status: DocumentStatus) => void;
  private timer: number | undefined;
  private retryTimer: number | undefined;
  private document: CommunicationDocument | null = null;
  private retryAttempt = 0;

  public constructor(options: AutosaveControllerOptions) {
    this.storage = options.storage;
    this.delayMs = options.delayMs ?? 300;
    this.retryDelaysMs = options.retryDelaysMs ?? [250, 500, 1000];
    this.onStatusChange = options.onStatusChange;
  }

  public attach(document: CommunicationDocument): void {
    this.document = document;
    this.retryAttempt = 0;
    this.clearTimer();
    this.clearRetryTimer();
  }

  public markDirty(document: CommunicationDocument): void {
    this.document = document;
    this.retryAttempt = 0;
    this.clearRetryTimer();
    this.onStatusChange?.('dirty');
    this.schedule();
  }

  public saveNow(): void {
    if (!this.document) return;

    this.clearTimer();
    this.clearRetryTimer();
    this.retryAttempt = 0;
    this.onStatusChange?.('saving');
    this.attemptSave();
  }

  public dispose(): void {
    this.clearTimer();
    this.clearRetryTimer();
    this.document = null;
  }

  private attemptSave(): void {
    if (!this.document) return;

    try {
      this.storage.save(this.document);
      this.retryAttempt = 0;
      this.onStatusChange?.('saved');
    } catch (error) {
      getObservability().captureError(error, {
        operation: 'save',
        component: 'AutosaveController',
        documentId: this.document.id,
      });

      if (this.retryAttempt < this.retryDelaysMs.length) {
        const delay = this.retryDelaysMs[this.retryAttempt];
        this.retryAttempt += 1;
        this.retryTimer = window.setTimeout(() => {
          this.retryTimer = undefined;
          this.attemptSave();
        }, delay);
        return;
      }

      this.retryAttempt = 0;
      this.onStatusChange?.('error');
    }
  }

  private schedule(): void {
    this.clearTimer();
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      this.saveNow();
    }, this.delayMs);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimer !== undefined) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }
}
