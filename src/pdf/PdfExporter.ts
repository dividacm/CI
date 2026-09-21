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

      if (index > 0) pdf.addPage();
      if (height <= pageHeight) {
        pdf.addImage(image, 'PNG', 0, 0, width, height);
        continue;
      }

      const pagePixelHeight = Math.floor((canvas.width * pageHeight) / width);
      let offset = 0;
      let firstSlice = true;
      while (offset < canvas.height) {
        if (!firstSlice) pdf.addPage();
        const sliceHeight = Math.min(pagePixelHeight, canvas.height - offset);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = sliceHeight;
        const context = slice.getContext('2d');
        if (!context) throw new Error('Não foi possível preparar a paginação do PDF.');
        context.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, width, (sliceHeight * width) / canvas.width);
        firstSlice = false;
        offset += sliceHeight;
      }
    }

    pdf.save(options.filename ?? 'comunicacao_interna.pdf');
  }
}
