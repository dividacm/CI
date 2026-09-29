import { describe, expect, it } from 'vitest';
import { renderHorizontalRuler } from '../../src/layout/RulerView';

describe('RulerView interaction contract', () => {
  it('exposes accessible margin sliders with current values', () => {
    const root = document.createElement('div');

    renderHorizontalRuler(root, {
      pageWidthMm: 210,
      marginLeftMm: 20,
      marginRightMm: 20,
    });

    const left = root.querySelector<HTMLElement>('.ruler-margin-left');
    const right = root.querySelector<HTMLElement>('.ruler-margin-right');

    expect(left?.getAttribute('role')).toBe('slider');
    expect(left?.getAttribute('aria-valuenow')).toBe('20');
    expect(left?.getAttribute('aria-valuemax')).toBe('190');
    expect(right?.getAttribute('aria-valuenow')).toBe('20');
    expect(right?.getAttribute('aria-valuemax')).toBe('190');
  });

  it('changes margins with keyboard controls and respects the opposite margin', () => {
    const root = document.createElement('div');
    const changes: Array<[string, number]> = [];

    renderHorizontalRuler(
      root,
      { pageWidthMm: 210, marginLeftMm: 20, marginRightMm: 20 },
      (side, value) => changes.push([side, value]),
    );

    const left = root.querySelector<HTMLElement>('.ruler-margin-left');
    const right = root.querySelector<HTMLElement>('.ruler-margin-right');
    if (!left || !right) throw new Error('Marcadores de margem não encontrados.');

    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }));
    right.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));

    expect(changes).toEqual([
      ['left', 21],
      ['left', 30],
      ['right', 190],
    ]);
  });

  it('supports Home and clamps keyboard movement at zero', () => {
    const root = document.createElement('div');
    const changes: Array<[string, number]> = [];

    renderHorizontalRuler(
      root,
      { pageWidthMm: 210, marginLeftMm: 20, marginRightMm: 20 },
      (side, value) => changes.push([side, value]),
    );

    const left = root.querySelector<HTMLElement>('.ruler-margin-left');
    if (!left) throw new Error('Marcador de margem esquerda não encontrado.');

    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    expect(changes).toEqual([
      ['left', 0],
      ['left', 19],
    ]);
  });
});
