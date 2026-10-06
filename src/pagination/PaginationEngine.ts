import type { PageLayoutConfig } from '../types/configuration';

export interface PaginationOptions {
  layout: PageLayoutConfig;
  header?: string;
  footer?: string;
}

export function appendBodyAcrossPages(
  root: HTMLElement,
  pages: HTMLElement[],
  current: HTMLElement,
  html: string,
  options: PaginationOptions,
): void {
  const holder = root.ownerDocument.createElement('div');
  holder.innerHTML = html || '<p><br></p>';

  for (const source of Array.from(holder.childNodes)) {
    const node =
      source.nodeType === Node.ELEMENT_NODE
        ? (source.cloneNode(true) as HTMLElement)
        : wrapTextNode(source, root.ownerDocument);
    if (!node) continue;
    current = appendNodeAcrossPages(root, pages, current, node, options);
  }
}

function wrapTextNode(source: Node, ownerDocument: Document): HTMLElement | null {
  const text = source.textContent ?? '';
  if (!text.trim()) return null;
  const paragraph = ownerDocument.createElement('p');
  paragraph.textContent = text;
  return paragraph;
}

function appendNodeAcrossPages(
  root: HTMLElement,
  pages: HTMLElement[],
  current: HTMLElement,
  node: HTMLElement,
  options: PaginationOptions,
): HTMLElement {
  current.appendChild(node);
  if (!isOverflowing(current)) return current;

  current.removeChild(node);
  return appendSplittableBlockAcrossPages(root, pages, current, node, options);
}

function appendSplittableBlockAcrossPages(
  root: HTMLElement,
  pages: HTMLElement[],
  current: HTMLElement,
  node: HTMLElement,
  options: PaginationOptions,
): HTMLElement {
  if (node.tagName === 'UL' || node.tagName === 'OL') {
    return appendListAcrossPages(root, pages, current, node, options);
  }

  const totalTextLength = node.textContent?.length ?? 0;
  if (!totalTextLength || !canSplitTextBlock(node)) {
    if (current.childElementCount > 0) {
      current = getPageContent(createPage(root, options, pages));
    }
    current.appendChild(node);
    return current;
  }

  let low = 1;
  let high = totalTextLength;
  let best = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = cloneTextRange(node, 0, middle);
    if (!candidate) {
      low = middle + 1;
      continue;
    }

    current.appendChild(candidate);
    const overflowing = isOverflowing(current);
    current.removeChild(candidate);

    if (overflowing) high = middle - 1;
    else {
      best = middle;
      low = middle + 1;
    }
  }

  best = findPreferredBreak(node, best);

  if (best <= 0) {
    if (current.childElementCount > 0) {
      current = getPageContent(createPage(root, options, pages));
    }
    current.appendChild(node);
    return current;
  }

  const firstPart = cloneTextRange(node, 0, best);
  const remainder = cloneTextRange(node, best, totalTextLength);
  if (!firstPart) {
    current = getPageContent(createPage(root, options, pages));
    current.appendChild(node);
    return current;
  }

  current.appendChild(firstPart);
  if (!remainder || !(remainder.textContent ?? '').trim()) return current;

  current = getPageContent(createPage(root, options, pages));
  current.appendChild(remainder);
  if (isOverflowing(current)) {
    return appendSplittableBlockAcrossPages(root, pages, current, remainder as HTMLElement, options);
  }
  return current;
}

function canSplitTextBlock(node: HTMLElement): boolean {
  return !['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'UL', 'OL'].includes(node.tagName);
}

function appendListAcrossPages(
  root: HTMLElement,
  pages: HTMLElement[],
  current: HTMLElement,
  list: HTMLElement,
  options: PaginationOptions,
): HTMLElement {
  const items = Array.from(list.children);
  if (!items.length) {
    if (current.childElementCount > 0) current = getPageContent(createPage(root, options, pages));
    current.appendChild(list);
    return current;
  }

  const listPage = (): HTMLElement => {
    const pageList = list.cloneNode(false) as HTMLElement;
    current.appendChild(pageList);
    return pageList;
  };

  let target = listPage();
  for (const item of items) {
    const clone = item.cloneNode(true) as HTMLElement;
    target.appendChild(clone);

    if (!isOverflowing(current)) continue;

    target.removeChild(clone);
    if (target.childElementCount === 0) {
      current.removeChild(target);
      current.appendChild(clone);
      if (isOverflowing(current)) {
        current.removeChild(clone);
        current = getPageContent(createPage(root, options, pages));
        target = listPage();
        target.appendChild(clone);
      }
      continue;
    }

    current = getPageContent(createPage(root, options, pages));
    target = listPage();
    target.appendChild(clone);
  }

  return current;
}

export function cloneTextRange(node: Node, start: number, end: number): Node | null {
  const textLength = node.textContent?.length ?? 0;
  if (end <= 0 || start >= textLength || start >= end) return null;

  let offset = 0;

  const cloneRange = (source: Node): Node | null => {
    if (source.nodeType === Node.TEXT_NODE) {
      const value = source.textContent ?? '';
      const nodeStart = offset;
      const nodeEnd = offset + value.length;
      offset = nodeEnd;
      const overlapStart = Math.max(start, nodeStart) - nodeStart;
      const overlapEnd = Math.min(end, nodeEnd) - nodeStart;
      if (overlapStart >= overlapEnd) return null;
      const ownerDocument = source.ownerDocument;
      if (!ownerDocument) throw new Error('Documento do nó de texto não encontrado.');
      return ownerDocument.createTextNode(value.slice(overlapStart, overlapEnd));
    }

    if (source.nodeType !== Node.ELEMENT_NODE) return null;

    const element = source as HTMLElement;
    const clone = element.cloneNode(false) as HTMLElement;
    if (element.tagName === 'BR') return clone;

    for (const child of Array.from(element.childNodes)) {
      const childClone = cloneRange(child);
      if (childClone) clone.appendChild(childClone);
    }
    return clone.childNodes.length ? clone : null;
  };

  return cloneRange(node);
}

export function findPreferredBreak(node: HTMLElement, best: number): number {
  if (best <= 0) return 0;
  const text = node.textContent ?? '';
  const windowStart = Math.max(0, best - 80);
  const segment = text.slice(windowStart, best);
  const breakOffset = Math.max(segment.lastIndexOf(' '), segment.lastIndexOf('\n'), segment.lastIndexOf('\t'));
  if (breakOffset < 0) return best;
  const preferred = windowStart + breakOffset + 1;
  return preferred > 0 && preferred <= best ? preferred : best;
}

export function createPage(
  root: HTMLElement,
  options: PaginationOptions,
  pages: HTMLElement[],
): HTMLElement {
  const page = root.ownerDocument.createElement('section');
  page.className = 'paper-page';
  const { layout, header, footer } = options;
  page.innerHTML = `<div class="paper-header">${header ? `<img src="${escapeHtml(header)}" alt="Cabeçalho">` : ''}</div><div class="paper-page-content" style="padding:${layout.marginTopMm}mm ${layout.marginRightMm}mm ${layout.marginBottomMm}mm ${layout.marginLeftMm}mm"></div><div class="paper-footer">${footer ? `<img src="${escapeHtml(footer)}" alt="Rodapé">` : ''}</div>`;
  root.appendChild(page);
  pages.push(page);
  return page;
}

function getPageContent(page: HTMLElement): HTMLElement {
  const content = page.querySelector<HTMLElement>('.paper-page-content');
  if (!content) throw new Error('Área de conteúdo da página não encontrada.');
  return content;
}

export function isOverflowing(content: HTMLElement): boolean {
  return content.scrollHeight > content.clientHeight;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });
}
