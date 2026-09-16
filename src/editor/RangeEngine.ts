export interface SelectionSnapshot {
  range: Range;
  collapsed: boolean;
}

export class RangeEngine {
  constructor(private readonly root: HTMLElement) {}

  getSelection(): SelectionSnapshot | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!this.root.contains(range.commonAncestorContainer)) return null;

    return { range, collapsed: range.collapsed };
  }

  restore(snapshot: Range): void {
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(snapshot);
  }

  replaceSelection(node: Node): boolean {
    const snapshot = this.getSelection();
    if (!snapshot) return false;

    const { range } = snapshot;
    range.deleteContents();
    range.insertNode(node);

    const nextRange = document.createRange();
    nextRange.selectNodeContents(node);
    nextRange.collapse(false);
    this.restore(nextRange);
    return true;
  }

  wrapSelection(tagName: string, attributes: Record<string, string> = {}): boolean {
    const snapshot = this.getSelection();
    if (!snapshot || snapshot.collapsed) return false;

    const { range } = snapshot;
    const wrapper = document.createElement(tagName);

    for (const [name, value] of Object.entries(attributes)) {
      wrapper.setAttribute(name, value);
    }

    try {
      range.surroundContents(wrapper);
    } catch {
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
    }

    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    nextRange.collapse(false);
    this.restore(nextRange);
    return true;
  }
}
