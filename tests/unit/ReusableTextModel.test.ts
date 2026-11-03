import { describe, expect, it } from 'vitest';
import {
  createReusableText,
  isReusableText,
  isReusableTextCategory,
  REUSABLE_TEXT_CATEGORIES,
} from '../../src/reusable-text/ReusableTextModel';

describe('ReusableTextModel', () => {
  it('cria um texto normalizando espaços do nome e mantendo conteúdo original', () => {
    const item = createReusableText({
      id: 'id-1',
      name: '  Encaminhamento  ',
      category: 'Encaminhamento',
      content: '  Texto com espaços.\nSegunda linha.  ',
      now: '2026-11-03T10:00:00.000Z',
    });

    expect(item).toEqual({
      id: 'id-1',
      name: 'Encaminhamento',
      category: 'Encaminhamento',
      content: '  Texto com espaços.\nSegunda linha.  ',
      createdAt: '2026-11-03T10:00:00.000Z',
      updatedAt: '2026-11-03T10:00:00.000Z',
    });
  });

  it('disponibiliza as seis categorias definidas para a primeira versão', () => {
    expect(REUSABLE_TEXT_CATEGORIES).toEqual([
      'Encaminhamento', 'Solicitação', 'Orientação', 'Cobrança', 'Finalização', 'Outros',
    ]);
    expect(isReusableTextCategory('Outros')).toBe(true);
    expect(isReusableTextCategory('Outra')).toBe(false);
  });

  it.each([
    { id: '', name: 'Nome', category: 'Outros', content: 'Texto' },
    { id: 'id', name: ' ', category: 'Outros', content: 'Texto' },
    { id: 'id', name: 'Nome', category: 'Inválida', content: 'Texto' },
    { id: 'id', name: 'Nome', category: 'Outros', content: '  ' },
  ])('rejeita dados obrigatórios inválidos: %o', (input) => {
    expect(() => createReusableText({
      ...input,
      category: input.category as 'Outros',
    })).toThrow();
  });

  it('rejeita datas inválidas', () => {
    expect(() => createReusableText({
      id: 'id',
      name: 'Nome',
      category: 'Outros',
      content: 'Texto',
      now: 'data-inválida',
    })).toThrow(/data/);
  });

  it('valida objetos persistidos antes de aceitá-los', () => {
    expect(isReusableText(createReusableText({
      id: 'id',
      name: 'Nome',
      category: 'Outros',
      content: 'Texto',
    }))).toBe(true);
    expect(isReusableText({ id: 'id' })).toBe(false);
  });
});
