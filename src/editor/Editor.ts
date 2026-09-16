import { FormattingEngine, type ListType, type TextAlignment } from './FormattingEngine';
import { HistoryManager } from './HistoryManager';

export class Editor {
  private readonly formatting: FormattingEngine;
  private readonly history: HistoryManager;

  constructor(private readonly root: HTMLElement) {
    this.formatting = new FormattingEngine(root);
    this.history = new HistoryManager();
    this.bindHistory();
  }

  focus(): void { this.root.focus(); }
  bold(): boolean { return this.apply(() => this.formatting.bold()); }
  italic(): boolean { return this.apply(() => this.formatting.italic()); }
  underline(): boolean { return this.apply(() => this.formatting.underline()); }
  align(alignment: TextAlignment): boolean { return this.apply(() => this.formatting.align(alignment)); }
  list(type: ListType): boolean { return this.apply(() => this.formatting.insertList(type)); }
  fontFamily(value: string): boolean { return this.apply(() => this.formatting.setFontFamily(value)); }
  fontSize(value: string): boolean { return this.apply(() => this.formatting.setFontSize(value)); }
  color(value: string): boolean { return this.apply(() => this.formatting.setColor(value)); }
  toggleCase(upper: boolean): boolean { return this.apply(() => this.formatting.toggleCase(upper)); }
  clearFormatting(): boolean { return this.apply(() => this.formatting.clearFormatting()); }
  undo(): boolean { return this.history.undo(this.root); }
  redo(): boolean { return this.history.redo(this.root); }

  private apply(operation: () => boolean): boolean {
    const before = this.root.innerHTML;
    const changed = operation();
    if (changed && this.root.innerHTML !== before) this.history.captureSnapshot(before);
    return changed;
  }

  private bindHistory(): void {
    this.root.addEventListener('input', () => {
      this.history.capture(this.root);
    });

    this.root.addEventListener('keydown', (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;

      event.preventDefault();
      if (key === 'y' || event.shiftKey) this.redo();
      else this.undo();
    });
  }
}
