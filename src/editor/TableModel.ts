export interface TableCell {
  content: string;
}

export interface TableModel {
  rows: number;
  columns: number;
  cells: TableCell[][];
}

export function createTableModel(rows: number, columns: number, initialContent = ''): TableModel {
  const normalizedRows = normalizeDimension(rows, 'linhas');
  const normalizedColumns = normalizeDimension(columns, 'colunas');

  return {
    rows: normalizedRows,
    columns: normalizedColumns,
    cells: Array.from({ length: normalizedRows }, () =>
      Array.from({ length: normalizedColumns }, () => ({ content: initialContent })),
    ),
  };
}

export function getTableCell(table: TableModel, row: number, column: number): TableCell {
  if (!Number.isInteger(row) || row < 0 || row >= table.rows) {
    throw new RangeError('Linha da tabela fora dos limites.');
  }
  if (!Number.isInteger(column) || column < 0 || column >= table.columns) {
    throw new RangeError('Coluna da tabela fora dos limites.');
  }

  const cell = table.cells[row]?.[column];
  if (!cell) throw new RangeError('Célula da tabela não encontrada.');
  return cell;
}

export function setTableCellContent(table: TableModel, row: number, column: number, content: string): TableModel {
  const next = cloneTable(table);
  const rowCells = next.cells[row];
  if (!rowCells) throw new RangeError('Linha da tabela não encontrada.');
  rowCells[column] = { content };
  return next;
}

export function resizeTable(table: TableModel, rows: number, columns: number): TableModel {
  const normalizedRows = normalizeDimension(rows, 'linhas');
  const normalizedColumns = normalizeDimension(columns, 'colunas');
  const next = createTableModel(normalizedRows, normalizedColumns);

  for (let row = 0; row < Math.min(table.rows, normalizedRows); row += 1) {
    const sourceRow = table.cells[row];
    const targetRow = next.cells[row];
    if (!sourceRow || !targetRow) continue;

    for (let column = 0; column < Math.min(table.columns, normalizedColumns); column += 1) {
      const sourceCell = sourceRow[column];
      if (sourceCell) targetRow[column] = { ...sourceCell };
    }
  }

  return next;
}

function cloneTable(table: TableModel): TableModel {
  return {
    rows: table.rows,
    columns: table.columns,
    cells: table.cells.map((row) => row.map((cell) => ({ ...cell }))),
  };
}

function normalizeDimension(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError('A quantidade de ' + label + ' deve ser um inteiro maior que zero.');
  }
  return value;
}
