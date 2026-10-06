import { createDocument } from '../document/createDocument';
import { DocumentIssuer } from '../document/DocumentIssuer';
import { Editor } from '../editor/Editor';
import { GraphicConnectorInteractions } from '../graphics/GraphicConnectorInteractions';
import { GraphicElementInteractions } from '../graphics/GraphicElementInteractions';
import { renderHorizontalRuler } from '../layout/RulerView';
import { getObservability } from '../observability/Observability';
import { PdfExporter } from '../pdf/PdfExporter';
import { AutosaveController } from '../storage/AutosaveController';
import { LocalStorageDocumentStorage } from '../storage/LocalStorageDocumentStorage';
import type { OrganizationConfig, TemplateConfig } from '../types/configuration';
import type { CommunicationDocument, DocumentStatus } from '../types/document';
import { createAppActions } from './AppActions';
import type { AppState } from './AppState';
import { getAppElements, getFieldValue, renderDocument, renderPreview, renderShell, setPreviewZoom, updateIssueButton, updatePdfButton } from './AppView';

const ACTIVE_DOCUMENT_KEY = 'ci:active-document';
const LAYOUT_CONFIG_KEY = 'ci:layout-config';

export class AppController {
  public constructor(private readonly root: HTMLElement, private readonly organization: OrganizationConfig) {}

  public render(): void {
  applySavedLayoutConfig(this.organization);
  const template = this.organization.templates.find((item) => item.id === this.organization.defaultTemplateId);
  if (!template) throw new Error(`Template não encontrado: ${this.organization.defaultTemplateId}`);

  this.root.innerHTML = renderShell(this.organization, template);
  const tableButton = this.root.ownerDocument.createElement('button');
  tableButton.type = 'button';
  tableButton.dataset.action = 'table-insert';
  tableButton.textContent = 'Tabela 2×3';
  tableButton.setAttribute('aria-label', 'Inserir tabela 2 por 3');
  const tableActions: Array<[string, string, string]> = [
    ['table-row-select', 'Linha', 'Selecionar linha'],
    ['table-column-select', 'Coluna', 'Selecionar coluna'],
    ['table-row-add', '+ Linha', 'Inserir linha'],
    ['table-row-delete', '− Linha', 'Excluir linha'],
    ['table-column-add', '+ Col', 'Inserir coluna'],
    ['table-column-delete', '− Col', 'Excluir coluna'],
    ['table-column-widen', 'Col +', 'Aumentar largura da coluna'],
    ['table-column-narrow', 'Col −', 'Reduzir largura da coluna'],
  ];
  const tableGroup = this.root.ownerDocument.createElement('div');
  tableGroup.className = 'toolbar-group table-tools';
  tableGroup.appendChild(tableButton);
  for (const [action, label, ariaLabel] of tableActions) {
    const button = this.root.ownerDocument.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.textContent = label;
    button.setAttribute('aria-label', ariaLabel);
    tableGroup.appendChild(button);
  }
  this.root.querySelector('.toolbar-groups')?.appendChild(tableGroup);
  const elements = getAppElements(this.root);
  const tableTools = tableGroup;
  let previewZoom = 100;
  const updatePreviewZoom = (value: number): void => {
    previewZoom = Math.min(150, Math.max(50, Math.round(value / 10) * 10));
    setPreviewZoom(this.root, previewZoom);
  };
  const graphicTools = this.root.querySelector<HTMLElement>('.graphic-tools');
  const connectorTools = this.root.querySelector<HTMLElement>('.connector-tools');
  const smartArtTools = this.root.querySelector<HTMLElement>('.smartart-tools');
  const storage = new LocalStorageDocumentStorage();
  const issuer = new DocumentIssuer({ storage });
  const pdfExporter = new PdfExporter();
  const state: AppState = { document: loadActiveDocument(template, storage), template, organization: this.organization };

  renderDocument(state.document, elements, this.organization, template);
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
  autosave.attach(state.document);
  setStatus('saved');
  updateIssueButton(elements.issueButton, state.document);
  updatePdfButton(elements.pdfButton, this.organization.features.pdfExport);
  const editor = new Editor(elements.editor);
  const syncTableTools = (): void => {
    tableTools.hidden = !editor.hasActiveTableCell();
  };
  const graphicsRoot = elements.editor.parentElement;
  if (!graphicsRoot) throw new Error('Canvas gráfico não encontrado.');
  const graphics = new GraphicElementInteractions(graphicsRoot, {
    onChange: () => sync(),
  });
  const connectors = new GraphicConnectorInteractions(graphicsRoot, {
    getElements: () => graphics.getElements(),
    onChange: () => sync(),
    onSelectionChange: () => {
      if (connectors.hasSelection()) graphics.clearSelection();
      syncConnectorTools();
      syncGraphicTools();
    },
  });
  const syncGraphicTools = (): void => {
    const selectedCount = graphics.getSelectedIds().length;
    if (graphicTools) graphicTools.hidden = selectedCount === 0;
    const connectButton = this.root.querySelector<HTMLButtonElement>('[data-action="graphic-connect"]');
    if (connectButton) connectButton.disabled = selectedCount !== 2;
  };
  const syncConnectorTools = (): void => {
    if (connectorTools) connectorTools.hidden = !connectors.hasSelection();
  };
  const syncSmartArtTools = (): void => {
    const selectedCount = graphics.getSelectedIds().length;
    if (smartArtTools) smartArtTools.hidden = selectedCount !== 1 || !graphics.getElements().some((element) => element.id === graphics.getSelectedIds()[0] && element.kind === 'smartart');
  };
  graphics.setElements(state.document.graphics ?? []);
  connectors.setConnectors(state.document.connectors ?? []);
  syncGraphicTools();
  syncConnectorTools();
  syncSmartArtTools();
  editor.setExternalHistoryHandlers(
    () => connectors.hasSelection() ? connectors.undo() : graphics.hasSelection() ? graphics.undo() : false,
    () => connectors.hasSelection() ? connectors.redo() : graphics.hasSelection() ? graphics.redo() : false,
  );
  const actions = createAppActions(
    state,
    editor,
    autosave,
    issuer,
    (name) => getFieldValue(this.root, name),
    () => graphics.getElements(),
    () => connectors.getConnectors(),
  );

  const syncRuler = (): void => {
    const ruler = elements.root.querySelector<HTMLElement>('#horizontal-ruler');
    if (!ruler) return;
    renderHorizontalRuler(
      ruler,
      {
        pageWidthMm: 210,
        marginLeftMm: this.organization.layout.marginLeftMm,
        marginRightMm: this.organization.layout.marginRightMm,
      },
      (side, valueMm) => {
        const key = side === 'left' ? 'marginLeftMm' : 'marginRightMm';
        this.organization.layout[key] = valueMm;
        persistLayoutConfig(this.organization);
        syncView();
      },
    );
  };

  const syncView = (): void => {
    updateIssueButton(elements.issueButton, state.document);
    renderPreview(elements.paper, this.organization, template, state.document);
    syncRuler();
  };

  syncRuler();
  updatePreviewZoom(previewZoom);

  const sync = (): void => { connectors.setElements(graphics.getElements()); actions.sync(); syncView(); syncTableTools(); syncGraphicTools(); syncConnectorTools(); syncSmartArtTools(); };

  editor.setSaveHandler(() => {
    sync();
    autosave.saveNow();
  });

  this.root.querySelector<HTMLElement>('.toolbar')?.addEventListener('pointerdown', () => {
    editor.rememberSelection();
  });

  elements.editor.addEventListener('click', syncTableTools);
  elements.editor.addEventListener('keyup', syncTableTools);
  elements.editor.addEventListener('focus', syncTableTools);
  graphicsRoot.addEventListener('pointerdown', () => queueMicrotask(() => { syncGraphicTools(); syncConnectorTools(); syncSmartArtTools(); }));
  document.addEventListener('selectionchange', syncTableTools);

  this.root.querySelectorAll<HTMLInputElement>('[data-field]').forEach((field) => {
    field.addEventListener('input', sync);
  });
  elements.editor.addEventListener('input', sync);

  this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      if (action === 'save') { sync(); autosave.saveNow(); return; }
      if (action === 'clear') {
        localStorage.removeItem(ACTIVE_DOCUMENT_KEY);
        actions.clear();
        const freshDocument = createDocument({ template, year: new Date().getFullYear(), number: 0 });
        state.document = freshDocument;
        localStorage.setItem(ACTIVE_DOCUMENT_KEY, freshDocument.id);
        autosave.attach(freshDocument);
        renderDocument(state.document, elements, this.organization, template);
        graphics.setElements(state.document.graphics ?? []);
        connectors.setConnectors(state.document.connectors ?? []);
        syncGraphicTools();
        syncConnectorTools();
        syncSmartArtTools();
        updateIssueButton(elements.issueButton, state.document);
        autosave.saveNow();
        syncRuler();
        return;
      }
      if (action === 'issue') {
        if (!(await actions.issue())) return;
        renderDocument(state.document, elements, this.organization, template);
        updateIssueButton(elements.issueButton, state.document);
        elements.status.textContent = `Documento nº ${state.document.number}/${state.document.year} emitido.`;
        elements.status.dataset.status = 'saved';
        syncRuler();
        return;
      }
      if (action === 'zoom-out') { updatePreviewZoom(previewZoom - 10); return; }
      if (action === 'zoom-reset') { updatePreviewZoom(100); return; }
      if (action === 'zoom-in') { updatePreviewZoom(previewZoom + 10); return; }
      if (action === 'pdf') {
        if (!this.organization.features.pdfExport) return;
        sync(); elements.pdfButton.disabled = true;
        const previous = elements.pdfButton.textContent;
        elements.pdfButton.textContent = 'Gerando PDF…';
        try {
          await pdfExporter.export(elements.paper, { filename: state.document.number > 0 ? `comunicacao_interna_${state.document.number}_${state.document.year}.pdf` : 'comunicacao_interna.pdf' });
          elements.status.textContent = 'PDF gerado com sucesso.';
          elements.status.dataset.status = 'saved';
        } catch (error) {
          getObservability().captureError(error, {
            operation: 'export',
            component: 'PdfExporter',
            documentId: state.document.id,
          });
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
        case 'table-insert': editor.insertTable(2, 3); break;
        case 'graphic-insert': graphics.insertShape(); break;
        case 'smartart-insert': graphics.insertSmartArt('process'); break;
        case 'smartart-node-add': graphics.addSmartArtNode(); break;
        case 'smartart-node-remove': graphics.removeSelectedSmartArtNode(); break;
        case 'smartart-node-edit': {
          const selectedNode = graphics.getSelectedSmartArtNodeId();
          if (!selectedNode) break;
          const current = graphics.getElements().find((element) => element.id === graphics.getSelectedIds()[0])?.smartArt?.nodes.find((node) => node.id === selectedNode)?.text ?? '';
          const value = this.root.ownerDocument.defaultView?.prompt('Editar nó SmartArt', current);
          if (value !== null && value !== undefined) graphics.editSelectedSmartArtNode(value);
          break;
        }
        case 'smartart-layout-process': graphics.setSelectedSmartArtLayout('process'); break;
        case 'smartart-layout-hierarchy': graphics.setSelectedSmartArtLayout('hierarchy'); break;
        case 'smartart-layout-cycle': graphics.setSelectedSmartArtLayout('cycle'); break;
        case 'graphic-duplicate': graphics.duplicateSelected(); break;
        case 'graphic-front': graphics.bringSelectedToFront(); break;
        case 'graphic-back': graphics.sendSelectedToBack(); break;
        case 'graphic-connect': {
          const ids = graphics.getSelectedIds();
          if (ids.length === 2) connectors.connect(ids[0]!, ids[1]!);
          break;
        }
        case 'connector-delete': connectors.deleteSelected(); break;
        case 'table-row-select': editor.selectTableRow(); break;
        case 'table-column-select': editor.selectTableColumn(); break;
        case 'table-row-add': editor.insertTableRow(); break;
        case 'table-row-delete': editor.deleteTableRow(); break;
        case 'table-column-add': editor.insertTableColumn(); break;
        case 'table-column-delete': editor.deleteTableColumn(); break;
        case 'table-column-widen': editor.resizeTableColumn(24); break;
        case 'table-column-narrow': editor.resizeTableColumn(-24); break;
        case 'font-inc': editor.fontSize('16px'); break;
        case 'font-dec': editor.fontSize('12px'); break;
        case 'upper': editor.toggleCase(true); break;
        case 'lower': editor.toggleCase(false); break;
        case 'copy': await editor.copy(); break;
        case 'cut': await editor.cut(); break;
        case 'paste': await editor.pastePlainText(); break;
        case 'undo': {
          if (connectors.hasSelection()) connectors.undo();
          else if (graphics.hasSelection()) graphics.undo();
          else editor.undo();
          break;
        }
        case 'redo': {
          if (connectors.hasSelection()) connectors.redo();
          else if (graphics.hasSelection()) graphics.redo();
          else editor.redo();
          break;
        }
        case 'clear-formatting': editor.clearFormatting(); break;
        default: return;
      }
      sync();
    });
  });

  this.root.querySelectorAll<HTMLInputElement>('[id^="margin-"]').forEach((input) => {
    input.addEventListener('change', () => {
      const marginKeys: Record<string, 'marginTopMm' | 'marginRightMm' | 'marginBottomMm' | 'marginLeftMm'> = {
        'margin-top': 'marginTopMm',
        'margin-right': 'marginRightMm',
        'margin-bottom': 'marginBottomMm',
        'margin-left': 'marginLeftMm',
      };
      const key = marginKeys[input.id];
      if (!key) return;
      const value = clampMargin(Number(input.value));
      this.organization.layout[key] = value;
      input.value = String(value);
      persistLayoutConfig(this.organization);
      syncView();
    });
  });

  this.root.querySelector<HTMLInputElement>('#header-asset')?.addEventListener('change', (event) => {
    this.organization.branding.headerAsset = (event.currentTarget as HTMLInputElement).value.trim() || undefined;
    persistLayoutConfig(this.organization);
    syncView();
  });

  this.root.querySelector<HTMLInputElement>('#footer-asset')?.addEventListener('change', (event) => {
    this.organization.branding.footerAsset = (event.currentTarget as HTMLInputElement).value.trim() || undefined;
    persistLayoutConfig(this.organization);
    syncView();
  });

  this.root.querySelector<HTMLSelectElement>('#font-family')?.addEventListener('change', (event) => { editor.fontFamily((event.currentTarget as HTMLSelectElement).value); sync(); });
  this.root.querySelector<HTMLSelectElement>('#font-size')?.addEventListener('change', (event) => { editor.fontSize((event.currentTarget as HTMLSelectElement).value); sync(); });
  this.root.querySelector<HTMLInputElement>('#font-color')?.addEventListener('input', (event) => { editor.color((event.currentTarget as HTMLInputElement).value); sync(); });
  }
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

function applySavedLayoutConfig(organization: OrganizationConfig): void {
  const raw = localStorage.getItem(LAYOUT_CONFIG_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Partial<OrganizationConfig['layout']> & {
      headerAsset?: string;
      footerAsset?: string;
    };
    organization.layout = {
      ...organization.layout,
      ...Object.fromEntries(
        Object.entries(saved)
          .filter(([key, value]) => ['marginTopMm', 'marginRightMm', 'marginBottomMm', 'marginLeftMm'].includes(key) && typeof value === 'number')
          .map(([key, value]) => [key, clampMargin(Number(value))]),
      ),
    };
    if (saved.headerAsset !== undefined) organization.branding.headerAsset = saved.headerAsset || undefined;
    if (saved.footerAsset !== undefined) organization.branding.footerAsset = saved.footerAsset || undefined;
  } catch (error) {
    getObservability().captureError(error, {
      operation: 'load-layout-config',
      component: 'App',
    });
    localStorage.removeItem(LAYOUT_CONFIG_KEY);
  }
}

function persistLayoutConfig(organization: OrganizationConfig): void {
  localStorage.setItem(LAYOUT_CONFIG_KEY, JSON.stringify({
    ...organization.layout,
    headerAsset: organization.branding.headerAsset ?? '',
    footerAsset: organization.branding.footerAsset ?? '',
  }));
}

function clampMargin(value: number): number {
  if (!Number.isFinite(value)) return 20;
  return Math.min(60, Math.max(0, Math.round(value)));
}
