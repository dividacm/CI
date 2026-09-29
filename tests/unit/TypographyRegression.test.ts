import { describe, expect, it } from 'vitest';
import { FormattingEngine } from '../../src/editor/FormattingEngine';
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  isSupportedFontFamily,
  isSupportedFontSize,
} from '../../src/editor/TypographyModel';

function setup(): { root: HTMLElement; engine: FormattingEngine } {
  document.body.innerHTML = '';
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.innerHTML = '<p>Texto tipográfico</p>';
  document.body.appendChild(root);
  return { root, engine: new FormattingEngine(root) };
}

function selectContents(root: HTMLElement): void {
  const node = root.querySelector('p')?.firstChild;
  if (!node) throw new Error('Texto não encontrado.');
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

describe('Typography regression contract', () => {
  it('keeps the default font first in the catalog', () => {
    expect(FONT_FAMILY_OPTIONS[0]?.value).toBe('Carlito');
  });

  it('keeps the expanded size scale ordered', () => {
    const sizes = FONT_SIZE_OPTIONS.map((option) => Number.parseInt(option.value, 10));
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(sizes.at(-1)).toBe(36);
  });

  it('accepts only catalog typography values', () => {
    expect(isSupportedFontFamily('Carlito')).toBe(true);
    expect(isSupportedFontFamily('Invalid Font')).toBe(false);
    expect(isSupportedFontSize('24px')).toBe(true);
    expect(isSupportedFontSize('13px')).toBe(false);
  });

  it('applies a catalog font family to the selected text', () => {
    const { root, engine } = setup();
    selectContents(root);

    expect(engine.setFontFamily('Georgia')).toBe(true);

    const span = root.querySelector('span');
    expect(span?.style.fontFamily).toContain('Georgia');
    expect(span?.textContent).toBe('Texto tipográfico');
  });

  it('applies a catalog font size to the selected text', () => {
    const { root, engine } = setup();
    selectContents(root);

    expect(engine.setFontSize('24px')).toBe(true);

    const span = root.querySelector('span');
    expect(span?.style.fontSize).toBe('24px');
    expect(span?.textContent).toBe('Texto tipográfico');
  });
});
