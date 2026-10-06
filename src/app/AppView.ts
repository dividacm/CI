import { FONT_FAMILY_OPTIONS, FONT_SIZE_OPTIONS } from '../editor/TypographyModel';
import { appendBodyAcrossPages, createPage, getPageContent, removeEmptyPages } from '../pagination/PaginationEngine';
import { renderHorizontalRuler } from '../layout/RulerView';
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
  const fields = template.fields
    .map((field) => renderField(field.id, field.label, field.defaultValue ?? '', field.placeholder, field.required))
    .join('');
  const layout = organization.layout;
  const header = template.headerAsset ?? organization.branding.headerAsset ?? '';
  const footer = template.footerAsset ?? organization.branding.footerAsset ?? '';

  return `<main class="app-shell" style="--primary:${escapeHtml(organization.branding.primaryColor)};--secondary:${escapeHtml(organization.branding.secondaryColor)};--body-font:${escapeHtml(organization.branding.fontFamily)}">
    <header class="app-header"><div><p class="eyebrow">${escapeHtml(organization.name)}</p><h1>${escapeHtml(template.name)}</h1><output id="document-number" class="document-number">Rascunho</output></div><output id="save-status" class="save-status" aria-live="polite">Carregando…</output></header>
    <section class="editor-panel" aria-label="Editor de comunicação">
      <div class="field-grid">${fields}</div>
      <div class="toolbar" role="toolbar" aria-label="Ferramentas do editor">
        <div class="toolbar-actions toolbar-primary-actions"><button type="button" data-action="save" class="action-green">Salvar</button><button type="button" data-action="clear" class="action-gray">Limpar</button><button type="button" data-action="issue" class="action-primary">Emitir documento</button><button type="button" data-action="pdf" class="action-orange">Baixar PDF</button></div>
        <details class="tools-menu">
          <summary>Ferramentas</summary>
          <div class="tools-panel">
            <section class="tool-section" aria-labelledby="page-tools-title"><h2 id="page-tools-title">Layout A4</h2><div class="layout-settings">
              ${renderNumberSetting('Margem superior', 'margin-top', layout.marginTopMm)}
              ${renderNumberSetting('Margem direita', 'margin-right', layout.marginRightMm)}
              ${renderNumberSetting('Margem inferior', 'margin-bottom', layout.marginBottomMm)}
              ${renderNumberSetting('Margem esquerda', 'margin-left', layout.marginLeftMm)}
              <label class="asset-setting"><span>Cabeçalho (URL/caminho)</span><input id="header-asset" value="${escapeHtml(header)}" placeholder="/assets/cab.png" /></label>
              <label class="asset-setting"><span>Rodapé (URL/caminho)</span><input id="footer-asset" value="${escapeHtml(footer)}" placeholder="/assets/rodape.png" /></label>
            </div></section>
            <section class="tool-section" aria-labelledby="format-tools-title"><h2 id="format-tools-title">Formatação</h2><div class="toolbar-groups">
              <div class="toolbar-group"><button type="button" data-action="bold" aria-label="Negrito"><strong>N</strong></button><button type="button" data-action="italic" aria-label="Itálico"><em>I</em></button><button type="button" data-action="underline" aria-label="Sublinhado"><u>S</u></button></div>
              <div class="toolbar-group"><button type="button" data-action="align-left">⟸</button><button type="button" data-action="align-center">≡</button><button type="button" data-action="align-right">⟹</button><button type="button" data-action="align-justify">≣</button></div>
              <div class="toolbar-group"><button type="button" data-action="list-unordered">• Lista</button><button type="button" data-action="list-ordered">1. Lista</button></div>
              <div class="toolbar-group"><select id="font-family" aria-label="Fonte"><option value="">Fonte</option>${FONT_FAMILY_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}</select><button type="button" data-action="font-inc">A+</button><button type="button" data-action="font-dec">A−</button><select id="font-size" aria-label="Tamanho"><option value="">Tam</option>${FONT_SIZE_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}</select><input id="font-color" type="color" value="#111111" aria-label="Cor da fonte"></div>
              <div class="toolbar-group"><button type="button" data-action="graphic-insert" aria-label="Inserir forma">Forma</button><button type="button" data-action="smartart-insert" aria-label="Inserir SmartArt">SmartArt</button></div><div class="toolbar-group smartart-tools" hidden><button type="button" data-action="smartart-node-add" aria-label="Adicionar nó SmartArt">+ Nó</button><button type="button" data-action="smartart-node-edit" aria-label="Editar nó SmartArt">Editar nó</button><button type="button" data-action="smartart-node-remove" aria-label="Remover nó SmartArt">− Nó</button><button type="button" data-action="smartart-layout-process">Processo</button><button type="button" data-action="smartart-layout-hierarchy">Hierarquia</button><button type="button" data-action="smartart-layout-cycle">Ciclo</button></div><div class="toolbar-group graphic-tools" hidden><button type="button" data-action="graphic-duplicate" aria-label="Duplicar elemento">Duplicar</button><button type="button" data-action="graphic-front" aria-label="Trazer para frente">Frente</button><button type="button" data-action="graphic-back" aria-label="Enviar para trás">Trás</button><button type="button" data-action="graphic-connect" aria-label="Conectar dois elementos">Conectar</button></div><div class="toolbar-group connector-tools" hidden><button type="button" data-action="connector-delete" aria-label="Excluir conector">Excluir conector</button></div><div class="toolbar-group"><button type="button" data-action="copy">Copiar</button><button type="button" data-action="cut">Recortar</button><button type="button" data-action="paste">Colar</button></div>
              <div class="toolbar-group"><button type="button" data-action="upper">Aa↑</button><button type="button" data-action="lower">Aa↓</button><button type="button" data-action="clear-formatting">🧹</button><button type="button" data-action="undo">↶</button><button type="button" data-action="redo">↷</button></div>
            </div></section>
          </div>
        </details>
      </div>      <div class="workspace"><div class="editor-canvas"><article id="editor" class="editor-surface" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true"></article></div><div class="preview-column"><div class="preview-controls" role="toolbar" aria-label="Controles de visualização"><button type="button" data-action="zoom-out" aria-label="Reduzir zoom">−</button><output id="preview-zoom" aria-live="polite">100%</output><button type="button" data-action="zoom-reset" aria-label="Redefinir zoom">100%</button><button type="button" data-action="zoom-in" aria-label="Aumentar zoom">+</button></div><div id="horizontal-ruler" class="horizontal-ruler"></div><div class="preview-wrap" style="--preview-zoom:1"><div id="paper" class="paper" role="document" aria-label="Pré-visualização A4"></div></div></div></div>
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
  const ruler = elements.root.querySelector<HTMLElement>('#horizontal-ruler');
  if (ruler) renderHorizontalRuler(ruler, { pageWidthMm: 210, marginLeftMm: organization.layout.marginLeftMm, marginRightMm: organization.layout.marginRightMm });
}

export function renderPreview(root: HTMLElement, organization: OrganizationConfig, template: TemplateConfig, document: CommunicationDocument): void {
  const header = template.headerAsset ?? organization.branding.headerAsset;
  const footer = template.footerAsset ?? organization.branding.footerAsset;
  const signatureName = organization.branding.signatureName ?? '';
  const signatureRole = organization.branding.signatureRole ?? '';
  const location = organization.branding.signatureLocation ?? '';
  const date = formatDate(new Date());
  const fields = template.fields.map((field) => renderPreviewField(field.label, getDocumentField(document, field.id))).join('');
  const body = sanitizeHtml(document.bodyHtml);
  const pages: HTMLElement[] = [];
  root.innerHTML = '';

  const firstPage = createPage(root, organization.layout, header, footer, pages);
  const firstContent = getPageContent(firstPage);
  firstContent.insertAdjacentHTML('beforeend', `<div class="paper-title">${escapeHtml(template.name)} <span>${document.number > 0 ? `Nº ${document.number}/${document.year}` : ''}</span></div>${fields}`);
  appendBodyAcrossPages(root, pages, firstContent, body, { layout: organization.layout, header, footer });

  const lastPage = pages[pages.length - 1];
  if (!lastPage) return;
  let lastContent = getPageContent(lastPage);
  const signature = root.ownerDocument.createElement('div');
  signature.className = 'paper-signature';
  signature.innerHTML = `<div>${location ? `${escapeHtml(location)}, ${date}.` : date}</div><strong>${escapeHtml(signatureName)}</strong><div>${escapeHtml(signatureRole)}</div>`;
  lastContent.appendChild(signature);
  if (lastContent.scrollHeight > lastContent.clientHeight) {
    lastContent.removeChild(signature);
    lastContent = getPageContent(createPage(root, organization.layout, header, footer, pages));
    lastContent.appendChild(signature);
  }

  removeEmptyPages(pages);
}

export function populateField(root: HTMLElement, name: string, value: string): void {
  const field = root.querySelector<HTMLInputElement>(`[data-field="${escapeSelector(name)}"]`);
  if (field) field.value = value;
}

export function getFieldValue(root: HTMLElement, name: string): string {
  return root.querySelector<HTMLInputElement>(`[data-field="${escapeSelector(name)}"]`)?.value ?? '';
}

export function renderDocumentNumber(root: HTMLOutputElement, document: CommunicationDocument): void {
  root.textContent = document.number > 0 ? `Documento nº ${document.number}/${document.year}` : 'Rascunho';
}

export function updateIssueButton(button: HTMLButtonElement, document: CommunicationDocument): void {
  const issued = document.number > 0;
  button.disabled = issued;
  button.textContent = issued ? 'Documento emitido' : 'Emitir documento';
}

export function updatePdfButton(button: HTMLButtonElement, enabled: boolean): void {
  button.hidden = !enabled;
}

function getDocumentField(document: CommunicationDocument, id: string): string { return document.fields[id] ?? ''; }
function renderPreviewField(label: string, value: string): string { return `<div class="preview-field"><span>${escapeHtml(label)}</span><div>${escapeHtml(value)}</div></div>`; }
function renderField(name: string, label: string, value: string, placeholder?: string, required = false): string { return `<label class="field"><span>${escapeHtml(label)}</span><input data-field="${escapeHtml(name)}" value="${escapeHtml(value)}"${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''}${required ? ' required' : ''} /></label>`; }
function renderNumberSetting(label: string, id: string, value: number): string { return `<label class="layout-setting"><span>${escapeHtml(label)}</span><input id="${id}" type="number" min="0" max="60" step="1" value="${value}"><span>mm</span></label>`; }
function formatDate(date: Date): string { return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date); }
function escapeSelector(value: string): string { return value.replace(/(["\\])/g, '\\$1'); }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => { const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }; return entities[character] ?? character; }); }

export function setPreviewZoom(root: HTMLElement, zoomPercent: number): void {
  const zoom = Math.min(150, Math.max(50, Math.round(zoomPercent / 10) * 10));
  const previewWrap = root.querySelector<HTMLElement>('.preview-wrap');
  const output = root.querySelector<HTMLOutputElement>('#preview-zoom');
  if (!previewWrap || !output) return;
  previewWrap.style.setProperty('--preview-zoom', String(zoom / 100));
  output.value = `${zoom}%`;
  output.textContent = `${zoom}%`;
  previewWrap.dataset.zoom = String(zoom);
}
