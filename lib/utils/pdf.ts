'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PDF_STYLES = `
  .pdf-content {
    padding: 40px !important;
    background: white !important;
    font-family: Arial, sans-serif !important;
  }
  
  .pdf-content h1 {
    font-size: 28px !important;
    margin-bottom: 24px !important;
    color: black !important;
    font-weight: bold !important;
  }
  
  .pdf-content h2 {
    font-size: 24px !important;
    margin-bottom: 18px !important;
    color: black !important;
    font-weight: bold !important;
  }
  
  .pdf-content h3 {
    font-size: 20px !important;
    margin-bottom: 16px !important;
    color: black !important;
    font-weight: bold !important;
  }
  
  .pdf-content p, .pdf-content div {
    font-size: 14px !important;
    line-height: 1.6 !important;
    margin-bottom: 12px !important;
    color: black !important;
  }

  .pdf-content .font-medium {
    font-weight: 600 !important;
  }

  .pdf-content .text-lg {
    font-size: 16px !important;
  }

  .pdf-content .text-sm {
    font-size: 13px !important;
  }

  .pdf-content .text-xs {
    font-size: 12px !important;
  }
  
  .pdf-content .border {
    border: 1px solid #000 !important;
  }
  
  .pdf-content .border-b {
    border-bottom: 1px solid #000 !important;
  }
  
  .pdf-content .rounded-lg {
    border-radius: 4px !important;
  }
  
  .pdf-content .space-y-4 > * + * {
    margin-top: 1.25rem !important;
  }
  
  .pdf-content .space-y-6 > * + * {
    margin-top: 1.75rem !important;
  }
  
  .pdf-content .mb-4 {
    margin-bottom: 1.25rem !important;
  }
  
  .pdf-content .mb-8 {
    margin-bottom: 2.25rem !important;
  }
  
  .pdf-content .p-4 {
    padding: 1.25rem !important;
  }
  
  .pdf-content .grid {
    display: grid !important;
    grid-gap: 1.25rem !important;
  }
  
  .pdf-content .text-gray-600 {
    color: #4B5563 !important;
  }
  
  .pdf-content .bg-gray-50 {
    background-color: #F9FAFB !important;
  }

  .pdf-content .prose {
    font-size: 14px !important;
    line-height: 1.6 !important;
  }

  .pdf-content .name-date {
    font-size: 16px !important;
    margin-bottom: 20px !important;
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

    // Create canvas with better settings
    const canvas = await html2canvas(clonedElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: clonedElement.scrollWidth,
      windowHeight: clonedElement.scrollHeight,
      onclone: (clonedDoc) => {
        // Any additional modifications to the cloned document can be done here
        const element = clonedDoc.querySelector('.pdf-content');
        if (element) {
          element.querySelectorAll('*').forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.pageBreakInside = 'avoid';
            }
          });
        }
      }
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Calculate dimensions to fit on A4
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Calculate number of pages needed
    const pagesNeeded = Math.ceil(imgHeight / pageHeight);
    
    // Add each page
    for (let page = 0; page < pagesNeeded; page++) {
      // Add new page if not first page
      if (page > 0) {
        pdf.addPage();
      }
      
      // Calculate position and height for this page
      const position = -page * pageHeight;
      
      pdf.addImage(
        canvas.toDataURL('image/png', 1.0), 
        'PNG', 
        0, 
        position, 
        imgWidth, 
        imgHeight
      );
    }

    // Save the PDF
    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}; 