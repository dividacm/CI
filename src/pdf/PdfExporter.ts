export interface PdfExporterOptions {
  filename?: string;
  scale?: number;
}

export class PdfExporter {
  public async export(element: HTMLElement, options: PdfExporterOptions = {}): Promise<void> {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const pages = Array.from(element.querySelectorAll<HTMLElement>('.paper-page'));
    const targets = pages.length > 0 ? pages : [element];
    const pdf = new jsPDF('p', 'mm', 'a4');

    for (const [index, page] of targets.entries()) {
      const canvas = await html2canvas(page, {
        scale: options.scale ?? 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const image = canvas.toDataURL('image/png');
      const width = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const height = (canvas.height * width) / canvas.width;
      const fitScale = Math.min(1, pageHeight / height);
      const renderWidth = width * fitScale;
      const renderHeight = height * fitScale;
      const x = (width - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      if (index > 0) pdf.addPage();
      pdf.addImage(image, 'PNG', x, y, renderWidth, renderHeight);
    }

    pdf.save(options.filename ?? 'comunicacao_interna.pdf');
  }
}
