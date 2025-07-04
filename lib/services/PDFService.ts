import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Resource, WorksheetResource, QuizResource, RubricResource, ExitSlipResource, LessonPlanResource } from '../types/resource';
import { generateWorksheetPDF, generateQuizPDF, generateRubricPDF, generateExitSlipPDF, generateLessonPlanPDF } from '../utils/pdf-generator';

export type PDFGenerationMethod = 'client' | 'server';

interface PDFOptions {
  method?: PDFGenerationMethod;
  fileName?: string;
  quality?: number; // 1-3, where 3 is highest quality
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export class PDFService {
  /**
   * Generate PDF from an HTML element (client-side)
   */
  static async generateFromElement(
    element: HTMLElement,
    options: PDFOptions = {}
  ): Promise<Blob> {
    const {
      fileName = 'document.pdf',
      quality = 2,
      pageSize = 'a4',
      orientation = 'portrait'
    } = options;

    try {
      // Clone the element to avoid modifying the original
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.appendChild(clonedElement);
      document.body.appendChild(container);

      // Generate canvas with specified quality
      const canvas = await html2canvas(clonedElement, {
        scale: quality,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const element = clonedDoc.querySelector('*');
          if (element instanceof HTMLElement) {
            (element.style as any)['-webkit-font-smoothing'] = 'antialiased';
            (element.style as any)['-moz-osx-font-smoothing'] = 'grayscale';
          }
        }
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Create PDF with specified settings
      const pdf = new jsPDF({
        format: pageSize,
        orientation: orientation,
        unit: 'pt',
        compress: true
      });

      // Calculate dimensions
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate scaling to fit page
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const imgX = (pageWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(
        imgData,
        'PNG',
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio,
        undefined,
        'FAST'
      );

      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF from element');
    }
  }

  /**
   * Generate PDF from a Resource object (server-side)
   */
  static async generateFromResource(
    resourceData: Resource,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    try {
      switch (resourceData.resourceType) {
        case 'worksheet':
          return generateWorksheetPDF(resourceData as WorksheetResource);
        case 'quiz':
          return generateQuizPDF(resourceData as QuizResource);
        case 'rubric':
          return generateRubricPDF(resourceData as RubricResource);
        case 'exit_slip':
          return generateExitSlipPDF(resourceData as ExitSlipResource);
        case 'lesson_plan':
          return generateLessonPlanPDF(resourceData as LessonPlanResource);
        default: {
          // For other resource types, create a simple PDF
          const doc = new jsPDF();
          const lineHeight = 10;
          let yPosition = 20;
          const margin = 20;
          const pageWidth = doc.internal.pageSize.width;

          // Title
          doc.setFontSize(16);
          doc.text(resourceData.title, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += lineHeight * 1.5;

          // Metadata
          doc.setFontSize(12);
          doc.text(`Subject: ${resourceData.subject}`, margin, yPosition);
          yPosition += lineHeight;
          doc.text(`Grade Level: ${resourceData.grade_level}`, margin, yPosition);
          yPosition += lineHeight * 1.5;

          // Instructions if available
          if ('instructions' in resourceData && resourceData.instructions) {
            doc.setFontSize(12);
            doc.text('Instructions:', margin, yPosition);
            yPosition += lineHeight;
            doc.setFontSize(10);
            const splitInstructions = doc.splitTextToSize(resourceData.instructions, pageWidth - margin * 2);
            doc.text(splitInstructions, margin, yPosition);
          }

          return Buffer.from(doc.output('arraybuffer'));
        }
      }
    } catch (error) {
      console.error('Error generating PDF from resource:', error);
      throw new Error('Failed to generate PDF from resource');
    }
  }

  /**
   * Download a PDF blob with the specified filename
   */
  static downloadPDF(pdfBlob: Blob, fileName: string): void {
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