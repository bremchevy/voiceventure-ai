import { MathContentGenerator } from './AIContentGenerator/math';
import { ReadingContentGenerator, ReadingContentOptions } from './AIContentGenerator/reading';
import { ScienceContentGenerator, ScienceContentOptions } from './AIContentGenerator/science';
import { GeneralContentGenerator, GeneralContentOptions } from './AIContentGenerator/general';
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
  private generalGenerator: GeneralContentGenerator;
  private templateManager: TemplateManager;

  constructor() {
    console.log('🔧 Initializing AIResourceGenerator');
    this.mathGenerator = new MathContentGenerator();
    this.readingGenerator = new ReadingContentGenerator();
    this.scienceGenerator = new ScienceContentGenerator();
    this.generalGenerator = new GeneralContentGenerator();
    this.templateManager = new TemplateManager();
  }

  async generateResource(options: ResourceGenerationOptions): Promise<GeneratedResource> {
    try {
      // Handle exit slips
      if (options.resourceType === 'exit_slip') {
        const exitSlipPrompt = `
Generate an exit slip assessment for ${options.subject} ${options.topicArea || 'general'} at the ${options.gradeLevel} level.

Requirements:
- Create 2-3 thoughtful questions that assess student understanding
- Questions should be grade-appropriate and aligned with learning objectives
- Include a mix of question types (multiple choice, short answer)
- Focus on key concepts and learning outcomes
- Use clear, concise language

Format the response as a JSON object with this structure:
{
  "title": "string",
  "content": "string",
  "sections": [
    {
      "type": "questions",
      "title": "Questions",
      "content": [
        {
          "question": "string",
          "type": "multiple_choice | short_answer",
          "options": ["string"] // For multiple choice only
        }
      ]
    }
  ]
}

${options.customInstructions ? `Additional requirements:\n${options.customInstructions}` : ''}`;

        const result = await this.generateContent(exitSlipPrompt, options);
        return this.formatContentForTemplate(result, options);
      }

      // Handle rubric generation
      if (options.resourceType === 'rubric') {
        const rubricStyle = options.rubricStyle || '4-point';
        const isChecklist = rubricStyle === 'checklist';
        
        const rubricPrompt = `
Create a detailed rubric for assessing ${options.subject} ${options.topicArea || 'general'} work at the ${options.gradeLevel} level.

Style: ${rubricStyle}
Difficulty: ${options.difficulty || 'medium'}

Requirements for writing rubrics:
- Include 4-6 specific criteria relevant to ${options.topicArea || options.subject}
- Each criterion should be clearly defined and measurable
- Descriptions should be detailed and specific to the subject matter
- Use grade-appropriate language and expectations
- Focus on observable and measurable outcomes
${isChecklist ? '- Write criteria as specific, observable yes/no statements' : '- Provide clear distinctions between performance levels'}

${isChecklist ? `Example checklist format:
{
  "title": "Math Problem Solving Checklist",
  "description": "Use this checklist to verify each step of your problem-solving process.",
  "criteria": [
    {
      "criterion": "Shows all work clearly",
      "description": "Each step of the solution is written out and labeled"
    },
    {
      "criterion": "Uses correct mathematical notation",
      "description": "Proper symbols and notation are used throughout"
    }
  ]
}` : `Example point-based format:
{
  "title": "Math Problem Solving Rubric",
  "description": "This rubric assesses the student's ability to solve mathematical problems.",
  "levels": [
    {
      "score": "4",
      "label": "Advanced",
      "description": "Shows complete understanding with clear, detailed work",
      "examples": ["All steps are shown and explained"]
    }
  ]
}`}

Format your response exactly like the example above, but with complete criteria for ${options.topicArea || options.subject}.

${options.customInstructions ? `Additional requirements:\n${options.customInstructions}` : ''}`;

        const result = await this.generateContent(rubricPrompt, options);
        return this.formatContentForTemplate(result, options);
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

  private formatContentForTemplate(content: string | GeneratedResource | any, options: ResourceGenerationOptions): GeneratedResource {
    try {
      // If content is already a GeneratedResource, return it as is
      if (typeof content === 'object' && 'title' in content && 'content' in content && 'metadata' in content && 'sections' in content) {
        return content as GeneratedResource;
      }

      // Parse string content if needed
      const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
      const subject = this.normalizeSubject(options.subject);

      // If the content is already in GeneratedResource format but was stringified
      if (parsedContent && 'title' in parsedContent && 'content' in parsedContent && 'metadata' in parsedContent && 'sections' in parsedContent) {
        return parsedContent as GeneratedResource;
      }

      // Default decorations based on subject
      const subjectDecorations: Record<string, string[]> = {
        math: ['🔢', '✏️', '📐', '➗'],
        science: ['🔬', '🧪', '🌍', '⚡'],
        reading: ['📚', '✍️', '📝', '📖']
      };

      // Handle rubrics
      if (options.resourceType === 'rubric') {
        const isChecklist = options.rubricStyle === 'checklist';
        const formattedContent: GeneratedResource = {
          title: parsedContent.title || `${options.subject} Evaluation Rubric`,
          content: parsedContent.description || this.generateDefaultInstructions(options),
          sections: [{
            type: 'rubric',
            title: 'Evaluation Criteria',
            content: JSON.stringify({
              description: parsedContent.description,
              levels: isChecklist ? [] : (parsedContent.levels || []),
              criteria: isChecklist ? (parsedContent.criteria || []) : []
            })
          }],
          metadata: {
            gradeLevel: options.gradeLevel,
            subject: options.subject,
            resourceType: 'rubric',
            generatedAt: new Date().toISOString(),
            theme: options.theme,
            difficulty: options.difficulty || 'medium'
          },
          decorations: parsedContent.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
        };
        return formattedContent;
      }

      // Create a base GeneratedResource
      const generatedResource: GeneratedResource = {
        title: parsedContent.title || `${options.subject} ${options.resourceType}`,
        content: parsedContent.content || parsedContent.instructions || this.generateDefaultInstructions(options),
        sections: parsedContent.sections || [],
        metadata: {
          gradeLevel: options.gradeLevel,
          subject: options.subject,
          resourceType: options.resourceType.toLowerCase() as ResourceType,
          generatedAt: new Date().toISOString(),
          theme: options.theme,
          difficulty: options.difficulty || 'medium'
        },
        decorations: parsedContent.decorations || subjectDecorations[options.subject.toLowerCase()] || ['📝', '✨', '🎯', '🌟']
      };

      // Handle special cases
      if (subject === 'reading' && parsedContent.passage) {
        generatedResource.sections = [
          {
            type: 'passage',
            title: 'Reading Passage',
            content: parsedContent.passage
          },
          ...(parsedContent.vocabulary && parsedContent.vocabulary.length > 0 ? [{
            type: 'vocabulary',
            title: 'Vocabulary',
            content: JSON.stringify(parsedContent.vocabulary)
          }] : []),
          ...(parsedContent.questions && parsedContent.questions.length > 0 ? [{
            type: 'questions',
            title: 'Questions',
            content: JSON.stringify(parsedContent.questions)
          }] : [])
        ];
      }

      return generatedResource;
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
    return this.mathGenerator.generateMathContent({
      grade: options.gradeLevel,
      difficulty: options.difficulty || 'medium',
      topic: options.topicArea || options.topic,
      numberOfProblems: options.questionCount || options.problemCount || 10,
      customInstructions: options.customInstructions
    });
  }

  private async generateReadingContent(options: ResourceGenerationOptions) {
    return this.readingGenerator.generateReadingContent({
      grade: options.gradeLevel,
      difficulty: options.difficulty || 'medium',
      topic: options.topicArea || options.topic,
      includeVocabulary: options.includeVocabulary || true,
      includeComprehension: true,
      numberOfQuestions: options.questionCount || options.problemCount || 10,
      customInstructions: options.customInstructions,
      readingLevel: options.readingLevel || options.gradeLevel,
      genre: options.genre,
      focus: options.focus
    });
  }

  private async generateScienceContent(options: ResourceGenerationOptions) {
    return this.scienceGenerator.generateScienceContent({
      grade: options.gradeLevel,
      difficulty: options.difficulty || 'medium',
      topic: options.topicArea || options.topic,
      includeExperiments: options.includeExperiments || false,
      includeDiagrams: options.includeDiagrams || false,
      includeQuestions: true,
      numberOfQuestions: options.questionCount || options.problemCount || 10,
      customInstructions: options.customInstructions
    });
  }

  private async generateGeneralContent(options: ResourceGenerationOptions): Promise<any> {
    // Generate focus points from topic area if not provided
    const derivedFocus = options.focus || this.generateFocusFromTopic(options.topicArea);

    return this.generalGenerator.generateGeneralContent({
      grade: options.gradeLevel,
      difficulty: options.difficulty || 'medium',
      topic: options.topicArea || options.topic,
      includeVisuals: options.includeVisuals || false,
      numberOfQuestions: options.questionCount || options.problemCount || 10,
      customInstructions: options.customInstructions,
      questionTypes: options.selectedQuestionTypes || ['multiple_choice'],
      focus: derivedFocus
    });
  }

  private generateFocusFromTopic(topic?: string): string[] {
    if (!topic) return [];

    // Split the topic into words and remove common words
    const words = topic.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of']);
    const significantWords = words.filter(word => !commonWords.has(word));

    // Generate focus areas based on the topic
    const focusAreas = new Set<string>();

    // Add the main topic
    focusAreas.add(topic);

    // Add key aspects based on common educational themes
    if (topic.includes('war') || topic.includes('conflict')) {
      focusAreas.add('causes and effects');
      focusAreas.add('key events');
      focusAreas.add('historical significance');
      focusAreas.add('social impact');
    } else if (topic.includes('science') || topic.includes('biology') || topic.includes('chemistry')) {
      focusAreas.add('key concepts');
      focusAreas.add('practical applications');
      focusAreas.add('scientific principles');
    } else if (topic.includes('math') || topic.includes('mathematics')) {
      focusAreas.add('problem-solving');
      focusAreas.add('practical applications');
      focusAreas.add('core concepts');
    }

    // Add general focus areas
    focusAreas.add('main concepts');
    focusAreas.add('practical examples');
    focusAreas.add('critical thinking');

    return Array.from(focusAreas);
  }

  private getQuestionTypes(options: ResourceGenerationOptions): string[] {
    // If specific question types are selected in the UI, use only those
    if (options.selectedQuestionTypes && options.selectedQuestionTypes.length > 0) {
      return options.selectedQuestionTypes;
    }

    // Default question types
    const defaultTypes = ['multiple_choice', 'true_false', 'short_answer'];
    
    // If it's a quiz, adjust based on quiz type
    if (options.resourceType.toLowerCase() === 'quiz') {
      switch (options.quizType) {
        case 'vocabulary':
          return ['multiple_choice', 'matching'];
        case 'comprehension':
          return ['multiple_choice', 'short_answer'];
        case 'analysis':
          return ['short_answer', 'long_answer'];
        case 'mixed':
        default:
          return defaultTypes;
      }
    }

    return defaultTypes;
  }

  private async generateContent(prompt: string, options: ResourceGenerationOptions): Promise<string> {
    try {
      // Add grade-specific context to the prompt
      const gradeContext = this.getGradeContext(options.gradeLevel);
      const visualContext = this.getVisualContext(options);
      
      let systemPrompt = "You are an expert educational content creator, specializing in creating engaging, grade-appropriate learning materials.";
      let userPrompt = "";

      if (options.resourceType === 'rubric') {
        systemPrompt += " You excel at creating detailed, clear rubrics that help assess student work fairly and consistently.";
      }

      userPrompt = `${prompt}

Grade-Level Context:
${gradeContext}

Visual Requirements:
${visualContext}

Please generate content that is:
1. Age-appropriate for ${options.gradeLevel}
2. Aligned with ${options.gradeLevel} learning standards
3. Using ${options.visualComplexity || 'moderate'} visual elements as appropriate
4. Formatted in clear, structured JSON`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      return content;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  private getGradeContext(gradeLevel: string): string {
    const grade = parseInt(gradeLevel.replace(/\D/g, '') || '0');
    let context = '';

    if (grade <= 2) {
      context = 'Focus on basic concepts, use simple language, and include visual aids.';
    } else if (grade <= 4) {
      context = 'Introduce more complex concepts, use grade-appropriate vocabulary, and include some visual support.';
    } else {
      context = 'Use advanced concepts, incorporate subject-specific terminology, and focus on critical thinking.';
    }

    return context;
  }

  private getVisualContext(options: ResourceGenerationOptions): string {
    const visualElements = [];
    
    if (options.includeVisuals) {
      visualElements.push('- Include visual aids to support learning');
    }
    if (options.includeDiagrams) {
      visualElements.push('- Include diagrams to explain concepts');
    }
    if (options.includeExperiments) {
      visualElements.push('- Include hands-on activities or experiments');
    }

    return visualElements.length > 0 
      ? visualElements.join('\n')
      : 'No specific visual requirements';
  }
} 