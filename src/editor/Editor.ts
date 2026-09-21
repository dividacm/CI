import { ClipboardService } from '../clipboard/ClipboardService';
import { FormattingEngine, type ListType, type TextAlignment } from './FormattingEngine';
import { HistoryManager } from './HistoryManager';
import { RangeEngine } from './RangeEngine';

export class Editor {
  private readonly formatting: FormattingEngine;
  private readonly history: HistoryManager;
  private readonly clipboard: ClipboardService;
  private savedSelection: Range | null = null;
  private saveHandler: (() => void) | null = null;

  constructor(private readonly root: HTMLElement) {
    const rangeEngine = new RangeEngine(root);
    this.formatting = new FormattingEngine(root);
    this.history = new HistoryManager();
    this.clipboard = new ClipboardService({ rangeEngine });
    this.history.capture(root);
    this.bindHistory();
    this.bindSelection();
  }

  getHtml(): string {
    return this.root.innerHTML;
  }

  setHtml(html: string): void {
    this.root.innerHTML = html;
    this.savedSelection = null;
  }

  focus(): void {
    this.root.focus();
  }

  rememberSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!this.root.contains(range.commonAncestorContainer)) return;
    this.savedSelection = range.cloneRange();
  }

  setSaveHandler(handler: (() => void) | null): void {
    this.saveHandler = handler;
  }

  async copy(): Promise<boolean> {
    this.focus();
    this.restoreSavedSelection();
    return this.clipboard.copy();
  }

  async cut(): Promise<boolean> {
    this.focus();
    this.restoreSavedSelection();
    const before = this.root.innerHTML;
    const changed = await this.clipboard.cut();
    if (changed && this.root.innerHTML !== before) {
      this.history.captureSnapshot(before);
      this.rememberSelection();
    }
    return changed;
  }

  async pastePlainText(): Promise<boolean> {
    this.focus();
    this.restoreSavedSelection();
    const before = this.root.innerHTML;
    const changed = await this.clipboard.pastePlainText();
    if (changed && this.root.innerHTML !== before) {
      this.history.captureSnapshot(before);
      this.rememberSelection();
    }
    return changed;
  }

  bold(): boolean {
    return this.apply(() => this.formatting.bold());
  }

  italic(): boolean {
    return this.apply(() => this.formatting.italic());
  }

  underline(): boolean {
    return this.apply(() => this.formatting.underline());
  }

  align(alignment: TextAlignment): boolean {
    return this.apply(() => this.formatting.align(alignment));
  }

  list(type: ListType): boolean {
    return this.apply(() => this.formatting.insertList(type));
  }

  fontFamily(value: string): boolean {
    return this.apply(() => this.formatting.setFontFamily(value));
  }

  fontSize(value: string): boolean {
    return this.apply(() => this.formatting.setFontSize(value));
  }

  color(value: string): boolean {
    return this.apply(() => this.formatting.setColor(value));
  }

  toggleCase(upper: boolean): boolean {
    return this.apply(() => this.formatting.toggleCase(upper));
  }

  clearFormatting(): boolean {
    return this.apply(() => this.formatting.clearFormatting());
  }

  undo(): boolean {
    const changed = this.history.undo(this.root);
    if (changed) this.rememberSelection();
    return changed;
  }

  redo(): boolean {
    const changed = this.history.redo(this.root);
    if (changed) this.rememberSelection();
    return changed;
  }

  private apply(operation: () => boolean): boolean {
    this.focus();
    this.restoreSavedSelection();
    const before = this.root.innerHTML;
    const changed = operation();
    if (changed && this.root.innerHTML !== before) {
      this.history.captureSnapshot(before);
      this.rememberSelection();
    }
    return changed;
  }

  private bindSelection(): void {
    this.root.addEventListener('keyup', () => this.rememberSelection());
    this.root.addEventListener('mouseup', () => this.rememberSelection());
    this.root.ownerDocument.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && this.root.contains(selection.anchorNode)) {
        this.rememberSelection();
      }
    });
  }

  private bindHistory(): void {
    this.root.addEventListener('beforeinput', () => {
      this.rememberSelection();
      this.history.capture(this.root);
    });

    this.root.addEventListener('keydown', (event) => {
      if (this.handleShortcut(event)) return;

      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;

      event.preventDefault();
      if (key === 'y' || event.shiftKey) this.redo();
      else this.undo();
      this.notifyChange();
    });
  }

  private handleShortcut(event: KeyboardEvent): boolean {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return false;

    const key = event.key.toLowerCase();
    const code = event.code;

    if (key === 's') {
      event.preventDefault();
      this.saveHandler?.();
      return true;
    }

    const changed = (() => {
      switch (true) {
        case key === 'b': event.preventDefault(); return this.bold();
        case key === 'i': event.preventDefault(); return this.italic();
        case key === 'u': event.preventDefault(); return this.underline();
        case key === 'l' && !event.shiftKey: event.preventDefault(); return this.align('left');
        case key === 'e' && !event.shiftKey: event.preventDefault(); return this.align('center');
        case key === 'r' && !event.shiftKey: event.preventDefault(); return this.align('right');
        case key === 'j' && !event.shiftKey: event.preventDefault(); return this.align('justify');
        case key === 'z': event.preventDefault(); return event.shiftKey ? this.redo() : this.undo();
        case key === 'y': event.preventDefault(); return this.redo();
        case key === 'c': event.preventDefault(); return true;
        case key === 'x': event.preventDefault(); return true;
        case key === 'v': event.preventDefault(); return true;
        case code === 'Digit7' && event.shiftKey: event.preventDefault(); return this.list('ol');
        case code === 'Digit8' && event.shiftKey: event.preventDefault(); return this.list('ul');
        default: return false;
      }
    })();

    if (key === 'c' || key === 'x' || key === 'v') {
      void this.handleClipboardShortcut(key);
      return true;
    }

    if (changed) this.notifyChange();
    return event.defaultPrevented;
  }

  private async handleClipboardShortcut(key: string): Promise<void> {
    const changed = key === 'c' ? await this.copy() : key === 'x' ? await this.cut() : await this.pastePlainText();
    if (changed && key !== 'c') this.notifyChange();
  }

  private restoreSavedSelection(): void {
    if (!this.savedSelection) return;

    if (!this.root.contains(this.savedSelection.startContainer) || !this.root.contains(this.savedSelection.endContainer)) {
      this.savedSelection = null;
      return;
    }

    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(this.savedSelection);
  }

  private notifyChange(): void {
    this.root.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
