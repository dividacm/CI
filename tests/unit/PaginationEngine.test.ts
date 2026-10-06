import { describe, expect, it } from 'vitest';
import {
  appendBodyAcrossPages,
  cloneTextRange,
  createPage,
  findPreferredBreak,
  isOverflowing,
} from '../../src/pagination/PaginationEngine';

const layout = {
  marginTopMm: 10,
  marginRightMm: 10,
  marginBottomMm: 10,
  marginLeftMm: 10,
};

function setOverflowModel(content: HTMLElement): void {
  Object.defineProperty(content, 'clientHeight', {
    configurable: true,
    value: 20,
  });
  Object.defineProperty(content, 'scrollHeight', {
    configurable: true,
    get: () => (content.textContent?.length ?? 0) > 12 ? 30 : 10,
  });
}

describe('PaginationEngine', () => {
  it('creates an A4 page with configured header, footer and margins', () => {
    const root = document.createElement('div');
    const pages: HTMLElement[] = [];

    const page = createPage(root, {
      layout,
      header: '/cab.png',
      footer: '/rodape.png',
    }, pages);

    expect(page.className).toBe('paper-page');
    expect(pages).toHaveLength(1);
    expect(page.querySelector('.paper-header img')?.getAttribute('src')).toBe('/cab.png');
    expect(page.querySelector('.paper-footer img')?.getAttribute('src')).toBe('/rodape.png');
    expect(page.querySelector('.paper-page-content')?.getAttribute('style')).toContain('10mm');
  });

  it('repeats the configured header and footer on every generated page', () => {
    const root = document.createElement('div');
    const pages: HTMLElement[] = [];

    for (let index = 0; index < 3; index += 1) {
      createPage(root, {
        layout,
        header: '/cab.png',
        footer: '/rodape.png',
      }, pages);
    }

    expect(pages).toHaveLength(3);
    for (const page of pages) {
      expect(page.querySelector('.paper-header img')?.getAttribute('src')).toBe('/cab.png');
      expect(page.querySelector('.paper-footer img')?.getAttribute('src')).toBe('/rodape.png');
      expect(page.querySelector('.paper-page-content')?.getAttribute('style')).toBe(
        'padding: 10mm 10mm 10mm 10mm;',
      );
    }
  });

  it('creates pages without optional assets', () => {
    const root = document.createElement('div');
    const pages: HTMLElement[] = [];
    const page = createPage(root, { layout }, pages);

    expect(page.querySelector('.paper-header img')).toBeNull();
    expect(page.querySelector('.paper-footer img')).toBeNull();
  });

  it('clones only the requested text range while preserving inline markup', () => {
    const source = document.createElement('p');
    source.innerHTML = '<strong>Olá mundo</strong> novamente';

    const clone = cloneTextRange(source, 0, 8) as HTMLElement;

    expect(clone.textContent).toBe('Olá mund');
    expect(clone.querySelector('strong')?.textContent).toBe('Olá mund');
  });

  it('returns the preferred whitespace break when available', () => {
    const node = document.createElement('p');
    node.textContent = 'Texto com uma quebra preferida aqui';

    const best = 18;
    const result = findPreferredBreak(node, best);

    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(best);
    expect(node.textContent?.slice(0, result).endsWith(' ')).toBe(true);
  });

  it('keeps the binary-search boundary when no whitespace is available', () => {
    const node = document.createElement('p');
    node.textContent = 'abcdefghijklmnop';

    expect(findPreferredBreak(node, 8)).toBe(8);
    expect(findPreferredBreak(node, 0)).toBe(0);
  });

  it('detects overflow from rendered dimensions', () => {
    const content = document.createElement('div');
    setOverflowModel(content);

    content.textContent = 'short';
    expect(isOverflowing(content)).toBe(false);

    content.textContent = 'this content overflows';
    expect(isOverflowing(content)).toBe(true);
  });

  it('keeps content on one page when it fits', () => {
    const root = document.createElement('div');
    const pages: HTMLElement[] = [];
    const first = createPage(root, { layout }, pages);
    const content = first.querySelector<HTMLElement>('.paper-page-content')!;
    setOverflowModel(content);

    appendBodyAcrossPages(root, pages, content, '<p>Texto curto</p>', { layout });

    expect(pages).toHaveLength(1);
    expect(content.textContent).toBe('Texto curto');
  });

  it('splits long text into additional pages', () => {
    const root = document.createElement('div');
    const pages: HTMLElement[] = [];
    const first = createPage(root, { layout }, pages);
    const content = first.querySelector<HTMLElement>('.paper-page-content')!;
    setOverflowModel(content);

    appendBodyAcrossPages(
      root,
      pages,
      content,
      '<p>Texto muito longo para demonstrar a quebra entre páginas do documento.</p>',
      { layout },
    );

    expect(pages.length).toBeGreaterThan(1);
    expect(pages.map((page) => page.textContent).join('')).toContain('Texto muito longo');
  });

  it('splits list items across pages without dropping items', () => {
    const root = document.createElement('div');
    const pages: HTMLElement[] = [];
    const first = createPage(root, { layout }, pages);
    const content = first.querySelector<HTMLElement>('.paper-page-content')!;
    setOverflowModel(content);

    appendBodyAcrossPages(
      root,
      pages,
      content,
      '<ul><li>Primeiro item</li><li>Segundo item</li><li>Terceiro item</li></ul>',
      { layout },
    );

    expect(pages.length).toBeGreaterThan(1);
    const text = pages.map((page) => page.textContent).join(' ');
    expect(text).toContain('Primeiro item');
    expect(text).toContain('Segundo item');
    expect(text).toContain('Terceiro item');
  });

  it('moves non-splittable tables to a new page when needed', () => {
    const root = document.createElement('div');
    const pages: HTMLElement[] = [];
    const first = createPage(root, { layout }, pages);
    const content = first.querySelector<HTMLElement>('.paper-page-content')!;
    setOverflowModel(content);
    content.innerHTML = '<p>conteúdo existente</p>';

    appendBodyAcrossPages(
      root,
      pages,
      content,
      '<table><tbody><tr><td>Tabela</td></tr></tbody></table>',
      { layout },
    );

    expect(pages.length).toBe(2);
    expect(pages[1]?.querySelector('table td')?.textContent).toBe('Tabela');
  });
});
