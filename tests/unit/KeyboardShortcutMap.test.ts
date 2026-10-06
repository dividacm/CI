import { describe, expect, it } from 'vitest';
import { getKeyboardCommand } from '../../src/app/KeyboardShortcutMap';

describe('KeyboardShortcutMap', () => {
  it('normalizes Ctrl and Meta variants to the same command', () => {
    expect(getKeyboardCommand({ key: 'b', ctrlKey: true })).toBe('bold');
    expect(getKeyboardCommand({ key: 'B', metaKey: true })).toBe('bold');
    expect(getKeyboardCommand({ key: 'i', ctrlKey: true })).toBe('italic');
  });

  it('maps undo and redo consistently', () => {
    expect(getKeyboardCommand({ key: 'z', ctrlKey: true })).toBe('undo');
    expect(getKeyboardCommand({ key: 'z', ctrlKey: true, shiftKey: true })).toBe('redo');
    expect(getKeyboardCommand({ key: 'y', ctrlKey: true })).toBe('redo');
  });

  it('maps clipboard, save, alignment and list shortcuts', () => {
    expect(getKeyboardCommand({ key: 'c', ctrlKey: true })).toBe('copy');
    expect(getKeyboardCommand({ key: 'x', metaKey: true })).toBe('cut');
    expect(getKeyboardCommand({ key: 'v', ctrlKey: true })).toBe('paste');
    expect(getKeyboardCommand({ key: 's', metaKey: true })).toBe('save');
    expect(getKeyboardCommand({ key: 'e', ctrlKey: true })).toBe('align-center');
    expect(getKeyboardCommand({ key: '7', ctrlKey: true, shiftKey: true, code: 'Digit7' })).toBe('list-ordered');
    expect(getKeyboardCommand({ key: '8', metaKey: true, shiftKey: true, code: 'Digit8' })).toBe('list-unordered');
  });

  it('rejects Alt combinations and unsupported or conflicting variants', () => {
    expect(getKeyboardCommand({ key: 'b', ctrlKey: true, altKey: true })).toBeNull();
    expect(getKeyboardCommand({ key: 'q', ctrlKey: true })).toBeNull();
    expect(getKeyboardCommand({ key: 'b', ctrlKey: true, shiftKey: true })).toBeNull();
    expect(getKeyboardCommand({ key: '7', ctrlKey: true, code: 'Digit7' })).toBeNull();
  });
});
