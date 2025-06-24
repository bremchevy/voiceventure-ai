import { MathContentGenerator } from './AIContentGenerator/math';
import { ReadingContentGenerator } from './AIContentGenerator/reading';
import { ScienceContentGenerator } from './AIContentGenerator/science';
import { TemplateManager } from './TemplateManager/base';
import type { ResourceGenerationOptions, GeneratedResource } from '@/lib/types/resource';

export class AIResourceGenerator {
  private mathGenerator: MathContentGenerator;
  private readingGenerator: ReadingContentGenerator;
  private scienceGenerator: ScienceContentGenerator;
  private templateManager: TemplateManager;

  constructor() {
    console.log('🔧 Initializing AIResourceGenerator');
    this.mathGenerator = new MathContentGenerator();
    this.readingGenerator = new ReadingContentGenerator();
    this.scienceGenerator = new ScienceContentGenerator();
    this.templateManager = new TemplateManager();
  }

  async generateResource(options: ResourceGenerationOptions): Promise<GeneratedResource> {
    console.log('🎯 Starting resource generation with options:', {
      subject: options.subject,
      gradeLevel: options.gradeLevel,
      resourceType: options.resourceType
    });

    let content;
    const subject = this.normalizeSubject(options.subject.toLowerCase().trim());
    console.log('📝 Normalized subject:', subject);

    // Generate content based on subject - using normalized subjects
    try {
      if (subject === 'math') {
        console.log('🔢 Generating math content');
        content = await this.generateMathContent(options);
      } else if (subject === 'reading') {
        console.log('📚 Generating reading content');
        content = await this.generateReadingContent(options);
      } else if (subject === 'science') {
        console.log('🔬 Generating science content');
        content = await this.generateScienceContent(options);
      } else {
        console.error('❌ Unsupported subject:', options.subject);
        throw new Error(`Unsupported subject: ${options.subject}`);
      }

      console.log('✅ Content generated successfully:', {
        hasContent: !!content,
        contentType: typeof content,
        keys: content ? Object.keys(content) : []
      });

      // Format the content for the template
      const templateData = this.formatContentForTemplate(content, options);

      console.log('📋 Template data prepared:', {
        hasTitle: !!templateData.title,
        hasInstructions: !!templateData.instructions,
        hasSections: !!templateData.sections,
        sectionCount: templateData.sections?.length || 0,
        problemCount: templateData.problems?.length || 0,
        hasMetadata: !!templateData.metadata,
        decorations: templateData.decorations?.length || 0
      });

      return {
        title: templateData.title,
        instructions: templateData.instructions,
        sections: templateData.sections,
        problems: templateData.problems,
        grade: options.gradeLevel,
        subject: options.subject,
        resourceType: options.resourceType,
        theme: options.theme,
        decorations: templateData.decorations,
        metadata: templateData.metadata
      };
    } catch (error) {
      console.error('❌ Error in generateResource:', error);
      console.error('Failed options:', options);
      throw error;
    }
  }

  private formatContentForTemplate(content: any, options: ResourceGenerationOptions) {
    // Default decorations based on subject
    const subjectDecorations: Record<string, string[]> = {
      math: ['🔢', '✏️', '📐', '➗'],
      science: ['🔬', '🧪', '🌍', '⚡'],
      reading: ['📚', '✍️', '📝', '📖']
    };

    // Handle structured content (like quizzes with sections)
    if (content.sections) {
      return {
        title: content.title || `${options.subject} ${options.resourceType}`,
        instructions: content.instructions || this.generateDefaultInstructions(options),
        sections: content.sections.map((section: any) => ({
          title: section.title,
          instructions: section.instructions,
          problems: section.problems.map((problem: any) => ({
            ...problem,
            type: problem.type || 'standard',
            number: problem.number || 0
          }))
        })),
        metadata: {
          gradeLevel: options.gradeLevel,
          subject: options.subject,
          resourceType: options.resourceType,
          generatedAt: new Date().toISOString(),
          theme: options.theme,
          difficulty: options.difficulty,
        },
        decorations: content.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
      };
    }

    // Convert questions/experiments to problems format for non-sectioned content
    const problems = this.convertToProblems(content, options.subject);

    return {
      title: content.title || `${options.subject} ${options.resourceType}`,
      instructions: content.instructions || this.generateDefaultInstructions(options),
      problems,
      metadata: {
        gradeLevel: options.gradeLevel,
        subject: options.subject,
        resourceType: options.resourceType,
        generatedAt: new Date().toISOString(),
        theme: options.theme,
        difficulty: options.difficulty,
      },
      decorations: content.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
    };
  }

  private convertToProblems(content: any, subject: string) {
    if (content.problems) {
      return content.problems.map((p: any) => ({
        question: p.question,
        visual: p.visual || null,
        steps: p.steps || [],
        // answer is intentionally excluded for student worksheets
      }));
    }

    // Convert questions to problems format
    if (content.questions) {
      return content.questions.map((q: any, index: number) => ({
        question: q.question || q,
        visual: q.visual || q.diagram || null,
        steps: q.steps || [],
        // answer is intentionally excluded for student worksheets
      }));
    }

    // Convert experiments to problems format
    if (content.experiments) {
      return content.experiments.map((exp: any) => ({
        question: exp.title || exp.question,
        visual: exp.diagram || exp.visual || null,
        steps: exp.procedure || exp.steps || [],
        // answer is intentionally excluded for student worksheets
      }));
    }

    // Return empty array if no content found
    return [];
  }

  private generateDefaultInstructions(options: ResourceGenerationOptions): string {
    const type = options.resourceType.toLowerCase();
    const subject = options.subject.toLowerCase();

    if (type === 'quiz') {
      return 'Read each question carefully and write your answers in the spaces provided. Show your work where necessary.';
    } else if (type === 'worksheet') {
      if (subject === 'math') {
        return 'Solve each problem step by step. Show all your work and circle your final answers.';
      } else if (subject === 'science') {
        return 'Answer each question based on your understanding of the scientific concepts. Use complete sentences where necessary.';
      } else {
        return 'Complete each question thoughtfully. Use evidence from the text to support your answers where applicable.';
      }
    }

    return 'Complete all questions to the best of your ability. Write your answers clearly in the spaces provided.';
  }

  private normalizeSubject(subject: string): string {
    console.log('🔍 Normalizing subject:', subject);
    
    // Map of subject-specific contexts to their base subjects
    const subjectMap: Record<string, string> = {
      // Math variants
      'mathematics': 'math',
      'algebra': 'math',
      'geometry': 'math',
      'arithmetic': 'math',
      
      // Reading variants
      'english': 'reading',
      'ela': 'reading',
      'language arts': 'reading',
      'comprehension': 'reading',
      'literacy': 'reading',
      
      // Science variants
      'biology': 'science',
      'chemistry': 'science',
      'physics': 'science',
      'science fair': 'science',
      'experiment': 'science'
    };

    // Check for exact matches first
    if (subject === 'math' || subject === 'reading' || subject === 'science') {
      console.log('✅ Found exact subject match:', subject);
      return subject;
    }

    // Check for subject-specific contexts
    for (const [key, value] of Object.entries(subjectMap)) {
      if (subject.includes(key)) {
        console.log(`✅ Normalized "${subject}" to "${value}" via key "${key}"`);
        return value;
      }
    }

    console.log('⚠️ No normalization found, returning original:', subject);
    // Default to the original subject if no match found
    return subject;
  }

  private async generateMathContent(options: ResourceGenerationOptions) {
    return this.mathGenerator.generateMathContent({
      grade: parseInt(options.gradeLevel),
      difficulty: options.difficulty || 'medium',
      topic: options.topicArea,
      includeSteps: options.includeQuestions,
      includeVisuals: options.includeVisuals,
      numberOfProblems: options.problemCount || 10,
    });
  }

  private async generateReadingContent(options: ResourceGenerationOptions) {
    return this.readingGenerator.generateReadingContent({
      grade: parseInt(options.gradeLevel),
      genre: options.genre || 'fiction',
      readingLevel: options.readingLevel || 'intermediate',
      includeQuestions: options.includeQuestions,
      includeVocabulary: options.includeVocabulary,
      wordCount: options.wordCount || 300,
      focus: options.focus || ['comprehension'],
    });
  }

  private async generateScienceContent(options: ResourceGenerationOptions) {
    const scienceOptions = {
      grade: parseInt(options.gradeLevel) || 5,
      subject: 'general',
      contentType: 'worksheet',
      includeExperiments: options.includeExperiments || false,
      includeDiagrams: options.includeDiagrams || true,
      includeQuestions: true,
      difficultyLevel: options.difficulty || 'intermediate',
      problemCount: options.problemCount || 6,
    };

    const result = await this.scienceGenerator.generateScienceContent(scienceOptions);
    
    try {
      const content = JSON.parse(result.content);
      return {
        title: content.title,
        instructions: content.introduction,
        problems: content.problems.map((p: any) => ({
          question: p.question,
          answer: p.answer,
          visual: p.type === 'diagram' ? p.diagram || 'Diagram placeholder' : undefined,
          explanation: p.explanation,
          type: p.type,
          options: p.options,
        })),
      };
    } catch (error) {
      console.error('Error parsing science content:', error);
      throw new Error('Failed to parse science content');
    }
  }
} 