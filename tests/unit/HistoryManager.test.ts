import { describe, expect, it } from 'vitest';
import { HistoryManager } from '../../src/editor/HistoryManager';

describe('HistoryManager', () => {
  it('desfaz e refaz estados na ordem correta', () => {
    const editor = document.createElement('div');
    const history = new HistoryManager();

    editor.innerHTML = '<p>A</p>';
    history.capture(editor);
    editor.innerHTML = '<p>B</p>';
    history.captureSnapshot('<p>A</p>');
    editor.innerHTML = '<p>C</p>';
    history.captureSnapshot('<p>B</p>');

    expect(history.undo(editor)).toBe(true);
    expect(editor.innerHTML).toBe('<p>B</p>');
    expect(history.undo(editor)).toBe(true);
    expect(editor.innerHTML).toBe('<p>A</p>');
    expect(history.redo(editor)).toBe(true);
    expect(editor.innerHTML).toBe('<p>B</p>');
  });

  it('retorna false quando não há undo ou redo disponível e clear limpa as pilhas', () => {
    const editor = document.createElement('div');
    const history = new HistoryManager();
    expect(history.undo(editor)).toBe(false);
    expect(history.redo(editor)).toBe(false);
    history.captureSnapshot('A');
    history.clear();
    expect(history.undo(editor)).toBe(false);
    expect(history.redo(editor)).toBe(false);
  });

  it('descarta o redo quando um novo estado é capturado', () => {
    const editor = document.createElement('div');
    const history = new HistoryManager();

    history.captureSnapshot('<p>A</p>');
    editor.innerHTML = '<p>B</p>';
    history.captureSnapshot('<p>B</p>');

    expect(history.undo(editor)).toBe(true);
    expect(editor.innerHTML).toBe('<p>B</p>');

    history.captureSnapshot('<p>C</p>');
    expect(history.redo(editor)).toBe(false);
  });

  it('mantém no máximo a quantidade configurada de estados', () => {
    const editor = document.createElement('div');
    const history = new HistoryManager(2);

    history.captureSnapshot('A');
    history.captureSnapshot('B');
    history.captureSnapshot('C');
    editor.innerHTML = 'C';

    expect(history.undo(editor)).toBe(true);
    expect(editor.innerHTML).toBe('C');
    expect(history.undo(editor)).toBe(true);
    expect(editor.innerHTML).toBe('B');
    expect(history.undo(editor)).toBe(false);
  });

  it('rejeita limite inválido', () => {
    expect(() => new HistoryManager(0)).toThrow();
    expect(() => new HistoryManager(1.5)).toThrow();
  });
});
