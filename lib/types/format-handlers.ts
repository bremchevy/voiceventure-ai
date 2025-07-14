import { WorksheetResource } from './resource';

// Base interface for format handlers
export interface FormatHandler {
  transform: (response: any) => WorksheetResource;
  preview: (resource: WorksheetResource) => JSX.Element;
  generatePDF: (resource: WorksheetResource) => string; // Returns HTML content for PDF
}

// Subject-specific format configurations
export interface MathFormats {
  standard: FormatHandler;
  guided: FormatHandler;
  interactive: FormatHandler;
}

export interface ReadingFormats {
  comprehension: FormatHandler;
  vocabulary_context: FormatHandler;
  literary_analysis: FormatHandler;
}

export interface ScienceFormats {
  science_context: FormatHandler;
  analysis_focus: FormatHandler;
  lab_experiment: FormatHandler;
}

// Combined format handlers type
export interface FormatHandlers {
  math: MathFormats;
  reading: ReadingFormats;
  science: ScienceFormats;
}

// Helper type to get available formats for a subject
export type SubjectFormats<T extends keyof FormatHandlers> = keyof FormatHandlers[T];

// Helper type to get all possible formats
export type AllFormats = SubjectFormats<'math'> | SubjectFormats<'reading'> | SubjectFormats<'science'>; 