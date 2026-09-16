export interface CommunicationDocument {
  id: string;
  number: number;
  year: number;
  from: string;
  to: string;
  subject: string;
  bodyHtml: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus = 'saved' | 'saving' | 'dirty' | 'error';
