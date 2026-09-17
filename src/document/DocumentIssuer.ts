import type { CommunicationDocument } from '../types/document';
import { DocumentNumbering } from '../storage/DocumentNumbering';
import type { DocumentStorage } from '../storage/DocumentStorage';

export interface DocumentIssuerOptions {
  numbering?: DocumentNumbering;
  storage: DocumentStorage;
}

export class DocumentIssuer {
  private readonly numbering: DocumentNumbering;
  private readonly storage: DocumentStorage;

  public constructor(options: DocumentIssuerOptions) {
    this.numbering = options.numbering ?? new DocumentNumbering();
    this.storage = options.storage;
  }

  public issue(document: CommunicationDocument): CommunicationDocument {
    if (document.number > 0) {
      throw new Error('O documento já possui numeração definitiva.');
    }

    const issued: CommunicationDocument = {
      ...document,
      number: this.numbering.next(document.year),
      updatedAt: new Date().toISOString(),
    };

    this.storage.save(issued);
    return issued;
  }
}
