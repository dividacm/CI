import { RangeEngine } from './RangeEngine';
import { createTableModel } from './TableModel';

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

  insertTable(rows = 2, columns = 3): boolean {
    const engine = new RangeEngine(this.root);
    if (!engine.getSelection()) return false;

    const model = createTableModel(rows, columns);
    const table = document.createElement('table');
    table.setAttribute('data-ci-table', 'true');

    const body = document.createElement('tbody');
    for (let row = 0; row < model.rows; row += 1) {
      const tr = document.createElement('tr');
      for (let column = 0; column < model.columns; column += 1) {
        const cell = document.createElement('td');
        cell.textContent = model.cells[row]?.[column]?.content ?? '';
        tr.appendChild(cell);
      }
      body.appendChild(tr);
    }

    table.appendChild(body);
    return engine.replaceSelection(table);
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
