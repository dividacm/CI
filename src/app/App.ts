import { createDocument } from '../document/createDocument';
import { Editor } from '../editor/Editor';
import { AutosaveController } from '../storage/AutosaveController';
import { LocalStorageDocumentStorage } from '../storage/LocalStorageDocumentStorage';
import { sanitizeHtml } from '../security/sanitizer';
import type { OrganizationConfig } from '../types/configuration';
import type { CommunicationDocument, DocumentStatus } from '../types/document';

const ACTIVE_DOCUMENT_KEY = 'ci:active-document-id';

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
          <p class="status" role="status" data-save-status>Rascunho local.</p>
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

  const storage = new LocalStorageDocumentStorage();
  const document = loadActiveDocument(storage, organization, template.id);
  populateFields(root, template, document);

  const body = root.querySelector<HTMLElement>('[data-editor-body]');
  if (!body) throw new Error('Área de edição não encontrada.');
  body.innerHTML = sanitizeHtml(document.bodyHtml);

  const status = root.querySelector<HTMLElement>('[data-save-status]');
  const autosave = new AutosaveController({
    storage,
    onStatusChange: (value) => setStatus(status, value),
  });
  autosave.attach(document);

  const editor = new Editor(body);

  const updateDocument = (): void => {
    document.from = getInputValue(root, 'from');
    document.to = getInputValue(root, 'to');
    document.subject = getInputValue(root, 'subject');
    document.bodyHtml = sanitizeHtml(body.innerHTML);
    autosave.markDirty(document);
  };

  bindToolbar(root, editor, updateDocument);

  root.querySelectorAll<HTMLInputElement>('.editor-fields input').forEach((input) => {
    input.addEventListener('input', updateDocument);
  });
  body.addEventListener('input', updateDocument);
}

function loadActiveDocument(
  storage: LocalStorageDocumentStorage,
  organization: OrganizationConfig,
  templateId: string,
): CommunicationDocument {
  const activeId = localStorage.getItem(ACTIVE_DOCUMENT_KEY);
  if (activeId) {
    const existing = storage.load(activeId);
    if (existing && existing.templateId === templateId) return existing;
  }

  const template = organization.templates.find((item) => item.id === templateId) ?? organization.templates[0];
  if (!template) throw new Error('Nenhum template configurado.');

  const document = createDocument({
    template,
    number: 0,
    year: new Date().getFullYear(),
  });
  localStorage.setItem(ACTIVE_DOCUMENT_KEY, document.id);
  return document;
}

function populateFields(
  root: HTMLElement,
  template: OrganizationConfig['templates'][number],
  document: CommunicationDocument,
): void {
  const values: Record<string, string> = {
    from: document.from,
    to: document.to,
    subject: document.subject,
  };

  for (const field of template.fields) {
    const input = root.querySelector<HTMLInputElement>(`[name="${field.id}"]`);
    if (!input) continue;
    input.placeholder = field.placeholder ?? '';
    input.value = values[field.id] ?? field.defaultValue ?? '';
    input.required = field.required;
  }
}

function getInputValue(root: HTMLElement, name: string): string {
  return root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? '';
}

function setStatus(element: HTMLElement | null, status: DocumentStatus): void {
  if (!element) return;
  element.textContent = {
    saved: 'Salvo localmente.',
    saving: 'Salvando…',
    dirty: 'Alterações pendentes.',
    error: 'Falha ao salvar. O conteúdo permanece nesta tela.',
  }[status];
}

function bindToolbar(root: HTMLElement, editor: Editor, onChange: () => void): void {
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
        default: return;
      }

      onChange();
    });
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"]/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' };
    return entities[character] ?? character;
  });
}
