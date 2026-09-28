import { describe, expect, it } from 'vitest';
import { renderHorizontalRuler } from '../../src/layout/RulerView';

describe('RulerView contract', () => {
  it('renders A4 ticks and margin markers in CSS pixels', () => {
    const root = document.createElement('div');

    renderHorizontalRuler(root, {
      pageWidthMm: 210,
      marginLeftMm: 20,
      marginRightMm: 20,
    });

    expect(root.querySelectorAll('.ruler-tick')).toHaveLength(22);
    expect(root.querySelector('.ruler-margin-left')?.getAttribute('style')).toContain('left: 75.59055118110236px');
    expect(root.querySelector('.ruler-margin-right')?.getAttribute('style')).toContain('left: 642.5196850393701px');
    expect(root.querySelector('.ruler-label')?.textContent).toBe('0');
    expect(root.querySelectorAll('.ruler-tick-major')).toHaveLength(11);
  });

  it('replaces existing ruler content deterministically', () => {
    const root = document.createElement('div');
    root.innerHTML = '<strong>old</strong>';

    renderHorizontalRuler(root, {
      pageWidthMm: 210,
      marginLeftMm: 10,
      marginRightMm: 10,
    });

    expect(root.querySelector('strong')).toBeNull();
    expect(root.getAttribute('role')).toBe('img');
  });
});
