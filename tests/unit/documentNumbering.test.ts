import { beforeEach, describe, expect, it } from 'vitest';
import { DocumentNumbering } from '../../src/storage/DocumentNumbering';

describe('DocumentNumbering', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('nao incrementa ao consultar o contador', () => {
    const numbering = new DocumentNumbering();

    expect(numbering.peek(2026)).toBe(0);
    expect(numbering.peek(2026)).toBe(0);
  });

  it('incrementa apenas quando um numero e solicitado', () => {
    const numbering = new DocumentNumbering();

    expect(numbering.next(2026)).toBe(1);
    expect(numbering.next(2026)).toBe(2);
    expect(numbering.peek(2026)).toBe(2);
  });
});
