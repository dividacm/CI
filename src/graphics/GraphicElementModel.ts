import { normalizeSmartArt, type SmartArtData } from './SmartArtModel';

export type GraphicElementKind = 'shape' | 'smartart';

export interface GraphicElementPosition {
  x: number;
  y: number;
}

export interface GraphicElementSize {
  width: number;
  height: number;
}

export interface GraphicElement {
  id: string;
  kind: GraphicElementKind;
  position: GraphicElementPosition;
  size: GraphicElementSize;
  rotation: number;
  groupId?: string;
  data: Record<string, string>;
  smartArt?: SmartArtData;
}

export interface CreateGraphicElementInput {
  id?: string;
  kind: GraphicElementKind;
  position?: Partial<GraphicElementPosition>;
  size?: Partial<GraphicElementSize>;
  rotation?: number;
  groupId?: string;
  data?: Record<string, string>;
  smartArt?: SmartArtData;
}

const DEFAULT_POSITION: GraphicElementPosition = { x: 0, y: 0 };
const DEFAULT_SIZE: GraphicElementSize = { width: 160, height: 96 };

export function createGraphicElement(input: CreateGraphicElementInput): GraphicElement {
  return {
    id: input.id ?? crypto.randomUUID(),
    kind: input.kind,
    position: {
      x: input.position?.x ?? DEFAULT_POSITION.x,
      y: input.position?.y ?? DEFAULT_POSITION.y,
    },
    size: {
      width: input.size?.width ?? DEFAULT_SIZE.width,
      height: input.size?.height ?? DEFAULT_SIZE.height,
    },
    rotation: input.rotation ?? 0,
    ...(input.groupId ? { groupId: input.groupId } : {}),
    data: { ...(input.data ?? {}) },
    ...(input.smartArt ? { smartArt: cloneSmartArt(input.smartArt) } : {}),
  };
}

export function normalizeGraphicElement(element: GraphicElement): GraphicElement | null {
  if (!element || typeof element.id !== 'string' || !element.id.trim()) return null;
  if (element.kind !== 'shape' && element.kind !== 'smartart') return null;
  if (!Number.isFinite(element.position?.x) || !Number.isFinite(element.position?.y)) return null;
  if (!Number.isFinite(element.size?.width) || !Number.isFinite(element.size?.height)) return null;
  if (element.size.width <= 0 || element.size.height <= 0) return null;
  if (!Number.isFinite(element.rotation)) return null;

  const smartArt = element.kind === 'smartart' ? normalizeSmartArt(element.smartArt) : null;
  if (element.kind === 'smartart' && !smartArt) return null;

  return {
    id: element.id,
    kind: element.kind,
    position: { x: element.position.x, y: element.position.y },
    size: { width: element.size.width, height: element.size.height },
    rotation: element.rotation,
    ...(typeof element.groupId === 'string' && element.groupId.trim() ? { groupId: element.groupId } : {}),
    data: Object.fromEntries(
      Object.entries(element.data ?? {}).filter(([, value]) => typeof value === 'string'),
    ),
    ...(smartArt ? { smartArt: cloneSmartArt(smartArt) } : {}),
  };
}

export function normalizeGraphicElements(elements: unknown): GraphicElement[] {
  if (!Array.isArray(elements)) return [];
  return elements.flatMap((element) => {
    const normalized = normalizeGraphicElement(element as GraphicElement);
    return normalized ? [normalized] : [];
  });
}

function cloneSmartArt(smartArt: SmartArtData): SmartArtData {
  return {
    layout: smartArt.layout,
    nodes: smartArt.nodes.map((node) => ({
      id: node.id,
      text: node.text,
      ...(node.parentId ? { parentId: node.parentId } : {}),
    })),
  };
}
