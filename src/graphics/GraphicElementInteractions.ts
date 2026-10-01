import { createGraphicElement, type GraphicElement } from './GraphicElementModel';

interface GraphicElementInteractionsOptions {
  onChange: (elements: GraphicElement[]) => void;
}

type GraphicDrag = {
  id: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  resizing: boolean;
  rotating: boolean;
  originWidth: number;
  originHeight: number;
  originRotation: number;
};

export class GraphicElementInteractions {
  private readonly layer: HTMLDivElement;
  private elements: GraphicElement[] = [];
  private selectedId: string | null = null;
  private undoStack: GraphicElement[][] = [];
  private redoStack: GraphicElement[][] = [];
  private drag: GraphicDrag | null = null;

  constructor(private readonly root: HTMLElement, private readonly options: GraphicElementInteractionsOptions) {
    root.style.position = root.style.position || 'relative';
    this.layer = root.ownerDocument.createElement('div');
    this.layer.className = 'graphic-elements-layer';
    this.layer.setAttribute('aria-label', 'Elementos gráficos');
    this.layer.contentEditable = 'false';
    root.appendChild(this.layer);
    this.layer.addEventListener('pointerdown', this.handlePointerDown);
    root.addEventListener('click', this.handleRootClick);
    root.ownerDocument.addEventListener('keydown', this.handleKeyDown);
  }

  setElements(elements: GraphicElement[]): void {
    this.elements = cloneElements(elements);
    if (!this.elements.some((element) => element.id === this.selectedId)) this.selectedId = null;
    this.render();
  }

  getElements(): GraphicElement[] {
    return cloneElements(this.elements);
  }

  hasSelection(): boolean {
    return this.selectedId !== null;
  }

  duplicateSelected(): boolean {
    if (!this.selectedId) return false;
    const source = this.elements.find((element) => element.id === this.selectedId);
    if (!source) return false;
    const duplicate = createGraphicElement({
      kind: source.kind,
      position: { x: source.position.x + 12, y: source.position.y + 12 },
      size: { ...source.size },
      rotation: source.rotation,
      data: { ...source.data },
    });
    this.commit([...this.elements, duplicate], duplicate.id);
    return true;
  }

  bringSelectedToFront(): boolean {
    return this.moveSelectedToIndex(this.elements.length - 1);
  }

  sendSelectedToBack(): boolean {
    return this.moveSelectedToIndex(0);
  }

  private moveSelectedToIndex(targetIndex: number): boolean {
    if (!this.selectedId) return false;
    const currentIndex = this.elements.findIndex((element) => element.id === this.selectedId);
    if (currentIndex < 0 || currentIndex === targetIndex) return false;
    const next = cloneElements(this.elements);
    const [selected] = next.splice(currentIndex, 1);
    if (!selected) return false;
    next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, selected);
    this.commit(next, selected.id);
    return true;
  }

  insertShape(): boolean {
    const element = createGraphicElement({
      kind: 'shape',
      position: { x: 40, y: 40 + this.elements.length * 24 },
      size: { width: 180, height: 100 },
      data: { label: 'Forma' },
    });
    this.commit([...this.elements, element], element.id);
    return true;
  }

  undo(): boolean {
    const previous = this.undoStack.pop();
    if (!previous) return false;
    this.redoStack.push(this.getElements());
    const selectedId = this.selectedId;
    this.elements = cloneElements(previous);
    this.selectedId = selectedId && this.elements.some((element) => element.id === selectedId) ? selectedId : null;
    this.render();
    this.options.onChange(this.getElements());
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(this.getElements());
    const selectedId = this.selectedId;
    this.elements = cloneElements(next);
    this.selectedId = selectedId && this.elements.some((element) => element.id === selectedId) ? selectedId : null;
    this.render();
    this.options.onChange(this.getElements());
    return true;
  }

  private commit(next: GraphicElement[], selectedId: string | null): void {
    this.undoStack.push(this.getElements());
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
    this.elements = cloneElements(next);
    this.selectedId = selectedId;
    this.render();
    this.options.onChange(this.getElements());
  }

  private render(): void {
    this.layer.replaceChildren();
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
      node.textContent = element.data.label || (element.kind === 'smartart' ? 'SmartArt' : 'Forma');

      if (element.id === this.selectedId) {
        node.dataset.selected = 'true';

        const resizeHandle = this.root.ownerDocument.createElement('span');
        resizeHandle.className = 'graphic-resize-handle';
        resizeHandle.dataset.resizeHandle = element.id;
        resizeHandle.setAttribute('aria-label', 'Redimensionar elemento');
        node.appendChild(resizeHandle);

        const rotateHandle = this.root.ownerDocument.createElement('span');
        rotateHandle.className = 'graphic-rotate-handle';
        rotateHandle.dataset.rotateHandle = element.id;
        rotateHandle.setAttribute('aria-label', 'Girar elemento');
        node.appendChild(rotateHandle);
      }

      this.layer.appendChild(node);
    }
  }

  private handleRootClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('.graphic-element')) return;
    if (this.selectedId !== null) {
      this.selectedId = null;
      this.render();
    }
  };

  private handlePointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const node = target.closest<HTMLElement>('.graphic-element');
    if (!node) return;
    const id = node.dataset.graphicId;
    const element = this.elements.find((item) => item.id === id);
    if (!id || !element) return;

    event.preventDefault();
    event.stopPropagation();
    this.selectedId = id;
    this.render();

    const resizing = Boolean(target.closest('[data-resize-handle]'));
    const rotating = Boolean(target.closest('[data-rotate-handle]'));
    this.drag = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      originX: element.position.x,
      originY: element.position.y,
      resizing,
      rotating,
      originWidth: element.size.width,
      originHeight: element.size.height,
      originRotation: element.rotation,
    };

    this.root.ownerDocument.addEventListener('pointermove', this.handlePointerMove);
    this.root.ownerDocument.addEventListener('pointerup', this.handlePointerUp, { once: true });
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.drag) return;
    const element = this.elements.find((item) => item.id === this.drag?.id);
    if (!element) return;

    if (this.drag.rotating) {
      const rootRect = this.root.getBoundingClientRect();
      const centerX = rootRect.left + this.drag.originX + this.drag.originWidth / 2;
      const centerY = rootRect.top + this.drag.originY + this.drag.originHeight / 2;
      const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI + 90;
      element.rotation = normalizeRotation(angle);
    } else {
      const dx = event.clientX - this.drag.startX;
      const dy = event.clientY - this.drag.startY;

      if (this.drag.resizing) {
        element.size.width = Math.max(72, this.drag.originWidth + dx);
        element.size.height = Math.max(48, this.drag.originHeight + dy);
      } else {
        element.position.x = Math.max(0, this.drag.originX + dx);
        element.position.y = Math.max(0, this.drag.originY + dy);
      }
    }

    this.render();
  };

  private handlePointerUp = (): void => {
    if (!this.drag) return;
    const drag = this.drag;
    const changed = this.elements.some((element) => {
      if (element.id !== drag.id) return false;
      return element.position.x !== drag.originX ||
        element.position.y !== drag.originY ||
        element.size.width !== drag.originWidth ||
        element.size.height !== drag.originHeight ||
        element.rotation !== drag.originRotation;
    });

    if (changed) {
      const previous = cloneElements(this.elements);
      const previousElement = previous.find((element) => element.id === drag.id);
      if (previousElement) {
        previousElement.position = { x: drag.originX, y: drag.originY };
        previousElement.size = { width: drag.originWidth, height: drag.originHeight };
        previousElement.rotation = drag.originRotation;
      }
      this.undoStack.push(previous);
      if (this.undoStack.length > 50) this.undoStack.shift();
      this.redoStack = [];
      this.options.onChange(this.getElements());
    }

    this.drag = null;
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.selectedId) return;
    const target = event.target;
    if (target instanceof HTMLElement && target !== this.root && !this.root.contains(target)) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.duplicateSelected();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.commit(this.elements.filter((element) => element.id !== this.selectedId), null);
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

    const element = this.elements.find((item) => item.id === this.selectedId);
    if (!element) return;

    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const next = cloneElements(this.elements);
    const moved = next.find((item) => item.id === this.selectedId);
    if (!moved) return;
    moved.position.x = Math.max(0, moved.position.x + delta.x * step);
    moved.position.y = Math.max(0, moved.position.y + delta.y * step);
    this.commit(next, this.selectedId);
  };
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
    data: { ...element.data },
  }));
}
