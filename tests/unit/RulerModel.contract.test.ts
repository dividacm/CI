import { describe, expect, it } from 'vitest';
import {
  CSS_PX_PER_INCH,
  createHorizontalRulerTicks,
  createRulerMetrics,
  MM_PER_INCH,
  mmToPx,
  pxToMm,
} from '../../src/layout/RulerModel';
import type { PageLayoutConfig } from '../../src/types/configuration';

const layout: PageLayoutConfig = {
  marginTopMm: 10,
  marginRightMm: 20,
  marginBottomMm: 20,
  marginLeftMm: 20,
};

describe('RulerModel contract', () => {
  it('uses the CSS 96 DPI millimeter conversion consistently', () => {
    expect(mmToPx(MM_PER_INCH)).toBe(CSS_PX_PER_INCH);
    expect(pxToMm(CSS_PX_PER_INCH)).toBe(MM_PER_INCH);
    expect(pxToMm(mmToPx(20))).toBeCloseTo(20, 10);
  });

  it('calculates the printable content area from page size and margins', () => {
    const metrics = createRulerMetrics(210, 297, layout);
    expect(metrics).toEqual({ pageWidthMm: 210, pageHeightMm: 297, contentWidthMm: 170, contentHeightMm: 267 });
  });

  it('does not produce negative content dimensions', () => {
    const metrics = createRulerMetrics(100, 80, { marginTopMm: 50, marginRightMm: 60, marginBottomMm: 50, marginLeftMm: 60 });
    expect(metrics.contentWidthMm).toBe(0);
    expect(metrics.contentHeightMm).toBe(0);
  });

  it('creates deterministic horizontal ticks in millimeters', () => {
    const ticks = createHorizontalRulerTicks(40, 10);
    expect(ticks).toHaveLength(5);
    expect(ticks.map((tick) => tick.valueMm)).toEqual([0, 10, 20, 30, 40]);
    expect(ticks.map((tick) => tick.major)).toEqual([true, false, true, false, true]);
    expect(ticks[2]?.positionPx).toBeCloseTo(mmToPx(20), 10);
  });

  it('rejects an invalid ruler interval', () => {
    expect(() => createHorizontalRulerTicks(210, 0)).toThrow('O intervalo da régua deve ser maior que zero.');
  });
});
