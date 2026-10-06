import type { GraphicConnector } from '../graphics/GraphicConnectorModel';
import type { GraphicElement } from '../graphics/GraphicElementModel';

export interface FlowPageMetrics {
  contentWidthPx: number;
  contentHeightPx: number;
}

export interface FlowPlacement {
  pageIndex: number;
  x: number;
  y: number;
}

export function getGraphicPageIndex(element: GraphicElement, metrics: FlowPageMetrics): number {
  if (!Number.isFinite(metrics.contentHeightPx) || metrics.contentHeightPx <= 0) return 0;
  return Math.max(0, Math.floor(Math.max(0, element.position.y) / metrics.contentHeightPx));
}

export function placeGraphicElement(element: GraphicElement, metrics: FlowPageMetrics): FlowPlacement {
  const pageIndex = getGraphicPageIndex(element, metrics);
  return {
    pageIndex,
    x: Math.max(0, Math.min(element.position.x, Math.max(0, metrics.contentWidthPx - element.size.width))),
    y: Math.max(0, element.position.y - pageIndex * metrics.contentHeightPx),
  };
}

export function getConnectorsForPage(
  connectors: GraphicConnector[],
  elements: GraphicElement[],
  pageIndex: number,
  metrics: FlowPageMetrics,
): GraphicConnector[] {
  const byId = new Map(elements.map((element) => [element.id, element]));
  return connectors.filter((connector) => {
    const from = byId.get(connector.fromId);
    const to = byId.get(connector.toId);
    return Boolean(
      from &&
      to &&
      getGraphicPageIndex(from, metrics) === pageIndex &&
      getGraphicPageIndex(to, metrics) === pageIndex,
    );
  });
}
