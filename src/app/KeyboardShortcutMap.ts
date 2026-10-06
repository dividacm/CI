export type KeyboardCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'save'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-justify'
  | 'list-ordered'
  | 'list-unordered'
  | 'graphic-duplicate'
  | 'graphic-group'
  | 'graphic-ungroup'
  | 'graphic-delete'
  | 'graphic-escape'
  | 'graphic-move-left'
  | 'graphic-move-right'
  | 'graphic-move-up'
  | 'graphic-move-down';

export interface KeyboardShortcutInput {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export type KeyboardContext = 'editor' | 'graphics';

export function getKeyboardCommand(event: KeyboardShortcutInput, context: KeyboardContext = 'editor'): KeyboardCommand | null {
  const key = event.key.toLowerCase();

  if (context === 'graphics') {
    if (event.ctrlKey || event.metaKey) {
      if (event.altKey) return null;
      if (key === 'd' && !event.shiftKey) return 'graphic-duplicate';
      if (key === 'g') return event.shiftKey ? 'graphic-ungroup' : 'graphic-group';
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      if (key === 'delete' || key === 'backspace') return 'graphic-delete';
      if (key === 'escape' && !event.shiftKey) return 'graphic-escape';
      if (key === 'arrowleft') return 'graphic-move-left';
      if (key === 'arrowright') return 'graphic-move-right';
      if (key === 'arrowup') return 'graphic-move-up';
      if (key === 'arrowdown') return 'graphic-move-down';
    }
    return null;
  }

  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;

  if (key === 'b' && !event.shiftKey) return 'bold';
  if (key === 'i' && !event.shiftKey) return 'italic';
  if (key === 'u' && !event.shiftKey) return 'underline';
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && !event.shiftKey) return 'redo';
  if (key === 'c' && !event.shiftKey) return 'copy';
  if (key === 'x' && !event.shiftKey) return 'cut';
  if (key === 'v' && !event.shiftKey) return 'paste';
  if (key === 's' && !event.shiftKey) return 'save';
  if (key === 'l' && !event.shiftKey) return 'align-left';
  if (key === 'e' && !event.shiftKey) return 'align-center';
  if (key === 'r' && !event.shiftKey) return 'align-right';
  if (key === 'j' && !event.shiftKey) return 'align-justify';
  if (event.code === 'Digit7' && event.shiftKey) return 'list-ordered';
  if (event.code === 'Digit8' && event.shiftKey) return 'list-unordered';

  return null;
}
