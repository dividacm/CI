export interface FontFamilyOption {
  value: string;
  label: string;
}

export interface FontSizeOption {
  value: string;
  label: string;
}

export const FONT_FAMILY_OPTIONS: readonly FontFamilyOption[] = [
  { value: 'Carlito', label: 'Carlito' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
];

export const FONT_SIZE_OPTIONS: readonly FontSizeOption[] = [
  { value: '10px', label: '10' },
  { value: '11px', label: '11' },
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '28px', label: '28' },
  { value: '32px', label: '32' },
  { value: '36px', label: '36' },
];

export function isSupportedFontFamily(value: string): boolean {
  return FONT_FAMILY_OPTIONS.some((option) => option.value === value);
}

export function isSupportedFontSize(value: string): boolean {
  return FONT_SIZE_OPTIONS.some((option) => option.value === value);
}
