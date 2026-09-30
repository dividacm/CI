import { describe, expect, it } from 'vitest';
import { createGraphicElement, normalizeGraphicElements } from '../../src/graphics/GraphicElementModel';

describe('V2.4.1 graphic element model', () => {
  it('creates a graphic element with stable defaults', () => {
    const element = createGraphicElement({
      kind: 'shape',
      data: { text: 'Exemplo' },
    });

    expect(element.id).toBeTruthy();
    expect(element.kind).toBe('shape');
    expect(element.position).toEqual({ x: 0, y: 0 });
    expect(element.size).toEqual({ width: 160, height: 96 });
    expect(element.rotation).toBe(0);
    expect(element.data).toEqual({ text: 'Exemplo' });
  });

  it('normalizes persisted graphics and rejects invalid elements', () => {
    const graphics = normalizeGraphicElements([
      {
        id: 'shape-1',
        kind: 'shape',
        position: { x: 10, y: 20 },
        size: { width: 200, height: 100 },
        rotation: 15,
        data: { text: 'ok', unsafe: 42 },
      },
      {
        id: '',
        kind: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 10, height: 10 },
        rotation: 0,
        data: {},
      },
      {
        id: 'bad-size',
        kind: 'smartart',
        position: { x: 0, y: 0 },
        size: { width: 0, height: 10 },
        rotation: 0,
        data: {},
      },
    ]);

    expect(graphics).toEqual([
      {
        id: 'shape-1',
        kind: 'shape',
        position: { x: 10, y: 20 },
        size: { width: 200, height: 100 },
        rotation: 15,
        data: { text: 'ok' },
      },
    ]);
  });

  it('returns an empty collection for legacy or invalid storage values', () => {
    expect(normalizeGraphicElements(undefined)).toEqual([]);
    expect(normalizeGraphicElements(null)).toEqual([]);
    expect(normalizeGraphicElements('not-an-array')).toEqual([]);
  });
});
