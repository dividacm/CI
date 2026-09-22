import { beforeEach, describe, expect, it } from 'vitest';
import { FormattingEngine } from '../../src/editor/FormattingEngine';

function setup(html = '<p>Texto de teste</p>') {
  document.body.innerHTML = '';
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.innerHTML = html;
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

describe('FormattingEngine', () => {
  beforeEach(() => document.body.innerHTML = '');

  it('aplica negrito, itálico e sublinhado', () => {
    const { root, engine } = setup();
    selectContents(root);
    expect(engine.bold()).toBe(true);
    selectContents(root);
    expect(engine.italic()).toBe(true);
    selectContents(root);
    expect(engine.underline()).toBe(true);
    expect(root.innerHTML).toContain('<u>');
  });

  it('alinha o bloco selecionado', () => {
    const { root, engine } = setup();
    selectContents(root);
    expect(engine.align('center')).toBe(true);
    expect(root.querySelector('p')?.style.textAlign).toBe('center');
  });

  it('aplica fonte, tamanho e cor', () => {
    const { root, engine } = setup();
    selectContents(root);
    expect(engine.setFontFamily('Carlito')).toBe(true);
    selectContents(root);
    expect(engine.setFontSize('18px')).toBe(true);
    selectContents(root);
    expect(engine.setColor('#123456')).toBe(true);
    expect(root.querySelector('span')).not.toBeNull();
  });

  it('insere lista ordenada e não ordenada', () => {
    const { root, engine } = setup();
    selectContents(root);
    expect(engine.insertList('ol')).toBe(true);
    expect(root.querySelector('ol')).not.toBeNull();

    const second = setup();
    selectContents(second.root);
    expect(second.engine.insertList('ul')).toBe(true);
    expect(second.root.querySelector('ul')).not.toBeNull();
  });

  it('insere item vazio quando a seleção está recolhida', () => {
    const { root, engine } = setup();
    const paragraph = root.querySelector('p');
    if (!paragraph) throw new Error('Parágrafo não encontrado.');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(engine.insertList('ul')).toBe(true);
    expect(root.querySelector('ul li br')).not.toBeNull();
  });

  it('altera maiúsculas/minúsculas e limpa formatação', () => {
    const { root, engine } = setup('<p><strong>Texto</strong></p>');
    selectContents(root);
    expect(engine.toggleCase(true)).toBe(true);
    expect(root.textContent).toContain('TEXTO');

    const second = setup('<p><strong>Texto</strong></p>');
    selectContents(second.root);
    expect(second.engine.clearFormatting()).toBe(true);
    expect(second.root.querySelector('strong')).toBeNull();
  });

  it('retorna false sem seleção ou para operação inválida de bloco', () => {
    const { root, engine } = setup();
    window.getSelection()?.removeAllRanges();
    expect(engine.bold()).toBe(false);
    expect(engine.align('left')).toBe(false);
    expect(engine.toggleCase(false)).toBe(false);
  });
});
