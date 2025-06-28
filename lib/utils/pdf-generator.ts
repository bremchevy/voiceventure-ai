import { jsPDF } from 'jspdf';
import { Resource } from '../types/resource';

export async function generateWorksheetPDF(resource: Resource): Promise<Buffer> {
  const doc = new jsPDF();
  const lineHeight = 10;
  let yPosition = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;

  // Title
  doc.setFontSize(16);
  doc.text(resource.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 2;

  // Metadata
  doc.setFontSize(12);
  doc.text(`Subject: ${resource.subject}`, margin, yPosition);
  yPosition += lineHeight;
  doc.text(`Grade Level: ${resource.gradeLevel}`, margin, yPosition);
  yPosition += lineHeight * 1.5;

  // Instructions
  if ('instructions' in resource && resource.instructions) {
    doc.setFontSize(12);
    doc.text('Instructions:', margin, yPosition);
    yPosition += lineHeight;
    doc.setFontSize(10);
    const splitInstructions = doc.splitTextToSize(resource.instructions, pageWidth - margin * 2);
    doc.text(splitInstructions, margin, yPosition);
    yPosition += lineHeight * (splitInstructions.length + 1);
  }

  // Problems
  doc.setFontSize(12);
  resource.problems.forEach((problem, index) => {
    // New page if needed
    if (yPosition > doc.internal.pageSize.height - margin) {
      doc.addPage();
      yPosition = margin;
    }

    // Problem text
    doc.text(`${index + 1}. ${problem.question}`, margin, yPosition);
    yPosition += lineHeight;

    // Options or answer space
    if ('options' in problem && problem.options) {
      problem.options.forEach((option, optIndex) => {
        doc.text(`${String.fromCharCode(65 + optIndex)}. ${option}`, margin + 10, yPosition);
        yPosition += lineHeight;
      });
    } else {
      // Answer line
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += lineHeight * 2;
    }
  });

  // Answer key for standard format
  if ('format' in resource && resource.format === 'standard') {
    doc.addPage();
    yPosition = margin;
    
    doc.setFontSize(14);
    doc.text('Answer Key', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    doc.setFontSize(12);
    resource.problems.forEach((problem, index) => {
      if (yPosition > doc.internal.pageSize.height - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(`${index + 1}. ${problem.answer || ''}`, margin, yPosition);
      yPosition += lineHeight;
    });
  }

  // Vocabulary section
  if ('vocabulary' in resource && typeof resource.vocabulary === 'object' && resource.vocabulary) {
    const vocabEntries = Object.entries(resource.vocabulary);
    if (vocabEntries.length > 0) {
      doc.addPage();
      yPosition = margin;
      
      doc.setFontSize(14);
      doc.text('Vocabulary', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight * 2;

      doc.setFontSize(12);
      vocabEntries.forEach(([term, definition]) => {
        if (yPosition > doc.internal.pageSize.height - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(`${term}:`, margin, yPosition);
        yPosition += lineHeight;
        const splitDefinition = doc.splitTextToSize(definition, pageWidth - margin * 2);
        doc.text(splitDefinition, margin + 10, yPosition);
        yPosition += lineHeight * (splitDefinition.length + 0.5);
      });
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}