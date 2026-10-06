import { getKeyboardCommand, type KeyboardCommand } from '../app/KeyboardShortcutMap';
import { ClipboardService } from '../clipboard/ClipboardService';
import { FormattingEngine, type ListType, type TextAlignment } from './FormattingEngine';
import { HistoryManager } from './HistoryManager';
import { RangeEngine } from './RangeEngine';
import { TableInteractions } from './TableInteractions';

export class Editor {
  private readonly formatting: FormattingEngine;
  private readonly history: HistoryManager;
  private readonly clipboard: ClipboardService;
  private readonly tables: TableInteractions;
  private savedSelection: Range | null = null;
  private saveHandler: (() => void) | null = null;
  private externalUndo: (() => boolean) | null = null;
  private externalRedo: (() => boolean) | null = null;

  constructor(private readonly root: HTMLElement) {
    const rangeEngine = new RangeEngine(root);
    this.formatting = new FormattingEngine(root);
    this.history = new HistoryManager();
    this.clipboard = new ClipboardService({ rangeEngine });
    this.tables = new TableInteractions(root);
    this.tables.bind();
    this.history.capture(root);
    this.bindHistory();
    this.bindSelection();
  }

  getHtml(): string { return this.root.innerHTML; }
  setHtml(html: string): void { this.root.innerHTML = html; this.savedSelection = null; this.tables.syncSelection(); }
  focus(): void { this.root.focus(); }

  rememberSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!this.root.contains(range.commonAncestorContainer)) return;
    this.savedSelection = range.cloneRange();
  }

  setExternalHistoryHandlers(undo: (() => boolean) | null, redo: (() => boolean) | null): void {
    this.externalUndo = undo;
    this.externalRedo = redo;
  }

  setSaveHandler(handler: (() => void) | null): void { this.saveHandler = handler; }

  async copy(): Promise<boolean> { this.focus(); this.restoreSavedSelection(); return this.clipboard.copy(); }

  async cut(): Promise<boolean> {
    this.focus(); this.restoreSavedSelection();
    const before = this.root.innerHTML;
    const changed = await this.clipboard.cut();
    if (changed && this.root.innerHTML !== before) { this.history.captureSnapshot(before); this.rememberSelection(); }
    return changed;
  }

  async pastePlainText(): Promise<boolean> {
    this.focus(); this.restoreSavedSelection();
    const before = this.root.innerHTML;
    const changed = await this.clipboard.pastePlainText();
    if (changed && this.root.innerHTML !== before) { this.history.captureSnapshot(before); this.rememberSelection(); }
    return changed;
  }

  bold(): boolean { return this.apply(() => this.formatting.bold()); }
  italic(): boolean { return this.apply(() => this.formatting.italic()); }
  underline(): boolean { return this.apply(() => this.formatting.underline()); }
  align(alignment: TextAlignment): boolean { return this.apply(() => this.formatting.align(alignment)); }
  list(type: ListType): boolean { return this.apply(() => this.formatting.insertList(type)); }
  insertTable(rows = 2, columns = 3): boolean { return this.apply(() => this.formatting.insertTable(rows, columns)); }
  selectTableRow(): boolean { return this.apply(() => this.tables.selectRow()); }
  selectTableColumn(): boolean { return this.apply(() => this.tables.selectColumn()); }
  insertTableRow(): boolean { return this.apply(() => this.tables.insertRow()); }
  deleteTableRow(): boolean { return this.apply(() => this.tables.deleteRow()); }
  insertTableColumn(): boolean { return this.apply(() => this.tables.insertColumn()); }
  deleteTableColumn(): boolean { return this.apply(() => this.tables.deleteColumn()); }
  resizeTableColumn(deltaPx: number): boolean { return this.apply(() => this.tables.resizeSelectedColumn(deltaPx)); }
  hasActiveTableCell(): boolean { return this.tables.hasActiveCell(); }
  fontFamily(value: string): boolean { return this.apply(() => this.formatting.setFontFamily(value)); }
  fontSize(value: string): boolean { return this.apply(() => this.formatting.setFontSize(value)); }
  color(value: string): boolean { return this.apply(() => this.formatting.setColor(value)); }
  toggleCase(upper: boolean): boolean { return this.apply(() => this.formatting.toggleCase(upper)); }
  clearFormatting(): boolean { return this.apply(() => this.formatting.clearFormatting()); }

  undo(): boolean {
    const changed = this.history.undo(this.root);
    if (changed) { this.rememberSelection(); this.tables.syncSelection(); }
    return changed;
  }

  redo(): boolean {
    const changed = this.history.redo(this.root);
    if (changed) { this.rememberSelection(); this.tables.syncSelection(); }
    return changed;
  }

  private apply(operation: () => boolean): boolean {
    this.focus(); this.restoreSavedSelection();
    const before = this.root.innerHTML;
    const changed = operation();
    if (changed && this.root.innerHTML !== before) { this.history.captureSnapshot(before); this.rememberSelection(); }
    return changed;
  }

  private bindSelection(): void {
    this.root.addEventListener('keyup', () => this.rememberSelection());
    this.root.addEventListener('mouseup', () => this.rememberSelection());
    this.root.ownerDocument.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && this.root.contains(selection.anchorNode)) this.rememberSelection();
    });
  }

  private bindHistory(): void {
    this.root.addEventListener('beforeinput', () => {
      this.rememberSelection();
      this.history.capture(this.root);
    });
    this.root.addEventListener('keydown', (event) => {
      if (this.handleTableNavigation(event)) return;
      this.handleShortcut(event);
    });
  }

  private handleTableNavigation(event: KeyboardEvent): boolean {
    if (event.key !== 'Tab') return false;
    const target = event.target;
    if (!(target instanceof Node) || !this.root.contains(target)) return false;
    if (!this.tables.hasActiveCell()) return false;
    event.preventDefault();
    const changed = this.apply(() => this.tables.moveByTab(event.shiftKey));
    if (changed) this.notifyChange();
    return true;
  }

  private handleShortcut(event: KeyboardEvent): boolean {
    const command = getKeyboardCommand(event);
    if (!command) return false;
    event.preventDefault();

    if (command === 'save') {
      this.saveHandler?.();
      return true;
    }
    if (command === 'undo' || command === 'redo') {
      const changed = command === 'undo' ? this.externalUndo?.() ?? this.undo() : this.externalRedo?.() ?? this.redo();
      if (changed) this.notifyChange();
      return true;
    }
    if (command === 'copy' || command === 'cut' || command === 'paste') {
      void this.handleClipboardShortcut(command);
      return true;
    }

    const changed = this.executeFormattingShortcut(command);
    if (changed) this.notifyChange();
    return true;
  }

  private executeFormattingShortcut(command: KeyboardCommand): boolean {
    switch (command) {
      case 'bold': return this.bold();
      case 'italic': return this.italic();
      case 'underline': return this.underline();
      case 'align-left': return this.align('left');
      case 'align-center': return this.align('center');
      case 'align-right': return this.align('right');
      case 'align-justify': return this.align('justify');
      case 'list-ordered': return this.list('ol');
      case 'list-unordered': return this.list('ul');
      default: return false;
    }
  }

  private async handleClipboardShortcut(command: KeyboardCommand): Promise<void> {
    const changed = command === 'copy' ? await this.copy() : command === 'cut' ? await this.cut() : await this.pastePlainText();
    if (changed && command !== 'copy') this.notifyChange();
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

  private notifyChange(): void { this.root.dispatchEvent(new Event('input', { bubbles: true })); }
}
