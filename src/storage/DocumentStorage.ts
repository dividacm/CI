import type { CommunicationDocument } from '../types/document';

export interface DocumentStorage {
  load(id: string): CommunicationDocument | null;
  save(document: CommunicationDocument): void;
  remove(id: string): void;
}
