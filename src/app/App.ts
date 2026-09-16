import { Editor } from '../editor/Editor';
import type { OrganizationConfig } from '../types/configuration';

export interface AppDependencies {
  organization: OrganizationConfig;
}

export function renderApp(root: HTMLElement, dependencies: AppDependencies): void {
  const { organization } = dependencies;

  root.innerHTML = `
    <main class="app-shell" data-organization="${escapeHtml(organization.id)}">
      <header class="app-header">
        <div>
          <p class="eyebrow">${escapeHtml(organization.branding.organizationName)}</p>
          <h1>Editor de Comunicação Interna</h1>
          <p class="status" role="status">Editor tipado inicializado.</p>
        </div>
      </header>
      <section class="editor-shell" aria-label="Editor">
        <div class="editor-fields">
          <label><span>De</span><input name="from" autocomplete="organization" /></label>
          <label><span>Para</span><input name="to" autocomplete="off" /></label>
          <label><span>Assunto</span><input name="subject" autocomplete="off" /></label>
        </div>
        <div class="editor-toolbar" aria-label="Formatação" role="toolbar">
          <button type="button" data-command="bold"><strong>B</strong></button>
          <button type="button" data-command="italic"><em>I</em></button>
          <button type="button" data-command="underline"><u>U</u></button>
          <button type="button" data-command="align-left">Esquerda</button>
          <button type="button" data-command="align-center">Centro</button>
          <button type="button" data-command="align-right">Direita</button>
          <button type="button" data-command="unordered-list">Lista</button>
          <button type="button" data-command="ordered-list">1. Lista</button>
          <button type="button" data-command="upper">MAIÚSCULAS</button>
          <button type="button" data-command="lower">minúsculas</button>
          <button type="button" data-command="clear">Limpar</button>
          <button type="button" data-command="undo">Desfazer</button>
          <button type="button" data-command="redo">Refazer</button>
        </div>
        <div class="editor-body" contenteditable="true" role="textbox" aria-multiline="true" data-editor-body></div>
      </section>
    </main>
  `;

  const template = organization.templates.find(
    (item) => item.id === organization.defaultTemplateId,
  );
  if (!template) throw new Error(`Template padrão "${organization.defaultTemplateId}" não encontrado.`);

  for (const field of template.fields) {
    const input = root.querySelector<HTMLInputElement>(`[name="${field.id}"]`);
    if (!input) continue;
    input.placeholder = field.placeholder ?? '';
    input.value = field.defaultValue ?? '';
    input.required = field.required;
  }

  const body = root.querySelector<HTMLElement>('[data-editor-body]');
  if (!body) throw new Error('Área de edição não encontrada.');

  const editor = new Editor(body);
  bindToolbar(root, editor);
}

function bindToolbar(root: HTMLElement, editor: Editor): void {
  root.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      if (!command) return;

      switch (command) {
        case 'bold': editor.bold(); break;
        case 'italic': editor.italic(); break;
        case 'underline': editor.underline(); break;
        case 'align-left': editor.align('left'); break;
        case 'align-center': editor.align('center'); break;
        case 'align-right': editor.align('right'); break;
        case 'unordered-list': editor.list('ul'); break;
        case 'ordered-list': editor.list('ol'); break;
        case 'upper': editor.toggleCase(true); break;
        case 'lower': editor.toggleCase(false); break;
        case 'clear': editor.clearFormatting(); break;
        case 'undo': editor.undo(); break;
        case 'redo': editor.redo(); break;
      }
    });
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"]/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' };
    return entities[character] ?? character;
  });
}
