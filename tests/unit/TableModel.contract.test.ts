import { describe, expect, it } from 'vitest';
import { createTableModel, getTableCell, resizeTable, setTableCellContent } from '../../src/editor/TableModel';

describe('Table model contract', () => {
  it('creates a deterministic rectangular table', () => {
    const table = createTableModel(2, 3, '');

    expect(table.rows).toBe(2);
    expect(table.columns).toBe(3);
    expect(table.cells).toHaveLength(2);
    expect(table.cells.every((row) => row.length === 3)).toBe(true);
  });

  it('preserves cell content when resizing up', () => {
    const table = setTableCellContent(createTableModel(2, 2), 1, 1, 'Valor');
    const resized = resizeTable(table, 3, 4);

    expect(getTableCell(resized, 1, 1).content).toBe('Valor');
    expect(getTableCell(resized, 2, 3).content).toBe('');
  });

  it('truncates cells when resizing down', () => {
    const table = setTableCellContent(createTableModel(3, 3), 2, 2, 'Remover');
    const resized = resizeTable(table, 2, 2);

    expect(resized.rows).toBe(2);
    expect(resized.columns).toBe(2);
    expect(() => getTableCell(resized, 2, 2)).toThrow(RangeError);
  });

  it('does not mutate the original table when updating a cell', () => {
    const table = createTableModel(1, 1);
    const next = setTableCellContent(table, 0, 0, 'Novo');

    expect(getTableCell(table, 0, 0).content).toBe('');
    expect(getTableCell(next, 0, 0).content).toBe('Novo');
  });

  it('rejects invalid dimensions and coordinates', () => {
    expect(() => createTableModel(0, 2)).toThrow(RangeError);
    expect(() => createTableModel(2.5, 2)).toThrow(RangeError);

    const table = createTableModel(2, 2);
    expect(() => getTableCell(table, -1, 0)).toThrow(RangeError);
    expect(() => getTableCell(table, 0, 2)).toThrow(RangeError);
  });
});
