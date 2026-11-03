export const REUSABLE_TEXT_CATEGORIES = [
  'Encaminhamento',
  'Solicitação',
  'Orientação',
  'Cobrança',
  'Finalização',
  'Outros',
] as const;

export type ReusableTextCategory = (typeof REUSABLE_TEXT_CATEGORIES)[number];

export interface ReusableText {
  id: string;
  name: string;
  category: ReusableTextCategory;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReusableTextCollection {
  schemaVersion: 1;
  items: ReusableText[];
}

export function isReusableTextCategory(value: unknown): value is ReusableTextCategory {
  return typeof value === 'string' &&
    REUSABLE_TEXT_CATEGORIES.some((category) => category === value);
}

export function isReusableText(value: unknown): value is ReusableText {
  if (!value || typeof value !== 'object') return false;

  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && item.id.trim().length > 0 &&
    typeof item.name === 'string' && item.name.trim().length > 0 &&
    isReusableTextCategory(item.category) &&
    typeof item.content === 'string' && item.content.trim().length > 0 &&
    typeof item.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt)) &&
    typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt));
}

export function createReusableText(input: {
  id: string;
  name: string;
  category: ReusableTextCategory;
  content: string;
  now?: string;
}): ReusableText {
  const name = input.name.trim();
  const content = input.content.trim();
  const now = input.now ?? new Date().toISOString();

  if (!input.id.trim()) throw new Error('O identificador do texto é obrigatório.');
  if (!name) throw new Error('O nome do texto é obrigatório.');
  if (!isReusableTextCategory(input.category)) throw new Error('A categoria do texto é inválida.');
  if (!content) throw new Error('O conteúdo do texto é obrigatório.');
  if (Number.isNaN(Date.parse(now))) throw new Error('A data do texto é inválida.');

  return {
    id: input.id,
    name,
    category: input.category,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };
}
