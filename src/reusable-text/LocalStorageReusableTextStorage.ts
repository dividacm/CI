import { isReusableText } from './ReusableTextModel';
import type { ReusableText, ReusableTextCollection } from './ReusableTextModel';
import type { ReusableTextStorage } from './ReusableTextStorage';

const STORAGE_KEY = 'ci:reusable-texts:v1';
const SCHEMA_VERSION = 1;

export class LocalStorageReusableTextStorage implements ReusableTextStorage {
  constructor(private readonly storage: Storage = localStorage) {}

  public load(): ReusableText[] {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('A biblioteca de textos contém dados inválidos. Os dados originais foram preservados.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('A estrutura armazenada da biblioteca é inválida.');
    }

    const collection = parsed as Partial<ReusableTextCollection>;
    if (collection.schemaVersion !== SCHEMA_VERSION || !Array.isArray(collection.items)) {
      throw new Error('A versão dos dados da biblioteca não é compatível.');
    }

    if (!collection.items.every(isReusableText)) {
      throw new Error('A biblioteca contém um ou mais textos inválidos. Os dados originais foram preservados.');
    }

    return collection.items.map((item) => ({ ...item }));
  }

  public save(items: ReusableText[]): void {
    if (!Array.isArray(items) || !items.every(isReusableText)) {
      throw new Error('Não foi possível salvar: a biblioteca contém textos inválidos.');
    }

    const collection: ReusableTextCollection = {
      schemaVersion: SCHEMA_VERSION,
      items: items.map((item) => ({ ...item })),
    };

    this.storage.setItem(STORAGE_KEY, JSON.stringify(collection));
  }
}
