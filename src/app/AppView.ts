import { sanitizeHtml } from '../security/sanitizer';
import type { OrganizationConfig, PageLayoutConfig, TemplateConfig } from '../types/configuration';
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
              <div class="toolbar-group"><select id="font-family" aria-label="Fonte"><option value="">Fonte</option><option>Arial</option><option>Times New Roman</option><option>Courier New</option><option>Carlito</option></select><button type="button" data-action="font-inc">A+</button><button type="button" data-action="font-dec">A−</button><select id="font-size" aria-label="Tamanho"><option value="">Tam</option><option value="12px">12</option><option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="20px">20</option></select><input id="font-color" type="color" value="#111111" aria-label="Cor da fonte"></div>
              <div class="toolbar-group"><button type="button" data-action="copy">Copiar</button><button type="button" data-action="cut">Recortar</button><button type="button" data-action="paste">Colar</button></div>
              <div class="toolbar-group"><button type="button" data-action="upper">Aa↑</button><button type="button" data-action="lower">Aa↓</button><button type="button" data-action="clear-formatting">🧹</button><button type="button" data-action="undo">↶</button><button type="button" data-action="redo">↷</button></div>
            </div></section>
          </div>
        </details>
      </div>      <div class="workspace"><article id="editor" class="editor-surface" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true"></article><div class="preview-wrap"><div id="paper" class="paper" role="document" aria-label="Pré-visualização A4"></div></div></div>
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
  const body = sanitizeHtml(document.bodyHtml);
  const pages: HTMLElement[] = [];
  root.innerHTML = '';

  const firstPage = createPage(root, organization.layout, header, footer, pages);
  const firstContent = getPageContent(firstPage);
  firstContent.insertAdjacentHTML('beforeend', `<div class="paper-title">${escapeHtml(template.name)} <span>${document.number > 0 ? `Nº ${document.number}/${document.year}` : ''}</span></div>${fields}`);
  appendBodyAcrossPages(root, pages, firstContent, body, organization.layout, header, footer);

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
}

function appendBodyAcrossPages(
  root: HTMLElement,
  pages: HTMLElement[],
  current: HTMLElement,
  html: string,
  layout: PageLayoutConfig,
  header?: string,
  footer?: string,
): void {
  const holder = root.ownerDocument.createElement('div');
  holder.innerHTML = html || '<p><br></p>';

  for (const source of Array.from(holder.children)) {
    const node = source.cloneNode(true) as HTMLElement;
    current = appendNodeAcrossPages(root, pages, current, node, layout, header, footer);
  }
}

function appendNodeAcrossPages(
  root: HTMLElement,
  pages: HTMLElement[],
  current: HTMLElement,
  node: HTMLElement,
  layout: PageLayoutConfig,
  header?: string,
  footer?: string,
): HTMLElement {
  current.appendChild(node);
  if (!isOverflowing(current)) return current;

  current.removeChild(node);

  return appendSplittableBlockAcrossPages(root, pages, current, node, layout, header, footer);
}

function appendSplittableBlockAcrossPages(
  root: HTMLElement,
  pages: HTMLElement[],
  current: HTMLElement,
  node: HTMLElement,
  layout: PageLayoutConfig,
  header?: string,
  footer?: string,
): HTMLElement {
  const totalTextLength = node.textContent?.length ?? 0;
  if (!totalTextLength || !canSplitTextBlock(node)) {
    current = getPageContent(createPage(root, layout, header, footer, pages));
    current.appendChild(node);
    return current;
  }

  let low = 1;
  let high = totalTextLength;
  let best = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = cloneTextRange(node, 0, middle);
    if (!candidate) {
      low = middle + 1;
      continue;
    }

    current.appendChild(candidate);
    const overflowing = isOverflowing(current);
    current.removeChild(candidate);

    if (overflowing) high = middle - 1;
    else {
      best = middle;
      low = middle + 1;
    }
  }

  best = findPreferredBreak(node, best);

  if (best <= 0) {
    current = getPageContent(createPage(root, layout, header, footer, pages));
    current.appendChild(node);
    return current;
  }

  const firstPart = cloneTextRange(node, 0, best);
  const remainder = cloneTextRange(node, best, totalTextLength);
  if (!firstPart) {
    current = getPageContent(createPage(root, layout, header, footer, pages));
    current.appendChild(node);
    return current;
  }

  current.appendChild(firstPart);
  if (!remainder || !(remainder.textContent ?? '').trim()) return current;

  current = getPageContent(createPage(root, layout, header, footer, pages));
  current.appendChild(remainder);
  if (isOverflowing(current)) {
    return appendSplittableBlockAcrossPages(root, pages, current, remainder as HTMLElement, layout, header, footer);
  }
  return current;
}

function canSplitTextBlock(node: HTMLElement): boolean {
  return !['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'UL', 'OL'].includes(node.tagName);
}

function cloneTextRange(node: Node, start: number, end: number): Node | null {
  const textLength = node.textContent?.length ?? 0;
  if (end <= 0 || start >= textLength || start >= end) return null;

  let offset = 0;

  const cloneRange = (source: Node): Node | null => {
    if (source.nodeType === Node.TEXT_NODE) {
      const value = source.textContent ?? '';
      const nodeStart = offset;
      const nodeEnd = offset + value.length;
      offset = nodeEnd;
      const overlapStart = Math.max(start, nodeStart) - nodeStart;
      const overlapEnd = Math.min(end, nodeEnd) - nodeStart;
      if (overlapStart >= overlapEnd) return null;
      const ownerDocument = source.ownerDocument;
      if (!ownerDocument) throw new Error('Documento do nó de texto não encontrado.');
      return ownerDocument.createTextNode(value.slice(overlapStart, overlapEnd));
    }

    if (source.nodeType !== Node.ELEMENT_NODE) return null;

    const element = source as HTMLElement;
    const clone = element.cloneNode(false) as HTMLElement;
    for (const child of Array.from(element.childNodes)) {
      const childClone = cloneRange(child);
      if (childClone) clone.appendChild(childClone);
    }
    return clone.childNodes.length ? clone : null;
  };

  return cloneRange(node);
}

function findPreferredBreak(node: HTMLElement, best: number): number {
  if (best <= 0) return 0;
  const text = node.textContent ?? '';
  const windowStart = Math.max(0, best - 80);
  const segment = text.slice(windowStart, best);
  const breakOffset = Math.max(segment.lastIndexOf(' '), segment.lastIndexOf('\\n'), segment.lastIndexOf('\\t'));
  if (breakOffset < 0) return best;
  const preferred = windowStart + breakOffset;
  return preferred > 0 ? preferred : best;
}

function createPage(
  root: HTMLElement,
  layout: PageLayoutConfig,
  header: string | undefined,
  footer: string | undefined,
  pages: HTMLElement[],
): HTMLElement {
  const page = document.createElement('section');
  page.className = 'paper-page';
  page.innerHTML = `<div class="paper-header">${header ? `<img src="${escapeHtml(header)}" alt="Cabeçalho">` : ''}</div><div class="paper-page-content" style="padding:${layout.marginTopMm}mm ${layout.marginRightMm}mm ${layout.marginBottomMm}mm ${layout.marginLeftMm}mm"></div><div class="paper-footer">${footer ? `<img src="${escapeHtml(footer)}" alt="Rodapé">` : ''}</div>`;
  root.appendChild(page);
  pages.push(page);
  return page;
}

function getPageContent(page: HTMLElement): HTMLElement {
  const content = page.querySelector<HTMLElement>('.paper-page-content');
  if (!content) throw new Error('Área de conteúdo da página não encontrada.');
  return content;
}

function isOverflowing(content: HTMLElement): boolean {
  return content.scrollHeight > content.clientHeight;
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
