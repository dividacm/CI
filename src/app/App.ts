import { DocumentIssuer } from '../document/DocumentIssuer';
import { createDocument } from '../document/createDocument';
import { Editor } from '../editor/Editor';
import { PdfExporter } from '../pdf/PdfExporter';
import { sanitizeHtml } from '../security/sanitizer';
import { AutosaveController } from '../storage/AutosaveController';
import { LocalStorageDocumentStorage } from '../storage/LocalStorageDocumentStorage';
import type { OrganizationConfig, TemplateConfig } from '../types/configuration';
import type { CommunicationDocument, DocumentStatus } from '../types/document';
import { getAppElements, getFieldValue, renderDocument, renderPreview, renderShell, updateIssueButton, updatePdfButton } from './AppView';

const ACTIVE_DOCUMENT_KEY = 'ci:active-document';

export function renderApp(root: HTMLElement, organization: OrganizationConfig): void {
  const template = organization.templates.find((item) => item.id === organization.defaultTemplateId);
  if (!template) throw new Error(`Template não encontrado: ${organization.defaultTemplateId}`);

  root.innerHTML = renderShell(organization, template);
  const elements = getAppElements(root);
  const storage = new LocalStorageDocumentStorage();
  const issuer = new DocumentIssuer({ storage });
  const pdfExporter = new PdfExporter();
  let document = loadActiveDocument(template, storage);

  renderDocument(document, elements, organization, template);
  const setStatus = (status: DocumentStatus): void => {
    const labels: Record<DocumentStatus, string> = {
      saved: 'Salvo localmente.',
      saving: 'Salvando…',
      dirty: 'Alterações pendentes.',
      error: 'Falha ao salvar. O conteúdo permanece nesta tela.',
    };
    elements.status.textContent = labels[status];
    elements.status.dataset.status = status;
  };

  const autosave = new AutosaveController({ storage, delayMs: 300, onStatusChange: setStatus });
  autosave.attach(document);
  setStatus('saved');
  updateIssueButton(elements.issueButton, document);
  updatePdfButton(elements.pdfButton, organization.features.pdfExport);
  const editor = new Editor(elements.editor);

  const sync = (): void => {
    document.from = getFieldValue(root, 'from');
    document.to = getFieldValue(root, 'to');
    document.subject = getFieldValue(root, 'subject');
    document.bodyHtml = sanitizeHtml(elements.editor.innerHTML);
    document.updatedAt = new Date().toISOString();
    autosave.markDirty(document);
    updateIssueButton(elements.issueButton, document);
    renderPreview(elements.paper, organization, template, document);
  };

  root.querySelectorAll<HTMLInputElement>('[data-field]').forEach((field) => field.addEventListener('input', sync));
  elements.editor.addEventListener('input', sync);

  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      if (action === 'save') { sync(); autosave.saveNow(); return; }
      if (action === 'clear') { resetDocument(root, elements.editor, template, document); sync(); autosave.saveNow(); return; }
      if (action === 'issue') {
        if (document.number > 0) return;
        sync(); autosave.saveNow();
        document = issuer.issue(document);
        autosave.attach(document);
        renderDocument(document, elements, organization, template);
        updateIssueButton(elements.issueButton, document);
        elements.status.textContent = `Documento nº ${document.number}/${document.year} emitido.`;
        elements.status.dataset.status = 'saved';
        return;
      }
      if (action === 'pdf') {
        if (!organization.features.pdfExport) return;
        sync(); elements.pdfButton.disabled = true;
        const previous = elements.pdfButton.textContent;
        elements.pdfButton.textContent = 'Gerando PDF…';
        try {
          await pdfExporter.export(elements.paper, { filename: document.number > 0 ? `comunicacao_interna_${document.number}_${document.year}.pdf` : 'comunicacao_interna.pdf' });
          elements.status.textContent = 'PDF gerado com sucesso.';
          elements.status.dataset.status = 'saved';
        } catch {
          elements.status.textContent = 'Falha ao gerar PDF.';
          elements.status.dataset.status = 'error';
        } finally { elements.pdfButton.disabled = false; elements.pdfButton.textContent = previous; }
        return;
      }
      switch (action) {
        case 'bold': editor.bold(); break;
        case 'italic': editor.italic(); break;
        case 'underline': editor.underline(); break;
        case 'align-left': editor.align('left'); break;
        case 'align-center': editor.align('center'); break;
        case 'align-right': editor.align('right'); break;
        case 'align-justify': editor.align('justify'); break;
        case 'list-unordered': editor.list('ul'); break;
        case 'list-ordered': editor.list('ol'); break;
        case 'font-inc': editor.fontSize('16px'); break;
        case 'font-dec': editor.fontSize('12px'); break;
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
      sync();
    });
  });

  root.querySelector<HTMLSelectElement>('#font-family')?.addEventListener('change', (event) => { editor.fontFamily((event.currentTarget as HTMLSelectElement).value); sync(); });
  root.querySelector<HTMLSelectElement>('#font-size')?.addEventListener('change', (event) => { editor.fontSize((event.currentTarget as HTMLSelectElement).value); sync(); });
  root.querySelector<HTMLInputElement>('#font-color')?.addEventListener('input', (event) => { editor.color((event.currentTarget as HTMLInputElement).value); sync(); });
}

function loadActiveDocument(template: TemplateConfig, storage: LocalStorageDocumentStorage): CommunicationDocument {
  const activeId = localStorage.getItem(ACTIVE_DOCUMENT_KEY);
  if (activeId) {
    const loaded = storage.load(activeId);
    if (loaded && loaded.templateId === template.id) return loaded;
  }
  const document = createDocument({ template, year: new Date().getFullYear(), number: 0 });
  localStorage.setItem(ACTIVE_DOCUMENT_KEY, document.id);
  return document;
}

function resetDocument(root: HTMLElement, editorRoot: HTMLElement, template: TemplateConfig, document: CommunicationDocument): void {
  document.number = 0;
  document.year = new Date().getFullYear();
  document.from = template.fields.find((field) => field.id === 'from')?.defaultValue ?? '';
  document.to = template.fields.find((field) => field.id === 'to')?.defaultValue ?? '';
  document.subject = template.fields.find((field) => field.id === 'subject')?.defaultValue ?? '';
  document.bodyHtml = '';
  document.updatedAt = new Date().toISOString();
  editorRoot.innerHTML = '';
  root.querySelector<HTMLInputElement>('[data-field="from"]')!.value = document.from;
  root.querySelector<HTMLInputElement>('[data-field="to"]')!.value = document.to;
  root.querySelector<HTMLInputElement>('[data-field="subject"]')!.value = document.subject;
}
