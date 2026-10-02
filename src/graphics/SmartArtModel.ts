export type SmartArtLayout = 'process' | 'hierarchy' | 'cycle';

export interface SmartArtNode {
  id: string;
  text: string;
  parentId?: string;
}

export interface SmartArtData {
  layout: SmartArtLayout;
  nodes: SmartArtNode[];
}

export interface CreateSmartArtNodeInput {
  id?: string;
  text?: string;
  parentId?: string;
}

export interface CreateSmartArtInput {
  layout?: SmartArtLayout;
  nodes?: CreateSmartArtNodeInput[];
}

export function createSmartArt(input: CreateSmartArtInput = {}): SmartArtData {
  const nodes = input.nodes?.length
    ? input.nodes.map((node) => createSmartArtNode(node))
    : [createSmartArtNode({ text: 'Ideia principal' })];

  return {
    layout: input.layout ?? 'process',
    nodes,
  };
}

export function createSmartArtNode(input: CreateSmartArtNodeInput = {}): SmartArtNode {
  return {
    id: input.id ?? crypto.randomUUID(),
    text: input.text ?? '',
    ...(input.parentId ? { parentId: input.parentId } : {}),
  };
}

export function normalizeSmartArt(value: unknown): SmartArtData | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<SmartArtData>;
  if (candidate.layout !== 'process' && candidate.layout !== 'hierarchy' && candidate.layout !== 'cycle') {
    return null;
  }
  if (!Array.isArray(candidate.nodes)) return null;

  const nodes: SmartArtNode[] = [];
  const ids = new Set<string>();

  for (const node of candidate.nodes) {
    if (!node || typeof node !== 'object') continue;
    const item = node as Partial<SmartArtNode>;
    if (typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) continue;
    if (typeof item.text !== 'string') continue;
    if (item.parentId !== undefined && (typeof item.parentId !== 'string' || !item.parentId.trim())) continue;

    ids.add(item.id);
    nodes.push({
      id: item.id,
      text: item.text,
      ...(item.parentId ? { parentId: item.parentId } : {}),
    });
  }

  if (!nodes.length) return null;

  const normalizedIds = new Set(nodes.map((node) => node.id));
  return {
    layout: candidate.layout,
    nodes: nodes.map((node) => (
      node.parentId && !normalizedIds.has(node.parentId)
        ? { id: node.id, text: node.text }
        : { ...node }
    )),
  };
}
