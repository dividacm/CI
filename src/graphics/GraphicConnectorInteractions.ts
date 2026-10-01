import { createGraphicConnector, type GraphicConnector } from './GraphicConnectorModel';
import type { GraphicElement } from './GraphicElementModel';

interface GraphicConnectorInteractionsOptions {
  getElements: () => GraphicElement[];
  onChange: (connectors: GraphicConnector[]) => void;
  onSelectionChange?: () => void;
}

export class GraphicConnectorInteractions {
  private readonly svg: SVGSVGElement;
  private connectors: GraphicConnector[] = [];
  private selectedId: string | null = null;
  private undoStack: GraphicConnector[][] = [];
  private redoStack: GraphicConnector[][] = [];

  constructor(private readonly root: HTMLElement, private readonly options: GraphicConnectorInteractionsOptions) {
    this.svg = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('graphic-connectors-layer');
    this.svg.setAttribute('aria-label', 'Conectores gráficos');
    this.svg.setAttribute('focusable', 'false');
    root.insertBefore(this.svg, root.firstChild);
    root.addEventListener('pointerdown', this.handleRootPointerDown);
    this.svg.addEventListener('pointerdown', this.handleConnectorPointerDown);
    root.ownerDocument.addEventListener('keydown', this.handleKeyDown);
  }

  setElements(elements: GraphicElement[]): void {
    this.render(elements);
  }

  setConnectors(connectors: GraphicConnector[]): void {
    this.connectors = cloneConnectors(connectors);
    this.selectedId = this.selectedId && this.connectors.some((connector) => connector.id === this.selectedId)
      ? this.selectedId
      : null;
    this.render(this.options.getElements());
  }

  getConnectors(): GraphicConnector[] {
    return cloneConnectors(this.connectors);
  }

  hasSelection(): boolean {
    return this.selectedId !== null;
  }

  clearSelection(): void {
    if (!this.selectedId) return;
    this.selectedId = null;
    this.render(this.options.getElements());
    this.options.onSelectionChange?.();
  }

  connect(fromId: string, toId: string): boolean {
    if (fromId === toId) return false;
    const elements = this.options.getElements();
    if (!elements.some((element) => element.id === fromId) || !elements.some((element) => element.id === toId)) return false;
    if (this.connectors.some((connector) =>
      (connector.fromId === fromId && connector.toId === toId) ||
      (connector.fromId === toId && connector.toId === fromId))) return false;

    const connector = createGraphicConnector({ fromId, toId });
    this.commit([...this.connectors, connector], connector.id);
    return true;
  }

  deleteSelected(): boolean {
    if (!this.selectedId) return false;
    const next = this.connectors.filter((connector) => connector.id !== this.selectedId);
    if (next.length === this.connectors.length) return false;
    this.commit(next, null);
    return true;
  }

  undo(): boolean {
    const previous = this.undoStack.pop();
    if (!previous) return false;
    this.redoStack.push(this.getConnectors());
    this.connectors = cloneConnectors(previous);
    this.selectedId = null;
    this.render(this.options.getElements());
    this.options.onChange(this.getConnectors());
    this.options.onSelectionChange?.();
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(this.getConnectors());
    this.connectors = cloneConnectors(next);
    this.selectedId = null;
    this.render(this.options.getElements());
    this.options.onChange(this.getConnectors());
    this.options.onSelectionChange?.();
    return true;
  }

  private commit(next: GraphicConnector[], selectedId: string | null): void {
    this.undoStack.push(this.getConnectors());
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
    this.connectors = cloneConnectors(next);
    this.selectedId = selectedId;
    this.render(this.options.getElements());
    this.options.onChange(this.getConnectors());
    this.options.onSelectionChange?.();
  }

  private render(elements: GraphicElement[]): void {
    const byId = new Map(elements.map((element) => [element.id, element]));
    this.svg.replaceChildren();
    const defs = this.root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = this.root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.id = 'graphic-connector-arrow';
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const path = this.root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('class', 'graphic-connector-arrow');
    marker.appendChild(path);
    defs.appendChild(marker);
    this.svg.appendChild(defs);

    for (const connector of this.connectors) {
      const from = byId.get(connector.fromId);
      const to = byId.get(connector.toId);
      if (!from || !to) continue;

      const line = this.root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.dataset.connectorId = connector.id;
      line.setAttribute('x1', String(from.position.x + from.size.width / 2));
      line.setAttribute('y1', String(from.position.y + from.size.height / 2));
      line.setAttribute('x2', String(to.position.x + to.size.width / 2));
      line.setAttribute('y2', String(to.position.y + to.size.height / 2));
      line.setAttribute('marker-end', 'url(#graphic-connector-arrow)');
      line.setAttribute('class', connector.id === this.selectedId ? 'graphic-connector graphic-connector-selected' : 'graphic-connector');
      line.setAttribute('role', 'button');
      line.setAttribute('aria-label', 'Conector');
      line.addEventListener('pointerdown', this.handleConnectorPointerDown);
      this.svg.appendChild(line);
    }
  }

  private handleConnectorPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const id = target.getAttribute('data-connector-id');
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedId = this.selectedId === id ? null : id;
    this.render(this.options.getElements());
    this.options.onSelectionChange?.();
  };

  private handleRootPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('.graphic-element')) this.clearSelection();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.selectedId) return;
    const target = event.target;
    if (target instanceof HTMLElement && target !== this.root && !this.root.contains(target)) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.clearSelection();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.deleteSelected();
    }
  };
}

function cloneConnectors(connectors: GraphicConnector[]): GraphicConnector[] {
  return connectors.map((connector) => ({ ...connector }));
}
