import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PdfExporter } from '../../src/pdf/PdfExporter';

const save = vi.fn();
const addPage = vi.fn();
const addImage = vi.fn();

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    width: 794,
    height: 1123,
    toDataURL: () => 'data:image/png;base64,test',
  }),
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    addPage,
    addImage,
    save,
  })),
}));

describe('PdfExporter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exporta cada página A4 e salva o PDF', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="paper-page">Página 1</div><div class="paper-page">Página 2</div>';
    await new PdfExporter().export(root, { filename: 'teste.pdf', scale: 1 });
    expect(addPage).toHaveBeenCalledTimes(1);
    expect(addImage).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith('teste.pdf');
  });

  it('usa o elemento raiz quando não há páginas', async () => {
    const root = document.createElement('div');
    root.textContent = 'Documento';
    await new PdfExporter().export(root);
    expect(addPage).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith('comunicacao_interna.pdf');
  });
});
