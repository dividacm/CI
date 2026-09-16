interface HistorySnapshot {
  html: string;
}

export class HistoryManager {
  private readonly undoStack: HistorySnapshot[] = [];
  private readonly redoStack: HistorySnapshot[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 50) {
    if (!Number.isInteger(maxSize) || maxSize < 1) {
      throw new Error('O tamanho máximo do histórico deve ser um inteiro positivo.');
    }

    this.maxSize = maxSize;
  }

  capture(editor: HTMLElement): void {
    this.captureSnapshot(editor.innerHTML);
  }

  captureSnapshot(html: string): void {
    this.undoStack.push({ html });
    this.trim(this.undoStack);
    this.redoStack.length = 0;
  }

  undo(editor: HTMLElement): boolean {
    const current = { html: editor.innerHTML };
    const previous = this.undoStack.pop();
    if (!previous) return false;

    this.redoStack.push(current);
    editor.innerHTML = previous.html;
    return true;
  }

  redo(editor: HTMLElement): boolean {
    const current = { html: editor.innerHTML };
    const next = this.redoStack.pop();
    if (!next) return false;

    this.undoStack.push(current);
    this.trim(this.undoStack);
    editor.innerHTML = next.html;
    return true;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  private trim(stack: HistorySnapshot[]): void {
    while (stack.length > this.maxSize) stack.shift();
  }
}
