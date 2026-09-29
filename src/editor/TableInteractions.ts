export type TableSelectionMode = 'cell' | 'row' | 'column';

export class TableInteractions {
  private selectedCell: HTMLTableCellElement | null = null;
  private selectionMode: TableSelectionMode = 'cell';

  constructor(private readonly root: HTMLElement) {}

  bind(): void {
    this.root.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLTableCellElement)) return;
      if (!target.closest('table[data-ci-table]')) return;
      this.selectedCell = target;
      this.selectionMode = 'cell';
      this.renderSelection();
    });
  }

  selectRow(): boolean {
    const cell = this.selectedCell;
    const row = cell?.closest('tr');
    if (!row) return false;
    this.selectionMode = 'row';
    this.renderSelection();
    return true;
  }

  selectColumn(): boolean {
    const cell = this.selectedCell;
    const table = cell?.closest('table[data-ci-table]');
    if (!cell || !table) return false;
    this.selectionMode = 'column';
    this.renderSelection();
    return true;
  }

  insertRow(): boolean {
    const cell = this.selectedCell;
    const row = cell?.closest('tr');
    if (!row) return false;
    const table = row.closest('table[data-ci-table]');
    if (!table) return false;
    const next = row.cloneNode(true) as HTMLTableRowElement;
    next.querySelectorAll('td').forEach((item) => { item.textContent = ''; });
    row.after(next);
    this.selectedCell = next.cells[0] ?? null;
    this.selectionMode = 'cell';
    this.renderSelection();
    return true;
  }

  deleteRow(): boolean {
    const row = this.selectedCell?.closest('tr');
    const table = row?.closest('table[data-ci-table]');
    if (!row || !table || table.rows.length <= 1) return false;
    const rowIndex = row.rowIndex;
    row.remove();
    const fallbackRow = table.rows[Math.min(rowIndex, table.rows.length - 1)];
    this.selectedCell = fallbackRow?.cells[0] ?? null;
    this.selectionMode = 'cell';
    this.renderSelection();
    return true;
  }

  insertColumn(): boolean {
    const cell = this.selectedCell;
    const table = cell?.closest('table[data-ci-table]');
    if (!cell || !table) return false;
    const columnIndex = cell.cellIndex + 1;
    Array.from(table.rows).forEach((row) => row.insertCell(columnIndex));
    this.selectedCell = table.rows[0]?.cells[Math.min(columnIndex, (table.rows[0]?.cells.length ?? 1) - 1)] ?? null;
    this.selectionMode = 'cell';
    this.renderSelection();
    return true;
  }

  deleteColumn(): boolean {
    const cell = this.selectedCell;
    const table = cell?.closest('table[data-ci-table]');
    if (!cell || !table || (table.rows[0]?.cells.length ?? 0) <= 1) return false;
    const columnIndex = cell.cellIndex;
    Array.from(table.rows).forEach((row) => row.deleteCell(columnIndex));
    const firstRow = table.rows[0];
    this.selectedCell = firstRow?.cells[Math.min(columnIndex, firstRow.cells.length - 1)] ?? null;
    this.selectionMode = 'cell';
    this.renderSelection();
    return true;
  }

  resizeSelectedColumn(deltaPx: number): boolean {
    const cell = this.selectedCell;
    const table = cell?.closest('table[data-ci-table]');
    if (!cell || !table || !Number.isFinite(deltaPx) || deltaPx === 0) return false;
    const currentWidth = cell.getBoundingClientRect().width || 72;
    const nextWidth = Math.max(72, Math.min(420, currentWidth + deltaPx));
    Array.from(table.rows).forEach((row) => {
      const target = row.cells[cell.cellIndex];
      if (target) target.style.width = `${Math.round(nextWidth)}px`;
    });
    return true;
  }

  private renderSelection(): void {
    this.root.querySelectorAll<HTMLElement>('[data-ci-table-selected]').forEach((item) => {
      item.removeAttribute('data-ci-table-selected');
    });

    const cell = this.selectedCell;
    const table = cell?.closest('table[data-ci-table]');
    if (!cell || !table) return;

    if (this.selectionMode === 'cell') {
      cell.setAttribute('data-ci-table-selected', 'cell');
      return;
    }

    if (this.selectionMode === 'row') {
      const row = cell.closest('tr');
      row?.querySelectorAll<HTMLElement>('td').forEach((item) => item.setAttribute('data-ci-table-selected', 'row'));
      return;
    }

    const index = cell.cellIndex;
    Array.from(table.rows).forEach((row) => {
      const target = row.cells[index];
      if (target) target.setAttribute('data-ci-table-selected', 'column');
    });
  }
}
