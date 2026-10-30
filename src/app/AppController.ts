import { resolveTemplate } from '../configuration/resolveTemplate';
import { createDocument } from '../document/createDocument';
import { DocumentIssuer } from '../document/DocumentIssuer';
import { createDocumentComposition, ensureDocumentComposition } from '../document/documentComposition';
import { Editor } from '../editor/Editor';
import { GraphicConnectorInteractions } from '../graphics/GraphicConnectorInteractions';
import { GraphicElementInteractions } from '../graphics/GraphicElementInteractions';
import { renderHorizontalRuler } from '../layout/RulerView';
import { getObservability } from '../observability/Observability';
import { PdfExporter } from '../pdf/PdfExporter';
import { AutosaveController } from '../storage/AutosaveController';
import { DocumentBackupError, MAX_DOCUMENT_BACKUP_BYTES, parseDocumentBackup, resolveImportedDocumentId, serializeDocumentBackup } from '../storage/DocumentBackup';
import { DocumentRepository } from '../storage/DocumentRepository';
import { LocalStorageDocumentStorage } from '../storage/LocalStorageDocumentStorage';
import type { OrganizationConfig } from '../types/configuration';
import type { DocumentStatus } from '../types/document';
import { createAppActions } from './AppActions';
import type { AppState } from './AppState';
import { getAppElements, getFieldValue, navigatePreviewPage, renderDocument, renderPreview, renderShell, setPreviewZoom, updateIssueButton, updatePdfButton } from './AppView';
import { CommandRegistry } from './CommandRegistry';

const LAYOUT_CONFIG_KEY = 'ci:layout-config';

export class AppController {
  public constructor(private readonly root: HTMLElement, private readonly organization: OrganizationConfig) {}

  public render(): void {
  applySavedLayoutConfig(this.organization);
  let template = resolveTemplate(this.organization);

  this.root.innerHTML = renderShell(this.organization, template);
  const densityKey = 'ci:ui-density';
  const densityOptions = ['comfortable', 'compact', 'tight'] as const;
  const savedDensity = localStorage.getItem(densityKey);
  const initialDensity = densityOptions.find((option) => option === savedDensity) ?? 'compact';
  const appShell = this.root.querySelector<HTMLElement>('.app-shell');
  const densitySelector = this.root.querySelector<HTMLSelectElement>('#ui-density');
  if (appShell) appShell.dataset.density = initialDensity;
  if (densitySelector) {
    densitySelector.value = initialDensity;
    densitySelector.addEventListener('change', () => {
      const selectedDensity = densityOptions.find((option) => option === densitySelector.value);
      if (!selectedDensity || !appShell) return;
      appShell.dataset.density = selectedDensity;
      localStorage.setItem(densityKey, selectedDensity);
    });
  }
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
  const tableInsertGroup = this.root.ownerDocument.createElement('div');
  tableInsertGroup.className = 'toolbar-group table-insert-tools';
  tableInsertGroup.appendChild(tableButton);
  const tableSelectionGroup = this.root.ownerDocument.createElement('div');
  tableSelectionGroup.className = 'toolbar-group table-selection-tools';
  for (const [action, label, ariaLabel] of tableActions) {
    const button = this.root.ownerDocument.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.textContent = label;
    button.setAttribute('aria-label', ariaLabel);
    tableSelectionGroup.appendChild(button);
  }
  const toolbarGroups = this.root.querySelector('.toolbar-groups');
  toolbarGroups?.append(tableInsertGroup, tableSelectionGroup);
  const elements = getAppElements(this.root);
  const tableTools = tableSelectionGroup;
  let previewZoom = 100;
  const updatePreviewZoom = (value: number): void => {
    previewZoom = Math.min(150, Math.max(50, Math.round(value / 10) * 10));
    setPreviewZoom(this.root, previewZoom);
  };
  const graphicTools = this.root.querySelector<HTMLElement>('.graphic-tools');
  const connectorTools = this.root.querySelector<HTMLElement>('.connector-tools');
  const smartArtTools = this.root.querySelector<HTMLElement>('.smartart-tools');
  const storage = new LocalStorageDocumentStorage();
  const repository = new DocumentRepository(storage);
  const issuer = new DocumentIssuer({ storage });
  const pdfExporter = new PdfExporter();
  const initialDocument = repository.loadActive(template);
  const initialCompositionCreated = ensureDocumentComposition(initialDocument, this.organization, template);
  if (initialCompositionCreated) storage.save(initialDocument);
  const state: AppState = { document: initialDocument, template, organization: this.organization };

  renderDocument(state.document, elements, this.organization, template);
  const setStatus = (status: DocumentStatus): void => {
    const labels: Record<DocumentStatus, string> = {
      saved: 'Salvo localmente.',
      saving: 'Salvando…',
      dirty: 'Alterações pendentes.',
      error: 'Falha ao salvar. O conteúdo permanece nesta tela.',
    };
    const hasRetry = status === 'error';
    elements.status.textContent = labels[status];
    elements.status.dataset.status = status;
    elements.retrySaveButton.hidden = !hasRetry;
    elements.retrySaveButton.classList.toggle('hidden', !hasRetry);
    elements.retrySaveButton.setAttribute('aria-hidden', hasRetry ? 'false' : 'true');
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
  syncTableTools();
  const graphicsRoot = elements.editor.parentElement;
  if (!graphicsRoot) throw new Error('Canvas gráfico não encontrado.');
  const graphics = new GraphicElementInteractions(graphicsRoot, {
    onChange: () => sync(),
    onSelectionChange: () => {
      if (graphics.hasSelection()) connectors.clearSelection();
      syncGraphicTools();
      syncConnectorTools();
      syncSmartArtTools();
    },
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

  let scheduledViewSync = false;
  const syncView = (): void => {
    updateIssueButton(elements.issueButton, state.document);
    renderPreview(elements.paper, this.organization, template, state.document);
    syncRuler();
  };
  const scheduleViewSync = (): void => {
    if (scheduledViewSync) return;
    scheduledViewSync = true;
    window.requestAnimationFrame(() => {
      scheduledViewSync = false;
      syncView();
    });
  };

  syncRuler();
  updatePreviewZoom(previewZoom);

  const sync = (renderImmediately = true): void => {
    connectors.setElements(graphics.getElements());
    actions.sync();
    if (renderImmediately) syncView();
    else scheduleViewSync();
    syncTableTools();
    syncGraphicTools();
    syncConnectorTools();
    syncSmartArtTools();
  };

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
  graphicsRoot.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('.graphic-element')) connectors.clearSelection();
    queueMicrotask(() => { syncGraphicTools(); syncConnectorTools(); syncSmartArtTools(); });
  }, true);
  document.addEventListener('selectionchange', syncTableTools);
  const syncToolbarState = (): void => {
    const selection = window.getSelection();
    const activeNode = selection?.anchorNode;
    const activeElement = activeNode instanceof Element ? activeNode : activeNode?.parentElement;
    const editorRoot = activeElement?.closest('#editor');
    const activeButtons: Record<string, boolean> = {
      bold: Boolean(editorRoot && activeElement?.closest('strong, b')),
      italic: Boolean(editorRoot && activeElement?.closest('em, i')),
      underline: Boolean(editorRoot && activeElement?.closest('u')),
    };
    const block = activeElement?.closest('p, div, li, h1, h2, h3, h4, h5, h6, blockquote') as HTMLElement | null;
    const alignment = block ? window.getComputedStyle(block).textAlign : '';
    activeButtons['align-left'] = alignment === 'left' || alignment === 'start';
    activeButtons['align-center'] = alignment === 'center';
    activeButtons['align-right'] = alignment === 'right' || alignment === 'end';
    activeButtons['align-justify'] = alignment === 'justify';

    for (const [action, active] of Object.entries(activeButtons)) {
      const button = this.root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
      if (!button) continue;
      button.setAttribute('aria-pressed', String(active));
      button.dataset.active = String(active);
    }
  };
  elements.editor.addEventListener('keyup', syncToolbarState);
  elements.editor.addEventListener('mouseup', syncToolbarState);
  elements.editor.addEventListener('focus', syncToolbarState);
  document.addEventListener('selectionchange', syncToolbarState);
  this.root.querySelector('.toolbar-groups')?.addEventListener('click', () => {
    queueMicrotask(syncToolbarState);
  });

  this.root.querySelector<HTMLSelectElement>('#template-selector')?.addEventListener('change', () => {
    const selectedTemplateId = this.root.querySelector<HTMLSelectElement>('#template-selector')?.value;
    if (!selectedTemplateId || selectedTemplateId === template.id) return;

    sync();
    autosave.saveNow();
    template = resolveTemplate(this.organization, selectedTemplateId);
    state.template = template;
    state.document = repository.loadActive(template);
    if (ensureDocumentComposition(state.document, this.organization, template)) {
      storage.save(state.document);
    }
    autosave.attach(state.document);
    renderDocument(state.document, elements, this.organization, template);
    graphics.setElements(state.document.graphics ?? []);
    connectors.setConnectors(state.document.connectors ?? []);
    syncGraphicTools();
    syncConnectorTools();
    syncSmartArtTools();
    updateIssueButton(elements.issueButton, state.document);
    syncRuler();
  });
  this.root.addEventListener('input', (event) => {
    if ((event.target as HTMLElement).matches?.('[data-field]')) sync(false);
  });
  elements.editor.addEventListener('input', () => sync(false));
  elements.paper.addEventListener('keydown', (event) => {
    if (event.key === 'PageUp') {
      event.preventDefault();
      navigatePreviewPage(elements.paper, -1);
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      navigatePreviewPage(elements.paper, 1);
    }
  });

  const backupImportInput = this.root.querySelector<HTMLInputElement>('#backup-import-file');
  backupImportInput?.addEventListener('change', async () => {
    const file = backupImportInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_DOCUMENT_BACKUP_BYTES) {
        throw new DocumentBackupError('O arquivo excede o limite de 2 MB.');
      }
      const candidate = parseDocumentBackup(await file.text(), template.id);
      const confirmed = this.root.ownerDocument.defaultView?.confirm(
        `Importar “${candidate.fields.subject || 'Documento sem assunto'}”? O documento atual será preservado. A restauração será criada como uma cópia quando o identificador já existir.`,
      );
      if (!confirmed) return;

      const imported = resolveImportedDocumentId(
        candidate,
        (id) => localStorage.getItem(`ci:document:${id}`) !== null,
      );
      storage.save(imported);
      repository.setActive(imported);
      state.document = imported;
      autosave.attach(imported);
      renderDocument(state.document, elements, this.organization, template);
      graphics.setElements(state.document.graphics ?? []);
      connectors.setConnectors(state.document.connectors ?? []);
      syncGraphicTools();
      syncConnectorTools();
      syncSmartArtTools();
      updateIssueButton(elements.issueButton, state.document);
      setStatus('saved');
      syncView();
      elements.status.textContent = 'Documento JSON restaurado. Confira o conteúdo antes de continuar.';
      elements.status.dataset.status = 'saved';
    } catch (error) {
      getObservability().captureError(error, {
        operation: 'import-document-backup',
        component: 'DocumentBackup',
      });
      elements.status.textContent = error instanceof Error
        ? `Não foi possível importar o backup: ${error.message}`
        : 'Não foi possível importar o backup. Verifique o arquivo e tente novamente.';
      elements.status.dataset.status = 'error';
    } finally {
      backupImportInput.value = '';
    }
  });

  this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      if (action === 'save') { sync(); autosave.saveNow(); return; }
      if (action === 'retry-save') { sync(); autosave.saveNow(); return; }
      if (action === 'clear') {
        repository.clearActive(template);
        actions.clear();
        const freshDocument = createDocument({
          template,
          year: new Date().getFullYear(),
          number: 0,
          composition: createDocumentComposition(this.organization, template),
        });
        state.document = freshDocument;
        repository.setActive(freshDocument);
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
      if (action === 'page-prev') { navigatePreviewPage(elements.paper, -1); return; }
      if (action === 'page-next') { navigatePreviewPage(elements.paper, 1); return; }
      if (action === 'zoom-out') { updatePreviewZoom(previewZoom - 10); return; }
      if (action === 'zoom-reset') { updatePreviewZoom(100); return; }
      if (action === 'zoom-in') { updatePreviewZoom(previewZoom + 10); return; }
      if (action === 'focus-editor') {
        const reduceMotion = this.root.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        elements.editor.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
        elements.editor.focus({ preventScroll: true });
        return;
      }
      if (action === 'backup-export') {
        sync();
        autosave.saveNow();
        try {
          const json = serializeDocumentBackup(state.document);
          const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const anchor = this.root.ownerDocument.createElement('a');
          const subject = (state.document.fields.subject || 'documento').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'documento';
          anchor.href = url;
          anchor.download = `ci-${subject}-${state.document.year}.json`;
          anchor.hidden = true;
          this.root.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
          elements.status.textContent = 'Backup JSON exportado. Guarde o arquivo em local institucional autorizado.';
          elements.status.dataset.status = 'saved';
        } catch (error) {
          getObservability().captureError(error, {
            operation: 'export-document-backup',
            component: 'DocumentBackup',
          });
          elements.status.textContent = error instanceof Error
            ? `Não foi possível exportar o backup: ${error.message}`
            : 'Não foi possível exportar o backup.';
          elements.status.dataset.status = 'error';
        }
        return;
      }
      if (action === 'backup-import') {
        backupImportInput?.click();
        return;
      }
      if (action === 'pdf') {
        if (!this.organization.features.pdfExport) return;
        // Flush the pending autosave before export so its delayed status callback
        // cannot overwrite the PDF result message.
        sync();
        autosave.saveNow();
        elements.pdfButton.disabled = true;
        const previous = elements.pdfButton.textContent;
        elements.pdfButton.textContent = 'Gerando PDF…';
        try {
          await pdfExporter.export(elements.paper, { filename: state.document.number > 0 ? `comunicacao_interna_${state.document.number}_${state.document.year}.pdf` : 'comunicacao_interna.pdf' });
          elements.status.textContent = 'PDF gerado com sucesso.';
          elements.status.dataset.status = 'saved';
          elements.retrySaveButton.hidden = true;
          elements.retrySaveButton.classList.add('hidden');
          elements.retrySaveButton.setAttribute('aria-hidden', 'true');
        } catch (error) {
          getObservability().captureError(error, {
            operation: 'export',
            component: 'PdfExporter',
            documentId: state.document.id,
          });
          elements.status.textContent = 'Falha ao gerar PDF. Tente novamente.';
          elements.status.dataset.status = 'error';
          elements.status.focus({ preventScroll: true });
        } finally { elements.pdfButton.disabled = false; elements.pdfButton.textContent = previous; }
        return;
      }
      const commands = new CommandRegistry();
      commands.register('bold', async () => { editor.bold(); });
      commands.register('italic', async () => { editor.italic(); });
      commands.register('underline', async () => { editor.underline(); });
      commands.register('align-left', async () => { editor.align('left'); });
      commands.register('align-center', async () => { editor.align('center'); });
      commands.register('align-right', async () => { editor.align('right'); });
      commands.register('align-justify', async () => { editor.align('justify'); });
      commands.register('list-unordered', async () => { editor.list('ul'); });
      commands.register('list-ordered', async () => { editor.list('ol'); });
      commands.register('table-insert', async () => { editor.insertTable(2, 3); });
      commands.register('graphic-insert', async () => { graphics.insertShape(); });
      commands.register('smartart-insert', async () => { graphics.insertSmartArt('process'); });
      commands.register('smartart-node-add', async () => { graphics.addSmartArtNode(); });
      commands.register('smartart-node-remove', async () => { graphics.removeSelectedSmartArtNode(); });
      commands.register('smartart-layout-process', async () => { graphics.setSelectedSmartArtLayout('process'); });
      commands.register('smartart-layout-hierarchy', async () => { graphics.setSelectedSmartArtLayout('hierarchy'); });
      commands.register('smartart-layout-cycle', async () => { graphics.setSelectedSmartArtLayout('cycle'); });
      commands.register('graphic-duplicate', async () => { graphics.duplicateSelected(); });
      commands.register('graphic-front', async () => { graphics.bringSelectedToFront(); });
      commands.register('graphic-back', async () => { graphics.sendSelectedToBack(); });
      commands.register('connector-delete', async () => { connectors.deleteSelected(); });
      commands.register('table-row-select', async () => { editor.selectTableRow(); });
      commands.register('table-column-select', async () => { editor.selectTableColumn(); });
      commands.register('table-row-add', async () => { editor.insertTableRow(); });
      commands.register('table-row-delete', async () => { editor.deleteTableRow(); });
      commands.register('table-column-add', async () => { editor.insertTableColumn(); });
      commands.register('table-column-delete', async () => { editor.deleteTableColumn(); });
      commands.register('table-column-widen', async () => { editor.resizeTableColumn(24); });
      commands.register('table-column-narrow', async () => { editor.resizeTableColumn(-24); });
      commands.register('font-inc', async () => { editor.fontSize('16px'); });
      commands.register('font-dec', async () => { editor.fontSize('12px'); });
      commands.register('upper', async () => { editor.toggleCase(true); });
      commands.register('lower', async () => { editor.toggleCase(false); });
      commands.register('copy', async () => { await editor.copy(); });
      commands.register('cut', async () => { await editor.cut(); });
      commands.register('paste', async () => { await editor.pastePlainText(); });
      commands.register('clear-formatting', async () => { editor.clearFormatting(); });
      commands.register('smartart-node-edit', () => {
        const selectedNode = graphics.getSelectedSmartArtNodeId();
        if (!selectedNode) return;
        const current = graphics.getElements().find((element) => element.id === graphics.getSelectedIds()[0])?.smartArt?.nodes.find((node) => node.id === selectedNode)?.text ?? '';
        const value = this.root.ownerDocument.defaultView?.prompt('Editar nó SmartArt', current);
        if (value !== null && value !== undefined) graphics.editSelectedSmartArtNode(value);
      });
      commands.register('graphic-connect', () => {
        const ids = graphics.getSelectedIds();
        const [fromId, toId] = ids;
        if (fromId !== undefined && toId !== undefined && ids.length === 2) connectors.connect(fromId, toId);
      });
      commands.register('undo', () => {
        if (connectors.hasSelection()) connectors.undo();
        else if (graphics.hasSelection() || graphics.canUndo()) graphics.undo();
        else editor.undo();
      });
      commands.register('redo', () => {
        if (connectors.hasSelection()) connectors.redo();
        else if (graphics.hasSelection() || graphics.canRedo()) graphics.redo();
        else editor.redo();
      });
      if (!(await commands.execute(action))) return;
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

export function applySavedLayoutConfig(organization: OrganizationConfig): void {
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

export function persistLayoutConfig(organization: OrganizationConfig): void {
  localStorage.setItem(LAYOUT_CONFIG_KEY, JSON.stringify({
    ...organization.layout,
    headerAsset: organization.branding.headerAsset ?? '',
    footerAsset: organization.branding.footerAsset ?? '',
  }));
}

export function clampMargin(value: number): number {
  if (!Number.isFinite(value)) return 20;
  return Math.min(60, Math.max(0, Math.round(value)));
}
