import { FormatHandler, FormatHandlers, AllFormats } from '../types/format-handlers';
import { WorksheetResource, QuizResource } from '../types/resource';
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

  public transformResource(subject: keyof FormatHandlers, format: AllFormats, data: any): WorksheetResource | QuizResource {
    // Special handling for quizzes
    if (data.resourceType === 'quiz') {
      return this.transformQuizResource(data);
    }

    const handler = this.getHandler(subject, format);
    try {
      const resource = handler.transform(data);
      this.validateResource(resource);
      return resource;
    } catch (error) {
      throw new Error(`Failed to transform resource: ${error.message}`);
    }
  }

  private transformQuizResource(data: any): QuizResource {
    try {
      // Validate the quiz data structure
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Quiz data must contain an array of questions');
      }

      // Transform each question
      const transformedQuestions = data.questions.map((q: any, index: number) => {
        if (!q.question) {
          throw new Error(`Question ${index + 1} is missing the question text`);
        }

        // Handle different question formats
        if (q.options) {
          // Multiple choice format
          const options = Array.isArray(q.options) ? q.options : 
                       typeof q.options === 'object' ? Object.values(q.options) :
                       [];
          
          if (options.length === 0) {
            throw new Error(`Question ${index + 1} has invalid options`);
          }

          return {
            type: "multiple_choice",
            question: q.question,
            options: options,
            answer: q.answer || q.correctAnswer,
            correctAnswer: q.correctAnswer || q.answer,
            explanation: q.explanation || `The correct answer is ${q.correctAnswer || q.answer}`,
            cognitiveLevel: q.cognitiveLevel || "recall",
            points: q.points || 1
          };
        } else {
          // Short answer format
          return {
            type: "short_answer",
            question: q.question,
            options: [],
            answer: q.answer || q.correctAnswer,
            correctAnswer: q.correctAnswer || q.answer,
            explanation: q.explanation || `The correct answer is ${q.answer || q.correctAnswer}`,
            cognitiveLevel: q.cognitiveLevel || "recall",
            points: q.points || 1
          };
        }
      });

      return {
        resourceType: 'quiz',
        title: data.title || "Quiz",
        subject: data.subject || "General",
        grade_level: data.grade_level || "",
        topic: data.topic || "General",
        theme: data.theme || "General",
        format: data.format || "multiple_choice",
        estimatedTime: data.estimatedTime || `${transformedQuestions.length * 2} minutes`,
        questions: transformedQuestions,
        totalPoints: data.totalPoints || transformedQuestions.length,
        metadata: {
          complexityLevel: data.metadata?.complexityLevel || 5,
          languageLevel: data.metadata?.languageLevel || 5,
          cognitiveDistribution: data.metadata?.cognitiveDistribution || {
            recall: 0.6,
            comprehension: 0.3,
            application: 0.1,
            analysis: 0
          }
        }
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to transform quiz: ${error.message}`);
      }
      throw new Error('Failed to transform quiz: Unknown error');
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