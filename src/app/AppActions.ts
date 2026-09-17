import { DocumentIssuer } from '../document/DocumentIssuer';
import type { Editor } from '../editor/Editor';
import { sanitizeHtml } from '../security/sanitizer';
import type { AutosaveController } from '../storage/AutosaveController';
import type { AppState } from './AppState';
import { resetDocument, replaceDocument, updateDocument } from './AppState';

export interface AppActions {
  sync(): void;
  clear(): void;
  issue(): boolean;
}

export function createAppActions(
  state: AppState,
  editor: Editor,
  autosave: AutosaveController,
  issuer: DocumentIssuer,
  getField: (name: string) => string,
): AppActions {
  const sync = (): void => {
    updateDocument(state, {
      from: getField('from'),
      to: getField('to'),
      subject: getField('subject'),
      bodyHtml: sanitizeHtml(editor.getHtml()),
    });
    autosave.markDirty(state.document);
  };

  return {
    sync,
    clear: (): void => {
      resetDocument(state);
      editor.setHtml('');
      autosave.markDirty(state.document);
    },
    issue: (): boolean => {
      if (state.document.number > 0) return false;
      sync();
      autosave.saveNow();
      replaceDocument(state, issuer.issue(state.document));
      autosave.attach(state.document);
      return true;
    },
  };
}
