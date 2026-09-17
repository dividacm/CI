import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PdfExporterOptions {
  filename?: string;
  scale?: number;
}

export class PdfExporter {
  public async export(element: HTMLElement, options: PdfExporterOptions = {}): Promise<void> {
    const canvas = await html2canvas(element, {
      scale: options.scale ?? 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const image = canvas.toDataURL('image/png');

    if (height <= pageHeight) {
      pdf.addImage(image, 'PNG', 0, 0, width, height);
    } else {
      const pageCanvas = document.createElement('canvas');
      const pagePixelHeight = Math.floor((canvas.width * pageHeight) / width);
      pageCanvas.width = canvas.width;
      pageCanvas.height = pagePixelHeight;
      const context = pageCanvas.getContext('2d');
      if (!context) throw new Error('Não foi possível preparar a paginação do PDF.');

      let offset = 0;
      let firstPage = true;
      while (offset < canvas.height) {
        pageCanvas.height = Math.min(pagePixelHeight, canvas.height - offset);
        context.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(
          canvas,
          0,
          offset,
          canvas.width,
          pageCanvas.height,
          0,
          0,
          pageCanvas.width,
          pageCanvas.height,
        );
        if (!firstPage) pdf.addPage();
        const pageImage = pageCanvas.toDataURL('image/png');
        const pageImageHeight = (pageCanvas.height * width) / pageCanvas.width;
        pdf.addImage(pageImage, 'PNG', 0, 0, width, pageImageHeight);
        firstPage = false;
        offset += pageCanvas.height;
      }
    }

    pdf.save(options.filename ?? 'comunicacao_interna.pdf');
  }
}
