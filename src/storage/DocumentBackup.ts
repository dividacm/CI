import { normalizeCommunicationDocument } from '../document/normalizeDocument';
import type { CommunicationDocument } from '../types/document';

export const DOCUMENT_BACKUP_FORMAT = 'ci-communication-document';
export const DOCUMENT_BACKUP_SCHEMA_VERSION = 1;
export const MAX_DOCUMENT_BACKUP_BYTES = 2 * 1024 * 1024;

interface DocumentBackupEnvelope {
  format: typeof DOCUMENT_BACKUP_FORMAT;
  schemaVersion: typeof DOCUMENT_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  document: CommunicationDocument;
}

export class DocumentBackupError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'DocumentBackupError';
  }
}

export function serializeDocumentBackup(document: CommunicationDocument, exportedAt = new Date().toISOString()): string {
  const normalized = normalizeCommunicationDocument(document);
  if (!normalized) throw new DocumentBackupError('O documento atual não pode ser exportado porque seus dados são inválidos.');

  const envelope: DocumentBackupEnvelope = {
    format: DOCUMENT_BACKUP_FORMAT,
    schemaVersion: DOCUMENT_BACKUP_SCHEMA_VERSION,
    exportedAt,
    document: normalized,
  };
  const json = JSON.stringify(envelope, null, 2);
  if (new TextEncoder().encode(json).byteLength > MAX_DOCUMENT_BACKUP_BYTES) {
    throw new DocumentBackupError('O documento excede o limite de 2 MB para exportação JSON.');
  }
  return json;
}

export function parseDocumentBackup(
  json: string,
  expectedTemplateId: string,
): CommunicationDocument {
  if (new TextEncoder().encode(json).byteLength > MAX_DOCUMENT_BACKUP_BYTES) {
    throw new DocumentBackupError('O arquivo excede o limite de 2 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new DocumentBackupError('O arquivo não contém um JSON válido.');
  }

  if (!isRecord(parsed) || parsed.format !== DOCUMENT_BACKUP_FORMAT) {
    throw new DocumentBackupError('Este arquivo não é um backup JSON do editor CI.');
  }
  if (parsed.schemaVersion !== DOCUMENT_BACKUP_SCHEMA_VERSION) {
    throw new DocumentBackupError('A versão deste backup não é compatível com esta versão do editor.');
  }
  if (typeof parsed.exportedAt !== 'string' || !isRecord(parsed.document)) {
    throw new DocumentBackupError('O arquivo de backup está incompleto.');
  }

  const candidate = parsed.document;
  if (
    typeof candidate.bodyHtml === 'string' && candidate.bodyHtml.length > 1_000_000
  ) {
    throw new DocumentBackupError('O conteúdo do documento excede o limite permitido.');
  }
  if (candidate.fields && (!isRecord(candidate.fields) || Object.keys(candidate.fields).length > 100)) {
    throw new DocumentBackupError('O arquivo contém campos demais ou uma estrutura de campos inválida.');
  }
  if (Array.isArray(candidate.graphics) && candidate.graphics.length > 500) {
    throw new DocumentBackupError('O arquivo contém elementos gráficos demais.');
  }
  if (Array.isArray(candidate.connectors) && candidate.connectors.length > 1000) {
    throw new DocumentBackupError('O arquivo contém conectores demais.');
  }

  const document = normalizeCommunicationDocument(candidate);
  if (!document) throw new DocumentBackupError('Os dados do documento não passaram na validação.');
  if (document.templateId !== expectedTemplateId) {
    throw new DocumentBackupError('Este backup pertence a outro modelo de documento. Selecione o modelo correspondente antes de importar.');
  }

  for (const [key, value] of Object.entries(document.fields)) {
    if (key.length > 200 || value.length > 100_000) {
      throw new DocumentBackupError('Um dos campos excede o tamanho permitido.');
    }
  }
  return document;
}

export function resolveImportedDocumentId(
  document: CommunicationDocument,
  isIdTaken: (id: string) => boolean,
  createId: () => string = () => globalThis.crypto?.randomUUID?.() ?? `restored-${Date.now().toString(36)}`,
): CommunicationDocument {
  if (!isIdTaken(document.id)) return { ...document, updatedAt: new Date().toISOString() };

  let id = createId();
  let attempts = 0;
  while (isIdTaken(id)) {
    attempts += 1;
    if (attempts >= 10) throw new DocumentBackupError('Não foi possível gerar um identificador seguro para a cópia restaurada.');
    id = createId();
  }
  return { ...document, id, updatedAt: new Date().toISOString() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
