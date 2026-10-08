import { FONT_FAMILY_OPTIONS, FONT_SIZE_OPTIONS } from '../editor/TypographyModel';
import { renderHorizontalRuler } from '../layout/RulerView';
import { getGraphicPageIndex } from '../pagination/DocumentFlow';
import { getPageMetrics, renderGraphicFlow } from '../pagination/DocumentFlowRenderer';
import { appendBodyAcrossPages, createPage, getPageContent, removeEmptyPages } from '../pagination/PaginationEngine';
import { sanitizeHtml } from '../security/sanitizer';
import type { OrganizationConfig, TemplateConfig } from '../types/configuration';
import type { CommunicationDocument } from '../types/document';

export interface AppElements {
  root: HTMLElement;
  editor: HTMLElement;
  paper: HTMLElement;
  status: HTMLOutputElement;
  issueButton: HTMLButtonElement;
  pdfButton: HTMLButtonElement;
  retrySaveButton: HTMLButtonElement;
}

export function renderShell(organization: OrganizationConfig, template: TemplateConfig): string {
  const fields = template.fields
    .map((field) => renderField(field.id, field.label, field.defaultValue ?? '', field.placeholder, field.required))
    .join('');
  const layout = organization.layout;
  const header = template.headerAsset ?? organization.branding.headerAsset ?? '';
  const templateOptions = organization.templates.map((item) => '<option value="' + escapeHtml(item.id) + '"' + (item.id === template.id ? ' selected' : '') + '>' + escapeHtml(item.name) + '</option>').join('');
  const footer = template.footerAsset ?? organization.branding.footerAsset ?? '';

  return `<main class="app-shell" style="--primary:${escapeHtml(organization.branding.primaryColor)};--secondary:${escapeHtml(organization.branding.secondaryColor)};--body-font:${escapeHtml(organization.branding.fontFamily)};--document-margin-top:${layout.marginTopMm}mm;--document-margin-right:${layout.marginRightMm}mm;--document-margin-bottom:${layout.marginBottomMm}mm;--document-margin-left:${layout.marginLeftMm}mm">
    <header class="app-header"><div><p class="eyebrow">${escapeHtml(organization.name)}</p><label class="template-selector"><span>Modelo</span><select id="template-selector" aria-label="Selecionar modelo de documento">${templateOptions}</select></label><h1>${escapeHtml(template.name)}</h1></div><div class="save-status-group"><output id="save-status" class="save-status" aria-live="polite" aria-atomic="true" tabindex="-1">Carregando…</output><button id="retry-save" type="button" class="retry-save hidden" data-action="retry-save" aria-label="Tentar salvar novamente">Tentar salvar</button></div></header>
    <section class="editor-panel" aria-label="Editor de comunicação">
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
              <div class="toolbar-group"><button type="button" data-action="align-left" aria-label="Alinhar à esquerda">⟸</button><button type="button" data-action="align-center" aria-label="Centralizar">≡</button><button type="button" data-action="align-right" aria-label="Alinhar à direita">⟹</button><button type="button" data-action="align-justify" aria-label="Justificar">≣</button></div>
              <div class="toolbar-group"><button type="button" data-action="list-unordered">• Lista</button><button type="button" data-action="list-ordered">1. Lista</button></div>
              <div class="toolbar-group"><select id="font-family" aria-label="Fonte"><option value="">Fonte</option>${FONT_FAMILY_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}</select><button type="button" data-action="font-inc" aria-label="Aumentar tamanho da fonte">A+</button><button type="button" data-action="font-dec" aria-label="Reduzir tamanho da fonte">A−</button><select id="font-size" aria-label="Tamanho"><option value="">Tam</option>${FONT_SIZE_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}</select><input id="font-color" type="color" value="#111111" aria-label="Cor da fonte"></div>
              <div class="toolbar-group"><button type="button" data-action="graphic-insert" aria-label="Inserir forma">Forma</button><button type="button" data-action="smartart-insert" aria-label="Inserir SmartArt">SmartArt</button></div><div class="toolbar-group smartart-tools" hidden><button type="button" data-action="smartart-node-add" aria-label="Adicionar nó SmartArt">+ Nó</button><button type="button" data-action="smartart-node-edit" aria-label="Editar nó SmartArt">Editar nó</button><button type="button" data-action="smartart-node-remove" aria-label="Remover nó SmartArt">− Nó</button><button type="button" data-action="smartart-layout-process" aria-label="Layout SmartArt processo">Processo</button><button type="button" data-action="smartart-layout-hierarchy" aria-label="Layout SmartArt hierarquia">Hierarquia</button><button type="button" data-action="smartart-layout-cycle" aria-label="Layout SmartArt ciclo">Ciclo</button></div><div class="toolbar-group graphic-tools" hidden><button type="button" data-action="graphic-duplicate" aria-label="Duplicar elemento">Duplicar</button><button type="button" data-action="graphic-front" aria-label="Trazer para frente">Frente</button><button type="button" data-action="graphic-back" aria-label="Enviar para trás">Trás</button><button type="button" data-action="graphic-connect" aria-label="Conectar dois elementos">Conectar</button></div><div class="toolbar-group connector-tools" hidden><button type="button" data-action="connector-delete" aria-label="Excluir conector">Excluir conector</button></div><div class="toolbar-group"><button type="button" data-action="copy" aria-label="Copiar seleção">Copiar</button><button type="button" data-action="cut" aria-label="Recortar seleção">Recortar</button><button type="button" data-action="paste" aria-label="Colar texto">Colar</button></div>
              <div class="toolbar-group"><button type="button" data-action="upper" aria-label="Transformar em maiúsculas">Aa↑</button><button type="button" data-action="lower" aria-label="Transformar em minúsculas">Aa↓</button><button type="button" data-action="clear-formatting" aria-label="Limpar formatação">🧹</button><button type="button" data-action="undo" aria-label="Desfazer">↶</button><button type="button" data-action="redo" aria-label="Refazer">↷</button></div>
            </div></section>
          </div>
        </details>
      </div>      <div class="workspace"><div class="editor-canvas"><article class="editor-page" aria-label="Documento A4"><header class="editor-page-header">${header ? `<img src="${escapeHtml(header)}" alt="" />` : ''}</header><div class="editor-page-content"><div class="editor-document-title">${escapeHtml(template.name)} <output id="editor-document-number"></output></div><div class="editor-document-date" id="editor-document-date"></div><div class="editor-metadata">${fields}</div><div id="editor" class="editor-surface" contenteditable="true" role="textbox" aria-label="Corpo da comunicação" aria-multiline="true" spellcheck="true"></div><div class="editor-signature" aria-label="Assinatura do documento"><div>${organization.branding.signatureLocation ? `${escapeHtml(organization.branding.signatureLocation)}, ` : ''}<span id="editor-signature-date"></span>.</div><strong>${escapeHtml(organization.branding.signatureName ?? '')}</strong><div>${escapeHtml(organization.branding.signatureRole ?? '')}</div></div></div><footer class="editor-page-footer">${footer ? `<img src="${escapeHtml(footer)}" alt="" />` : ''}</footer></article></div><div class="preview-column"><div class="preview-controls" role="toolbar" aria-label="Controles de visualização"><div class="page-navigation" role="group" aria-label="Navegação de páginas"><button type="button" data-action="page-prev" aria-label="Página anterior">‹</button><output id="page-indicator" aria-live="polite">Página 1 de 1</output><button type="button" data-action="page-next" aria-label="Próxima página">›</button></div><div class="zoom-navigation" role="group" aria-label="Zoom"><button type="button" data-action="zoom-out" aria-label="Reduzir zoom">−</button><output id="preview-zoom" aria-live="polite">100%</output><button type="button" data-action="zoom-reset" aria-label="Redefinir zoom">100%</button><button type="button" data-action="zoom-in" aria-label="Aumentar zoom">+</button></div></div><div id="horizontal-ruler" class="horizontal-ruler"></div><div class="preview-wrap" style="--preview-zoom:1"><div id="paper" class="paper" role="document" aria-label="Pré-visualização A4 multi-página" tabindex="0"></div></div></div></div>
    </section>
  </main>`;
}

export function getAppElements(root: HTMLElement): AppElements {
  const editor = root.querySelector<HTMLElement>('#editor');
  const paper = root.querySelector<HTMLElement>('#paper');
  const status = root.querySelector<HTMLOutputElement>('#save-status');
  const issueButton = root.querySelector<HTMLButtonElement>('[data-action="issue"]');
  const pdfButton = root.querySelector<HTMLButtonElement>('[data-action="pdf"]');
  const retrySaveButton = root.querySelector<HTMLButtonElement>('[data-action="retry-save"]');
  if (!editor || !paper || !status || !issueButton || !pdfButton || !retrySaveButton) throw new Error('Estrutura do editor não encontrada.');
  return { root, editor, paper, status, issueButton, pdfButton, retrySaveButton };
}

export function renderDocument(document: CommunicationDocument, elements: AppElements, organization: OrganizationConfig, template: TemplateConfig): void {
  elements.editor.innerHTML = sanitizeHtml(document.bodyHtml);
  const metadata = elements.root.querySelector<HTMLElement>('.editor-metadata');
  if (metadata) metadata.innerHTML = template.fields.map((field) => renderField(field.id, field.label, '', field.placeholder, field.required)).join('');
  for (const field of template.fields) populateField(elements.root, field.id, getDocumentField(document, field.id));
  const header = template.headerAsset ?? organization.branding.headerAsset ?? '';
  const footer = template.footerAsset ?? organization.branding.footerAsset ?? '';
  const pageHeader = elements.root.querySelector<HTMLElement>('.editor-page-header');
  const pageFooter = elements.root.querySelector<HTMLElement>('.editor-page-footer');
  if (pageHeader) pageHeader.innerHTML = header ? `<img src="${escapeHtml(header)}" alt="" />` : '';
  if (pageFooter) pageFooter.innerHTML = footer ? `<img src="${escapeHtml(footer)}" alt="" />` : '';
  const documentTitle = elements.root.querySelector<HTMLElement>('.editor-document-title');
  if (documentTitle) documentTitle.innerHTML = `${escapeHtml(template.name)} <output id="editor-document-number"></output>`;
  const appTitle = elements.root.querySelector<HTMLElement>('.app-header h1');
  if (appTitle) appTitle.textContent = template.name;
  const numberOutput = elements.root.querySelector<HTMLOutputElement>('#editor-document-number');
  if (numberOutput) numberOutput.textContent = document.number > 0 ? `Nº ${document.number}/${document.year}` : 'Rascunho';
  const dateOutput = elements.root.querySelector<HTMLElement>('#editor-document-date');
  const signatureDate = elements.root.querySelector<HTMLElement>('#editor-signature-date');
  const formattedDate = formatDate(new Date());
  if (dateOutput) dateOutput.textContent = formattedDate;
  if (signatureDate) signatureDate.textContent = formattedDate;
  renderPreview(elements.paper, organization, template, document);
  const ruler = elements.root.querySelector<HTMLElement>('#horizontal-ruler');
  if (ruler) renderHorizontalRuler(ruler, { pageWidthMm: 210, marginLeftMm: organization.layout.marginLeftMm, marginRightMm: organization.layout.marginRightMm });
}

export function renderPreview(root: HTMLElement, organization: OrganizationConfig, template: TemplateConfig, document: CommunicationDocument): void {
  const composition = document.composition ?? {
    headerAsset: template.headerAsset ?? organization.branding.headerAsset,
    footerAsset: template.footerAsset ?? organization.branding.footerAsset,
    signatureName: organization.branding.signatureName,
    signatureRole: organization.branding.signatureRole,
    signatureLocation: organization.branding.signatureLocation,
  };
  const header = composition.headerAsset;
  const footer = composition.footerAsset;
  const signatureName = composition.signatureName ?? '';
  const signatureRole = composition.signatureRole ?? '';
  const location = composition.signatureLocation ?? '';
  const date = formatDate(new Date());
  const fields = template.fields.map((field) => renderPreviewField(field.label, getDocumentField(document, field.id))).join('');
  const body = sanitizeHtml(document.bodyHtml);
  const pages: HTMLElement[] = [];
  const activePage = Number(root.dataset.activePage) || 1;
  root.innerHTML = '';

  const firstPage = createPage(root, { layout: organization.layout, header, footer }, pages);
  const firstContent = getPageContent(firstPage);
  firstContent.insertAdjacentHTML('beforeend', `<div class="paper-title">${escapeHtml(template.name)} <span>${document.number > 0 ? `Nº ${document.number}/${document.year}` : ''}</span></div>${fields}`);
  appendBodyAcrossPages(root, pages, firstContent, body, { layout: organization.layout, header, footer });

  const graphicMetrics = getPageMetrics(organization.layout);
  const graphics = document.graphics ?? [];
  const requiredGraphicPages = graphics.reduce(
    (max, element) => Math.max(max, getGraphicPageIndex(element, graphicMetrics) + 1),
    1,
  );
  while (pages.length < requiredGraphicPages) {
    createPage(root, { layout: organization.layout, header, footer }, pages);
  }
  pages.forEach((page, index) => {
    renderGraphicFlow(getPageContent(page), {
      elements: graphics,
      connectors: document.connectors ?? [],
      pageIndex: index,
      metrics: graphicMetrics,
    });
  });

  const lastPage = pages[pages.length - 1];
  if (!lastPage) return;
  let lastContent = getPageContent(lastPage);
  const signature = root.ownerDocument.createElement('div');
  signature.className = 'paper-signature';
  signature.innerHTML = `<div>${location ? `${escapeHtml(location)}, ${date}.` : date}</div><strong>${escapeHtml(signatureName)}</strong><div>${escapeHtml(signatureRole)}</div>`;
  lastContent.appendChild(signature);
  if (lastContent.scrollHeight > lastContent.clientHeight) {
    lastContent.removeChild(signature);
    lastContent = getPageContent(createPage(root, { layout: organization.layout, header, footer }, pages));
    lastContent.appendChild(signature);
  }

  removeEmptyPages(pages);
  setActivePreviewPage(root, Math.min(activePage, pages.length));
}

export function populateField(root: HTMLElement, name: string, value: string): void {
  const field = root.querySelector<HTMLInputElement>(`[data-field="${escapeSelector(name)}"]`);
  if (field) field.value = value;
}

export function getFieldValue(root: HTMLElement, name: string): string {
  return root.querySelector<HTMLInputElement>(`[data-field="${escapeSelector(name)}"]`)?.value ?? '';
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

export function setActivePreviewPage(root: HTMLElement, pageNumber: number): void {
  const pages = Array.from(root.querySelectorAll<HTMLElement>('.paper-page'));
  if (!pages.length) return;
  const page = Math.min(pages.length, Math.max(1, Math.round(pageNumber)));
  root.dataset.activePage = String(page);
  pages.forEach((item, index) => {
    const active = index + 1 === page;
    item.dataset.pageNumber = String(index + 1);
    item.dataset.active = String(active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });
  const indicator = root.parentElement?.parentElement?.querySelector<HTMLOutputElement>('#page-indicator');
  if (indicator) {
    indicator.value = `Página ${page} de ${pages.length}`;
    indicator.textContent = `Página ${page} de ${pages.length}`;
  }
  const previous = root.parentElement?.parentElement?.querySelector<HTMLButtonElement>('[data-action="page-prev"]');
  const next = root.parentElement?.parentElement?.querySelector<HTMLButtonElement>('[data-action="page-next"]');
  if (previous) previous.disabled = page <= 1;
  if (next) next.disabled = page >= pages.length;
}

export function navigatePreviewPage(root: HTMLElement, direction: -1 | 1): void {
  const pages = Array.from(root.querySelectorAll<HTMLElement>('.paper-page'));
  if (!pages.length) return;
  const current = Number(root.dataset.activePage) || 1;
  const target = Math.min(pages.length, Math.max(1, current + direction));
  setActivePreviewPage(root, target);
  pages[target - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
