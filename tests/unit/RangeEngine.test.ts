import { beforeEach, describe, expect, it } from 'vitest';
import { RangeEngine } from '../../src/editor/RangeEngine';

describe('RangeEngine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.getSelection()?.removeAllRanges();
  });

  function setup(html = '<p>Texto</p>') {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.appendChild(root);
    return root;
  }

  function selectContents(node: Node, collapse = false) {
    const range = document.createRange();
    range.selectNodeContents(node);
    if (collapse) range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  it('retorna null sem seleção ou fora da raiz', () => {
    const root = setup();
    const engine = new RangeEngine(root);
    expect(engine.getSelection()).toBeNull();

    const outside = document.createElement('p');
    outside.textContent = 'Fora';
    document.body.appendChild(outside);
    selectContents(outside);
    expect(engine.getSelection()).toBeNull();
  });

  it('substitui a seleção e posiciona o cursor ao final do novo nó', () => {
    const root = setup();
    const text = root.querySelector('p')?.firstChild;
    if (!text) throw new Error('Texto não encontrado.');
    selectContents(text);

    const engine = new RangeEngine(root);
    expect(engine.replaceSelection(document.createTextNode('Novo'))).toBe(true);
    expect(root.textContent).toBe('Novo');
    expect(window.getSelection()?.isCollapsed).toBe(true);
  });

  it('não altera a raiz quando a seleção está ausente', () => {
    const root = setup();
    expect(new RangeEngine(root).replaceSelection(document.createTextNode('X'))).toBe(false);
    expect(root.textContent).toBe('Texto');
  });

  it('não envolve seleção colapsada', () => {
    const root = setup();
    const text = root.querySelector('p')?.firstChild;
    if (!text) throw new Error('Texto não encontrado.');
    selectContents(text, true);

    expect(new RangeEngine(root).wrapSelection('strong')).toBe(false);
    expect(root.innerHTML).toBe('<p>Texto</p>');
  });

  it('aplica atributos e usa fallback para seleção que atravessa nós', () => {
    const root = setup('<p>Um <em>dois</em> três</p>');
    const paragraph = root.querySelector('p');
    if (!paragraph) throw new Error('Parágrafo não encontrado.');
    const range = document.createRange();
    range.setStart(paragraph.firstChild!, 0);
    range.setEnd(paragraph.lastChild!, paragraph.lastChild!.textContent!.length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const engine = new RangeEngine(root);
    expect(engine.wrapSelection('span', { class: 'marked' })).toBe(true);
    expect(root.querySelector('span.marked')).not.toBeNull();
    expect(root.querySelector('span.marked')?.textContent).toBe('Um dois três');
  });
});
