import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '../../src/editor/Editor';

function createEditor(initialHtml = '<p>Texto</p>'): { root: HTMLElement; editor: Editor } {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.innerHTML = initialHtml;
  document.body.appendChild(root);
  return { root, editor: new Editor(root) };
}

function selectContents(root: HTMLElement) {
  const text = root.querySelector('p')?.firstChild;
  if (!text) throw new Error('Texto de teste não encontrado.');
  const range = document.createRange();
  range.selectNodeContents(text);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function key(root: HTMLElement, keyValue: string, options: Partial<KeyboardEventInit> = {}) {
  root.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    key: keyValue,
    code: keyValue.length === 1 ? `Key${keyValue.toUpperCase()}` : keyValue,
    ctrlKey: true,
    ...options,
  }));
}

describe('Editor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.getSelection()?.removeAllRanges();
  });

  it('desfaz e refaz uma operação de formatação', () => {
    const { root, editor } = createEditor();
    selectContents(root);
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

  it('lê e substitui o HTML e permite configurar o callback de salvar', () => {
    const { root, editor } = createEditor();
    const save = vi.fn();
    expect(editor.getHtml()).toBe('<p>Texto</p>');
    editor.setHtml('<p>Novo</p>');
    expect(editor.getHtml()).toBe('<p>Novo</p>');
    editor.setSaveHandler(save);
    key(root, 's');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('aplica as operações de formatação expostas pelo editor', () => {
    const operations = [
      (editor: Editor) => editor.italic(),
      (editor: Editor) => editor.underline(),
      (editor: Editor) => editor.fontFamily('Carlito'),
      (editor: Editor) => editor.fontSize('16px'),
      (editor: Editor) => editor.color('#123456'),
    ];
    for (const operation of operations) {
      const { root, editor } = createEditor();
      selectContents(root);
      expect(operation(editor)).toBe(true);
    }

    const { root: alignedRoot, editor: alignedEditor } = createEditor();
    selectContents(alignedRoot);
    expect(alignedEditor.align('center')).toBe(true);
    expect(alignedRoot.querySelector('p')?.style.textAlign).toBe('center');

    const { root: listRoot, editor: listEditor } = createEditor();
    selectContents(listRoot);
    expect(listEditor.list('ul')).toBe(true);
    expect(listRoot.querySelector('ul')).not.toBeNull();

    const { root: upperRoot, editor: upperEditor } = createEditor();
    selectContents(upperRoot);
    expect(upperEditor.toggleCase(true)).toBe(true);
    expect(upperRoot.textContent).toBe('TEXTO');

    const { root: clearRoot, editor: clearEditor } = createEditor('<p><strong>Texto</strong></p>');
    selectContents(clearRoot);
    expect(clearEditor.clearFormatting()).toBe(true);
    expect(clearRoot.textContent).toBe('Texto');
  });

  it('retorna false quando a operação exige seleção e ela não existe', () => {
    const { editor } = createEditor();
    expect(editor.bold()).toBe(false);
    expect(editor.italic()).toBe(false);
    expect(editor.underline()).toBe(false);
    expect(editor.fontFamily('Carlito')).toBe(false);
    expect(editor.fontSize('16px')).toBe(false);
    expect(editor.color('#123')).toBe(false);
    expect(editor.toggleCase(true)).toBe(false);
    expect(editor.clearFormatting()).toBe(false);
  });

  it('trata atalhos de alinhamento, lista e edição', () => {
    const { root, editor } = createEditor();
    selectContents(root);
    key(root, 'i');
    expect(root.querySelector('em')).not.toBeNull();

    editor.setHtml('<p>Texto</p>');
    selectContents(root);
    key(root, 'e');
    expect(root.querySelector('p')?.style.textAlign).toBe('center');

    editor.setHtml('<p>Texto</p>');
    selectContents(root);
    root.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: '7', code: 'Digit7', ctrlKey: true, shiftKey: true }));
    expect(root.querySelector('ol')).not.toBeNull();

    editor.setHtml('<p>Texto</p>');
    selectContents(root);
    root.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: '8', code: 'Digit8', ctrlKey: true, shiftKey: true }));
    expect(root.querySelector('ul')).not.toBeNull();
  });

  it('ignora atalhos modificados por Alt e teclas não suportadas', () => {
    const { root } = createEditor();
    root.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'b', ctrlKey: true, altKey: true }));
    expect(root.innerHTML).toBe('<p>Texto</p>');
    root.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'q', ctrlKey: true }));
    expect(root.innerHTML).toBe('<p>Texto</p>');
  });

  it('notifica mudanças por input e shortcuts de undo/redo', () => {
    const { root, editor } = createEditor();
    const input = vi.fn();
    root.addEventListener('input', input);

    selectContents(root);
    editor.bold();
    expect(input).not.toHaveBeenCalled();

    key(root, 'z');
    expect(root.innerHTML).toBe('<p>Texto</p>');
    expect(input).toHaveBeenCalled();

    key(root, 'y');
    expect(root.innerHTML).toContain('<strong>Texto</strong>');

    key(root, 'z', { shiftKey: true });
    expect(root.innerHTML).toContain('<strong>Texto</strong>');
  });
});
