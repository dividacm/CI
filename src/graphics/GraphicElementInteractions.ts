import { createGraphicElement, type GraphicElement } from './GraphicElementModel';
import { createSmartArt, type SmartArtData } from './SmartArtModel';

interface GraphicElementInteractionsOptions {
  onChange: (elements: GraphicElement[]) => void;
}

type GraphicDrag = {
  ids: string[];
  startX: number;
  startY: number;
  originElements: GraphicElement[];
  resizing: boolean;
  rotating: boolean;
};

type SelectionRect = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

export class GraphicElementInteractions {
  private readonly layer: HTMLDivElement;
  private readonly selectionBox: HTMLDivElement;
  private elements: GraphicElement[] = [];
  private selectedIds = new Set<string>();
  private undoStack: GraphicElement[][] = [];
  private redoStack: GraphicElement[][] = [];
  private drag: GraphicDrag | null = null;
  private selectionRect: SelectionRect | null = null;
  private selectedSmartArtNodeId: string | null = null;

  constructor(private readonly root: HTMLElement, private readonly options: GraphicElementInteractionsOptions) {
    root.style.position = root.style.position || 'relative';
    this.layer = root.ownerDocument.createElement('div');
    this.layer.className = 'graphic-elements-layer';
    this.layer.setAttribute('aria-label', 'Elementos gráficos');
    this.layer.contentEditable = 'false';
    root.appendChild(this.layer);

    this.selectionBox = root.ownerDocument.createElement('div');
    this.selectionBox.className = 'graphic-selection-box';
    this.selectionBox.hidden = true;
    this.layer.appendChild(this.selectionBox);

    this.layer.addEventListener('pointerdown', this.handlePointerDown);
    this.layer.addEventListener('dblclick', this.handleDoubleClick);
    root.addEventListener('pointerdown', this.handleRootPointerDown);
    root.addEventListener('click', this.handleRootClick);
    root.ownerDocument.addEventListener('keydown', this.handleKeyDown);
  }

  setElements(elements: GraphicElement[]): void {
    this.elements = cloneElements(elements);
    this.selectedIds = new Set([...this.selectedIds].filter((id) => this.elements.some((element) => element.id === id)));
    this.render();
  }

  getElements(): GraphicElement[] {
    return cloneElements(this.elements);
  }

  hasSelection(): boolean {
    return this.selectedIds.size > 0;
  }

  getSelectedIds(): string[] {
    return [...this.selectedIds];
  }

  getSelectedSmartArtNodeId(): string | null {
    return this.selectedSmartArtNodeId;
  }

  clearSelection(): void {
    if (!this.selectedIds.size) return;
    this.selectedIds.clear();
    this.selectedSmartArtNodeId = null;
    this.render();
  }

  duplicateSelected(): boolean {
    if (!this.selectedIds.size) return false;
    const sources = this.elements.filter((element) => this.selectedIds.has(element.id));
    if (!sources.length) return false;
    const idMap = new Map<string, string>();
    const duplicates = sources.map((source) => {
      const id = crypto.randomUUID();
      idMap.set(source.id, id);
      return createGraphicElement({
        id,
        kind: source.kind,
        position: { x: source.position.x + 12, y: source.position.y + 12 },
        size: { ...source.size },
        rotation: source.rotation,
        groupId: source.groupId,
        data: { ...source.data },
        ...(source.smartArt ? { smartArt: cloneSmartArt(source.smartArt) } : {}),
      });
    });
    const selectedIds = duplicates.map((element) => element.id);
    this.commit([...this.elements, ...duplicates], selectedIds);
    return true;
  }

  bringSelectedToFront(): boolean {
    return this.moveSelectedToEdge(true);
  }

  sendSelectedToBack(): boolean {
    return this.moveSelectedToEdge(false);
  }

  groupSelected(): boolean {
    if (this.selectedIds.size < 2) return false;
    const groupId = crypto.randomUUID();
    const next = cloneElements(this.elements);
    for (const element of next) {
      if (this.selectedIds.has(element.id)) element.groupId = groupId;
    }
    this.commit(next, this.getSelectedIds());
    return true;
  }

  ungroupSelected(): boolean {
    const selectedGroupIds = new Set(
      this.elements
        .filter((element) => this.selectedIds.has(element.id) && element.groupId)
        .map((element) => element.groupId as string),
    );
    if (!selectedGroupIds.size) return false;

    const next = cloneElements(this.elements);
    for (const element of next) {
      if (element.groupId && selectedGroupIds.has(element.groupId)) delete element.groupId;
    }
    this.commit(next, this.getSelectedIds());
    return true;
  }

  editSelectedSmartArtNode(text: string): boolean {
    const element = this.getSelectedSmartArt();
    const smartArt = element?.smartArt;
    if (!smartArt || !this.selectedSmartArtNodeId) return false;
    const node = smartArt.nodes.find((item) => item.id === this.selectedSmartArtNodeId);
    if (!node) return false;
    const value = text.trim();
    if (!value || value === node.text) return false;
    const next = cloneElements(this.elements);
    const target = next.find((item) => item.id === element.id);
    const targetNode = target?.smartArt?.nodes.find((item) => item.id === this.selectedSmartArtNodeId);
    if (!targetNode) return false;
    targetNode.text = value;
    this.commit(next, this.getSelectedIds());
    return true;
  }

  addSmartArtNode(): boolean {
    const element = this.getSelectedSmartArt();
    if (!element?.smartArt) return false;
    const parentId = element.smartArt.layout === 'hierarchy' ? this.selectedSmartArtNodeId ?? undefined : undefined;
    const node = {
      id: crypto.randomUUID(),
      text: `Novo nó ${element.smartArt.nodes.length + 1}`,
      ...(parentId ? { parentId } : {}),
    };
    const next = cloneElements(this.elements);
    const target = next.find((item) => item.id === element.id);
    if (!target?.smartArt) return false;
    target.smartArt.nodes.push(node);
    this.selectedSmartArtNodeId = node.id;
    this.commit(next, this.getSelectedIds());
    return true;
  }

  removeSelectedSmartArtNode(): boolean {
    const element = this.getSelectedSmartArt();
    if (!element?.smartArt || !this.selectedSmartArtNodeId) return false;
    if (element.smartArt.nodes.length <= 1) return false;
    const nodeId = this.selectedSmartArtNodeId;
    const next = cloneElements(this.elements);
    const target = next.find((item) => item.id === element.id);
    if (!target?.smartArt) return false;
    const removed = target.smartArt.nodes.find((node) => node.id === nodeId);
    if (!removed) return false;
    target.smartArt.nodes = target.smartArt.nodes
      .filter((node) => node.id !== nodeId)
      .map((node) => node.parentId === nodeId ? { id: node.id, text: node.text } : node);
    this.selectedSmartArtNodeId = null;
    this.commit(next, this.getSelectedIds());
    return true;
  }

  setSelectedSmartArtLayout(layout: SmartArtData['layout']): boolean {
    const element = this.getSelectedSmartArt();
    if (!element?.smartArt || element.smartArt.layout === layout) return false;
    const next = cloneElements(this.elements);
    const target = next.find((item) => item.id === element.id);
    if (!target?.smartArt) return false;
    target.smartArt.layout = layout;
    this.commit(next, this.getSelectedIds());
    return true;
  }

  private getSelectedSmartArt(): GraphicElement | null {
    if (this.selectedIds.size !== 1) return null;
    const id = this.selectedIds.values().next().value;
    const element = this.elements.find((item) => item.id === id);
    return element?.kind === 'smartart' && element.smartArt ? element : null;
  }

  insertSmartArt(layout: SmartArtData['layout'] = 'process'): boolean {
    const smartArt = createSmartArt({
      layout,
      nodes: layout === 'hierarchy'
        ? [
            { text: 'Direção' },
            { text: 'Equipe', parentId: '__ROOT__' },
          ]
        : [
            { text: 'Etapa 1' },
            { text: 'Etapa 2' },
            { text: 'Etapa 3' },
          ],
    });
    if (layout === 'hierarchy' && smartArt.nodes[1]) {
      const rootNode = smartArt.nodes[0];
      if (rootNode) smartArt.nodes[1].parentId = rootNode.id;
    }
    const element = createGraphicElement({
      kind: 'smartart',
      position: { x: 40, y: 40 + this.elements.length * 24 },
      size: { width: 360, height: 150 },
      data: { label: 'SmartArt' },
      smartArt,
    });
    this.commit([...this.elements, element], [element.id]);
    return true;
  }

  insertShape(): boolean {
    const element = createGraphicElement({
      kind: 'shape',
      position: { x: 40, y: 40 + this.elements.length * 24 },
      size: { width: 180, height: 100 },
      data: { label: 'Forma' },
    });
    this.commit([...this.elements, element], [element.id]);
    return true;
  }

  undo(): boolean {
    const previous = this.undoStack.pop();
    if (!previous) return false;
    this.redoStack.push(this.getElements());
    this.elements = cloneElements(previous);
    this.selectedIds = new Set([...this.selectedIds].filter((id) => this.elements.some((element) => element.id === id)));
    this.render();
    this.options.onChange(this.getElements());
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(this.getElements());
    this.elements = cloneElements(next);
    this.selectedIds = new Set([...this.selectedIds].filter((id) => this.elements.some((element) => element.id === id)));
    this.render();
    this.options.onChange(this.getElements());
    return true;
  }

  private moveSelectedToEdge(front: boolean): boolean {
    if (!this.selectedIds.size) return false;
    const selected = this.elements.filter((element) => this.selectedIds.has(element.id));
    if (!selected.length) return false;
    const unselected = this.elements.filter((element) => !this.selectedIds.has(element.id));
    const next = front ? [...unselected, ...selected] : [...selected, ...unselected];
    if (next.every((element, index) => element.id === this.elements[index]?.id)) return false;
    this.commit(next, this.getSelectedIds());
    return true;
  }

  private commit(next: GraphicElement[], selectedIds: string[]): void {
    this.undoStack.push(this.getElements());
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
    this.elements = cloneElements(next);
    this.selectedIds = new Set(selectedIds);
    if (!this.getSelectedSmartArt()) this.selectedSmartArtNodeId = null;
    this.render();
    this.options.onChange(this.getElements());
  }

  private render(): void {
    this.layer.replaceChildren();
    this.layer.appendChild(this.selectionBox);
    for (const element of this.elements) {
      const node = this.root.ownerDocument.createElement('div');
      const kindClass = element.kind === 'smartart' ? 'graphic-element-smartart' : 'graphic-element-shape';
      node.className = `graphic-element ${kindClass}`;
      node.dataset.graphicId = element.id;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', element.data.label || 'Elemento gráfico');
      node.contentEditable = 'false';
      node.style.left = `${element.position.x}px`;
      node.style.top = `${element.position.y}px`;
      node.style.width = `${element.size.width}px`;
      node.style.height = `${element.size.height}px`;
      node.style.transform = `rotate(${element.rotation}deg)`;
      if (element.kind === 'smartart' && element.smartArt) {
        renderSmartArtNode(node, element.smartArt, this.selectedSmartArtNodeId);
      } else {
        node.textContent = element.data.label || 'Forma';
      }

      if (this.selectedIds.has(element.id)) {
        node.dataset.selected = 'true';
      }

      if (this.isPrimarySelection(element.id)) {
        const resizeHandle = this.root.ownerDocument.createElement('span');
        resizeHandle.className = 'graphic-resize-handle';
        resizeHandle.dataset.resizeHandle = element.id;
        resizeHandle.setAttribute('aria-label', 'Redimensionar seleção');
        node.appendChild(resizeHandle);

        if (this.selectedIds.size === 1) {
          const rotateHandle = this.root.ownerDocument.createElement('span');
          rotateHandle.className = 'graphic-rotate-handle';
          rotateHandle.dataset.rotateHandle = element.id;
          rotateHandle.setAttribute('aria-label', 'Girar elemento');
          node.appendChild(rotateHandle);
        }
      }

      this.layer.appendChild(node);
    }

    if (this.selectionRect) {
      this.selectionBox.hidden = false;
      const left = Math.min(this.selectionRect.startX, this.selectionRect.currentX);
      const top = Math.min(this.selectionRect.startY, this.selectionRect.currentY);
      const width = Math.abs(this.selectionRect.currentX - this.selectionRect.startX);
      const height = Math.abs(this.selectionRect.currentY - this.selectionRect.startY);
      this.selectionBox.style.left = `${left}px`;
      this.selectionBox.style.top = `${top}px`;
      this.selectionBox.style.width = `${width}px`;
      this.selectionBox.style.height = `${height}px`;
    } else {
      this.selectionBox.hidden = true;
    }
  }

  private isPrimarySelection(id: string): boolean {
    return this.selectedIds.values().next().value === id;
  }

  private selectFromElement(id: string, additive: boolean): void {
    const element = this.elements.find((item) => item.id === id);
    if (!element) return;

    const ids = element.groupId
      ? this.elements.filter((item) => item.groupId === element.groupId).map((item) => item.id)
      : [id];

    const next = additive ? new Set(this.selectedIds) : new Set<string>();
    const allSelected = ids.every((itemId) => next.has(itemId));
    if (allSelected) {
      for (const itemId of ids) next.delete(itemId);
    } else {
      for (const itemId of ids) next.add(itemId);
    }
    this.selectedIds = next;
    if (!this.selectedIds.size || !this.getSelectedSmartArt()) this.selectedSmartArtNodeId = null;
    this.render();
  }

  private handleRootClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('.graphic-element') || target.closest('.graphic-selection-box')) return;
    if (this.selectedIds.size) {
      this.selectedIds.clear();
      this.render();
    }
  };

  private handleRootPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || event.target !== this.root) return;
    event.preventDefault();
    const rect = this.root.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;
    this.selectionRect = { startX, startY, currentX: startX, currentY: startY };
    this.selectedIds.clear();
    this.render();
    this.root.ownerDocument.addEventListener('pointermove', this.handleSelectionMove);
    this.root.ownerDocument.addEventListener('pointerup', this.handleSelectionUp, { once: true });
  };

  private handleSelectionMove = (event: PointerEvent): void => {
    if (!this.selectionRect) return;
    const rect = this.root.getBoundingClientRect();
    this.selectionRect.currentX = event.clientX - rect.left;
    this.selectionRect.currentY = event.clientY - rect.top;
    this.render();
  };

  private handleSelectionUp = (): void => {
    if (!this.selectionRect) return;
    const selection = this.selectionRect;
    this.selectionRect = null;
    const left = Math.min(selection.startX, selection.currentX);
    const right = Math.max(selection.startX, selection.currentX);
    const top = Math.min(selection.startY, selection.currentY);
    const bottom = Math.max(selection.startY, selection.currentY);
    if (right - left >= 4 || bottom - top >= 4) {
      this.selectedIds = new Set(
        this.elements
          .filter((element) => intersects(element.position.x, element.position.y, element.size.width, element.size.height, left, top, right, bottom))
          .map((element) => element.id),
      );
    }
    this.render();
  };

  private handleDoubleClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const node = target.closest<HTMLElement>('.smartart-node');
    if (!node) return;
    const graphic = node.closest<HTMLElement>('.graphic-element');
    const id = graphic?.dataset.graphicId;
    const nodeId = node.dataset.smartartNodeId;
    if (!id || !nodeId || !this.elements.some((item) => item.id === id && item.kind === 'smartart')) return;
    this.selectedIds = new Set([id]);
    this.selectedSmartArtNodeId = nodeId;
    const current = node.textContent?.trim() ?? '';
    const value = this.root.ownerDocument.defaultView?.prompt('Editar nó SmartArt', current);
    if (value !== null && value !== undefined) this.editSelectedSmartArtNode(value);
    this.render();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const node = target.closest<HTMLElement>('.graphic-element');
    if (!node) return;
    const id = node.dataset.graphicId;
    const smartArtNode = target.closest<HTMLElement>('.smartart-node');
    const element = this.elements.find((item) => item.id === id);
    if (!id || !element) return;

    event.preventDefault();
    event.stopPropagation();

    if (smartArtNode && element.kind === 'smartart' && element.smartArt) {
      this.selectedSmartArtNodeId = smartArtNode.dataset.smartartNodeId ?? null;
    } else {
      this.selectedSmartArtNodeId = null;
    }

    const additive = event.ctrlKey || event.metaKey;
    const wasSelected = this.selectedIds.has(id);
    if (additive || !wasSelected) this.selectFromElement(id, additive);
    if (!this.selectedIds.has(id)) return;

    const ids = [...this.selectedIds].length ? [...this.selectedIds] : [id];
    const selectedElements = this.elements.filter((item) => ids.includes(item.id));
    const resizing = Boolean(target.closest('[data-resize-handle]'));
    const rotating = Boolean(target.closest('[data-rotate-handle]'));

    this.drag = {
      ids,
      startX: event.clientX,
      startY: event.clientY,
      originElements: cloneElements(selectedElements),
      resizing,
      rotating,
    };

    this.root.ownerDocument.addEventListener('pointermove', this.handlePointerMove);
    this.root.ownerDocument.addEventListener('pointerup', this.handlePointerUp, { once: true });
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.drag) return;
    const dx = event.clientX - this.drag.startX;
    const dy = event.clientY - this.drag.startY;

    if (this.drag.rotating && this.drag.ids.length === 1) {
      const origin = this.drag.originElements[0];
      const element = this.elements.find((item) => item.id === this.drag?.ids[0]);
      if (!origin || !element) return;
      const rootRect = this.root.getBoundingClientRect();
      const centerX = rootRect.left + origin.position.x + origin.size.width / 2;
      const centerY = rootRect.top + origin.position.y + origin.size.height / 2;
      const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI + 90;
      element.rotation = normalizeRotation(angle);
    } else if (this.drag.resizing) {
      this.resizeSelection(dx, dy);
    } else {
      for (const origin of this.drag.originElements) {
        const element = this.elements.find((item) => item.id === origin.id);
        if (!element) continue;
        element.position.x = Math.max(0, origin.position.x + dx);
        element.position.y = Math.max(0, origin.position.y + dy);
      }
    }

    this.render();
  };

  private resizeSelection(dx: number, dy: number): void {
    if (this.drag?.originElements.length === 1) {
      const origin = this.drag.originElements[0];
      if (!origin) return;
      const element = this.elements.find((item) => item.id === origin.id);
      if (!element) return;
      element.size.width = Math.max(72, origin.size.width + dx);
      element.size.height = Math.max(48, origin.size.height + dy);
      return;
    }

    if (!this.drag?.originElements.length) return;
    const bounds = getBounds(this.drag.originElements);
    const nextWidth = Math.max(72, bounds.width + dx);
    const nextHeight = Math.max(48, bounds.height + dy);
    const scaleX = nextWidth / bounds.width;
    const scaleY = nextHeight / bounds.height;

    for (const origin of this.drag.originElements) {
      const element = this.elements.find((item) => item.id === origin.id);
      if (!element) continue;
      element.position.x = bounds.left + (origin.position.x - bounds.left) * scaleX;
      element.position.y = bounds.top + (origin.position.y - bounds.top) * scaleY;
      element.size.width = Math.max(24, origin.size.width * scaleX);
      element.size.height = Math.max(24, origin.size.height * scaleY);
    }
  }

  private handlePointerUp = (): void => {
    if (!this.drag) return;
    const drag = this.drag;
    const changed = drag.originElements.some((origin) => {
      const element = this.elements.find((item) => item.id === origin.id);
      if (!element) return false;
      return element.position.x !== origin.position.x ||
        element.position.y !== origin.position.y ||
        element.size.width !== origin.size.width ||
        element.size.height !== origin.size.height ||
        element.rotation !== origin.rotation;
    });

    if (changed) {
      const previous = cloneElements(this.elements);
      for (const origin of drag.originElements) {
        const previousElement = previous.find((element) => element.id === origin.id);
        if (!previousElement) continue;
        previousElement.position = { ...origin.position };
        previousElement.size = { ...origin.size };
        previousElement.rotation = origin.rotation;
      }
      this.undoStack.push(previous);
      if (this.undoStack.length > 50) this.undoStack.shift();
      this.redoStack = [];
      this.options.onChange(this.getElements());
    }

    this.drag = null;
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.selectedIds.size) return;
    const target = event.target;
    if (target instanceof HTMLElement && target !== this.root && !this.root.contains(target)) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.duplicateSelected();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      if (event.shiftKey) this.ungroupSelected();
      else this.groupSelected();
      return;
    }

    if (event.key === 'Escape') {
      this.selectedIds.clear();
      this.render();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.commit(this.elements.filter((element) => !this.selectedIds.has(element.id)), []);
      return;
    }

    const deltas: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const delta = deltas[event.key];
    if (!delta || event.altKey || event.ctrlKey || event.metaKey) return;

    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const next = cloneElements(this.elements);
    for (const id of this.selectedIds) {
      const element = next.find((item) => item.id === id);
      if (!element) continue;
      element.position.x = Math.max(0, element.position.x + delta.x * step);
      element.position.y = Math.max(0, element.position.y + delta.y * step);
    }
    this.commit(next, this.getSelectedIds());
  };
}

function intersects(x: number, y: number, width: number, height: number, left: number, top: number, right: number, bottom: number): boolean {
  return x < right && x + width > left && y < bottom && y + height > top;
}

function getBounds(elements: GraphicElement[]): { left: number; top: number; width: number; height: number } {
  const left = Math.min(...elements.map((element) => element.position.x));
  const top = Math.min(...elements.map((element) => element.position.y));
  const right = Math.max(...elements.map((element) => element.position.x + element.size.width));
  const bottom = Math.max(...elements.map((element) => element.position.y + element.size.height));
  return { left, top, width: right - left, height: bottom - top };
}

function normalizeRotation(rotation: number): number {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function cloneElements(elements: GraphicElement[]): GraphicElement[] {
  return elements.map((element) => ({
    ...element,
    position: { ...element.position },
    size: { ...element.size },
    ...(element.groupId ? { groupId: element.groupId } : {}),
    data: { ...element.data },
    ...(element.smartArt ? { smartArt: cloneSmartArt(element.smartArt) } : {}),
  }));
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

function renderSmartArtNode(container: HTMLElement, smartArt: SmartArtData, selectedNodeId: string | null): void {
  container.setAttribute('aria-label', `SmartArt ${smartArt.layout}`);
  const content = container.ownerDocument.createElement('div');
  content.className = `smartart-content smartart-${smartArt.layout}`;
  for (const item of smartArt.nodes) {
    const node = container.ownerDocument.createElement('div');
    node.className = 'smartart-node';
    node.dataset.smartartNodeId = item.id;
    if (item.id === selectedNodeId) node.dataset.selected = 'true';
    node.textContent = item.text;
    content.appendChild(node);
  }
  container.appendChild(content);
}
