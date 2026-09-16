import { RangeEngine } from './RangeEngine';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type ListType = 'ul' | 'ol';

export class FormattingEngine {
  constructor(private readonly root: HTMLElement) {}

  bold(): boolean {
    return this.inline('strong');
  }

  italic(): boolean {
    return this.inline('em');
  }

  underline(): boolean {
    return this.inline('u');
  }

  align(alignment: TextAlignment): boolean {
    const range = new RangeEngine(this.root).getSelection();
    if (!range) return false;

    const element = this.findBlock(range.range.commonAncestorContainer);
    if (!element) return false;

    element.style.textAlign = alignment;
    return true;
  }

  setFontFamily(fontFamily: string): boolean {
    return this.inline('span', { style: `font-family: ${fontFamily};` });
  }

  setFontSize(size: string): boolean {
    return this.inline('span', { style: `font-size: ${size};` });
  }

  setColor(color: string): boolean {
    return this.inline('span', { style: `color: ${color};` });
  }

  insertList(type: ListType): boolean {
    const engine = new RangeEngine(this.root);
    const selection = engine.getSelection();
    if (!selection) return false;

    const list = document.createElement(type);
    const item = document.createElement('li');

    if (selection.collapsed) {
      item.appendChild(document.createElement('br'));
      list.appendChild(item);
      return engine.replaceSelection(list);
    }

    const fragment = selection.range.extractContents();
    item.appendChild(fragment);
    list.appendChild(item);
    selection.range.insertNode(list);
    return true;
  }

  toggleCase(upper: boolean): boolean {
    const engine = new RangeEngine(this.root);
    const selection = engine.getSelection();
    if (!selection || selection.collapsed) return false;

    const text = selection.range.toString();
    const replacement = document.createTextNode(upper ? text.toUpperCase() : text.toLowerCase());
    return engine.replaceSelection(replacement);
  }

  clearFormatting(): boolean {
    const engine = new RangeEngine(this.root);
    const selection = engine.getSelection();
    if (!selection || selection.collapsed) return false;

    return engine.replaceSelection(document.createTextNode(selection.range.toString()));
  }

  private inline(tagName: string, attributes: Record<string, string> = {}): boolean {
    return new RangeEngine(this.root).wrapSelection(tagName, attributes);
  }

  private findBlock(node: Node): HTMLElement | null {
    let current: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;

    while (current && current !== this.root) {
      if (current instanceof HTMLElement && /^(P|DIV|LI|H[1-6]|BLOCKQUOTE)$/.test(current.tagName)) {
        return current;
      }
      current = current.parentNode;
    }

    return null;
  }
}
