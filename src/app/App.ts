import { createDocument } from '../document/createDocument';
import { DocumentIssuer } from '../document/DocumentIssuer';
import { Editor } from '../editor/Editor';
import { getObservability } from '../observability/Observability';
import { PdfExporter } from '../pdf/PdfExporter';
import { AutosaveController } from '../storage/AutosaveController';
import { LocalStorageDocumentStorage } from '../storage/LocalStorageDocumentStorage';
import type { OrganizationConfig, TemplateConfig } from '../types/configuration';
import type { CommunicationDocument, DocumentStatus } from '../types/document';
import { createAppActions } from './AppActions';
import type { AppState } from './AppState';
import { getAppElements, getFieldValue, renderDocument, renderPreview, renderShell, updateIssueButton, updatePdfButton } from './AppView';

const ACTIVE_DOCUMENT_KEY = 'ci:active-document';
const LAYOUT_CONFIG_KEY = 'ci:layout-config';

export function renderApp(root: HTMLElement, organization: OrganizationConfig): void {
  applySavedLayoutConfig(organization);
  const template = organization.templates.find((item) => item.id === organization.defaultTemplateId);
  if (!template) throw new Error(`Template não encontrado: ${organization.defaultTemplateId}`);

  root.innerHTML = renderShell(organization, template);
  const elements = getAppElements(root);
  const storage = new LocalStorageDocumentStorage();
  const issuer = new DocumentIssuer({ storage });
  const pdfExporter = new PdfExporter();
  const state: AppState = { document: loadActiveDocument(template, storage), template, organization };

  renderDocument(state.document, elements, organization, template);
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
  updatePdfButton(elements.pdfButton, organization.features.pdfExport);
  const editor = new Editor(elements.editor);
  const actions = createAppActions(state, editor, autosave, issuer, (name) => getFieldValue(root, name));

  const syncView = (): void => {
    updateIssueButton(elements.issueButton, state.document);
    renderPreview(elements.paper, organization, template, state.document);
  };

  const sync = (): void => { actions.sync(); syncView(); };

  editor.setSaveHandler(() => {
    sync();
    autosave.saveNow();
  });

  root.querySelector<HTMLElement>('.toolbar')?.addEventListener('pointerdown', () => {
    editor.rememberSelection();
  });

  root.querySelectorAll<HTMLInputElement>('[data-field]').forEach((field) => {
    field.addEventListener('input', sync);
  });
  elements.editor.addEventListener('input', sync);

  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
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
        renderDocument(state.document, elements, organization, template);
        updateIssueButton(elements.issueButton, state.document);
        autosave.saveNow();
        return;
      }
      if (action === 'issue') {
        if (!actions.issue()) return;
        renderDocument(state.document, elements, organization, template);
        updateIssueButton(elements.issueButton, state.document);
        elements.status.textContent = `Documento nº ${state.document.number}/${state.document.year} emitido.`;
        elements.status.dataset.status = 'saved';
        return;
      }
      if (action === 'pdf') {
        if (!organization.features.pdfExport) return;
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

  root.querySelectorAll<HTMLInputElement>('[id^="margin-"]').forEach((input) => {
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
      organization.layout[key] = value;
      input.value = String(value);
      persistLayoutConfig(organization);
      syncView();
    });
  });

  root.querySelector<HTMLInputElement>('#header-asset')?.addEventListener('change', (event) => {
    organization.branding.headerAsset = (event.currentTarget as HTMLInputElement).value.trim() || undefined;
    persistLayoutConfig(organization);
    syncView();
  });

  root.querySelector<HTMLInputElement>('#footer-asset')?.addEventListener('change', (event) => {
    organization.branding.footerAsset = (event.currentTarget as HTMLInputElement).value.trim() || undefined;
    persistLayoutConfig(organization);
    syncView();
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
