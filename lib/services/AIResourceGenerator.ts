import { MathContentGenerator } from './AIContentGenerator/math';
import { ReadingContentGenerator, ReadingContentOptions } from './AIContentGenerator/reading';
import { ScienceContentGenerator, ScienceContentOptions } from './AIContentGenerator/science';
import { TemplateManager } from './TemplateManager/base';
import type { ResourceGenerationOptions, GeneratedResource, ResourceType } from '@/lib/types/resource';

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
    console.log('🎯 Generating resource with options:', options);

    try {
      // Special handling for rubrics
      if (options.resourceType.toLowerCase() === 'rubric') {
        const rubricPrompt = `Generate a detailed rubric with the following specifications:

1. Create a comprehensive rubric for ${options.subject} ${options.topicArea || ''} evaluation at ${options.gradeLevel} level
2. Return the response in the following JSON format:
{
  "title": "An appropriate title for the rubric",
  "introduction": "Brief description of what this rubric evaluates",
  "criteria": [
    {
      "criterion": "Name of the criterion",
      "description": "What this criterion evaluates",
      "levels": [
        {
          "score": "4",
          "label": "Excellent",
          "description": "Detailed description of excellent performance"
        },
        {
          "score": "3",
          "label": "Good",
          "description": "Detailed description of good performance"
        },
        {
          "score": "2",
          "label": "Fair",
          "description": "Detailed description of fair performance"
        },
        {
          "score": "1",
          "label": "Needs Improvement",
          "description": "Detailed description of performance needing improvement"
        }
      ]
    }
  ]
}

Requirements for writing rubrics:
- Include criteria for content, organization, style, and mechanics
- Use clear, measurable criteria
- Focus on specific writing elements
- Provide detailed descriptions for each performance level
- Use grade-appropriate language and expectations

${options.customInstructions ? `Additional requirements:\n${options.customInstructions}` : ''}`;

        const result = await this.generateContent(rubricPrompt);
        return this.formatContentForTemplate(JSON.parse(result.content), options);
      }

      // Handle other resource types
      switch (options.subject.toLowerCase()) {
        case 'math':
          return this.formatContentForTemplate(
            await this.generateMathContent(options),
            options
          );
        case 'reading':
          return this.formatContentForTemplate(
            await this.generateReadingContent(options),
            options
          );
        case 'science':
          return this.formatContentForTemplate(
            await this.generateScienceContent(options),
            options
          );
        default:
          throw new Error(`Unsupported subject: ${options.subject}`);
      }
    } catch (error) {
      console.error('Error generating resource:', error);
      throw error;
    }
  }

  private formatContentForTemplate(content: any, options: ResourceGenerationOptions): GeneratedResource {
    // Default decorations based on subject
    const subjectDecorations: Record<string, string[]> = {
      math: ['🔢', '✏️', '📐', '➗'],
      science: ['🔬', '🧪', '🌍', '⚡'],
      reading: ['📚', '✍️', '📝', '📖']
    };

    // Handle reading content with passages
    if (options.subject.toLowerCase() === 'reading' && content.passage) {
      const formattedContent: GeneratedResource = {
        title: content.title || `${options.subject} ${options.resourceType}`,
        content: content.instructions || this.generateDefaultInstructions(options),
        sections: [
          {
            type: 'passage',
            title: content.passage.title || 'Reading Passage',
            content: content.passage.text
          },
          {
            type: 'problems',
            title: 'Questions',
            content: JSON.stringify(content.questions || [])
          }
        ],
        metadata: {
          gradeLevel: options.gradeLevel,
          subject: options.subject,
          resourceType: options.resourceType.toLowerCase() as ResourceType,
          generatedAt: new Date().toISOString(),
          theme: options.theme,
          difficulty: options.difficulty
        },
        decorations: content.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
      };

      // Add vocabulary section if present
      if (content.passage.vocabulary && content.passage.vocabulary.length > 0) {
        formattedContent.sections.push({
          type: 'vocabulary',
          title: 'Vocabulary',
          content: JSON.stringify(content.passage.vocabulary)
        });
      }

      return formattedContent;
    }

    // Handle rubrics
    if (options.resourceType.toLowerCase() === 'rubric' && content.criteria) {
      const formattedContent: GeneratedResource = {
        title: content.title || `${options.subject} Evaluation Rubric`,
        content: content.introduction || this.generateDefaultInstructions(options),
        metadata: {
          gradeLevel: options.gradeLevel,
          subject: options.subject,
          resourceType: 'rubric',
          generatedAt: new Date().toISOString(),
          theme: options.theme,
          difficulty: options.difficulty
        },
        sections: [{
          type: 'rubric',
          title: 'Evaluation Criteria',
          content: JSON.stringify(content.criteria)
        }],
        decorations: content.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
      };
      return formattedContent;
    }

    // Handle structured content (like quizzes with sections)
    if (content.sections) {
      const formattedContent: GeneratedResource = {
        title: content.title || `${options.subject} ${options.resourceType}`,
        content: content.instructions || this.generateDefaultInstructions(options),
        sections: content.sections.map((section: any) => ({
          type: 'section',
          title: section.title,
          content: JSON.stringify(section.problems)
        })),
        metadata: {
          gradeLevel: options.gradeLevel,
          subject: options.subject,
          resourceType: options.resourceType.toLowerCase() as ResourceType,
          generatedAt: new Date().toISOString(),
          theme: options.theme,
          difficulty: options.difficulty
        },
        decorations: content.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
      };
      return formattedContent;
    }

    // Convert questions/experiments to problems format for non-sectioned content
    const problems = this.convertToProblems(content, options.subject);

    const formattedContent: GeneratedResource = {
      title: content.title || `${options.subject} ${options.resourceType}`,
      content: content.instructions || this.generateDefaultInstructions(options),
      sections: [{
        type: 'problems',
        title: 'Problems',
        content: JSON.stringify(problems)
      }],
      metadata: {
        gradeLevel: options.gradeLevel,
        subject: options.subject,
        resourceType: options.resourceType.toLowerCase() as ResourceType,
        generatedAt: new Date().toISOString(),
        theme: options.theme,
        difficulty: options.difficulty
      },
      decorations: content.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
    };
    return formattedContent;
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
    
    const subjectMap: Record<string, string> = {
      'mathematics': 'math',
      'maths': 'math',
      'reading': 'reading',
      'english': 'reading',
      'language arts': 'reading',
      'ela': 'reading',
      'science': 'science',
      'biology': 'science',
      'chemistry': 'science',
      'physics': 'science'
    };

    return subjectMap[subject.toLowerCase()] || subject.toLowerCase();
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
    const readingOptions: ReadingContentOptions = {
      grade: parseInt(options.gradeLevel) || 5,
      genre: options.genre as 'fiction' | 'non-fiction' | 'poetry' | 'biography',
      difficulty: options.difficulty as 'beginner' | 'intermediate' | 'advanced',
      topic: options.topicArea,
      includeVocabulary: options.includeVocabulary,
      includeComprehension: true,
      includeAnalysis: true,
      wordCount: options.wordCount,
      focus: options.focus as Array<'main_idea' | 'characters' | 'plot' | 'theme' | 'vocabulary' | 'inference'>,
      customInstructions: options.customInstructions,
      numberOfQuestions: options.questionCount || 3
    };

    return await this.readingGenerator.generateReadingContent(readingOptions);
  }

  private async generateScienceContent(options: ResourceGenerationOptions) {
    const scienceOptions: ScienceContentOptions = {
      grade: parseInt(options.gradeLevel) || 5,
      subject: options.topicArea as 'biology' | 'chemistry' | 'physics' | 'earth_science' | 'environmental',
      difficulty: options.difficulty as 'basic' | 'intermediate' | 'advanced',
      topic: options.topicArea,
      includeExperiments: options.includeExperiments || false,
      includeDiagrams: options.includeDiagrams || false,
      includeQuestions: true,
      numberOfQuestions: 5,
      customInstructions: options.customInstructions
    };

    return await this.scienceGenerator.generateScienceContent(scienceOptions);
  }

  private async generateContent(prompt: string) {
    try {
      const response = await fetch(`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate content: ${response.statusText}`);
      }

      const data = await response.json();
      return { content: data.content };
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }
} 