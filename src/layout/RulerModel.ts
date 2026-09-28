import type { PageLayoutConfig } from '../types/configuration';

export const MM_PER_INCH = 25.4;
export const CSS_PX_PER_INCH = 96;

export interface RulerMetrics {
  pageWidthMm: number;
  pageHeightMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
}

export interface RulerTick {
  positionPx: number;
  valueMm: number;
  major: boolean;
}

export function mmToPx(valueMm: number): number {
  return (valueMm / MM_PER_INCH) * CSS_PX_PER_INCH;
}

export function pxToMm(valuePx: number): number {
  return (valuePx / CSS_PX_PER_INCH) * MM_PER_INCH;
}

export function createRulerMetrics(
  pageWidthMm: number,
  pageHeightMm: number,
  layout: PageLayoutConfig,
): RulerMetrics {
  return {
    pageWidthMm,
    pageHeightMm,
    contentWidthMm: Math.max(0, pageWidthMm - layout.marginLeftMm - layout.marginRightMm),
    contentHeightMm: Math.max(0, pageHeightMm - layout.marginTopMm - layout.marginBottomMm),
  };
}

export function createHorizontalRulerTicks(
  pageWidthMm: number,
  stepMm = 10,
): RulerTick[] {
  if (!Number.isFinite(pageWidthMm) || pageWidthMm <= 0) return [];
  if (!Number.isFinite(stepMm) || stepMm <= 0) throw new Error('O intervalo da régua deve ser maior que zero.');

  const ticks: RulerTick[] = [];
  for (let valueMm = 0; valueMm <= pageWidthMm + Number.EPSILON; valueMm += stepMm) {
    ticks.push({
      positionPx: mmToPx(valueMm),
      valueMm,
      major: valueMm % (stepMm * 2) === 0,
    });
  }
  return ticks;
}
