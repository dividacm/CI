export interface CommunicationDocument {
  id: string;
  number: number;
  year: number;
  fields: Record<string, string>;
  bodyHtml: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus = 'saved' | 'saving' | 'dirty' | 'error';
