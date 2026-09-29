import { describe, expect, it } from 'vitest';
import { FormattingEngine } from '../../src/editor/FormattingEngine';
import { sanitizeHtml } from '../../src/security/sanitizer';

function setup(): { root: HTMLElement; engine: FormattingEngine } {
  document.body.innerHTML = '';
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.innerHTML = '<p>Texto</p>';
  document.body.appendChild(root);

  const paragraph = root.querySelector('p');
  if (!paragraph) throw new Error('Parágrafo não encontrado.');

  const range = document.createRange();
  range.selectNodeContents(paragraph);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  return { root, engine: new FormattingEngine(root) };
}

describe('V2.3.1 table insertion', () => {
  it('inserts a deterministic 2x3 table at the current selection', () => {
    const { root, engine } = setup();

    expect(engine.insertTable(2, 3)).toBe(true);
    expect(root.querySelector('table[data-ci-table]')).not.toBeNull();
    expect(root.querySelectorAll('tr')).toHaveLength(2);
    expect(root.querySelectorAll('td')).toHaveLength(6);
  });

  it('sanitizes table structure while removing unsupported attributes', () => {
    const html = '<table data-ci-table="true" onclick="alert(1)"><tbody><tr><td>Valor</td></tr></tbody></table>';
    const sanitized = sanitizeHtml(html);

    expect(sanitized).toContain('<table data-ci-table="true">');
    expect(sanitized).toContain('<td>Valor</td>');
    expect(sanitized).not.toContain('onclick');
  });

  it('keeps table cell text editable after insertion', () => {
    const { root, engine } = setup();

    expect(engine.insertTable(1, 2)).toBe(true);
    const cell = root.querySelector('td');
    if (!cell) throw new Error('Célula não encontrada.');

    cell.textContent = 'Novo valor';
    expect(cell.textContent).toBe('Novo valor');
  });
});
