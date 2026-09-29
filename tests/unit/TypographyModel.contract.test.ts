import { describe, expect, it } from 'vitest';
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  isSupportedFontFamily,
  isSupportedFontSize,
} from '../../src/editor/TypographyModel';

describe('TypographyModel contract', () => {
  it('keeps the organization default font and common document fonts available', () => {
    expect(FONT_FAMILY_OPTIONS.map((option) => option.value)).toEqual([
      'Carlito',
      'Arial',
      'Verdana',
      'Tahoma',
      'Trebuchet MS',
      'Georgia',
      'Times New Roman',
      'Courier New',
    ]);
  });

  it('provides an ordered document-oriented size scale', () => {
    expect(FONT_SIZE_OPTIONS.map((option) => option.value)).toEqual([
      '10px',
      '11px',
      '12px',
      '14px',
      '16px',
      '18px',
      '20px',
      '24px',
      '28px',
      '32px',
      '36px',
    ]);
  });

  it('validates supported typography values without accepting arbitrary values', () => {
    expect(isSupportedFontFamily('Carlito')).toBe(true);
    expect(isSupportedFontFamily('Comic Sans MS')).toBe(false);
    expect(isSupportedFontSize('16px')).toBe(true);
    expect(isSupportedFontSize('15px')).toBe(false);
  });
});
