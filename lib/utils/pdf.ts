'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PDF_STYLES = `
  .pdf-content {
    padding: 40px !important;
    background: white !important;
    font-family: Arial, sans-serif !important;
    width: 100% !important;
    font-weight: 400 !important;
  }
  
  .pdf-content h1 {
    font-size: 24px !important;
    margin-bottom: 20px !important;
    color: black !important;
    font-weight: 700 !important;
    text-align: center !important;
  }
  
  .pdf-content .name-date {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 20px !important;
    margin-bottom: 30px !important;
    max-width: 600px !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  .pdf-content .name-date span {
    font-size: 16px !important;
    line-height: 1.5 !important;
  }

  .pdf-content .question-container {
    margin-bottom: 24px !important;
  }

  .pdf-content .question {
    font-weight: 600 !important;
    font-size: 16px !important;
    margin-bottom: 12px !important;
    line-height: 1.5 !important;
  }

  .pdf-content .options {
    margin-left: 20px !important;
  }

  .pdf-content .option {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    margin-bottom: 8px !important;
  }

  .pdf-content .option span:first-child {
    width: 16px !important;
    height: 16px !important;
    border: 1px solid #000 !important;
    border-radius: 50% !important;
    display: inline-block !important;
  }

  .pdf-content .answer-space {
    min-height: 100px !important;
    border-bottom: 2px solid #666 !important;
    margin-top: 16px !important;
    margin-bottom: 24px !important;
    width: 100% !important;
  }

  .pdf-content .short-answer-space {
    min-height: 120px !important;
    border-bottom: 2px solid #666 !important;
    margin-top: 16px !important;
    margin-bottom: 24px !important;
    width: 100% !important;
  }

  .pdf-content .metadata {
    margin-top: 40px !important;
    font-size: 12px !important;
    color: #666 !important;
  }

  .pdf-content .metadata p {
    margin-bottom: 4px !important;
  }
  
  .pdf-content h2 {
    font-size: 26px !important;
    margin-bottom: 20px !important;
    color: black !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;
  }
  
  .pdf-content h3 {
    font-size: 22px !important;
    margin-bottom: 18px !important;
    color: black !important;
    font-weight: 600 !important;
    line-height: 1.3 !important;
  }
  
  .pdf-content p, .pdf-content div {
    font-size: 16px !important;
    line-height: 1.8 !important;
    margin-bottom: 14px !important;
    color: black !important;
    font-weight: 500 !important;
    letter-spacing: 0.01em !important;
  }

  .pdf-content .font-medium {
    font-weight: 600 !important;
  }

  .pdf-content .text-lg {
    font-size: 18px !important;
    font-weight: 500 !important;
    line-height: 1.7 !important;
  }

  .pdf-content .text-sm {
    font-size: 15px !important;
    font-weight: 500 !important;
    line-height: 1.7 !important;
  }

  .pdf-content .text-xs {
    font-size: 14px !important;
    font-weight: 500 !important;
    line-height: 1.6 !important;
  }
  
  .pdf-content .border {
    border: 1.5px solid #000 !important;
  }
  
  .pdf-content .border-b {
    border-bottom: 1.5px solid #000 !important;
  }
  
  .pdf-content .rounded-lg {
    border-radius: 4px !important;
  }
  
  .pdf-content .space-y-4 > * + * {
    margin-top: 1.5rem !important;
  }
  
  .pdf-content .space-y-6 > * + * {
    margin-top: 2rem !important;
  }
  
  .pdf-content .mb-4 {
    margin-bottom: 1.5rem !important;
  }
  
  .pdf-content .mb-8 {
    margin-bottom: 2.5rem !important;
  }
  
  .pdf-content .p-4 {
    padding: 1.5rem !important;
  }
  
  .pdf-content .grid {
    display: grid !important;
    grid-gap: 1.5rem !important;
  }
  
  .pdf-content .text-gray-600 {
    color: #2D3748 !important;
    font-weight: 500 !important;
  }
  
  .pdf-content .bg-gray-50 {
    background-color: #F9FAFB !important;
  }

  .pdf-content .prose {
    font-size: 16px !important;
    line-height: 1.8 !important;
    font-weight: 500 !important;
  }
`;

export const generatePDF = async (element: HTMLElement, fileName: string = 'worksheet.pdf') => {
  try {
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Add PDF-specific class
    clonedElement.classList.add('pdf-content');
    
    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.appendChild(clonedElement);
    
    // Add PDF styles
    const styleElement = document.createElement('style');
    styleElement.textContent = PDF_STYLES;
    container.appendChild(styleElement);
    
    // Add to document temporarily
    document.body.appendChild(container);

    // A4 dimensions in points (72 points per inch)
    const a4Width = 595.28;  // 8.27 inches
    const a4Height = 841.89; // 11.69 inches
    const marginPt = 40;     // margin in points

    // Create canvas with high quality settings
    const canvas = await html2canvas(clonedElement, {
      scale: 3, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: false,
      removeContainer: true,
      imageTimeout: 0,
      onclone: (clonedDoc) => {
        const element = clonedDoc.querySelector('.pdf-content');
        if (element instanceof HTMLElement) {
          // Ensure crisp text rendering
          element.style.webkitFontSmoothing = 'antialiased';
          element.style.mozOsxFontSmoothing = 'grayscale';
          element.style.textRendering = 'optimizeLegibility';
        }
      }
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Create PDF with A4 size and high quality settings
    const pdf = new jsPDF({
      format: 'a4',
      unit: 'pt',
      orientation: 'portrait',
      compress: false, // Disable compression
      precision: 16 // Increase precision
    });
    
    // Calculate dimensions to fit on A4 with margins
    const imgWidth = a4Width - (2 * marginPt);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add image with high quality settings
    pdf.addImage(
      canvas.toDataURL('image/png', 1.0), // Maximum quality
      'PNG',
      marginPt,
      marginPt,
      imgWidth,
      Math.min(imgHeight, a4Height - (2 * marginPt)),
      undefined, // No alias
      'FAST' // High quality
    );

    // Save the PDF with high quality settings
    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}; 