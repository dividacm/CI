import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipboardService } from '../../src/clipboard/ClipboardService';
import { RangeEngine } from '../../src/editor/RangeEngine';

describe('ClipboardService', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('Colado'),
      },
    });
  });

  it('copia somente texto da seleção', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p><strong>Olá</strong> mundo</p>';
    document.body.appendChild(root);
    const text = root.querySelector('strong')?.firstChild;
    if (!text) throw new Error('Texto de teste não encontrado.');

    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const clipboard = new ClipboardService({ rangeEngine: new RangeEngine(root) });
    expect(await clipboard.copy()).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Olá');
  });

  it('cola como TextNode e não interpreta HTML', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>A</p>';
    document.body.appendChild(root);
    const paragraph = root.querySelector('p');
    if (!paragraph) throw new Error('Parágrafo de teste não encontrado.');

    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    Object.defineProperty(navigator.clipboard, 'readText', {
      configurable: true,
      value: vi.fn().mockResolvedValue('<strong>não é HTML</strong>'),
    });

    const clipboard = new ClipboardService({ rangeEngine: new RangeEngine(root) });
    expect(await clipboard.pastePlainText()).toBe(true);
    expect(root.querySelector('strong')).toBeNull();
    expect(root.textContent).toContain('<strong>não é HTML</strong>');
  });
});
