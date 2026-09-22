import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipboardService } from '../../src/clipboard/ClipboardService';
import { RangeEngine } from '../../src/editor/RangeEngine';

describe('ClipboardService', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.getSelection()?.removeAllRanges();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('Colado'),
      },
    });
  });

  function setup(selected = true) {
    const root = document.createElement('div');
    root.innerHTML = '<p>Texto</p>';
    document.body.appendChild(root);
    if (selected) {
      const text = root.querySelector('p')?.firstChild;
      if (!text) throw new Error('Texto não encontrado.');
      const range = document.createRange();
      range.selectNodeContents(text);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    return root;
  }

  it('retorna false para seleção ausente ou vazia', async () => {
    const root = setup(false);
    const clipboard = new ClipboardService({ rangeEngine: new RangeEngine(root) });
    expect(await clipboard.copy()).toBe(false);
    expect(await clipboard.cut()).toBe(false);
  });

  it('copia somente texto da seleção', async () => {
    const root = setup();
    const clipboard = new ClipboardService({ rangeEngine: new RangeEngine(root) });
    expect(await clipboard.copy()).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Texto');
  });

  it('usa execCommand quando a API de clipboard falha', async () => {
    const root = setup();
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('blocked'));
    const execCommand = vi.spyOn(document, 'execCommand').mockReturnValue(true);
    const clipboard = new ClipboardService({ rangeEngine: new RangeEngine(root) });
    expect(await clipboard.copy()).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    execCommand.mockRestore();
  });

  it('recorta a seleção depois de copiar', async () => {
    const root = setup();
    const clipboard = new ClipboardService({ rangeEngine: new RangeEngine(root) });
    expect(await clipboard.cut()).toBe(true);
    expect(root.textContent).toBe('');
  });

  it('retorna false quando a leitura da área de transferência falha ou está vazia', async () => {
    const root = setup(false);
    const clipboard = new ClipboardService({ rangeEngine: new RangeEngine(root) });
    navigator.clipboard.readText.mockResolvedValueOnce('');
    expect(await clipboard.pastePlainText()).toBe(false);
    navigator.clipboard.readText.mockRejectedValueOnce(new Error('blocked'));
    expect(await clipboard.pastePlainText()).toBe(false);
  });
});
