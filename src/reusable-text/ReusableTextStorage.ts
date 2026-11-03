import type { ReusableText } from './ReusableTextModel';

export interface ReusableTextStorage {
  load(): ReusableText[];
  save(items: ReusableText[]): void;
}
