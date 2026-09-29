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
    expect(Number.parseFloat(root.querySelector('.ruler-margin-left')?.style.left ?? '')).toBeCloseTo(75.59055118110236, 10);
    expect(Number.parseFloat(root.querySelector('.ruler-margin-right')?.style.left ?? '')).toBeCloseTo(718.1102362204724, 10);
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
