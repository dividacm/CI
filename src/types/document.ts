import type { GraphicConnector } from '../graphics/GraphicConnectorModel';
import type { GraphicElement } from '../graphics/GraphicElementModel';

export interface CommunicationDocument {
  id: string;
  number: number;
  year: number;
  fields: Record<string, string>;
  bodyHtml: string;
  graphics?: GraphicElement[];
  connectors?: GraphicConnector[];
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus = 'saved' | 'saving' | 'dirty' | 'error';
