import { FormatHandler, FormatHandlers, AllFormats } from '../types/format-handlers';
import { WorksheetResource } from '../types/resource';
import { scienceFormats } from '../handlers/science-formats';
import { mathFormats } from '../handlers/math-formats';
import { readingFormats } from '../handlers/reading-formats';

class FormatHandlerService {
  private static instance: FormatHandlerService;
  private formatHandlers: FormatHandlers;

  private constructor() {
    this.formatHandlers = {
      science: scienceFormats,
      math: mathFormats,
      reading: readingFormats
    };
  }

  public static getInstance(): FormatHandlerService {
    if (!FormatHandlerService.instance) {
      FormatHandlerService.instance = new FormatHandlerService();
    }
    return FormatHandlerService.instance;
  }

  public getHandler(subject: keyof FormatHandlers, format: AllFormats): FormatHandler {
    const subjectHandlers = this.formatHandlers[subject];
    if (!subjectHandlers) {
      throw new Error(`No handlers found for subject: ${subject}`);
    }

    const handler = subjectHandlers[format as keyof typeof subjectHandlers];
    if (!handler) {
      throw new Error(`No handler found for format: ${format} in subject: ${subject}`);
    }

    return handler;
  }

  public transformResource(subject: keyof FormatHandlers, format: AllFormats, data: any): WorksheetResource {
    const handler = this.getHandler(subject, format);
    try {
      const resource = handler.transform(data);
      this.validateResource(resource);
      return resource;
    } catch (error) {
      throw new Error(`Failed to transform resource: ${error.message}`);
    }
  }

  public generatePreview(resource: WorksheetResource): JSX.Element {
    const handler = this.getHandler(resource.subject.toLowerCase() as keyof FormatHandlers, resource.format as AllFormats);
    try {
      return handler.preview(resource);
    } catch (error) {
      throw new Error(`Failed to generate preview: ${error.message}`);
    }
  }

  public generatePDF(resource: WorksheetResource): string {
    const handler = this.getHandler(resource.subject.toLowerCase() as keyof FormatHandlers, resource.format as AllFormats);
    try {
      return handler.generatePDF(resource);
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  private validateResource(resource: WorksheetResource): void {
    if (!resource.subject || !resource.format || !resource.resourceType) {
      throw new Error('Invalid resource: missing required fields');
    }

    // Validate format-specific fields
    switch (resource.format) {
      case 'science_context':
        if (!resource.science_context) {
          throw new Error('Invalid science_context resource: missing science_context data');
        }
        break;
      case 'analysis_focus':
        if (!resource.analysis_content) {
          throw new Error('Invalid analysis_focus resource: missing analysis_content data');
        }
        break;
      // Add other format validations as needed
    }
  }
}

export const formatHandlerService = FormatHandlerService.getInstance(); 