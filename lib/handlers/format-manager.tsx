import { FormatHandlers, FormatHandler, MathFormats, ReadingFormats, ScienceFormats } from '../types/format-handlers';
import { mathFormats } from './math-formats';
import { readingFormats } from './reading-formats';
import { scienceFormats } from './science-formats';
import { WorksheetResource } from '../types/resource';

// Combined format handlers
const formatHandlers: FormatHandlers = {
  math: mathFormats,
  reading: readingFormats,
  science: scienceFormats
};

// Helper function to get the correct format handler
export function getFormatHandler(subject: string, format: string): FormatHandler {
  const normalizedSubject = subject.toLowerCase();
  let subjectKey: keyof FormatHandlers;

  // Map subject to key
  if (normalizedSubject.includes('math')) {
    subjectKey = 'math';
  } else if (normalizedSubject.includes('read') || normalizedSubject.includes('language')) {
    subjectKey = 'reading';
  } else if (normalizedSubject.includes('science')) {
    subjectKey = 'science';
  } else {
    throw new Error(`Unsupported subject: ${subject}`);
  }

  // Get format handlers for subject
  const subjectHandlers = formatHandlers[subjectKey];
  if (!subjectHandlers) {
    throw new Error(`No handlers found for subject: ${subject}`);
  }

  // Get specific format handler based on subject
  const normalizedFormat = format.toLowerCase();
  let formatHandler: FormatHandler | undefined;
  
  switch(subjectKey) {
    case 'math':
      formatHandler = (subjectHandlers as MathFormats)[normalizedFormat as keyof MathFormats];
      break;
    case 'reading':
      formatHandler = (subjectHandlers as ReadingFormats)[normalizedFormat as keyof ReadingFormats];
      break;
    case 'science':
      formatHandler = (subjectHandlers as ScienceFormats)[normalizedFormat as keyof ScienceFormats];
      break;
  }

  if (!formatHandler) {
    throw new Error(`No handler found for format: ${format} in subject: ${subject}. Available formats: ${Object.keys(subjectHandlers).join(', ')}`);
  }

  return formatHandler;
}

// Helper function to transform API response
export function transformResponse(response: any): WorksheetResource {
  const subject = response.subject || 'Math';
  const format = response.format || 'standard';
  
  const handler = getFormatHandler(subject, format);
  return handler.transform(response);
}

// Helper function to generate preview content
export function generatePreview(resource: WorksheetResource) {
  const handler = getFormatHandler(resource.subject, resource.format);
  return handler.preview(resource);
}

// Helper function to generate PDF content
export function generatePDFContent(resource: WorksheetResource): string {
  const handler = getFormatHandler(resource.subject, resource.format);
  return handler.generatePDF(resource);
} 