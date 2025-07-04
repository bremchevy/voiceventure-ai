import { jsPDF } from 'jspdf';
import { Resource, WorksheetResource } from '../types/resource';

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

  // Helper function to add a section title
  const addSectionTitle = (title: string): void => {
    checkAndAddPage(lineHeight * 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, margin, yPosition);
    yPosition += lineHeight * 1.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
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
  yPosition += lineHeight * 1.5;

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

  // Reading Passage
  if (resource.passage) {
    addSectionTitle('Reading Passage');
    
    // Add the passage text only
    doc.setFont("helvetica", "normal");
    addMultilineText(resource.passage.text);
    yPosition += lineHeight * 2;
  }

  // Comprehension Problems
  if (resource.comprehensionProblems?.length) {
    addSectionTitle('Reading Comprehension');
    
    resource.comprehensionProblems.forEach((problem, index) => {
      checkAndAddPage(lineHeight * 2);
      
      // Question number and text
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, margin, yPosition);
      doc.setFont("helvetica", "normal");
      
      addMultilineText(problem.question, 15);
      
      // Evidence prompt
      if (problem.evidence_prompt) {
        yPosition += lineHeight * 0.5;
        doc.setFont("helvetica", "italic");
        addMultilineText(`Evidence: ${problem.evidence_prompt}`, 15);
      }
      
      // Add answer lines
      yPosition += lineHeight;
      doc.setDrawColor(200, 200, 200); // Light gray lines
      
      // Add 2 lines for answers
      const numberOfLines = 2;
      for(let i = 0; i < numberOfLines; i++) {
        doc.line(margin + 15, yPosition + (i * lineHeight), pageWidth - margin, yPosition + (i * lineHeight));
      }
      
      yPosition += (numberOfLines * lineHeight) + lineHeight; // Extra space after answer lines
    });
  }

  // Science Content
  if (resource.scienceContent) {
    // Main explanation
    if (resource.scienceContent.explanation) {
      addSectionTitle('Introduction');
      doc.setFont("helvetica", "normal");
      addMultilineText(resource.scienceContent.explanation);
      yPosition += lineHeight * 1.5;
    }

    // Key concepts
    if (resource.scienceContent.concepts?.length) {
      addSectionTitle('Key Concepts');
      resource.scienceContent.concepts.forEach((concept, index) => {
        doc.setFont("helvetica", "normal");
        addMultilineText(concept);
        yPosition += lineHeight;
      });
      yPosition += lineHeight;
    }

    // Applications
    if (resource.scienceContent.applications?.length) {
      addSectionTitle('Real-World Applications');
      resource.scienceContent.applications.forEach((application, index) => {
        doc.setFont("helvetica", "normal");
        addMultilineText(application);
        yPosition += lineHeight;
      });
      yPosition += lineHeight;
    }
  }

  // Problems section (for math and science)
  if (resource.problems?.length) {
    addSectionTitle(resource.subject === 'Science' ? 'Questions' : 'Mathematics Problems');
    
    resource.problems.forEach((problem, index: number) => {
      checkAndAddPage(lineHeight * 2);

      // Problem text
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, margin, yPosition);
      doc.setFont("helvetica", "normal");
      
      addMultilineText(problem.question, 15);

      // Add steps if available
      if (problem.steps?.length) {
        yPosition += lineHeight;
        problem.steps.forEach((step: string, stepIndex: number) => {
          addMultilineText(`${stepIndex + 1}. ${step}`, 30);
        });
      }

      // Add hints if available
      if (problem.hints?.length) {
        yPosition += lineHeight;
        doc.setFont("helvetica", "italic");
        problem.hints.forEach((hint: string) => {
          addMultilineText(`Hint: ${hint}`, 30);
        });
      }

      // Add answer lines
      yPosition += lineHeight;
      doc.setDrawColor(200, 200, 200); // Light gray lines
      
      // Add 2 lines for answers
      const numberOfLines = 2;
      for(let i = 0; i < numberOfLines; i++) {
        doc.line(margin + 15, yPosition + (i * lineHeight), pageWidth - margin, yPosition + (i * lineHeight));
      }
      
      yPosition += (numberOfLines * lineHeight) + lineHeight; // Extra space after answer lines
    });
  }

  // Add passage metadata at the end
  if (resource.passage) {
    doc.addPage();
    yPosition = margin;
    
    addSectionTitle('Additional Information');
    
    // Add passage type if available
    if (resource.passage.type) {
      doc.setFont("helvetica", "bold");
      doc.text('Passage Type:', margin, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(resource.passage.type, margin + 80, yPosition);
      yPosition += lineHeight * 1.5;
    }

    // Add lexile level if available
    if (resource.passage.lexile_level) {
      doc.setFont("helvetica", "bold");
      doc.text('Lexile Level:', margin, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(resource.passage.lexile_level, margin + 80, yPosition);
      yPosition += lineHeight * 1.5;
    }

    // Add target vocabulary if available
    if (resource.passage.target_words?.length) {
      doc.setFont("helvetica", "bold");
      doc.text('Target Vocabulary:', margin, yPosition);
      yPosition += lineHeight;
      doc.setFont("helvetica", "normal");
      resource.passage.target_words.forEach(word => {
        addMultilineText(`• ${word}`, 15);
      });
      yPosition += lineHeight;
    }
  }

  // Generate answer key on new page
  if (resource.problems?.length || resource.comprehensionProblems?.length) {
    doc.addPage();
    yPosition = margin;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text('Answer Key', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;
    
    doc.setFontSize(11);

    // Comprehension answers
    if (resource.comprehensionProblems?.length) {
      resource.comprehensionProblems.forEach((problem, index) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}.`, margin, yPosition);
        doc.setFont("helvetica", "normal");
        addMultilineText(problem.answer, 15);
        yPosition += lineHeight;
      });
    }

    // Other problems answers
    if (resource.problems?.length) {
      resource.problems.forEach((problem, index) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}.`, margin, yPosition);
        doc.setFont("helvetica", "normal");
        addMultilineText(problem.answer, 15);
        
        if (problem.explanation) {
          yPosition += lineHeight;
          doc.setFont("helvetica", "italic");
          addMultilineText(`Explanation: ${problem.explanation}`, 15);
        }
        
        yPosition += lineHeight * 1.5;
      });
    }
  }

  // Key terms if available
  if (resource.scienceContent?.key_terms && Object.keys(resource.scienceContent.key_terms).length > 0) {
    addSectionTitle('Key Terms');
    Object.entries(resource.scienceContent.key_terms).forEach(([term, definition]) => {
      doc.setFont("helvetica", "bold");
      doc.text(term + ":", margin, yPosition);
      doc.setFont("helvetica", "normal");
      addMultilineText(definition, 15);
      yPosition += lineHeight;
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}