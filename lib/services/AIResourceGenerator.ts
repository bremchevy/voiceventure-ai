import { MathContentGenerator } from './AIContentGenerator/math';
import { ReadingContentGenerator, ReadingContentOptions } from './AIContentGenerator/reading';
import { ScienceContentGenerator, ScienceContentOptions } from './AIContentGenerator/science';
import { GeneralContentGenerator, GeneralContentOptions } from './AIContentGenerator/general';
import { TemplateManager } from './TemplateManager/base';
import type { ResourceGenerationOptions, GeneratedResource, ResourceType } from '@/lib/types/resource';
import OpenAI from 'openai';

export class AIResourceGenerator {
  private mathGenerator: MathContentGenerator;
  private readingGenerator: ReadingContentGenerator;
  private scienceGenerator: ScienceContentGenerator;
  private generalGenerator: GeneralContentGenerator;
  private templateManager: TemplateManager;
  private readonly openai: OpenAI;

  private readonly themeDecorations: Record<string, string[]> = {
    'general': ['📝', '✨', '🎯', '🌟'],
    'nature': ['🌿', '🌺', '🌳', '🦋'],
    'space': ['🚀', '⭐', '🌙', '🌠'],
    'ocean': ['🌊', '🐠', '🐋', '🐚'],
    'science': ['🔬', '⚗️', '🧪', '🔭'],
    'math': ['➗', '📐', '💫', '🔢'],
    'sports': ['⚽', '🏀', '🎯', '🏆'],
    'music': ['🎵', '🎼', '🎹', '🎸'],
    'art': ['🎨', '🖌️', '🎭', '✨'],
    'technology': ['💻', '🤖', '⚡', '📱']
  };

  constructor(apiKey: string) {
    console.log('🔧 Initializing AIResourceGenerator');
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    this.mathGenerator = new MathContentGenerator();
    this.readingGenerator = new ReadingContentGenerator();
    this.scienceGenerator = new ScienceContentGenerator();
    this.generalGenerator = new GeneralContentGenerator();
    this.templateManager = new TemplateManager();
  }

  async generateResource(options: ResourceGenerationOptions): Promise<GeneratedResource> {
    // Clean up options for rubric type
    if (options.resourceType.toLowerCase() === 'rubric') {
      // Remove question-related fields and ensure rubric style
      const { selectedQuestionTypes, questionCount, quizQuestionCount, ...cleanOptions } = options;
      options = {
        ...cleanOptions,
        rubricStyle: options.rubricStyle || '4-point' // Default to 4-point if not specified
      };
    }

    console.log('🎯 Generating resource with options:', {
      ...options,
      // Add debug info for rubric style when applicable
      ...(options.resourceType.toLowerCase() === 'rubric' && {
        rubricStyle: options.rubricStyle || '4-point',
      })
    });

    try {
      // Special handling for exit slips and bell ringers
      if (options.resourceType.toLowerCase() === 'exit_slip') {
        const exitSlipPrompt = `Generate a ${options.subject} ${options.topicArea ? `about ${options.topicArea}` : ''} ${options.resourceType === 'exit_slip' ? 'exit slip' : 'bell ringer'} for ${options.gradeLevel} with the following specifications:

1. Create engaging questions that assess student understanding of ${options.topicArea || options.subject} concepts
2. Include a mix of question types (multiple choice, open-ended, reflection)
3. Focus on ${options.focus ? options.focus.join(', ') : 'key concepts'}
4. Return the response in the following JSON format:
{
  "title": "An appropriate title for the exit slip",
  "instructions": "Clear instructions for students",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The correct option",
      "explanation": "Why this is the correct answer"
    },
    {
      "type": "open_ended",
      "question": "A reflective or conceptual question",
      "expectedResponse": "What you expect students to write about",
      "criteria": "What to look for in the response"
    }
  ]
}

Requirements:
- Questions should be grade-appropriate
- Include at least one question about the main concept
- Include at least one reflective question
- Keep questions concise and clear
- Use appropriate mathematical notation for math concepts

${options.customInstructions ? `Additional requirements:\n${options.customInstructions}` : ''}`;

        const result = await this.generateContent(exitSlipPrompt, options);
        return this.formatContentForTemplate(JSON.parse(result), options);
      }

      // Special handling for rubrics
      if (options.resourceType.toLowerCase() === 'rubric') {
        // Only default to 4-point if no style is provided
        const rubricStyle = options.rubricStyle || '4-point';
        const levels = this.getRubricLevels(rubricStyle);
        
        console.log('📋 Generating rubric with style:', rubricStyle);
        
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert educational content creator, specializing in creating detailed assessment rubrics. Return ONLY valid JSON that matches the exact format requested."
            },
            {
              role: "user",
              content: `Generate a detailed ${rubricStyle} rubric for evaluating ${options.subject} ${options.topicArea || ''} at the ${options.gradeLevel} level.

Requirements:
1. Use the ${rubricStyle} scale format
2. Make criteria specific to ${options.subject} ${options.topicArea || ''}
3. Include clear descriptions for each level
4. Add examples where appropriate
5. Ensure language is grade-appropriate for ${options.gradeLevel}

Return the response in this exact JSON format:
{
  "title": "Descriptive title for the rubric",
  "introduction": "Brief description of what this rubric evaluates",
  "criteria": [
    {
      "criterion": "Name of criterion",
      "description": "What this criterion evaluates",
      "levels": [
        {
          "score": "${levels[0].score}",
          "label": "${levels[0].label}",
          "description": "Detailed description",
          "examples": ["Example 1", "Example 2"]
        }
      ]
    }
  ]}${options.customInstructions ? `\n\nAdditional Instructions:\n${options.customInstructions}` : ''}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content generated from OpenAI API');
        }

        try {
          const parsedContent = JSON.parse(content);
          return {
            title: parsedContent.title,
            content: parsedContent,
            sections: [
              {
                type: "introduction",
                content: parsedContent.introduction
              },
              ...parsedContent.criteria.map(criterion => ({
                type: "criterion",
                title: criterion.criterion,
                content: criterion.description
              }))
            ],
            metadata: {
              gradeLevel: options.gradeLevel,
              subject: options.subject,
              resourceType: 'rubric',
              generatedAt: new Date().toISOString(),
              theme: options.theme,
              difficulty: options.difficulty
            },
            decorations: options.theme ? this.themeDecorations[options.theme.toLowerCase()] : ['📝', '✨', '🎯', '🌟']
          };
        } catch (error) {
          console.error('Error parsing rubric content:', error);
          throw new Error('Failed to parse rubric content');
        }
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
        case 'general':
          return this.formatContentForTemplate(
            await this.generateGeneralContent(options),
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
    try {
      const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
      const subject = this.normalizeSubject(options.subject);
      
      // Handle reading content differently
      if (subject === 'reading') {
        const sections = [];
        
        // Add passage section if it exists
        if (parsedContent.passage) {
          sections.push({
            type: 'passage',
            title: 'Reading Passage',
            content: parsedContent.passage
          });
        }

        // Add vocabulary section if it exists
        if (parsedContent.vocabulary && parsedContent.vocabulary.length > 0) {
          sections.push({
            type: 'vocabulary',
            title: 'Vocabulary',
            content: JSON.stringify(parsedContent.vocabulary)
          });
        }

        // Add questions section
        if (parsedContent.questions && parsedContent.questions.length > 0) {
          sections.push({
            type: 'questions',
            title: 'Questions',
            content: JSON.stringify(parsedContent.questions)
          });
        }

        return {
          title: parsedContent.title || `${options.gradeLevel} Reading Worksheet`,
          content: '', // Remove the duplicate passage content
          sections,
          metadata: {
            gradeLevel: options.gradeLevel,
            subject: options.subject,
            resourceType: options.resourceType,
            generatedAt: new Date().toISOString(),
            theme: options.theme,
            difficulty: options.difficulty
          },
          decorations: options.theme ? this.themeDecorations[options.theme.toLowerCase()] : ['📝', '✨', '🎯', '🌟']
        };
      }

      // Default decorations based on subject
      const subjectDecorations: Record<string, string[]> = {
        math: ['🔢', '✏️', '📐', '➗'],
        science: ['🔬', '🧪', '🌍', '⚡'],
        reading: ['📚', '✍️', '📝', '📖']
      };

      // Handle exit slips
      if (options.resourceType.toLowerCase() === 'exit_slip' && parsedContent.questions) {
        const formattedContent: GeneratedResource = {
          title: parsedContent.title || `${options.subject} ${options.resourceType === 'exit_slip' ? 'Exit Slip' : 'Bell Ringer'}`,
          content: parsedContent.instructions || 'Answer each question thoughtfully. Your responses help us understand your learning.',
          sections: [{
            type: 'questions',
            title: 'Questions',
            content: JSON.stringify(parsedContent.questions.map((q: any) => ({
              question: q.question,
              type: q.type,
              options: q.options,
              visual: q.visual || null,
              explanation: q.explanation || null
            })))
          }],
          metadata: {
            gradeLevel: options.gradeLevel,
            subject: options.subject,
            resourceType: options.resourceType.toLowerCase() as ResourceType,
            generatedAt: new Date().toISOString(),
            theme: options.theme,
            difficulty: options.difficulty
          },
          decorations: parsedContent.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
        };
        return formattedContent;
      }

      // Handle rubrics
      if (options.resourceType.toLowerCase() === 'rubric' && parsedContent.criteria) {
        const formattedContent: GeneratedResource = {
          title: parsedContent.title || `${options.subject} Evaluation Rubric`,
          content: parsedContent.introduction || this.generateDefaultInstructions(options),
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
            title: parsedContent.title,
            content: parsedContent // Pass the entire content object without stringifying
          }],
          decorations: parsedContent.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
        };
        return formattedContent;
      }

      // Handle structured content (like quizzes with sections)
      if (parsedContent.sections) {
        const formattedContent: GeneratedResource = {
          title: parsedContent.title || `${options.subject} ${options.resourceType}`,
          content: parsedContent.instructions || this.generateDefaultInstructions(options),
          sections: parsedContent.sections.map((section: any) => ({
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
          decorations: parsedContent.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
        };
        return formattedContent;
      }

      // Convert questions/experiments to problems format for non-sectioned content
      const problems = this.convertToProblems(parsedContent, options.subject);

      const formattedContent: GeneratedResource = {
        title: parsedContent.title || `${options.subject} ${options.resourceType}`,
        content: parsedContent.instructions || this.generateDefaultInstructions(options),
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
        decorations: parsedContent.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
      };
      return formattedContent;
    } catch (error) {
      console.error('Error formatting content:', error);
      throw error;
    }
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
      'physics': 'science',
      'general knowledge': 'general',
      'general studies': 'general',
      'general': 'general'
    };

    return subjectMap[subject.toLowerCase()] || subject.toLowerCase();
  }

  private async generateMathContent(options: ResourceGenerationOptions) {
    const numberOfProblems = options.questionCount || options.problemCount || 10;
    console.log(`📊 Generating ${numberOfProblems} math problems...`);
    
    return this.mathGenerator.generateMathContent({
      grade: parseInt(options.gradeLevel),
      difficulty: options.difficulty || 'medium',
      topic: options.topicArea,
      includeSteps: options.includeQuestions,
      includeVisuals: options.includeVisuals,
      numberOfProblems,
      customInstructions: options.customInstructions
    });
  }

  private async generateReadingContent(options: ResourceGenerationOptions) {
    const numberOfQuestions = options.questionCount || 5;
    console.log(`📚 Generating ${numberOfQuestions} reading questions...`);

    const readingOptions: ReadingContentOptions = {
      grade: options.gradeLevel,
      difficulty: options.difficulty as 'basic' | 'intermediate' | 'advanced',
      topic: options.topicArea,
      includeVocabulary: options.includeVocabulary || true,
      includeComprehension: true,
      numberOfQuestions,
      customInstructions: options.customInstructions,
      readingLevel: options.gradeLevel,
      genre: options.genre,
      focus: options.focus as string[]
    };

    return await this.readingGenerator.generateReadingContent(readingOptions);
  }

  private async generateScienceContent(options: ResourceGenerationOptions) {
    const numberOfQuestions = options.questionCount || 10;
    console.log(`🔬 Generating ${numberOfQuestions} science questions...`);

    const scienceOptions: ScienceContentOptions = {
      grade: parseInt(options.gradeLevel) || 5,
      subject: options.topicArea as 'biology' | 'chemistry' | 'physics' | 'earth_science' | 'environmental',
      difficulty: options.difficulty as 'basic' | 'intermediate' | 'advanced',
      topic: options.topicArea,
      includeExperiments: options.includeExperiments || false,
      includeDiagrams: options.includeDiagrams || false,
      includeQuestions: true,
      numberOfQuestions,
      customInstructions: options.customInstructions
    };

    return await this.scienceGenerator.generateScienceContent(scienceOptions);
  }

  private async generateGeneralContent(options: ResourceGenerationOptions): Promise<any> {
    console.log('Generating general content...');
    const numberOfQuestions = options.questionCount || options.problemCount || 10;
    console.log(`Generating ${numberOfQuestions} questions for ${options.subject} ${options.resourceType}`);

    return this.generalGenerator.generateGeneralContent({
      grade: parseInt(options.gradeLevel),
      difficulty: options.difficulty || 'medium',
      topic: options.topicArea,
      includeQuestions: options.includeQuestions,
      includeVisuals: options.includeVisuals,
      numberOfQuestions,
      customInstructions: options.customInstructions
    });
  }

  private getRubricLevels(style: string): { score: string; label: string }[] {
    switch (style) {
      case '4-point':
        return [
          { score: '4', label: 'Excellent' },
          { score: '3', label: 'Good' },
          { score: '2', label: 'Satisfactory' },
          { score: '1', label: 'Needs Improvement' }
        ];
      case '3-point':
        return [
          { score: '3', label: 'Exceeds Expectations' },
          { score: '2', label: 'Meets Expectations' },
          { score: '1', label: 'Below Expectations' }
        ];
      case 'checklist':
        return [
          { score: '✓', label: 'Complete' },
          { score: '×', label: 'Incomplete' }
        ];
      default:
        return [
          { score: '4', label: 'Excellent' },
          { score: '3', label: 'Good' },
          { score: '2', label: 'Satisfactory' },
          { score: '1', label: 'Needs Improvement' }
        ];
    }
  }
}
