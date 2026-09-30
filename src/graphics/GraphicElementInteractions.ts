import { createGraphicElement, type GraphicElement } from './GraphicElementModel';

interface GraphicElementInteractionsOptions {
  onChange: (elements: GraphicElement[]) => void;
}

export class GraphicElementInteractions {
  private readonly layer: HTMLDivElement;
  private elements: GraphicElement[] = [];
  private selectedId: string | null = null;
  private undoStack: GraphicElement[][] = [];
  private redoStack: GraphicElement[][] = [];
  private drag: { id: string; startX: number; startY: number; originX: number; originY: number; resizing: boolean; originWidth: number; originHeight: number } | null = null;

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
    this.elements = elements.map((element) => ({ ...element, position: { ...element.position }, size: { ...element.size }, data: { ...element.data } }));
    if (!this.elements.some((element) => element.id === this.selectedId)) this.selectedId = null;
    this.render();
  }

  getElements(): GraphicElement[] {
    return this.elements.map((element) => ({ ...element, position: { ...element.position }, size: { ...element.size }, data: { ...element.data } }));
  }

  hasSelection(): boolean {
    return this.selectedId !== null;
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
    this.elements = cloneElements(previous);
    this.selectedId = this.elements[0]?.id ?? null;
    this.render();
    this.options.onChange(this.getElements());
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(this.getElements());
    this.elements = cloneElements(next);
    this.selectedId = this.elements[0]?.id ?? null;
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
      node.className = 'graphic-element graphic-element-shape';
      node.dataset.graphicId = element.id;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', element.data.label || 'Elemento gráfico');
      node.contentEditable = 'false';
      node.style.left = `${element.position.x}px`;
      node.style.top = `${element.position.y}px`;
      node.style.width = `${element.size.width}px`;
      node.style.height = `${element.size.height}px`;
      node.style.transform = `rotate(${element.rotation}deg)`;
      node.textContent = element.data.label || 'Forma';
      if (element.id === this.selectedId) {
        node.dataset.selected = 'true';
        const handle = this.root.ownerDocument.createElement('span');
        handle.className = 'graphic-resize-handle';
        handle.dataset.resizeHandle = element.id;
        handle.setAttribute('aria-label', 'Redimensionar elemento');
        node.appendChild(handle);
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
    this.drag = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      originX: element.position.x,
      originY: element.position.y,
      resizing,
      originWidth: element.size.width,
      originHeight: element.size.height,
    };
    this.root.ownerDocument.addEventListener('pointermove', this.handlePointerMove);
    this.root.ownerDocument.addEventListener('pointerup', this.handlePointerUp, { once: true });
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.drag) return;
    const element = this.elements.find((item) => item.id === this.drag?.id);
    if (!element) return;
    const dx = event.clientX - this.drag.startX;
    const dy = event.clientY - this.drag.startY;

    if (this.drag.resizing) {
      element.size.width = Math.max(72, this.drag.originWidth + dx);
      element.size.height = Math.max(48, this.drag.originHeight + dy);
    } else {
      element.position.x = Math.max(0, this.drag.originX + dx);
      element.position.y = Math.max(0, this.drag.originY + dy);
    }
    this.render();
  };

  private handlePointerUp = (): void => {
    if (!this.drag) return;
    const changed = this.elements.some((element) => {
      if (element.id !== this.drag?.id) return false;
      return element.position.x !== this.drag.originX || element.position.y !== this.drag.originY ||
        element.size.width !== this.drag.originWidth || element.size.height !== this.drag.originHeight;
    });
    if (changed) {
      const current = this.getElements();
      const previous = cloneElements(current);
      const changedElement = previous.find((element) => element.id === this.drag?.id);
      if (changedElement) {
        changedElement.position.x = this.drag.originX;
        changedElement.position.y = this.drag.originY;
        changedElement.size.width = this.drag.originWidth;
        changedElement.size.height = this.drag.originHeight;
      }
      this.undoStack.push(previous);
      this.redoStack = [];
      this.options.onChange(this.getElements());
    }
    this.drag = null;
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.selectedId || !(event.key === 'Delete' || event.key === 'Backspace')) return;
    const target = event.target;
    if (target instanceof HTMLElement && target !== this.root && !this.root.contains(target)) return;
    event.preventDefault();
    this.commit(this.elements.filter((element) => element.id !== this.selectedId), null);
  };
}

function cloneElements(elements: GraphicElement[]): GraphicElement[] {
  return elements.map((element) => ({
    ...element,
    position: { ...element.position },
    size: { ...element.size },
    data: { ...element.data },
  }));
}
