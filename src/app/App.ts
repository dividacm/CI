import { DocumentIssuer } from '../document/DocumentIssuer';
import { createDocument } from '../document/createDocument';
import { Editor } from '../editor/Editor';
import { PdfExporter } from '../pdf/PdfExporter';
import { sanitizeHtml } from '../security/sanitizer';
import { AutosaveController } from '../storage/AutosaveController';
import { LocalStorageDocumentStorage } from '../storage/LocalStorageDocumentStorage';
import type { OrganizationConfig, TemplateConfig } from '../types/configuration';
import type { CommunicationDocument, DocumentStatus } from '../types/document';

const ACTIVE_DOCUMENT_KEY = 'ci:active-document';

export function renderApp(root: HTMLElement, organization: OrganizationConfig): void {
  const template = organization.templates.find((item) => item.id === organization.defaultTemplateId);
  if (!template) throw new Error(`Template não encontrado: ${organization.defaultTemplateId}`);

  root.innerHTML = renderShell(organization, template);
  const editorRoot = root.querySelector<HTMLElement>('#editor');
  const paper = root.querySelector<HTMLElement>('#paper');
  const statusRoot = root.querySelector<HTMLOutputElement>('#save-status');
  const numberRoot = root.querySelector<HTMLOutputElement>('#document-number');
  const issueButton = root.querySelector<HTMLButtonElement>('[data-action="issue"]');
  const pdfButton = root.querySelector<HTMLButtonElement>('[data-action="pdf"]');
  if (!editorRoot || !paper || !statusRoot || !numberRoot || !issueButton || !pdfButton) {
    throw new Error('Estrutura do editor não encontrada.');
  }

  const storage = new LocalStorageDocumentStorage();
  const issuer = new DocumentIssuer({ storage });
  const pdfExporter = new PdfExporter();
  let document = loadActiveDocument(template, storage);
  editorRoot.innerHTML = sanitizeHtml(document.bodyHtml);
  populateField(root, 'from', document.from);
  populateField(root, 'to', document.to);
  populateField(root, 'subject', document.subject);
  renderDocumentNumber(numberRoot, document);
  renderPreview(paper, organization, template, document);

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
  updatePdfButton(pdfButton, organization.features.pdfExport);
  const editor = new Editor(editorRoot);

  const sync = (): void => {
    document.from = getFieldValue(root, 'from');
    document.to = getFieldValue(root, 'to');
    document.subject = getFieldValue(root, 'subject');
    document.bodyHtml = sanitizeHtml(editorRoot.innerHTML);
    autosave.markDirty(document);
    updateIssueButton(issueButton, document);
    renderPreview(paper, organization, template, document);
  };

  root.querySelectorAll<HTMLInputElement>('[data-field]').forEach((field) => field.addEventListener('input', sync));
  editorRoot.addEventListener('input', sync);

  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      if (action === 'save') { sync(); autosave.saveNow(); return; }
      if (action === 'clear') { resetDocument(root, editorRoot, template, document); sync(); autosave.saveNow(); return; }
      if (action === 'issue') {
        if (document.number > 0) return;
        sync(); autosave.saveNow();
        document = issuer.issue(document);
        autosave.attach(document);
        renderDocumentNumber(numberRoot, document);
        updateIssueButton(issueButton, document);
        renderPreview(paper, organization, template, document);
        statusRoot.textContent = `Documento nº ${document.number}/${document.year} emitido.`;
        statusRoot.dataset.status = 'saved';
        return;
      }
      if (action === 'pdf') {
        if (!organization.features.pdfExport) return;
        sync(); pdfButton.disabled = true;
        const previous = pdfButton.textContent;
        pdfButton.textContent = 'Gerando PDF…';
        try {
          await pdfExporter.export(paper, { filename: document.number > 0 ? `comunicacao_interna_${document.number}_${document.year}.pdf` : 'comunicacao_interna.pdf' });
          statusRoot.textContent = 'PDF gerado com sucesso.';
          statusRoot.dataset.status = 'saved';
        } catch {
          statusRoot.textContent = 'Falha ao gerar PDF.';
          statusRoot.dataset.status = 'error';
        } finally { pdfButton.disabled = false; pdfButton.textContent = previous; }
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

function renderShell(organization: OrganizationConfig, template: TemplateConfig): string {
  return `<main class="app-shell" style="--primary:${escapeHtml(organization.branding.primaryColor)};--secondary:${escapeHtml(organization.branding.secondaryColor)};--body-font:${escapeHtml(organization.branding.fontFamily)}">
    <header class="app-header"><div><p class="eyebrow">${escapeHtml(organization.name)}</p><h1>${escapeHtml(template.name)}</h1><output id="document-number" class="document-number">Rascunho</output></div><output id="save-status" class="save-status" aria-live="polite">Carregando…</output></header>
    <section class="editor-panel" aria-label="Editor de comunicação">
      <div class="field-grid">${renderField('from', 'De', getField(template, 'from')?.defaultValue ?? '')}${renderField('to', 'Para', getField(template, 'to')?.defaultValue ?? '')}${renderField('subject', 'Assunto', getField(template, 'subject')?.defaultValue ?? '')}</div>
      <div class="toolbar" role="toolbar" aria-label="Formatação">
        <div class="toolbar-group"><button type="button" data-action="bold" aria-label="Negrito"><strong>N</strong></button><button type="button" data-action="italic" aria-label="Itálico"><em>I</em></button><button type="button" data-action="underline" aria-label="Sublinhado"><u>S</u></button></div>
        <div class="toolbar-group"><button type="button" data-action="align-left">⟸</button><button type="button" data-action="align-center">≡</button><button type="button" data-action="align-right">⟹</button><button type="button" data-action="align-justify">≣</button></div>
        <div class="toolbar-group"><button type="button" data-action="list-unordered">• Lista</button><button type="button" data-action="list-ordered">1. Lista</button></div>
        <div class="toolbar-group"><select id="font-family" aria-label="Fonte"><option value="">Fonte</option><option>Arial</option><option>Times New Roman</option><option>Courier New</option><option>Carlito</option></select><button type="button" data-action="font-inc">A+</button><button type="button" data-action="font-dec">A−</button><select id="font-size" aria-label="Tamanho"><option value="">Tam</option><option value="12px">12</option><option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="20px">20</option></select><input id="font-color" type="color" value="#111111" aria-label="Cor da fonte"></div>
        <div class="toolbar-group"><button type="button" data-action="copy">Copiar</button><button type="button" data-action="cut">Recortar</button><button type="button" data-action="paste">Colar</button></div>
        <div class="toolbar-group"><button type="button" data-action="upper">Aa↑</button><button type="button" data-action="lower">Aa↓</button><button type="button" data-action="clear-formatting">🧹</button><button type="button" data-action="undo">↶</button><button type="button" data-action="redo">↷</button></div>
        <div class="toolbar-group toolbar-actions"><button type="button" data-action="pdf" class="action-orange">Baixar PDF</button><button type="button" data-action="clear" class="action-gray">Limpar</button><button type="button" data-action="save" class="action-green">Salvar</button><button type="button" data-action="issue" class="action-primary">Emitir documento</button></div>
      </div>
      <div class="workspace"><article id="editor" class="editor-surface" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true"></article><div class="preview-wrap"><div id="paper" class="paper" role="document" aria-label="Pré-visualização A4"></div></div></div>
    </section>
  </main>`;
}

function renderPreview(root: HTMLElement, organization: OrganizationConfig, template: TemplateConfig, document: CommunicationDocument): void {
  const header = template.headerAsset ?? organization.branding.headerAsset;
  const footer = template.footerAsset ?? organization.branding.footerAsset;
  const signatureName = organization.branding.signatureName ?? '';
  const signatureRole = organization.branding.signatureRole ?? '';
  const location = organization.branding.signatureLocation ?? '';
  const date = formatDate(new Date());
  root.innerHTML = `<div class="paper-header">${header ? `<img src="${escapeHtml(header)}" alt="Cabeçalho">` : ''}</div><div class="paper-content"><div class="paper-title">COMUNICAÇÃO INTERNA <span>${document.number > 0 ? `Nº ${document.number}/${document.year}` : ''}</span></div>${renderPreviewField('De', document.from)}${renderPreviewField('Para', document.to)}${renderPreviewField('Assunto', document.subject)}<div class="paper-body">${sanitizeHtml(document.bodyHtml)}</div><div class="paper-signature"><div>${location ? `${escapeHtml(location)}, ${date}.` : date}</div><strong>${escapeHtml(signatureName)}</strong><div>${escapeHtml(signatureRole)}</div></div></div><div class="paper-footer">${footer ? `<img src="${escapeHtml(footer)}" alt="Rodapé">` : ''}</div>`;
}

function renderPreviewField(label: string, value: string): string { return `<div class="preview-field"><span>${escapeHtml(label)}</span><div>${escapeHtml(value)}</div></div>`; }
function renderField(name: string, label: string, value: string): string { return `<label class="field"><span>${escapeHtml(label)}</span><input data-field="${escapeHtml(name)}" value="${escapeHtml(value)}" /></label>`; }
function getField(template: TemplateConfig, id: string): TemplateConfig['fields'][number] | undefined { return template.fields.find((field) => field.id === id); }
function populateField(root: HTMLElement, name: string, value: string): void { const field = root.querySelector<HTMLInputElement>(`[data-field="${name}"]`); if (field) field.value = value; }
function getFieldValue(root: HTMLElement, name: string): string { return root.querySelector<HTMLInputElement>(`[data-field="${name}"]`)?.value ?? ''; }
function loadActiveDocument(template: TemplateConfig, storage: LocalStorageDocumentStorage): CommunicationDocument { const activeId = localStorage.getItem(ACTIVE_DOCUMENT_KEY); if (activeId) { const loaded = storage.load(activeId); if (loaded && loaded.templateId === template.id) return loaded; } const document = createDocument({ template, year: new Date().getFullYear(), number: 0 }); localStorage.setItem(ACTIVE_DOCUMENT_KEY, document.id); return document; }
function resetDocument(root: HTMLElement, editorRoot: HTMLElement, template: TemplateConfig, document: CommunicationDocument): void { document.number = 0; document.year = new Date().getFullYear(); document.from = getField(template, 'from')?.defaultValue ?? ''; document.to = getField(template, 'to')?.defaultValue ?? ''; document.subject = getField(template, 'subject')?.defaultValue ?? ''; document.bodyHtml = ''; editorRoot.innerHTML = ''; populateField(root, 'from', document.from); populateField(root, 'to', document.to); populateField(root, 'subject', document.subject); const number = root.querySelector<HTMLOutputElement>('#document-number'); if (number) renderDocumentNumber(number, document); const issue = root.querySelector<HTMLButtonElement>('[data-action="issue"]'); if (issue) updateIssueButton(issue, document); }
function renderDocumentNumber(root: HTMLOutputElement, document: CommunicationDocument): void { root.textContent = document.number > 0 ? `Documento nº ${document.number}/${document.year}` : 'Rascunho'; }
function updateIssueButton(button: HTMLButtonElement, document: CommunicationDocument): void { const issued = document.number > 0; button.disabled = issued; button.textContent = issued ? 'Documento emitido' : 'Emitir documento'; }
function updatePdfButton(button: HTMLButtonElement, enabled: boolean): void { button.hidden = !enabled; }
function formatDate(date: Date): string { return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date); }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => { const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }; return entities[character] ?? character; }); }
