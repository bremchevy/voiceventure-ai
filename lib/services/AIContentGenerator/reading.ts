import { BaseAIContentGenerator, GenerationOptions, GenerationResult } from './base';

export interface ReadingContentOptions {
  grade?: number;
  genre?: 'fiction' | 'non-fiction' | 'poetry' | 'biography';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  topic?: string;
  includeVocabulary?: boolean;
  includeComprehension?: boolean;
  includeAnalysis?: boolean;
  wordCount?: number;
  focus?: Array<'main_idea' | 'characters' | 'plot' | 'theme' | 'vocabulary' | 'inference'>;
  customInstructions?: string;
}

export interface ReadingQuestion {
  type: 'vocabulary' | 'comprehension' | 'analysis' | 'main_idea' | 'inference';
  question: string;
  answer: string;
  explanation?: string;
  options?: string[];
  textEvidence?: string;
  vocabularyContext?: string;
  literaryDevice?: string;
}

export interface ReadingPassage {
  title: string;
  author?: string;
  genre: string;
  text: string;
  wordCount: number;
  readingLevel: string;
  themes?: string[];
  vocabulary?: Array<{ word: string; definition: string; context: string }>;
}

export interface ReadingGenerationResult extends GenerationResult {
  title: string;
  instructions: string;
  passage: ReadingPassage;
  questions: ReadingQuestion[];
  literaryElements?: Array<{ element: string; explanation: string }>;
  discussionPrompts?: string[];
  extendedActivities?: string[];
}

export class ReadingContentGenerator extends BaseAIContentGenerator {
  private readonly genrePrompts: Record<string, string> = {
    fiction: 'Create an engaging fictional story with character development and plot',
    'non-fiction': 'Generate an informative non-fiction text about a relevant topic',
    poetry: 'Compose age-appropriate poetry with literary devices',
    biography: 'Write a biographical text about a significant historical figure',
  };

  private readonly focusPrompts: Record<string, string> = {
    main_idea: 'Identify and analyze the main idea and supporting details',
    characters: 'Analyze character development, motivations, and relationships',
    plot: 'Examine plot structure, conflict, and resolution',
    theme: 'Identify and analyze themes and their development',
    vocabulary: 'Focus on vocabulary in context and word meaning',
    inference: 'Make inferences and draw conclusions from the text',
  };

  async generateReadingContent(
    options: ReadingContentOptions,
    genOptions?: GenerationOptions
  ): Promise<ReadingGenerationResult> {
    const prompt = await this.buildReadingPrompt(options);
    await this.validatePrompt(prompt);

    // Pass custom instructions to the base generator
    const generationOptions: GenerationOptions = {
      ...genOptions,
      customInstructions: options.customInstructions,
    };

    const result = await this.generateContent(prompt, generationOptions);

    try {
      const parsedContent = JSON.parse(result.content);
      return {
        ...result,
        title: parsedContent.title || this.generateDefaultTitle(options),
        instructions: parsedContent.instructions || this.generateDefaultInstructions(options),
        passage: parsedContent.passage || this.generateDefaultPassage(options),
        questions: parsedContent.questions.map(this.formatQuestion),
        literaryElements: parsedContent.literaryElements || [],
        discussionPrompts: parsedContent.discussionPrompts || [],
        extendedActivities: parsedContent.extendedActivities || [],
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        ...result,
        title: this.generateDefaultTitle(options),
        instructions: this.generateDefaultInstructions(options),
        passage: this.generateDefaultPassage(options),
        questions: this.generateDefaultQuestions(options),
        literaryElements: [],
        discussionPrompts: [],
        extendedActivities: [],
      };
    }
  }

  private formatQuestion(q: any): ReadingQuestion {
    return {
      type: q.type,
      question: q.question,
      answer: q.answer,
      explanation: q.explanation,
      options: q.options,
      textEvidence: q.textEvidence,
      vocabularyContext: q.vocabularyContext,
      literaryDevice: q.literaryDevice,
    };
  }

  private generateDefaultTitle(options: ReadingContentOptions): string {
    const grade = options.grade || 5;
    const genre = options.genre || 'Reading';
    const difficulty = options.difficulty || 'intermediate';
    return `Grade ${grade} ${genre} Comprehension (${difficulty} level)`;
  }

  private generateDefaultInstructions(options: ReadingContentOptions): string {
    return `Read the following ${options.genre || ''} passage carefully. Answer the questions using evidence from the text.${
      options.includeVocabulary ? ' Pay attention to vocabulary words in context.' : ''
    }`;
  }

  private generateDefaultPassage(options: ReadingContentOptions): ReadingPassage {
    return {
      title: 'Sample Reading Passage',
      genre: options.genre || 'fiction',
      text: 'This is a sample reading passage. Please generate actual content.',
      wordCount: options.wordCount || 250,
      readingLevel: options.difficulty || 'intermediate',
      themes: ['Sample Theme'],
      vocabulary: [
        {
          word: 'sample',
          definition: 'An example used to represent something',
          context: 'This is a sample passage.',
        },
      ],
    };
  }

  private generateDefaultQuestions(options: ReadingContentOptions): ReadingQuestion[] {
    return [{
      type: 'main_idea',
      question: 'What is the main idea of the passage?',
      answer: 'The main idea would be determined from the actual passage.',
      explanation: 'The main idea is typically supported by key details throughout the text.',
    }];
  }

  private async buildReadingPrompt(options: ReadingContentOptions): Promise<string> {
    const {
      grade = 5,
      genre = 'fiction',
      difficulty = 'intermediate',
      topic,
      includeVocabulary = true,
      includeComprehension = true,
      includeAnalysis = true,
      wordCount = 300,
      focus = ['main_idea', 'vocabulary'],
    } = options;

    let prompt = `Generate a ${difficulty}-level ${genre} reading comprehension worksheet with the following specifications:

1. Create a ${wordCount}-word passage for grade ${grade} students${topic ? ` about ${topic}` : ''}
2. Return the response in the following JSON format:
{
  "title": "An engaging title for the worksheet",
  "instructions": "Clear instructions for students",
  "passage": {
    "title": "Title of the reading",
    "author": "Author name if applicable",
    "genre": "${genre}",
    "text": "The full passage text",
    "wordCount": ${wordCount},
    "readingLevel": "${difficulty}",
    "themes": ["Theme 1", "Theme 2"],
    "vocabulary": [
      {
        "word": "Vocabulary word",
        "definition": "Word definition",
        "context": "How the word is used in the passage"
      }
    ]
  },
  "questions": [
    {
      "type": "vocabulary/comprehension/analysis/main_idea/inference",
      "question": "The question text",
      "answer": "The correct answer",
      "explanation": "Why this is correct",
      "options": ["A", "B", "C", "D"] (for multiple choice),
      "textEvidence": "Relevant quote from the passage",
      "vocabularyContext": "Context for vocabulary questions",
      "literaryDevice": "Relevant literary device if applicable"
    }
  ],
  "literaryElements": [
    {
      "element": "Literary element name",
      "explanation": "How it's used in the passage"
    }
  ],
  "discussionPrompts": ["Prompt 1", "Prompt 2"],
  "extendedActivities": ["Activity 1", "Activity 2"]
}

Requirements:
- Make content engaging and grade-appropriate
- Use clear, age-appropriate language
- Include varied question types
${includeVocabulary ? '- Include vocabulary in context' : ''}
${includeComprehension ? '- Include text-based comprehension questions' : ''}
${includeAnalysis ? '- Include analysis and critical thinking questions' : ''}

Focus areas:
${focus.map(f => this.focusPrompts[f] || `Focus on ${f}`).join('\n')}

Genre-specific guidelines:
${this.genrePrompts[genre] || 'Create grade-appropriate reading content'}`;

    return prompt;
  }

  protected async enhancePrompt(prompt: string, context: any = {}): Promise<string> {
    return `${prompt}\n\nEnsure content is engaging, age-appropriate, and promotes critical thinking. Return ONLY valid JSON.`;
  }
} 