import { describe, expect, it } from 'vitest';
import { setActivePreviewPage } from '../../src/app/AppView';

function createPreview(pageCount: number): { paper: HTMLElement; column: HTMLElement } {
  const column = document.createElement('div');
  column.innerHTML =
    '<div class="preview-controls"><button data-action="page-prev"></button><output id="page-indicator"></output><button data-action="page-next"></button></div><div class="preview-wrap"></div>';
  const paper = document.createElement('div');
  paper.id = 'paper';
  paper.className = 'paper';
  for (let index = 0; index < pageCount; index += 1) {
    const page = document.createElement('section');
    page.className = 'paper-page';
    paper.appendChild(page);
  }
  column.querySelector('.preview-wrap')?.appendChild(paper);
  document.body.appendChild(column);
  return { paper, column };
}

describe('multi-page preview navigation', () => {
  it('tracks the active page and updates navigation controls', () => {
    const { paper, column } = createPreview(3);

    setActivePreviewPage(paper, 2);

    expect(paper.dataset.activePage).toBe('2');
    expect(paper.querySelectorAll('.paper-page[data-active="true"]')).toHaveLength(1);
    expect(paper.querySelector<HTMLElement>('.paper-page[data-page-number="2"]')?.getAttribute('aria-current')).toBe('page');
    expect(column.querySelector<HTMLOutputElement>('#page-indicator')?.textContent).toBe('Página 2 de 3');
    expect(column.querySelector<HTMLButtonElement>('[data-action="page-prev"]')?.disabled).toBe(false);
    expect(column.querySelector<HTMLButtonElement>('[data-action="page-next"]')?.disabled).toBe(false);
  });

  it('clamps navigation to the first and last page', () => {
    const { paper, column } = createPreview(2);

    setActivePreviewPage(paper, 0);
    expect(paper.dataset.activePage).toBe('1');
    expect(column.querySelector<HTMLButtonElement>('[data-action="page-prev"]')?.disabled).toBe(true);

    setActivePreviewPage(paper, 99);
    expect(paper.dataset.activePage).toBe('2');
    expect(column.querySelector<HTMLButtonElement>('[data-action="page-next"]')?.disabled).toBe(true);
  });
});
