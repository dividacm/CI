import { sanitizeHtml } from '../security/sanitizer';
import type { OrganizationConfig, TemplateConfig } from '../types/configuration';
import type { CommunicationDocument } from '../types/document';

export interface AppElements {
  root: HTMLElement;
  editor: HTMLElement;
  paper: HTMLElement;
  status: HTMLOutputElement;
  number: HTMLOutputElement;
  issueButton: HTMLButtonElement;
  pdfButton: HTMLButtonElement;
}

export function renderShell(organization: OrganizationConfig, template: TemplateConfig): string {
  const fields = template.fields.map((field) => renderField(field.id, field.label, field.defaultValue ?? '', field.placeholder, field.required)).join('');
  return `<main class="app-shell" style="--primary:${escapeHtml(organization.branding.primaryColor)};--secondary:${escapeHtml(organization.branding.secondaryColor)};--body-font:${escapeHtml(organization.branding.fontFamily)}">
    <header class="app-header"><div><p class="eyebrow">${escapeHtml(organization.name)}</p><h1>${escapeHtml(template.name)}</h1><output id="document-number" class="document-number">Rascunho</output></div><output id="save-status" class="save-status" aria-live="polite">Carregando…</output></header>
    <section class="editor-panel" aria-label="Editor de comunicação">
      <div class="field-grid">${fields}</div>
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

export function getAppElements(root: HTMLElement): AppElements {
  const editor = root.querySelector<HTMLElement>('#editor');
  const paper = root.querySelector<HTMLElement>('#paper');
  const status = root.querySelector<HTMLOutputElement>('#save-status');
  const number = root.querySelector<HTMLOutputElement>('#document-number');
  const issueButton = root.querySelector<HTMLButtonElement>('[data-action="issue"]');
  const pdfButton = root.querySelector<HTMLButtonElement>('[data-action="pdf"]');
  if (!editor || !paper || !status || !number || !issueButton || !pdfButton) throw new Error('Estrutura do editor não encontrada.');
  return { root, editor, paper, status, number, issueButton, pdfButton };
}

export function renderDocument(document: CommunicationDocument, elements: AppElements, organization: OrganizationConfig, template: TemplateConfig): void {
  elements.editor.innerHTML = sanitizeHtml(document.bodyHtml);
  for (const field of template.fields) populateField(elements.root, field.id, getDocumentField(document, field.id));
  renderDocumentNumber(elements.number, document);
  renderPreview(elements.paper, organization, template, document);
}

export function renderPreview(root: HTMLElement, organization: OrganizationConfig, template: TemplateConfig, document: CommunicationDocument): void {
  const header = template.headerAsset ?? organization.branding.headerAsset;
  const footer = template.footerAsset ?? organization.branding.footerAsset;
  const signatureName = organization.branding.signatureName ?? '';
  const signatureRole = organization.branding.signatureRole ?? '';
  const location = organization.branding.signatureLocation ?? '';
  const date = formatDate(new Date());
  const fields = template.fields.map((field) => renderPreviewField(field.label, getDocumentField(document, field.id))).join('');
  root.innerHTML = `<div class="paper-header">${header ? `<img src="${escapeHtml(header)}" alt="Cabeçalho">` : ''}</div><div class="paper-content"><div class="paper-title">${escapeHtml(template.name)} <span>${document.number > 0 ? `Nº ${document.number}/${document.year}` : ''}</span></div>${fields}<div class="paper-body">${sanitizeHtml(document.bodyHtml)}</div><div class="paper-signature"><div>${location ? `${escapeHtml(location)}, ${date}.` : date}</div><strong>${escapeHtml(signatureName)}</strong><div>${escapeHtml(signatureRole)}</div></div></div><div class="paper-footer">${footer ? `<img src="${escapeHtml(footer)}" alt="Rodapé">` : ''}</div>`;
}

export function populateField(root: HTMLElement, name: string, value: string): void {
  const field = root.querySelector<HTMLInputElement>(`[data-field="${escapeSelector(name)}"]`);
  if (field) field.value = value;
}

export function getFieldValue(root: HTMLElement, name: string): string { return root.querySelector<HTMLInputElement>(`[data-field="${escapeSelector(name)}"]`)?.value ?? ''; }
export function renderDocumentNumber(root: HTMLOutputElement, document: CommunicationDocument): void { root.textContent = document.number > 0 ? `Documento nº ${document.number}/${document.year}` : 'Rascunho'; }
export function updateIssueButton(button: HTMLButtonElement, document: CommunicationDocument): void { const issued = document.number > 0; button.disabled = issued; button.textContent = issued ? 'Documento emitido' : 'Emitir documento'; }
export function updatePdfButton(button: HTMLButtonElement, enabled: boolean): void { button.hidden = !enabled; }

function getDocumentField(document: CommunicationDocument, id: string): string { return document.fields[id] ?? ''; }
function renderPreviewField(label: string, value: string): string { return `<div class="preview-field"><span>${escapeHtml(label)}</span><div>${escapeHtml(value)}</div></div>`; }
function renderField(name: string, label: string, value: string, placeholder?: string, required = false): string { return `<label class="field"><span>${escapeHtml(label)}</span><input data-field="${escapeHtml(name)}" value="${escapeHtml(value)}"${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''}${required ? ' required' : ''} /></label>`; }
function formatDate(date: Date): string { return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date); }
function escapeSelector(value: string): string { return value.replace(/(["\\])/g, '\\$1'); }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => { const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }; return entities[character] ?? character; }); }
