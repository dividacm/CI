import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfExporter } from '../../src/pdf/PdfExporter';

const save = vi.fn();
const addPage = vi.fn();
const addImage = vi.fn();
const html2canvas = vi.fn();

vi.mock('html2canvas', () => ({
  default: html2canvas,
}));


vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(function () {
    return {
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      addPage,
      addImage,
      save,
    };
  }),
}));

describe('PdfExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    html2canvas.mockResolvedValue({
      width: 794,
      height: 1123,
      toDataURL: () => 'data:image/png;base64,test',
    });
  });

  it('exporta cada página A4 e salva o PDF', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="paper-page">Página 1</div><div class="paper-page">Página 2</div>';
    await new PdfExporter().export(root, { filename: 'teste.pdf', scale: 1 });

    expect(html2canvas).toHaveBeenCalledTimes(2);
    expect(addPage).toHaveBeenCalledTimes(1);
    expect(addImage).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith('teste.pdf');
  });

  it('preserva cabeçalho, rodapé e camada gráfica ao capturar cada página', async () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section class="paper-page">
        <div class="paper-header"><img src="/cab.png" alt="Cabeçalho"></div>
        <div class="paper-page-content">
          <p>Conteúdo da página 1</p>
          <div class="paper-graphics-layer"><div class="paper-graphic-element">Forma</div></div>
        </div>
        <div class="paper-footer"><img src="/rodape.png" alt="Rodapé"></div>
      </section>
      <section class="paper-page">
        <div class="paper-header"><img src="/cab.png" alt="Cabeçalho"></div>
        <div class="paper-page-content"><p>Conteúdo da página 2</p></div>
        <div class="paper-footer"><img src="/rodape.png" alt="Rodapé"></div>
      </section>
    `;

    await new PdfExporter().export(root, { scale: 2 });

    const capturedPages = html2canvas.mock.calls.map(([page]) => page as HTMLElement);
    expect(capturedPages).toHaveLength(2);
    expect(capturedPages.every((page) => page.classList.contains('paper-page'))).toBe(true);
    expect(capturedPages[0]?.querySelector('.paper-header img')?.getAttribute('src')).toBe('/cab.png');
    expect(capturedPages[0]?.querySelector('.paper-footer img')?.getAttribute('src')).toBe('/rodape.png');
    expect(capturedPages[0]?.querySelector('.paper-graphics-layer')).not.toBeNull();
    expect(addPage).toHaveBeenCalledTimes(1);
    expect(addImage).toHaveBeenCalledTimes(2);
  });

  it('ignora o zoom da interface ao capturar o PDF', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="preview-wrap" style="zoom: 1.5"><div class="paper-page">Página 1</div></div>';

    await new PdfExporter().export(root, { scale: 1 });

    const options = html2canvas.mock.calls[0]?.[1] as { onclone?: (document: Document) => void };
    expect(options.onclone).toBeTypeOf('function');

    const clonedDocument = document.implementation.createHTMLDocument('clone');
    clonedDocument.body.innerHTML = '<div class="preview-wrap" style="zoom: 1.5"><div class="paper-page">Página 1</div></div>';
    options.onclone?.(clonedDocument);

    expect(clonedDocument.querySelector<HTMLElement>('.preview-wrap')?.style.zoom).toBe('1');
  });

  it('usa o elemento raiz quando não há páginas', async () => {
    const root = document.createElement('div');
    root.textContent = 'Documento';
    await new PdfExporter().export(root);

    expect(addPage).not.toHaveBeenCalled();
    expect(addImage).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('comunicacao_interna.pdf');
  });
});
