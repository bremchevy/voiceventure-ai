import { MathContentGenerator } from './AIContentGenerator/math';
import { ReadingContentGenerator, ReadingContentOptions } from './AIContentGenerator/reading';
import { ScienceContentGenerator, ScienceContentOptions } from './AIContentGenerator/science';
import { TemplateManager } from './TemplateManager/base';
import type { ResourceGenerationOptions, GeneratedResource, ResourceType } from '@/lib/types/resource';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000
});

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

        const result = await this.generateContent(rubricPrompt, options);
        return this.formatContentForTemplate(JSON.parse(result), options);
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
          }
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
            title: 'Evaluation Criteria',
            content: JSON.stringify(parsedContent.criteria)
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
      'physics': 'science'
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

  private async generateContent(prompt: string, options: ResourceGenerationOptions) {
    try {
      // Add grade-specific context to the prompt
      const gradeContext = this.getGradeContext(options.gradeLevel);
      const visualContext = this.getVisualContext(options);
      
      const enhancedPrompt = `
Generate a ${options.difficulty} ${options.subject} ${options.resourceType} for ${options.gradeLevel} about ${options.topicArea}.

Number of Questions: ${options.questionCount || options.problemCount || 10}

Grade-Level Context:
${gradeContext}

Visual Requirements:
${visualContext}

Additional Instructions:
${options.customInstructions || 'No additional instructions provided.'}

Please generate content that is:
1. Age-appropriate for ${options.gradeLevel}
2. Aligned with ${options.gradeLevel} learning standards
3. Using ${options.visualComplexity} visual elements as appropriate
4. Formatted in clear, structured JSON
5. IMPORTANT: Generate EXACTLY ${options.questionCount || options.problemCount || 10} questions/problems, no more and no less

The content should include:
- A clear title
- Grade-appropriate instructions
- Content sections with questions/problems
- Visual aids where appropriate
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert educational content creator, specializing in creating engaging, grade-appropriate learning materials. IMPORTANT: Always format your entire response as a valid JSON object with the following structure:\n{\n  \"title\": string,\n  \"content\": string,\n  \"sections\": Array<{\n    \"type\": string,\n    \"title\"?: string,\n    \"content\": string\n  }>\n}"
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      try {
        // Validate JSON format
        const parsedContent = JSON.parse(content);
        return content;
      } catch (error) {
        console.error('Error parsing OpenAI response as JSON:', error);
        throw new Error('Invalid JSON format in response');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  private getGradeContext(gradeLevel: string): string {
    const grade = parseInt(gradeLevel);
    if (grade <= 2) {
      return `
- Use simple, clear language
- Keep instructions brief and direct
- Include more visual aids and examples
- Focus on concrete concepts
- Use larger fonts and spacing`;
    } else if (grade <= 4) {
      return `
- Use grade-appropriate vocabulary
- Include step-by-step instructions
- Balance visual and text content
- Introduce abstract concepts gradually
- Include some critical thinking elements`;
    } else {
      return `
- Use more complex vocabulary
- Include detailed instructions
- Focus on abstract concepts
- Encourage critical thinking
- Include challenging problem-solving tasks`;
    }
  }

  private getVisualContext(options: ResourceGenerationOptions): string {
    const visualRequirements = [];
    
    if (options.includeVisuals) {
      visualRequirements.push(`- Include ${options.visualComplexity} visual aids to support learning`);
    }
    
    if (options.includeDiagrams) {
      visualRequirements.push('- Add relevant diagrams to explain concepts');
    }
    
    if (options.includeExperiments) {
      visualRequirements.push('- Include hands-on experiments or activities');
    }

    return visualRequirements.length > 0 
      ? visualRequirements.join('\n')
      : '- Minimal visual aids, focus on text-based content';
  }
} 