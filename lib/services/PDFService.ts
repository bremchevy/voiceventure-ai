import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { WorksheetResource } from '../types/resource';
import { formatHandlerService } from './FormatHandlerService';

export type PDFGenerationMethod = 'client' | 'server';

export class PDFService {
  static async generatePDF(resource: WorksheetResource): Promise<string> {
    try {
      // Get the HTML content from the format handler
      const htmlContent = formatHandlerService.generatePDF(resource);

      // Create a temporary container for the HTML content
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Generate PDF using html2canvas and jsPDF
      const canvas = await html2canvas(container);
      document.body.removeChild(container);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());

      return pdf.output('datauristring');
    } catch (error: unknown) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async downloadPDF(resource: WorksheetResource): Promise<Blob> {
    try {
      const pdfDataUri = await this.generatePDF(resource);
      // Convert data URI to Blob
      const base64Data = pdfDataUri.split(',')[1];
      const binaryData = atob(base64Data);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }
      return new Blob([array], { type: 'application/pdf' });
    } catch (error: unknown) {
      console.error('PDF download error:', error);
      throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static downloadBlob(pdfBlob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
} 