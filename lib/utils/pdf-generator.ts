import { jsPDF } from 'jspdf';
import { Resource, WorksheetResource, MathProblem } from '../types/resource';

// Add the Helvetica font family for a clean, modern look
export async function generateWorksheetPDF(resource: WorksheetResource): Promise<Buffer> {
  const doc = new jsPDF();
  const lineHeight = 10;
  let yPosition = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxY = pageHeight - margin; // Maximum y position before needing a new page

  // Helper function to check and add new page if needed
  const checkAndAddPage = (requiredSpace: number = lineHeight): void => {
    if (yPosition + requiredSpace > maxY) {
      doc.addPage();
      yPosition = margin;
      // Reset font settings after new page
      doc.setFont("helvetica");
      doc.setFontSize(11);
    }
  };

  // Helper function to handle multiline text
  const addMultilineText = (text: string, indent: number = 0): void => {
    const maxWidth = pageWidth - (margin * 2) - indent;
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      checkAndAddPage();
      doc.text(line, margin + indent, yPosition);
      yPosition += lineHeight;
    });
  };

  // Set default font to Helvetica
  doc.setFont("helvetica");

  // Title with modern styling
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  checkAndAddPage(lineHeight * 2);
  doc.text(resource.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 1.5;

  // Name and Date fields with modern styling
  checkAndAddPage(lineHeight * 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const columnWidth = (pageWidth - margin * 2) / 2;
  const nameX = margin;
  const dateX = margin + columnWidth + 10;
  
  // Name field
  doc.setFont("helvetica", "bold");
  doc.text('Name:', nameX, yPosition);
  doc.setFont("helvetica", "normal");
  doc.line(nameX + 25, yPosition, nameX + columnWidth - 10, yPosition);
  
  // Date field
  doc.setFont("helvetica", "bold");
  doc.text('Date:', dateX, yPosition);
  doc.setFont("helvetica", "normal");
  doc.line(dateX + 25, yPosition, dateX + columnWidth - 10, yPosition);
  
  yPosition += lineHeight * 1.5;

  // Metadata with modern styling
  checkAndAddPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Subject: `, margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(resource.subject, margin + 35, yPosition);
  yPosition += lineHeight;
  
  checkAndAddPage();
  doc.setFont("helvetica", "bold");
  doc.text(`Grade Level: `, margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(resource.grade_level, margin + 45, yPosition);
  yPosition += lineHeight;

  // Instructions with modern styling
  if (resource.instructions) {
    checkAndAddPage(lineHeight * 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text('Instructions:', margin, yPosition);
    yPosition += lineHeight;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    addMultilineText(resource.instructions);
    yPosition += lineHeight; // Add extra space after instructions
  }

  // Problems with modern styling
  if (resource.problems) {
    doc.setFontSize(11);
    resource.problems.forEach((problem: MathProblem, index: number) => {
      checkAndAddPage(lineHeight * 2);

      // Problem text
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, margin, yPosition);
      doc.setFont("helvetica", "normal");
      
      // Handle long question text
      const questionLines = doc.splitTextToSize(problem.question, pageWidth - margin * 2 - 15);
      questionLines.forEach((line: string, lineIndex: number) => {
        if (lineIndex > 0) {
          checkAndAddPage();
        }
        doc.text(line, margin + 15, yPosition);
        yPosition += lineHeight;
      });

      // Options or answer space
      if ('options' in problem && (problem as any).options) {
        ((problem as any).options as string[]).forEach((option: string, optIndex: number) => {
          checkAndAddPage();
          doc.text(`${String.fromCharCode(65 + optIndex)}.`, margin + 15, yPosition);
          
          // Handle long option text
          const optionLines = doc.splitTextToSize(option, pageWidth - margin * 2 - 30);
          optionLines.forEach((line: string, lineIndex: number) => {
            if (lineIndex > 0) {
              checkAndAddPage();
            }
            doc.text(line, margin + 30, yPosition + (lineIndex * lineHeight));
          });
          yPosition += lineHeight * optionLines.length;
        });
      } else {
        checkAndAddPage();
        // Answer line with subtle styling
        doc.setDrawColor(200, 200, 200); // Light gray line
        doc.line(margin + 15, yPosition, pageWidth - margin, yPosition);
        yPosition += lineHeight * 1.5;
      }
    });

    // Answer key on a new page with modern styling
    doc.addPage();
    yPosition = margin;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text('Answer Key', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 1.5;

    doc.setFontSize(11);
    resource.problems.forEach((problem: MathProblem, index: number) => {
      checkAndAddPage(lineHeight * 2);
      
      // Display both question and answer with modern styling
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, margin, yPosition);
      doc.setFont("helvetica", "normal");
      
      // Handle long question text in answer key
      const questionLines = doc.splitTextToSize(problem.question, pageWidth - margin * 2 - 15);
      questionLines.forEach((line: string, lineIndex: number) => {
        if (lineIndex > 0) {
          checkAndAddPage();
        }
        doc.text(line, margin + 15, yPosition);
        yPosition += lineHeight;
      });
      
      checkAndAddPage();
      doc.setFont("helvetica", "bold");
      doc.text('Answer:', margin + 15, yPosition);
      doc.setFont("helvetica", "normal");
      
      // Handle long answer text
      if (problem.answer) {
        const answerLines = doc.splitTextToSize(problem.answer, pageWidth - margin * 2 - 45);
        answerLines.forEach((line: string, lineIndex: number) => {
          if (lineIndex > 0) {
            checkAndAddPage();
          }
          doc.text(line, margin + 45, yPosition);
          yPosition += lineHeight;
        });
      }
      yPosition += lineHeight * 0.2; // Small extra space between problems
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}