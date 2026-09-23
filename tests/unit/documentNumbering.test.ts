import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentNumbering, type LockManagerLike } from '../../src/storage/DocumentNumbering';

describe('DocumentNumbering', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('nao incrementa ao consultar o contador', () => {
    const numbering = new DocumentNumbering();

    expect(numbering.peek(2026)).toBe(0);
    expect(numbering.peek(2026)).toBe(0);
  });

  it('incrementa apenas quando um numero e solicitado', async () => {
    const numbering = new DocumentNumbering();

    expect(await numbering.next(2026)).toBe(1);
    expect(await numbering.next(2026)).toBe(2);
    expect(numbering.peek(2026)).toBe(2);
  });

  it('usa lock exclusivo por ano para serializar emissoes', async () => {
    const request = vi.fn(
      async <T>(
        _name: string,
        _options: { mode: 'exclusive' },
        callback: () => Promise<T> | T,
      ) => callback(),
    );
    const locks: LockManagerLike = { request };
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { locks },
    });

    try {
      const numbering = new DocumentNumbering();

      await expect(numbering.next(2026)).resolves.toBe(1);
      expect(request).toHaveBeenCalledWith(
        'ci:document-numbering:2026',
        { mode: 'exclusive' },
        expect.any(Function),
      );
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: originalNavigator,
      });
    }
  });
});
