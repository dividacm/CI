export type GraphicConnectorType = 'straight';

export interface GraphicConnector {
  id: string;
  fromId: string;
  toId: string;
  type: GraphicConnectorType;
}

export interface CreateGraphicConnectorInput {
  id?: string;
  fromId: string;
  toId: string;
  type?: GraphicConnectorType;
}

export function createGraphicConnector(input: CreateGraphicConnectorInput): GraphicConnector {
  return {
    id: input.id ?? crypto.randomUUID(),
    fromId: input.fromId,
    toId: input.toId,
    type: input.type ?? 'straight',
  };
}

export function normalizeGraphicConnector(connector: GraphicConnector): GraphicConnector | null {
  if (!connector || typeof connector.id !== 'string' || !connector.id.trim()) return null;
  if (typeof connector.fromId !== 'string' || !connector.fromId.trim()) return null;
  if (typeof connector.toId !== 'string' || !connector.toId.trim()) return null;
  if (connector.fromId === connector.toId) return null;
  if (connector.type !== 'straight') return null;

  return {
    id: connector.id,
    fromId: connector.fromId,
    toId: connector.toId,
    type: connector.type,
  };
}

export function normalizeGraphicConnectors(connectors: unknown, elementIds?: Set<string>): GraphicConnector[] {
  if (!Array.isArray(connectors)) return [];
  return connectors.flatMap((connector) => {
    const normalized = normalizeGraphicConnector(connector as GraphicConnector);
    if (!normalized) return [];
    if (elementIds && (!elementIds.has(normalized.fromId) || !elementIds.has(normalized.toId))) return [];
    return [normalized];
  });
}
