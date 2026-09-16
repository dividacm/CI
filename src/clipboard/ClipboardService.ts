import type { RangeEngine } from '../editor/RangeEngine';

export interface ClipboardServiceOptions {
  rangeEngine: RangeEngine;
}

export class ClipboardService {
  private readonly rangeEngine: RangeEngine;

  public constructor(options: ClipboardServiceOptions) {
    this.rangeEngine = options.rangeEngine;
  }

  public async copy(): Promise<boolean> {
    const selection = this.rangeEngine.getSelection();
    if (!selection || selection.range.collapsed) {
      return false;
    }

    const text = selection.range.toString();
    if (!text) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return document.execCommand('copy');
    }
  }

  public async cut(): Promise<boolean> {
    const copied = await this.copy();
    if (!copied) {
      return false;
    }

    const selection = this.rangeEngine.getSelection();
    if (!selection || selection.range.collapsed) {
      return false;
    }

    selection.range.deleteContents();
    selection.range.collapse(true);
    selection.range.commonAncestorContainer.parentElement?.focus();
    return true;
  }

  public async pastePlainText(): Promise<boolean> {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        return false;
      }

      this.rangeEngine.replaceSelection(text.replace(/\r\n?/g, '\n'));
      return true;
    } catch {
      return false;
    }
  }
}
