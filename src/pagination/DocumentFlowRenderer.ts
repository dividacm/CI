import type { GraphicConnector } from '../graphics/GraphicConnectorModel';
import type { GraphicElement } from '../graphics/GraphicElementModel';
import { getConnectorsForPage, placeGraphicElement, type FlowPageMetrics } from './DocumentFlow';

export interface RenderGraphicFlowOptions { elements: GraphicElement[]; connectors: GraphicConnector[]; pageIndex: number; metrics: FlowPageMetrics; }

export function renderGraphicFlow(container: HTMLElement, options: RenderGraphicFlowOptions): void {
  const doc = container.ownerDocument;
  const layer = doc.createElement('div');
  layer.className = 'paper-graphics-layer';
  layer.setAttribute('aria-label', 'Elementos gráficos da página');
  const pageElements = options.elements.filter((element) => getPageIndex(element, options.metrics) === options.pageIndex);
  for (const element of pageElements) {
    const placement = placeGraphicElement(element, options.metrics);
    const node = doc.createElement('div');
    node.className = 'paper-graphic-element';
    node.dataset.graphicId = element.id;
    node.style.left = placement.x + 'px';
    node.style.top = placement.y + 'px';
    node.style.width = element.size.width + 'px';
    node.style.height = element.size.height + 'px';
    node.style.transform = 'rotate(' + element.rotation + 'deg)';
    node.setAttribute('aria-label', element.data.label || (element.kind === 'smartart' ? 'SmartArt' : 'Forma'));
    if (element.kind === 'smartart' && element.smartArt) renderSmartArt(node, element.smartArt.nodes);
    else node.textContent = element.data.label || 'Forma';
    layer.appendChild(node);
  }
  const connectors = getConnectorsForPage(options.connectors, options.elements, options.pageIndex, options.metrics);
  if (connectors.length) layer.insertBefore(renderConnectors(doc, connectors, options.elements, options.metrics), layer.firstChild);
  container.appendChild(layer);
}

function getPageIndex(element: GraphicElement, metrics: FlowPageMetrics): number {
  if (!Number.isFinite(metrics.contentHeightPx) || metrics.contentHeightPx <= 0) return 0;
  return Math.max(0, Math.floor(Math.max(0, element.position.y) / metrics.contentHeightPx));
}

function renderSmartArt(container: HTMLElement, nodes: NonNullable<GraphicElement['smartArt']>['nodes']): void {
  const content = container.ownerDocument.createElement('div');
  content.className = 'smartart-content';
  for (const node of nodes) {
    const item = container.ownerDocument.createElement('div');
    item.className = 'smartart-node';
    item.dataset.smartartNodeId = node.id;
    item.textContent = node.text;
    content.appendChild(item);
  }
  container.appendChild(content);
}

function renderConnectors(ownerDocument: Document, connectors: GraphicConnector[], elements: GraphicElement[], metrics: FlowPageMetrics): SVGElement {
  const svg = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('paper-graphic-connectors');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', '0 0 ' + Math.max(1, metrics.contentWidthPx) + ' ' + Math.max(1, metrics.contentHeightPx));
  svg.setAttribute('preserveAspectRatio', 'none');
  const byId = new Map(elements.map((element) => [element.id, element]));
  for (const connector of connectors) {
    const from = byId.get(connector.fromId); const to = byId.get(connector.toId);
    if (!from || !to) continue;
    const a = placeGraphicElement(from, metrics); const b = placeGraphicElement(to, metrics);
    const line = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('paper-graphic-connector');
    line.setAttribute('x1', String(a.x + from.size.width / 2)); line.setAttribute('y1', String(a.y + from.size.height / 2));
    line.setAttribute('x2', String(b.x + to.size.width / 2)); line.setAttribute('y2', String(b.y + to.size.height / 2));
    svg.appendChild(line);
  }
  return svg;
}

export function getPageMetrics(layout: { marginLeftMm: number; marginRightMm: number; marginTopMm: number; marginBottomMm: number }): FlowPageMetrics {
  const pxPerMm = 96 / 25.4;
  return {
    contentWidthPx: Math.max(1, (210 - layout.marginLeftMm - layout.marginRightMm) * pxPerMm),
    contentHeightPx: Math.max(1, (297 - 30 - 25 - layout.marginTopMm - layout.marginBottomMm) * pxPerMm),
  };
}