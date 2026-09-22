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

function selectTextNode(node: Text): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

describe('FormattingEngine', () => {
  beforeEach(() => document.body.innerHTML = '');

  it('aplica negrito, itálico e sublinhado', () => {
    const bold = setup();
    selectContents(bold.root);
    expect(bold.engine.bold()).toBe(true);
    expect(bold.root.querySelector('strong')).not.toBeNull();

    const italic = setup();
    selectContents(italic.root);
    expect(italic.engine.italic()).toBe(true);
    expect(italic.root.querySelector('em')).not.toBeNull();

    const underline = setup();
    selectContents(underline.root);
    expect(underline.engine.underline()).toBe(true);
    expect(underline.root.querySelector('u')).not.toBeNull();
  });

  it('alinha o bloco selecionado', () => {
    const { root, engine } = setup();
    selectContents(root);
    expect(engine.align('center')).toBe(true);
    expect(root.querySelector('p')?.style.textAlign).toBe('center');
  });

  it('aplica fonte, tamanho e cor', () => {
    const family = setup();
    selectContents(family.root);
    expect(family.engine.setFontFamily('Carlito')).toBe(true);
    expect(family.root.querySelector('span')).not.toBeNull();

    const size = setup();
    selectContents(size.root);
    expect(size.engine.setFontSize('18px')).toBe(true);
    expect(size.root.querySelector('span')).not.toBeNull();

    const color = setup();
    selectContents(color.root);
    expect(color.engine.setColor('#123456')).toBe(true);
    expect(color.root.querySelector('span')).not.toBeNull();
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
    const { root, engine } = setup('<p>Texto</p>');
    selectContents(root);
    expect(engine.toggleCase(true)).toBe(true);
    expect(root.textContent).toContain('TEXTO');

    const second = setup('<p><strong>Texto</strong></p>');
    const textNode = second.root.querySelector('strong')?.firstChild;
    if (!(textNode instanceof Text)) throw new Error('Texto formatado não encontrado.');
    selectTextNode(textNode);
    expect(second.engine.clearFormatting()).toBe(true);
    expect(second.root.querySelector('strong')).toBeNull();
    expect(second.root.textContent).toBe('Texto');
  });

  it('retorna false sem seleção ou para operação inválida de bloco', () => {
    const { root, engine } = setup();
    window.getSelection()?.removeAllRanges();
    expect(engine.bold()).toBe(false);
    expect(engine.align('left')).toBe(false);
    expect(engine.toggleCase(false)).toBe(false);
  });
});
