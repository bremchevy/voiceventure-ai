import { WorksheetResource } from '../types/resource';
import { formatHandlerService } from './FormatHandlerService';
import { generatePDF } from '../utils/pdf-generator';

export type PDFGenerationMethod = 'client' | 'server';

export class PDFService {
  static async generatePDF(resource: WorksheetResource, method: PDFGenerationMethod = 'client'): Promise<Buffer> {
    try {
      // Get the HTML content from the format handler
      const htmlContent = formatHandlerService.generatePDF(resource);

      // Use Puppeteer for both client and server-side generation
      // This ensures consistent rendering across all contexts
      const pdfBuffer = await generatePDF(resource);
      return pdfBuffer;

    } catch (error: unknown) {
      console.error('Error in PDF generation:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async downloadPDF(resource: WorksheetResource): Promise<Blob> {
    try {
      const pdfDataUri = await this.generatePDF(resource, 'client');
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