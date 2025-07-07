import { jsPDF } from 'jspdf';
import { Resource, WorksheetResource, QuizResource, RubricResource, ExitSlipResource, LessonPlanResource } from '../types/resource';

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
    
    // Calculate total height needed for passage
    const passageLines = doc.splitTextToSize(resource.passage.text, pageWidth - margin * 2);
    const passageHeight = passageLines.length * lineHeight;
    
    // If passage won't fit, start new page
    if (yPosition + passageHeight > maxY) {
      doc.addPage();
      yPosition = margin;
      doc.setFont("helvetica");
      doc.setFontSize(11);
    }
    
    // Add the passage text
    doc.setFont("helvetica", "normal");
    doc.text(passageLines, margin, yPosition);
    yPosition += passageHeight + lineHeight;
  }

  // Comprehension Problems
  if (resource.comprehensionProblems?.length) {
    addSectionTitle('Reading Comprehension');
    
    resource.comprehensionProblems.forEach((problem, index) => {
      // Calculate height needed for this problem
      const questionLines = doc.splitTextToSize(problem.question, pageWidth - margin * 4);
      let totalHeight = questionLines.length * lineHeight;
      
      if (problem.evidence_prompt) {
        const evidenceLines = doc.splitTextToSize(`Evidence: ${problem.evidence_prompt}`, pageWidth - margin * 4);
        totalHeight += evidenceLines.length * lineHeight + lineHeight * 0.5;
      }
      
      // Add height for answer lines
      totalHeight += lineHeight * 3; // 2 lines for answers + 1 line spacing
      
      // Check if we need a new page
      if (yPosition + totalHeight > maxY) {
        doc.addPage();
        yPosition = margin;
        doc.setFont("helvetica");
        doc.setFontSize(11);
      }
      
      // Question number and text
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, margin, yPosition);
      doc.setFont("helvetica", "normal");
      
      doc.text(questionLines, margin + 15, yPosition);
      yPosition += questionLines.length * lineHeight;
      
      // Evidence prompt
      if (problem.evidence_prompt) {
        yPosition += lineHeight * 0.5;
        doc.setFont("helvetica", "italic");
        const evidenceLines = doc.splitTextToSize(`Evidence: ${problem.evidence_prompt}`, pageWidth - margin * 4);
        doc.text(evidenceLines, margin + 15, yPosition);
        yPosition += evidenceLines.length * lineHeight;
      }
      
      // Add answer lines
      yPosition += lineHeight;
      doc.setDrawColor(200, 200, 200); // Light gray lines
      
      for(let i = 0; i < 2; i++) {
        doc.line(margin + 15, yPosition + (i * lineHeight), pageWidth - margin, yPosition + (i * lineHeight));
      }
      
      yPosition += lineHeight * 2.5; // Space after answer lines
    });
  }

  // Science Content
  if (resource.scienceContent) {
    // Main explanation
    if (resource.scienceContent.explanation) {
      addSectionTitle('Introduction');
      
      const explanationLines = doc.splitTextToSize(resource.scienceContent.explanation, pageWidth - margin * 2);
      const explanationHeight = explanationLines.length * lineHeight;
      
      if (yPosition + explanationHeight > maxY) {
        doc.addPage();
        yPosition = margin;
        doc.setFont("helvetica");
        doc.setFontSize(11);
      }
      
      doc.setFont("helvetica", "normal");
      doc.text(explanationLines, margin, yPosition);
      yPosition += explanationHeight + lineHeight;
    }

    // Key concepts
    if (resource.scienceContent.concepts?.length) {
      addSectionTitle('Key Concepts');
      
      resource.scienceContent.concepts.forEach((concept, index) => {
        const conceptLines = doc.splitTextToSize(concept, pageWidth - margin * 2);
        const conceptHeight = conceptLines.length * lineHeight;
        
        if (yPosition + conceptHeight > maxY) {
          doc.addPage();
          yPosition = margin;
          doc.setFont("helvetica");
          doc.setFontSize(11);
        }
        
        doc.setFont("helvetica", "normal");
        doc.text(conceptLines, margin, yPosition);
        yPosition += conceptHeight;
      });
      yPosition += lineHeight;
    }

    // Applications
    if (resource.scienceContent.applications?.length) {
      addSectionTitle('Real-World Applications');
      
      resource.scienceContent.applications.forEach((application, index) => {
        const applicationLines = doc.splitTextToSize(application, pageWidth - margin * 2);
        const applicationHeight = applicationLines.length * lineHeight;
        
        if (yPosition + applicationHeight > maxY) {
          doc.addPage();
          yPosition = margin;
          doc.setFont("helvetica");
          doc.setFontSize(11);
        }
        
        doc.setFont("helvetica", "normal");
        doc.text(applicationLines, margin, yPosition);
        yPosition += applicationHeight;
      });
      yPosition += lineHeight;
    }
  }

  // Problems section (for math and science)
  if (resource.problems?.length) {
    addSectionTitle(resource.subject === 'Science' ? 'Questions' : 'Mathematics Problems');
    
    resource.problems.forEach((problem, index) => {
      // Calculate total height needed for this problem
      const questionLines = doc.splitTextToSize(problem.question, pageWidth - margin * 4);
      let totalHeight = questionLines.length * lineHeight + lineHeight;
      
      if (problem.steps?.length) {
        problem.steps.forEach(step => {
          const stepLines = doc.splitTextToSize(step, pageWidth - margin * 4);
          totalHeight += stepLines.length * lineHeight;
        });
        totalHeight += lineHeight;
      }
      
      if (problem.hints?.length) {
        problem.hints.forEach(hint => {
          const hintLines = doc.splitTextToSize(`Hint: ${hint}`, pageWidth - margin * 4);
          totalHeight += hintLines.length * lineHeight;
        });
        totalHeight += lineHeight;
      }
      
      // Add height for answer lines
      totalHeight += lineHeight * 3;
      
      // Check if we need a new page
      if (yPosition + totalHeight > maxY) {
        doc.addPage();
        yPosition = margin;
        doc.setFont("helvetica");
        doc.setFontSize(11);
      }

      // Problem text
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, margin, yPosition);
      doc.setFont("helvetica", "normal");
      
      doc.text(questionLines, margin + 15, yPosition);
      yPosition += questionLines.length * lineHeight;

      // Add steps if available
      if (problem.steps?.length) {
        yPosition += lineHeight;
        problem.steps.forEach((step, stepIndex) => {
          const stepLines = doc.splitTextToSize(`${stepIndex + 1}. ${step}`, pageWidth - margin * 4);
          doc.text(stepLines, margin + 30, yPosition);
          yPosition += stepLines.length * lineHeight;
        });
      }

      // Add hints if available
      if (problem.hints?.length) {
        yPosition += lineHeight;
        doc.setFont("helvetica", "italic");
        problem.hints.forEach(hint => {
          const hintLines = doc.splitTextToSize(`Hint: ${hint}`, pageWidth - margin * 4);
          doc.text(hintLines, margin + 30, yPosition);
          yPosition += hintLines.length * lineHeight;
        });
      }

      // Add answer lines
      yPosition += lineHeight;
      doc.setDrawColor(200, 200, 200); // Light gray lines
      
      for(let i = 0; i < 2; i++) {
        doc.line(margin + 15, yPosition + (i * lineHeight), pageWidth - margin, yPosition + (i * lineHeight));
      }
      
      yPosition += lineHeight * 2.5; // Space after answer lines
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

export async function generateQuizPDF(resource: QuizResource): Promise<Buffer> {
  const doc = new jsPDF();
  const lineHeight = 10;
  let yPosition = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxY = pageHeight - margin;

  // Helper functions
  const checkAndAddPage = (requiredSpace: number = lineHeight): void => {
    if (yPosition + requiredSpace > maxY) {
      doc.addPage();
      yPosition = margin;
      doc.setFont("helvetica");
      doc.setFontSize(11);
    }
  };

  const addMultilineText = (text: string, indent: number = 0): void => {
    const maxWidth = pageWidth - (margin * 2) - indent;
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      checkAndAddPage();
      doc.text(line, margin + indent, yPosition);
      yPosition += lineHeight;
    });
  };

  // Set default font
  doc.setFont("helvetica");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(resource.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 3;

  // Name and Date fields
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const columnWidth = (pageWidth - margin * 2) / 2;
  const nameX = margin;
  const dateX = margin + columnWidth;
  
  // Name field
  doc.text('Name:', nameX, yPosition);
  doc.line(nameX + 25, yPosition, nameX + columnWidth - 10, yPosition);
  
  // Date field
  doc.text('Date:', dateX, yPosition);
  doc.line(dateX + 25, yPosition, dateX + columnWidth - 10, yPosition);
  yPosition += lineHeight * 2;

  // Subject and Grade Level
  doc.text(`Subject: ${resource.subject}`, nameX, yPosition);
  doc.text(`Grade Level: ${resource.grade_level}`, dateX, yPosition);
  yPosition += lineHeight * 2;

  // Time and Points
  if (resource.estimatedTime) {
    doc.text(`Time: ${resource.estimatedTime}`, nameX, yPosition);
  }
  if (resource.totalPoints) {
    doc.text(`Total Points: ${resource.totalPoints}`, dateX, yPosition);
  yPosition += lineHeight * 2;
  }

  // Instructions if available
  if (resource.instructions) {
    doc.setFont("helvetica", "bold");
    doc.text('Instructions:', margin, yPosition);
    yPosition += lineHeight;
    doc.setFont("helvetica", "normal");
    const instructionLines = doc.splitTextToSize(resource.instructions, pageWidth - margin * 2);
    doc.text(instructionLines, margin, yPosition);
    yPosition += instructionLines.length * lineHeight + lineHeight;
  }

  // Questions
    resource.questions.forEach((question, index) => {
    // Calculate space needed
    let totalHeight = lineHeight * 2;
    const contentWidth = pageWidth - margin * 2;

    if (question.type === 'skill_assessment') {
      // Type guard for skill assessment questions
      type SkillAssessmentQuestion = Extract<ExitSlipResource['questions'][number], { type: 'skill_assessment' }>;

      function isSkillAssessmentQuestion(q: any): q is SkillAssessmentQuestion {
        return q.type === 'skill_assessment' && 'task' in q;
      }

      // Ensure this is a skill assessment question
      if (!isSkillAssessmentQuestion(question)) {
        continue;
      }

      const skillQuestion = question;
      
      // Handle skill assessment more compactly
      const taskLines = doc.splitTextToSize(skillQuestion.task || '', contentWidth - 55);
      const applicationContextLines = skillQuestion.realWorldApplication ? doc.splitTextToSize(skillQuestion.realWorldApplication, contentWidth - 55) : [];
      
      // Calculate total height needed
      totalHeight += taskLines.length * lineHeight;
      if (skillQuestion.steps?.length) totalHeight += skillQuestion.steps.length * lineHeight;
      if (applicationContextLines.length) totalHeight += applicationContextLines.length * lineHeight;
      if (skillQuestion.successCriteria?.length) totalHeight += skillQuestion.successCriteria.length * lineHeight;
      totalHeight += lineHeight * 5; // Extra space for section gaps

      checkAndAddPage(totalHeight);

      // Question number and Task
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, margin, yPosition);
      doc.text('Task:', margin + 10, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(taskLines, margin + 45, yPosition);
      yPosition += taskLines.length * lineHeight + lineHeight;

      // Steps
      if (skillQuestion.steps?.length) {
        doc.setFont("helvetica", "bold");
        doc.text('Steps:', margin + 10, yPosition);
        yPosition += lineHeight;
      doc.setFont("helvetica", "normal");
        skillQuestion.steps.forEach((step: string, stepIndex: number) => {
          const stepLines = doc.splitTextToSize(`${stepIndex + 1}. ${step}`, contentWidth - 55);
          doc.text(stepLines, margin + 45, yPosition);
          yPosition += stepLines.length * lineHeight;
        });
      yPosition += lineHeight;
      }

      // Application Context (moved after steps)
      if (skillQuestion.realWorldApplication) {
        // Add a bit more space before this section
        yPosition += lineHeight * 0.5;
        
        doc.setFont("helvetica", "bold");
        doc.text('Real-World', margin + 10, yPosition);
        doc.text('Application:', margin + 10, yPosition + lineHeight);
        yPosition += lineHeight * 2;
        
        doc.setFont("helvetica", "normal");
        // Ensure proper wrapping for the application context
        const wrappedContextLines = doc.splitTextToSize(skillQuestion.realWorldApplication, contentWidth - 55);
        doc.text(wrappedContextLines, margin + 45, yPosition);
        yPosition += wrappedContextLines.length * lineHeight + lineHeight;
      }

      // Success Criteria
      if (skillQuestion.successCriteria?.length) {
        doc.setFont("helvetica", "bold");
        doc.text('Success Criteria:', margin + 10, yPosition);
          yPosition += lineHeight;
        doc.setFont("helvetica", "normal");
        skillQuestion.successCriteria.forEach((criterion: string) => {
          const criterionLines = doc.splitTextToSize(criterion, contentWidth - 60);
          doc.text(`□`, margin + 45, yPosition);
          doc.text(criterionLines, margin + 55, yPosition);
          yPosition += criterionLines.length * lineHeight;
        });
        yPosition += lineHeight;
      }
    } else {
      // Handle standard question types
      const questionLines = doc.splitTextToSize(question.question, contentWidth - 20);
      totalHeight += questionLines.length * lineHeight;
      
      if (question.options?.length) {
        totalHeight += question.options.length * lineHeight;
      }
      
      if (question.explanation) {
        const explanationLines = doc.splitTextToSize(question.explanation, contentWidth - 20);
        totalHeight += explanationLines.length * lineHeight;
      }
      
      totalHeight += lineHeight * 2; // Space for answer
    }

    // Check if we need a new page
    checkAndAddPage(totalHeight);

    // Question number
    doc.setFont("helvetica", "bold");
    if (question.type === 'skill_assessment') {
      // Skill assessment format
      doc.text(`${index + 1}. ${question.mainQuestion}`, margin, yPosition);
      yPosition += lineHeight * 1.5;

      if (question.task) {
      doc.setFont("helvetica", "bold");
        doc.text('Task:', margin + 10, yPosition);
      doc.setFont("helvetica", "normal");
        const taskLines = doc.splitTextToSize(question.task, contentWidth - 60);
        doc.text(taskLines, margin + 45, yPosition);
        yPosition += taskLines.length * lineHeight + lineHeight;
      }

      if (question.steps?.length) {
        doc.setFont("helvetica", "bold");
        doc.text('Steps:', margin + 10, yPosition);
      yPosition += lineHeight;
        doc.setFont("helvetica", "normal");
        question.steps.forEach((step, stepIndex) => {
          doc.text(`${stepIndex + 1}. ${step}`, margin + 45, yPosition);
          yPosition += lineHeight;
        });
        yPosition += lineHeight;
      }

      if (question.successCriteria?.length) {
        doc.setFont("helvetica", "bold");
        doc.text('Success Criteria:', margin + 10, yPosition);
        yPosition += lineHeight;
        doc.setFont("helvetica", "normal");
        question.successCriteria.forEach((criterion, index) => {
          doc.text(`• ${criterion}`, margin + 45, yPosition);
          yPosition += lineHeight;
        });
        yPosition += lineHeight;
      }
    } else {
      // Standard question format
      doc.text(`${index + 1}. ${question.question}`, margin, yPosition);
      yPosition += lineHeight * 1.5;

      if (question.options?.length) {
        doc.setFont("helvetica", "normal");
        question.options.forEach((option, optIndex) => {
          doc.text(`${String.fromCharCode(97 + optIndex)}) ${option}`, margin + 20, yPosition);
          yPosition += lineHeight;
        });
        yPosition += lineHeight;
      }

      if (question.explanation) {
        doc.setFont("helvetica", "italic");
        const explanationLines = doc.splitTextToSize(question.explanation, contentWidth - 40);
        doc.text(explanationLines, margin + 20, yPosition);
        yPosition += explanationLines.length * lineHeight + lineHeight;
      }
    }

    // Add space between questions
    yPosition += lineHeight;
  });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateRubricPDF(resource: RubricResource): Promise<Buffer> {
  console.log("Generating rubric PDF with style:", resource.format);
  const doc = new jsPDF();
  const lineHeight = 10;
  let yPosition = 20;
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxY = pageHeight - margin;
  const cellPadding = 5;

  // Helper functions
  const checkAndAddPage = (requiredSpace: number = lineHeight): void => {
    if (yPosition + requiredSpace > maxY) {
      doc.addPage();
      yPosition = margin;
      doc.setFont("helvetica");
      doc.setFontSize(11);
    }
  };

  // Enhanced multiline text function that returns height and handles word wrapping better
  const addMultilineText = (text: string, x: number, y: number, maxWidth: number): number => {
    const words = text.split(' ');
    let currentLine = '';
    let totalHeight = 0;
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);
      
      if (testWidth > maxWidth) {
        doc.text(currentLine, x, y + totalHeight);
        currentLine = word;
        totalHeight += lineHeight;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) {
      doc.text(currentLine, x, y + totalHeight);
      totalHeight += lineHeight;
    }
    
    return totalHeight || lineHeight;
  };

  // Set default font
  doc.setFont("helvetica");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(resource.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 2;

  // Metadata
  doc.setFontSize(11);
  doc.text(`Subject: ${resource.subject}`, margin, yPosition);
  doc.text(`Grade Level: ${resource.grade_level}`, pageWidth - margin - 80, yPosition);
  yPosition += lineHeight * 2;

  // Table settings
  const tableWidth = pageWidth - (margin * 2);

  if (resource.format === 'checklist') {
    // Table settings
    const checkboxColWidth = 45; // Width for checkbox column (wider to fit Yes/Complete)
    const descriptionColWidth = tableWidth - checkboxColWidth;
    
    // Process each criterion
    resource.criteria.forEach((criterion, index) => {
      // Calculate text content and heights
      const titleText = `${index + 1}. ${criterion.name}`;
      const mainDescLines = doc.splitTextToSize(criterion.description, tableWidth - (cellPadding * 2));
      
      // Get descriptions for Yes/No states from levels array
      const yesDescription = criterion.levels[0]?.description || '';
      const noDescription = criterion.levels[1]?.description || '';
      
      const yesDescLines = doc.splitTextToSize(yesDescription, descriptionColWidth - (cellPadding * 2));
      const noDescLines = doc.splitTextToSize(noDescription, descriptionColWidth - (cellPadding * 2));
      
      // Calculate heights
      const headerHeight = (mainDescLines.length + 1) * lineHeight + (cellPadding * 2);
      const yesRowHeight = Math.max(yesDescLines.length * lineHeight + (cellPadding * 2), lineHeight * 2);
      const noRowHeight = Math.max(noDescLines.length * lineHeight + (cellPadding * 2), lineHeight * 2);
      const totalHeight = headerHeight + yesRowHeight + noRowHeight;
      
      checkAndAddPage(totalHeight);
      
      // Draw criterion header
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, yPosition, tableWidth, headerHeight, 'FD');
      
      // Add criterion title and main description
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(titleText, margin + cellPadding, yPosition + lineHeight);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(mainDescLines, margin + cellPadding, yPosition + lineHeight * 2);
      
      yPosition += headerHeight;
      
      // Draw Yes/Complete row
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, yPosition, tableWidth, yesRowHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(margin, yPosition, tableWidth, yesRowHeight);
      doc.line(margin + checkboxColWidth, yPosition, margin + checkboxColWidth, yPosition + yesRowHeight);
      
      // Add Yes checkbox and description
      const checkboxSize = 4;
      const checkboxX = margin + cellPadding;
      const checkboxY = yPosition + (yesRowHeight / 2) - (checkboxSize / 2);
      
      // Draw square checkbox
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.2);
      doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
      
      // Add Yes/Complete text
      doc.setFontSize(9);
      doc.text("Yes/Complete", checkboxX + checkboxSize + 4, yPosition + (yesRowHeight / 2));
      
      // Add Yes description
      doc.setFontSize(10);
      doc.text(yesDescLines, margin + checkboxColWidth + cellPadding, yPosition + lineHeight);
      
      yPosition += yesRowHeight;
      
      // Draw No/Incomplete row
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, yPosition, tableWidth, noRowHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, yPosition, tableWidth, noRowHeight);
      doc.line(margin + checkboxColWidth, yPosition, margin + checkboxColWidth, yPosition + noRowHeight);
      
      // Add No checkbox
      const noCheckboxY = yPosition + (noRowHeight / 2) - (checkboxSize / 2);
      
      // Draw square checkbox
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.2);
      doc.rect(checkboxX, noCheckboxY, checkboxSize, checkboxSize);
      
      // Add No/Incomplete text
      doc.setFontSize(9);
      doc.text("No/Incomplete", checkboxX + checkboxSize + 4, yPosition + (noRowHeight / 2));
      
      // Add No description
      doc.setFontSize(10);
      doc.text(noDescLines, margin + checkboxColWidth + cellPadding, yPosition + lineHeight);
      
      yPosition += noRowHeight + lineHeight; // Add extra space between criteria
    });
  } else {
    // Rating scale format (3-point or 4-point)
    resource.criteria.forEach((criterion, index) => {
      const criterionTextHeight = doc.splitTextToSize(criterion.description, tableWidth - (cellPadding * 2)).length * lineHeight;
      const criterionHeaderHeight = lineHeight * 2 + criterionTextHeight + cellPadding * 2;

      const headers = resource.format === '4_point'
        ? ['Excellent (4)', 'Good (3)', 'Satisfactory (2)', 'Needs Improvement (1)']
        : ['Exceeds Expectations (3)', 'Meets Expectations (2)', 'Below Expectations (1)'];

      const colWidth = tableWidth / headers.length;
      const headerHeight = lineHeight * 2.5;
      const contentHeight = lineHeight * 6;
      const totalHeight = criterionHeaderHeight + headerHeight + contentHeight + lineHeight;

      checkAndAddPage(totalHeight);

      // Criterion header
      doc.setFillColor(240, 240, 240);
      doc.setDrawColor(100, 100, 100);
      doc.rect(margin, yPosition, tableWidth, criterionHeaderHeight, 'FD');
      
      // Criterion title and description
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${criterion.name}`, margin + cellPadding, yPosition + lineHeight);
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      addMultilineText(criterion.description, margin + cellPadding, yPosition + lineHeight * 2, tableWidth - (cellPadding * 2));
      
      yPosition += criterionHeaderHeight + lineHeight;

      // Draw rating scale table
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, tableWidth, headerHeight + contentHeight);

      // Draw header cells
      headers.forEach((header, i) => {
        const x = margin + (i * colWidth);
        doc.setFillColor(245, 245, 245);
        doc.rect(x, yPosition, colWidth, headerHeight, 'F');
        
        if (i > 0) {
          doc.line(x, yPosition, x, yPosition + headerHeight + contentHeight);
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(header, x + (colWidth / 2), yPosition + (headerHeight / 2), { 
          align: 'center',
          maxWidth: colWidth - (cellPadding * 2)
        });
      });

      doc.line(margin, yPosition + headerHeight, margin + tableWidth, yPosition + headerHeight);

      // Add content
      criterion.levels.forEach((level, i) => {
        if (i < headers.length) {
          const x = margin + (i * colWidth);
  doc.setFont("helvetica", "normal");
          const wrappedText = doc.splitTextToSize(level.description, colWidth - (cellPadding * 2));
          doc.text(wrappedText, x + (colWidth / 2), yPosition + headerHeight + cellPadding + (lineHeight / 2), { 
            align: 'center',
            maxWidth: colWidth - (cellPadding * 2)
          });
        }
      });

      yPosition += headerHeight + contentHeight + lineHeight * 2;
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateExitSlipPDF(resource: ExitSlipResource): Promise<Buffer> {
  const doc = new jsPDF();
  const lineHeight = 7; // Reduced from 10 to 7
  let yPosition = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxY = pageHeight - margin;

  function checkAndAddPage(requiredSpace: number = lineHeight): void {
    if (yPosition + requiredSpace > maxY) {
      doc.addPage();
      yPosition = margin;
      doc.setFont("helvetica");
      doc.setFontSize(11);
    }
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20); // Reduced from 24 to 20
  doc.text(resource.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 2;

  // Name and Date fields in a more compact layout
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const columnWidth = (pageWidth - margin * 2) / 2;
  const nameX = margin;
  const dateX = margin + columnWidth + 10;
  
  // Name and Date on same line
  doc.setFont("helvetica", "bold");
  doc.text('Name:', nameX, yPosition);
  doc.text('Date:', dateX, yPosition);
  doc.setFont("helvetica", "normal");
  doc.line(nameX + 25, yPosition, nameX + columnWidth - 10, yPosition);
  doc.line(dateX + 25, yPosition, dateX + columnWidth - 10, yPosition);
  yPosition += lineHeight * 1.2;

  // Subject and Grade Level on same line
  doc.setFont("helvetica", "bold");
  doc.text(`Subject: `, margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(resource.subject, margin + 35, yPosition);
  doc.setFont("helvetica", "bold");
  doc.text(`Grade Level: `, margin + columnWidth, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(resource.grade_level, margin + columnWidth + 45, yPosition);
  yPosition += lineHeight * 1.2;

  // Instructions
  if (resource.instructions) {
    doc.setFont("helvetica", "bold");
    doc.text('Instructions:', margin, yPosition);
    yPosition += lineHeight;
    doc.setFont("helvetica", "normal");
    const instructionLines = doc.splitTextToSize(resource.instructions, pageWidth - margin * 2);
    doc.text(instructionLines, margin, yPosition);
    yPosition += instructionLines.length * lineHeight + lineHeight;
  }

  // Questions
  if (resource.questions && resource.questions.length > 0) {
    resource.questions.forEach((question, index) => {
      // Calculate space needed based on question type
      let totalHeight = lineHeight * 1.5; // Reduced basic spacing
      const contentWidth = pageWidth - margin * 2;

      if (question.type === 'vocabulary_check') {
        // Calculate space needed for content
        const termText = question.term || '';
        const definitionText = question.definition || '';
        const contextText = question.context || '';
        const usagePromptText = question.usagePrompt || '';
        
        // Calculate line wrapping once
        const termLines = doc.splitTextToSize(termText, contentWidth - 60);
        const definitionLines = doc.splitTextToSize(definitionText, contentWidth - 60);
        const contextLines = doc.splitTextToSize(contextText, contentWidth - 60);
        const usageLines = doc.splitTextToSize(usagePromptText, contentWidth - 60);
        
        totalHeight += (termLines.length + definitionLines.length + contextLines.length + usageLines.length) * lineHeight;
        if (question.examples?.length) totalHeight += question.examples.length * lineHeight;
        totalHeight += lineHeight * 4; // Reduced extra space

        // Check if we need a new page
        checkAndAddPage(totalHeight);

        // Question number and Term on same line
      doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}.`, margin, yPosition);
        doc.text('Term:', margin + 10, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(termText, margin + 35, yPosition);
        yPosition += lineHeight * 1.2;

      // Definition
      doc.setFont("helvetica", "bold");
        doc.text('Definition:', margin + 10, yPosition);
      doc.setFont("helvetica", "normal");
        doc.text(definitionLines, margin + 45, yPosition);
        yPosition += definitionLines.length * lineHeight + lineHeight * 0.5;

      // Context
        if (contextText) {
        doc.setFont("helvetica", "bold");
          doc.text('Context:', margin + 10, yPosition);
        doc.setFont("helvetica", "normal");
          doc.text(contextLines, margin + 45, yPosition);
          yPosition += contextLines.length * lineHeight + lineHeight * 0.5;
      }

      // Examples
        if (question.examples?.length) {
        doc.setFont("helvetica", "bold");
          doc.text('Examples:', margin + 10, yPosition);
          yPosition += lineHeight * 0.8;
        doc.setFont("helvetica", "normal");
          question.examples.forEach(example => {
            doc.text(`• ${example}`, margin + 45, yPosition);
        yPosition += lineHeight;
          });
          yPosition += lineHeight * 0.5;
      }

        // Usage Prompt
        if (usagePromptText) {
        doc.setFont("helvetica", "bold");
          doc.text('Practice:', margin + 10, yPosition);
        doc.setFont("helvetica", "normal");
          doc.text(usageLines, margin + 45, yPosition);
          yPosition += usageLines.length * lineHeight + lineHeight * 0.5;
        }

        // Add lines for writing with reduced spacing
        doc.setDrawColor(200, 200, 200);
        for (let i = 0; i < 2; i++) {
          doc.line(margin + 45, yPosition + (i * lineHeight), 
                  pageWidth - margin, yPosition + (i * lineHeight));
        }
        yPosition += lineHeight * 2.5;
      } else if (question.type === 'reflection_prompt') {
        // Handle reflection prompts more compactly
        const questionLines = doc.splitTextToSize(question.mainQuestion || '', contentWidth - 20);
        totalHeight += questionLines.length * lineHeight;
        if (question.reflectionGuides?.length) {
          totalHeight += question.reflectionGuides.length * lineHeight;
        }
        if (question.sentenceStarters?.length) {
          totalHeight += question.sentenceStarters.length * lineHeight * 2;
        }

        checkAndAddPage(totalHeight);

      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, margin, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(questionLines, margin + 10, yPosition);
        yPosition += questionLines.length * lineHeight + lineHeight * 0.5;

        if (question.reflectionGuides?.length) {
          doc.setFont("helvetica", "bold");
          doc.text('Consider these points:', margin + 10, yPosition);
          yPosition += lineHeight;
          doc.setFont("helvetica", "normal");
          question.reflectionGuides.forEach(guide => {
            doc.text(`• ${guide}`, margin + 15, yPosition);
          yPosition += lineHeight;
        });
          yPosition += lineHeight * 0.5;
        }

        if (question.sentenceStarters?.length) {
          doc.setFont("helvetica", "bold");
          doc.text('Sentence Starters:', margin + 10, yPosition);
        yPosition += lineHeight;
          doc.setFont("helvetica", "normal");
          question.sentenceStarters.forEach(starter => {
            doc.text(starter, margin + 10, yPosition);
        yPosition += lineHeight;
        doc.setDrawColor(200, 200, 200);
            doc.line(margin + 10, yPosition, pageWidth - margin, yPosition);
            yPosition += lineHeight * 1.5;
          });
        }
      } else if (question.type === 'skill_assessment') {
        // Type guard for skill assessment questions
        type SkillAssessmentQuestion = Extract<ExitSlipResource['questions'][number], { type: 'skill_assessment' }>;

        function isSkillAssessmentQuestion(q: any): q is SkillAssessmentQuestion {
          return q.type === 'skill_assessment' && 'task' in q;
        }

        // Ensure this is a skill assessment question
        if (!isSkillAssessmentQuestion(question)) {
          continue;
        }

        const skillQuestion = question;
        
        // Handle skill assessment more compactly
        const taskLines = doc.splitTextToSize(skillQuestion.task || '', contentWidth - 55);
        const applicationContextLines = skillQuestion.realWorldApplication ? doc.splitTextToSize(skillQuestion.realWorldApplication, contentWidth - 55) : [];
        
        // Calculate total height needed
        totalHeight += taskLines.length * lineHeight;
        if (skillQuestion.steps?.length) totalHeight += skillQuestion.steps.length * lineHeight;
        if (applicationContextLines.length) totalHeight += applicationContextLines.length * lineHeight;
        if (skillQuestion.successCriteria?.length) totalHeight += skillQuestion.successCriteria.length * lineHeight;
        totalHeight += lineHeight * 5; // Extra space for section gaps

        checkAndAddPage(totalHeight);

        // Question number and Task
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}.`, margin, yPosition);
        doc.text('Task:', margin + 10, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(taskLines, margin + 45, yPosition);
        yPosition += taskLines.length * lineHeight + lineHeight;

        // Steps
        if (skillQuestion.steps?.length) {
          doc.setFont("helvetica", "bold");
          doc.text('Steps:', margin + 10, yPosition);
          yPosition += lineHeight;
          doc.setFont("helvetica", "normal");
          skillQuestion.steps.forEach((step: string, stepIndex: number) => {
            const stepLines = doc.splitTextToSize(`${stepIndex + 1}. ${step}`, contentWidth - 55);
            doc.text(stepLines, margin + 45, yPosition);
            yPosition += stepLines.length * lineHeight;
          });
          yPosition += lineHeight;
        }

        // Application Context (moved after steps)
        if (skillQuestion.realWorldApplication) {
          // Add a bit more space before this section
          yPosition += lineHeight * 0.5;
          
          doc.setFont("helvetica", "bold");
          doc.text('Real-World', margin + 10, yPosition);
          doc.text('Application:', margin + 10, yPosition + lineHeight);
          yPosition += lineHeight * 2;
          
          doc.setFont("helvetica", "normal");
          // Ensure proper wrapping for the application context
          const wrappedContextLines = doc.splitTextToSize(skillQuestion.realWorldApplication, contentWidth - 55);
          doc.text(wrappedContextLines, margin + 45, yPosition);
          yPosition += wrappedContextLines.length * lineHeight + lineHeight;
        }

        // Success Criteria
        if (skillQuestion.successCriteria?.length) {
          doc.setFont("helvetica", "bold");
          doc.text('Success Criteria:', margin + 10, yPosition);
          yPosition += lineHeight;
          doc.setFont("helvetica", "normal");
          skillQuestion.successCriteria.forEach((criterion: string) => {
            const criterionLines = doc.splitTextToSize(criterion, contentWidth - 60);
            doc.text(`□`, margin + 45, yPosition);
            doc.text(criterionLines, margin + 55, yPosition);
            yPosition += criterionLines.length * lineHeight;
          });
          yPosition += lineHeight;
        }
      }
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export const generateLessonPlanPDF = async (resource: LessonPlanResource): Promise<Buffer> => {
  const doc = new jsPDF();
  const margin = 20;
  const lineHeight = 7;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = margin;

  // Helper function to check and add page break if needed
  const checkAndAddPage = (contentHeight: number): boolean => {
    if (yPosition + contentHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add section title with proper spacing
  const addSectionTitle = (title: string, duration?: string): void => {
    checkAndAddPage(lineHeight * 3);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, yPosition);
    if (duration) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128); // Gray color for duration
      doc.text(`(${duration})`, margin + doc.getTextWidth(title) + 5, yPosition);
      doc.setTextColor(0, 0, 0); // Reset to black
    }
    yPosition += lineHeight * 1.5;
    doc.setFont("helvetica", "normal");
  };

  // Helper function to add bullet points with proper indentation and page breaks
  const addBulletPoint = (text: string, indent: number = 5): void => {
    const bulletIndent = margin + indent;
    const maxWidth = pageWidth - bulletIndent - margin;
    const lines = doc.splitTextToSize(text, maxWidth);
    
    checkAndAddPage(lines.length * lineHeight + lineHeight/2);
    
    doc.text("•", margin + indent - 3, yPosition);
    doc.text(lines, bulletIndent, yPosition);
    yPosition += lines.length * lineHeight + lineHeight/2;
  };

  // Title and metadata section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const title = resource.title || "Lesson Plan";
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, yPosition);
  yPosition += lineHeight * 2;

  // Subject and Grade
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const subject = resource.subject || "";
  const subjectWidth = doc.getTextWidth(subject);
  doc.text(subject, (pageWidth - subjectWidth) / 2, yPosition);
  yPosition += lineHeight;

  const grade = resource.grade_level || "";
  const gradeWidth = doc.getTextWidth(grade);
  doc.text(grade, (pageWidth - gradeWidth) / 2, yPosition);
  yPosition += lineHeight * 2;

  // Duration
  const duration = resource.duration || "";
  const durationWidth = doc.getTextWidth(duration);
  doc.text(duration, (pageWidth - durationWidth) / 2, yPosition);
  yPosition += lineHeight * 2;

  // Learning Objectives
  addSectionTitle("Learning Objectives");
  if (resource.objectives?.length) {
    resource.objectives.forEach(objective => {
      addBulletPoint(objective);
  });
  yPosition += lineHeight;
  }

  // Materials Needed
  addSectionTitle("Materials Needed");
  if (resource.materials?.length) {
    resource.materials.forEach(material => {
      addBulletPoint(material);
    });
    yPosition += lineHeight;
  }

  // Activities Section
  // Opening Activity
  if (resource.activities?.opening) {
    addSectionTitle("Opening Activity", resource.activities.opening.duration);
    
    if (resource.activities.opening.description) {
      const descLines = doc.splitTextToSize(resource.activities.opening.description, pageWidth - margin * 2);
      checkAndAddPage(descLines.length * lineHeight + lineHeight);
      doc.text(descLines, margin, yPosition);
      yPosition += descLines.length * lineHeight + lineHeight;
    }

    if (resource.activities.opening.teacher_actions?.length) {
    doc.setFont("helvetica", "bold");
      checkAndAddPage(lineHeight * 2);
      doc.text("Teacher Actions:", margin, yPosition);
    yPosition += lineHeight;
      doc.setFont("helvetica", "normal");
      resource.activities.opening.teacher_actions.forEach(action => {
        addBulletPoint(action, 10);
      });
    }

    if (resource.activities.opening.student_actions?.length) {
      doc.setFont("helvetica", "bold");
      checkAndAddPage(lineHeight * 2);
      doc.text("Student Actions:", margin, yPosition);
      yPosition += lineHeight;
    doc.setFont("helvetica", "normal");
      resource.activities.opening.student_actions.forEach(action => {
        addBulletPoint(action, 10);
      });
    }
    yPosition += lineHeight;
  }

  // Main Activity
  if (resource.activities?.main) {
    addSectionTitle("Main Activity", resource.activities.main.duration);
    
    if (resource.activities.main.description) {
      const descLines = doc.splitTextToSize(resource.activities.main.description, pageWidth - margin * 2);
      checkAndAddPage(descLines.length * lineHeight + lineHeight);
      doc.text(descLines, margin, yPosition);
      yPosition += descLines.length * lineHeight + lineHeight;
    }

    if (resource.activities.main.teacher_actions?.length) {
    doc.setFont("helvetica", "bold");
      checkAndAddPage(lineHeight * 2);
      doc.text("Teacher Actions:", margin, yPosition);
    yPosition += lineHeight;
      doc.setFont("helvetica", "normal");
      resource.activities.main.teacher_actions.forEach(action => {
        addBulletPoint(action, 10);
      });
    }

    if (resource.activities.main.student_actions?.length) {
      doc.setFont("helvetica", "bold");
      checkAndAddPage(lineHeight * 2);
      doc.text("Student Actions:", margin, yPosition);
    yPosition += lineHeight;
      doc.setFont("helvetica", "normal");
      resource.activities.main.student_actions.forEach(action => {
        addBulletPoint(action, 10);
      });
    }
    yPosition += lineHeight;
  }

  // Closing Activity
  if (resource.activities?.closing) {
    addSectionTitle("Closing Activity", resource.activities.closing.duration);
    
    if (resource.activities.closing.description) {
      const descLines = doc.splitTextToSize(resource.activities.closing.description, pageWidth - margin * 2);
      checkAndAddPage(descLines.length * lineHeight + lineHeight);
      doc.text(descLines, margin, yPosition);
      yPosition += descLines.length * lineHeight + lineHeight;
    }

    if (resource.activities.closing.teacher_actions?.length) {
    doc.setFont("helvetica", "bold");
      checkAndAddPage(lineHeight * 2);
      doc.text("Teacher Actions:", margin, yPosition);
    yPosition += lineHeight;
    doc.setFont("helvetica", "normal");
      resource.activities.closing.teacher_actions.forEach(action => {
        addBulletPoint(action, 10);
      });
    }

    if (resource.activities.closing.student_actions?.length) {
    doc.setFont("helvetica", "bold");
      checkAndAddPage(lineHeight * 2);
      doc.text("Student Actions:", margin, yPosition);
    yPosition += lineHeight;
    doc.setFont("helvetica", "normal");
      resource.activities.closing.student_actions.forEach(action => {
        addBulletPoint(action, 10);
      });
    }
    yPosition += lineHeight;
  }

  // Assessment Sections
  if (resource.assessment?.formative?.length) {
    addSectionTitle("Formative Assessment");
    resource.assessment.formative.forEach(assessment => {
      addBulletPoint(assessment);
    });
    yPosition += lineHeight;
  }

  if (resource.assessment?.summative?.length) {
    addSectionTitle("Summative Assessment");
    resource.assessment.summative.forEach(assessment => {
      addBulletPoint(assessment);
    });
    yPosition += lineHeight;
  }

  // Differentiation Sections
  if (resource.differentiation?.struggling?.length) {
    addSectionTitle("Support for Struggling Students");
    resource.differentiation.struggling.forEach(support => {
      addBulletPoint(support);
    });
    yPosition += lineHeight;
  }

  if (resource.differentiation?.advanced?.length) {
    addSectionTitle("Extensions for Advanced Students");
    resource.differentiation.advanced.forEach(extension => {
      addBulletPoint(extension);
    });
    yPosition += lineHeight;
  }

  // Extension Activities
  if (resource.extensions?.length) {
    addSectionTitle("Extension Activities");
    resource.extensions.forEach(activity => {
      addBulletPoint(activity);
    });
    yPosition += lineHeight;
  }

  // Reflection Points
  if (resource.reflection_points?.length) {
    addSectionTitle("Reflection Points");
    resource.reflection_points.forEach(point => {
      addBulletPoint(point);
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
};