import { beforeEach, describe, expect, it } from 'vitest';
import { Editor } from '../../src/editor/Editor';

function createEditor(initialHtml = '<p>Texto</p>'): { root: HTMLElement; editor: Editor } {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.innerHTML = initialHtml;
  document.body.appendChild(root);
  return { root, editor: new Editor(root) };
}

describe('Editor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('desfaz e refaz uma operação de formatação', () => {
    const { root, editor } = createEditor('<p>Texto</p>');
    const text = root.querySelector('p')?.firstChild;
    if (!text) throw new Error('Texto de teste não encontrado.');

    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(editor.bold()).toBe(true);
    expect(root.innerHTML).toContain('<strong>Texto</strong>');

    expect(editor.undo()).toBe(true);
    expect(root.innerHTML).toBe('<p>Texto</p>');

    expect(editor.redo()).toBe(true);
    expect(root.innerHTML).toContain('<strong>Texto</strong>');
  });

  it('desfaz uma edição manual registrada por beforeinput', () => {
    const { root, editor } = createEditor('<p>A</p>');

    root.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText' }));
    root.innerHTML = '<p>AB</p>';

    expect(editor.undo()).toBe(true);
    expect(root.innerHTML).toBe('<p>A</p>');
  });
});
