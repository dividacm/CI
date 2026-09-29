import { describe, expect, it } from 'vitest';
import { TableInteractions } from '../../src/editor/TableInteractions';

function setup(): { root: HTMLElement; tables: TableInteractions } {
  document.body.innerHTML = '<div id="root"><table data-ci-table="true"><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table></div>';
  const root = document.querySelector<HTMLElement>('#root');
  if (!root) throw new Error('Raiz não encontrada.');
  const tables = new TableInteractions(root);
  tables.bind();
  const cell = root.querySelector<HTMLTableCellElement>('td');
  if (!cell) throw new Error('Célula não encontrada.');
  cell.click();
  return { root, tables };
}

describe('V2.3.2 table interactions', () => {
  it('selects the current row and column', () => {
    const { root, tables } = setup();
    expect(tables.selectRow()).toBe(true);
    expect(root.querySelectorAll('[data-ci-table-selected="row"]')).toHaveLength(2);
    expect(tables.selectColumn()).toBe(true);
    expect(root.querySelectorAll('[data-ci-table-selected="column"]')).toHaveLength(2);
  });

  it('inserts and deletes rows without losing other content', () => {
    const { root, tables } = setup();
    expect(tables.insertRow()).toBe(true);
    expect(root.querySelectorAll('tr')).toHaveLength(3);
    expect(tables.deleteRow()).toBe(true);
    expect(root.querySelectorAll('tr')).toHaveLength(2);
    expect(root.textContent).toContain('A');
    expect(root.textContent).toContain('D');
  });

  it('inserts and deletes columns', () => {
    const { root, tables } = setup();
    expect(tables.insertColumn()).toBe(true);
    expect(root.querySelectorAll('tr')[0]?.cells).toHaveLength(3);
    expect(tables.deleteColumn()).toBe(true);
    expect(root.querySelectorAll('tr')[0]?.cells).toHaveLength(2);
  });

  it('resizes the selected column within safe bounds', () => {
    const { root, tables } = setup();
    expect(tables.resizeSelectedColumn(24)).toBe(true);
    expect(root.querySelector('td')?.getAttribute('style')).toContain('width');
    expect(tables.resizeSelectedColumn(-1000)).toBe(true);
    expect(root.querySelector('td')?.getAttribute('style')).toContain('72px');
  });
});
