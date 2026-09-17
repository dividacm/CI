import { DocumentIssuer } from '../document/DocumentIssuer';
import { createDocument } from '../document/createDocument';
import { Editor } from '../editor/Editor';
import { sanitizeHtml } from '../security/sanitizer';
import { AutosaveController } from '../storage/AutosaveController';
import { LocalStorageDocumentStorage } from '../storage/LocalStorageDocumentStorage';
import type { OrganizationConfig } from '../types/configuration';
import type { CommunicationDocument, DocumentStatus } from '../types/document';

export function renderApp(root: HTMLElement, organization: OrganizationConfig): void {
  const template = organization.templates.find((item) => item.id === organization.defaultTemplateId);
  if (!template) throw new Error(`Template não encontrado: ${organization.defaultTemplateId}`);

  root.innerHTML = `
    <main class="app-shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">${escapeHtml(organization.name)}</p>
          <h1>${escapeHtml(template.name)}</h1>
          <output id="document-number" class="document-number" aria-label="Número do documento">Rascunho</output>
        </div>
        <output id="save-status" class="save-status" aria-live="polite">Carregando…</output>
      </header>
      <section class="editor-panel" aria-label="Editor de comunicação">
        <div class="field-grid">
          ${renderField('from', 'De', organization.fields.from.defaultValue)}
          ${renderField('to', 'Para', organization.fields.to.defaultValue)}
          ${renderField('subject', 'Assunto', organization.fields.subject.defaultValue)}
        </div>
        <div class="toolbar" role="toolbar" aria-label="Formatação">
          <button type="button" data-action="bold"><strong>B</strong></button>
          <button type="button" data-action="italic"><em>I</em></button>
          <button type="button" data-action="underline"><u>U</u></button>
          <button type="button" data-action="align-left">Esquerda</button>
          <button type="button" data-action="align-center">Centro</button>
          <button type="button" data-action="align-right">Direita</button>
          <button type="button" data-action="list-unordered">• Lista</button>
          <button type="button" data-action="list-ordered">1. Lista</button>
          <button type="button" data-action="upper">MAIÚSCULAS</button>
          <button type="button" data-action="lower">minúsculas</button>
          <button type="button" data-action="copy">Copiar</button>
          <button type="button" data-action="cut">Recortar</button>
          <button type="button" data-action="paste">Colar</button>
          <button type="button" data-action="undo">Desfazer</button>
          <button type="button" data-action="redo">Refazer</button>
          <button type="button" data-action="clear-formatting">Limpar formatação</button>
          <button type="button" data-action="issue" class="primary-action">Emitir documento</button>
        </div>
        <article id="editor" class="editor-surface" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true"></article>
      </section>
    </main>`;

  const editorRoot = root.querySelector<HTMLElement>('#editor');
  const statusRoot = root.querySelector<HTMLOutputElement>('#save-status');
  const numberRoot = root.querySelector<HTMLOutputElement>('#document-number');
  const issueButton = root.querySelector<HTMLButtonElement>('[data-action="issue"]');
  if (!editorRoot || !statusRoot || !numberRoot || !issueButton) {
    throw new Error('Estrutura do editor não encontrada.');
  }

  const storage = new LocalStorageDocumentStorage();
  const issuer = new DocumentIssuer({ storage });
  let document = loadActiveDocument(organization, template, storage);
  editorRoot.innerHTML = sanitizeHtml(document.bodyHtml);
  populateField(root, 'from', document.from);
  populateField(root, 'to', document.to);
  populateField(root, 'subject', document.subject);
  renderDocumentNumber(numberRoot, document);

  const setStatus = (status: DocumentStatus): void => {
    const labels: Record<DocumentStatus, string> = {
      saved: 'Salvo localmente.',
      saving: 'Salvando…',
      dirty: 'Alterações pendentes.',
      error: 'Falha ao salvar. O conteúdo permanece nesta tela.',
    };
    statusRoot.textContent = labels[status];
    statusRoot.dataset.status = status;
  };

  const autosave = new AutosaveController({ storage, delayMs: 300, onStatusChange: setStatus });
  autosave.attach(document);
  setStatus('saved');
  updateIssueButton(issueButton, document);
  const editor = new Editor(editorRoot);

  const updateDocument = (): void => {
    document.from = getFieldValue(root, 'from');
    document.to = getFieldValue(root, 'to');
    document.subject = getFieldValue(root, 'subject');
    document.bodyHtml = sanitizeHtml(editorRoot.innerHTML);
    autosave.markDirty(document);
    updateIssueButton(issueButton, document);
  };

  root.querySelectorAll<HTMLInputElement>('[data-field]').forEach((field) => {
    field.addEventListener('input', updateDocument);
  });
  editorRoot.addEventListener('input', updateDocument);

  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      if (action === 'issue') {
        if (document.number > 0) return;
        updateDocument();
        autosave.saveNow();
        document = issuer.issue(document);
        autosave.attach(document);
        renderDocumentNumber(numberRoot, document);
        updateIssueButton(issueButton, document);
        statusRoot.textContent = `Documento nº ${document.number}/${document.year} emitido.`;
        statusRoot.dataset.status = 'saved';
        return;
      }

      switch (action) {
        case 'bold': editor.bold(); break;
        case 'italic': editor.italic(); break;
        case 'underline': editor.underline(); break;
        case 'align-left': editor.align('left'); break;
        case 'align-center': editor.align('center'); break;
        case 'align-right': editor.align('right'); break;
        case 'list-unordered': editor.list('unordered'); break;
        case 'list-ordered': editor.list('ordered'); break;
        case 'upper': editor.toggleCase(true); break;
        case 'lower': editor.toggleCase(false); break;
        case 'copy': await editor.copy(); break;
        case 'cut': await editor.cut(); break;
        case 'paste': await editor.pastePlainText(); break;
        case 'undo': editor.undo(); break;
        case 'redo': editor.redo(); break;
        case 'clear-formatting': editor.clearFormatting(); break;
        default: return;
      }
      updateDocument();
    });
  });
}

function renderField(name: string, label: string, value: string): string {
  return `<label class="field"><span>${escapeHtml(label)}</span><input data-field="${escapeHtml(name)}" value="${escapeHtml(value)}" /></label>`;
}

function populateField(root: HTMLElement, name: string, value: string): void {
  const field = root.querySelector<HTMLInputElement>(`[data-field="${name}"]`);
  if (field) field.value = value;
}

function getFieldValue(root: HTMLElement, name: string): string {
  return root.querySelector<HTMLInputElement>(`[data-field="${name}"]`)?.value ?? '';
}

function loadActiveDocument(
  organization: OrganizationConfig,
  template: NonNullable<OrganizationConfig['templates'][number]>,
  storage: LocalStorageDocumentStorage,
): CommunicationDocument {
  const activeId = localStorage.getItem('ci:active-document');
  if (activeId) {
    const loaded = storage.load(activeId);
    if (loaded && loaded.templateId === template.id) return loaded;
  }

  const document = createDocument({
    template,
    year: new Date().getFullYear(),
    number: 0,
    from: organization.fields.from.defaultValue,
    to: organization.fields.to.defaultValue,
    subject: organization.fields.subject.defaultValue,
  });
  localStorage.setItem('ci:active-document', document.id);
  return document;
}

function renderDocumentNumber(root: HTMLOutputElement, document: CommunicationDocument): void {
  root.textContent = document.number > 0
    ? `Documento nº ${document.number}/${document.year}`
    : 'Rascunho';
}

function updateIssueButton(button: HTMLButtonElement, document: CommunicationDocument): void {
  const issued = document.number > 0;
  button.disabled = issued;
  button.textContent = issued ? 'Documento emitido' : 'Emitir documento';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });
}
