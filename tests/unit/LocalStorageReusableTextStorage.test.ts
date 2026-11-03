import { beforeEach, describe, expect, it } from 'vitest';
import { createReusableText } from '../../src/reusable-text/ReusableTextModel';
import { LocalStorageReusableTextStorage } from '../../src/reusable-text/LocalStorageReusableTextStorage';

const sample = () => createReusableText({
  id: 'text-1',
  name: 'Encaminhamento padrão',
  category: 'Encaminhamento',
  content: 'Encaminhamos para análise.',
  now: '2026-11-03T10:00:00.000Z',
});

describe('LocalStorageReusableTextStorage', () => {
  beforeEach(() => localStorage.clear());

  it('retorna uma lista vazia quando ainda não há biblioteca', () => {
    expect(new LocalStorageReusableTextStorage().load()).toEqual([]);
  });

  it('salva e recupera textos com versão de esquema', () => {
    const storage = new LocalStorageReusableTextStorage();
    const item = sample();

    storage.save([item]);

    expect(JSON.parse(localStorage.getItem('ci:reusable-texts:v1') ?? '{}')).toEqual({
      schemaVersion: 1,
      items: [item],
    });
    expect(storage.load()).toEqual([item]);
  });

  it('mantém os dados armazenados isolados dos objetos retornados', () => {
    const storage = new LocalStorageReusableTextStorage();
    storage.save([sample()]);

    const loaded = storage.load();
    loaded[0]!.name = 'Alterado fora do storage';

    expect(storage.load()[0]!.name).toBe('Encaminhamento padrão');
  });

  it('rejeita JSON corrompido sem apagar o conteúdo original', () => {
    const raw = '{json inválido';
    localStorage.setItem('ci:reusable-texts:v1', raw);

    expect(() => new LocalStorageReusableTextStorage().load()).toThrow(/dados inválidos/);
    expect(localStorage.getItem('ci:reusable-texts:v1')).toBe(raw);
  });

  it('rejeita versões desconhecidas sem sobrescrever os dados', () => {
    const raw = JSON.stringify({ schemaVersion: 2, items: [] });
    localStorage.setItem('ci:reusable-texts:v1', raw);

    expect(() => new LocalStorageReusableTextStorage().load()).toThrow(/não é compatível/);
    expect(localStorage.getItem('ci:reusable-texts:v1')).toBe(raw);
  });

  it('rejeita itens inválidos ao carregar e ao salvar', () => {
    const invalid = { ...sample(), category: 'Categoria desconhecida' };
    localStorage.setItem('ci:reusable-texts:v1', JSON.stringify({
      schemaVersion: 1,
      items: [invalid],
    }));

    expect(() => new LocalStorageReusableTextStorage().load()).toThrow(/textos inválidos/);
    expect(() => new LocalStorageReusableTextStorage().save([invalid as never])).toThrow(/textos inválidos/);
  });

  it('propaga falha de quota ou indisponibilidade do armazenamento', () => {
    const failingStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('storage unavailable'); },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage;

    expect(() => new LocalStorageReusableTextStorage(failingStorage).save([sample()]))
      .toThrow('storage unavailable');
  });
});
