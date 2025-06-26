import { BaseAIContentGenerator, GenerationOptions, GenerationResult } from './base';

export interface ReadingContentOptions {
  grade?: number;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  topic?: string;
  includeVocabulary?: boolean;
  includeComprehension?: boolean;
  numberOfQuestions?: number;
  customInstructions?: string;
  readingLevel?: string;
  genre?: string;
  focus?: string[];
}

interface ReadingQuestion {
  question: string;
  answer?: string;
  explanation?: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: string[];
}

interface ReadingGenerationResult extends GenerationResult {
  title: string;
  passage: string;
  questions: ReadingQuestion[];
  vocabulary?: Array<{ word: string; definition: string; context?: string }>;
  learningObjectives: string[];
}

export class ReadingContentGenerator extends BaseAIContentGenerator {
  private readonly MAX_QUESTIONS = 20; // Maximum number of questions allowed

  private readonly topicPrompts: Record<string, string> = {
    'character traits': 'Create content focusing on character analysis, personality traits, and character development',
    'main idea': 'Generate content about identifying main ideas and supporting details',
    'comprehension': 'Create reading comprehension exercises with questions about the text',
    'vocabulary': 'Focus on vocabulary development and word meaning in context',
    'story elements': 'Explore plot, setting, characters, and other story elements',
  };

  private validateResponse(response: any, options: ReadingContentOptions): boolean {
    if (!response.title || !response.passage || !response.questions) {
      console.error('❌ Missing required fields in response');
      return false;
    }

    if (!Array.isArray(response.questions)) {
      console.error('❌ Invalid response format: questions is not an array');
      return false;
    }

    const expectedQuestions = options.numberOfQuestions || 10;
    if (!Array.isArray(response.questions) || response.questions.length !== expectedQuestions) {
      console.error(`❌ Expected ${expectedQuestions} questions but got ${response.questions?.length || 0}`);
      return false;
    }

    // Validate each question has required fields
    const validQuestions = response.questions.every((q: any) => 
      q.question && 
      q.type && 
      q.answer && 
      (q.type !== 'multiple_choice' || (Array.isArray(q.options) && q.options.length >= 2))
    );

    if (!validQuestions) {
      console.error('❌ Invalid question format in response');
      return false;
    }

    // Validate passage is not empty
    if (!response.passage.trim()) {
      console.error('❌ Empty passage');
      return false;
    }

    // Validate vocabulary if included
    if (response.vocabulary && (!Array.isArray(response.vocabulary) || !response.vocabulary.every((v: any) => 
      v.word && v.definition && v.context
    ))) {
      console.error('❌ Invalid vocabulary format');
      return false;
    }

    return true;
  }

  private async buildReadingPrompt(options: ReadingContentOptions): Promise<string> {
    const {
      grade = 5,
      difficulty = 'intermediate',
      topic,
      includeVocabulary = true,
      includeComprehension = true,
      numberOfQuestions = 10,
      customInstructions = '',
      readingLevel,
      genre,
      focus = []
    } = options;

    // Enforce maximum question limit
    const limitedQuestions = Math.min(numberOfQuestions, this.MAX_QUESTIONS);

    const gradeSpecificPrompt = grade <= 2 ? `
- Use very simple sentences
- Limit each paragraph to 3-4 sentences
- Use familiar situations and characters
- Repeat important words and concepts
- Include clear cause-and-effect relationships` : '';

    return `
Generate a grade-appropriate reading passage with comprehension questions.

PASSAGE REQUIREMENTS:
1. Write a SHORT story (2-3 paragraphs) about a character showing specific traits through their actions
2. The story must be appropriate for ${readingLevel || `grade ${grade}`} students
3. Focus on the topic: ${topic}
4. Difficulty level: ${difficulty}
5. Include clear examples of character traits in action${gradeSpecificPrompt}

RESPONSE FORMAT:
{
  "title": "A clear, engaging title",
  "passage": "The story showing character traits",
  "questions": [
    {
      "question": "Question about character traits",
      "type": "multiple_choice",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "Correct letter (A, B, C, or D)",
      "explanation": "Why this shows understanding of character traits"
    }
  ],
  "vocabulary": [
    {
      "word": "A character trait word from the story",
      "definition": "Simple definition",
      "context": "How it was used in the story"
    }
  ]
}

REQUIREMENTS:
- Generate EXACTLY ${limitedQuestions} questions
- Questions should focus on identifying and understanding character traits
- Include 3-5 character trait vocabulary words
- Make all content age-appropriate
${customInstructions ? `\nAdditional Instructions:\n${customInstructions}` : ''}
`;
  }

  async generateReadingContent(
    options: ReadingContentOptions,
    retryCount = 0
  ): Promise<ReadingGenerationResult> {
    const MAX_RETRIES = 3;
    try {
      const {
        numberOfQuestions = 5,
        ...otherOptions
      } = options;

      // Enforce maximum question limit
      const limitedQuestions = Math.min(numberOfQuestions, this.MAX_QUESTIONS);
      if (limitedQuestions !== numberOfQuestions) {
        console.log(`⚠️ Requested ${numberOfQuestions} questions exceeds maximum of ${this.MAX_QUESTIONS}. Limiting to ${this.MAX_QUESTIONS} questions.`);
      }

      const prompt = await this.buildReadingPrompt({ ...otherOptions, numberOfQuestions: limitedQuestions });
      
      console.log(`📚 Attempting to generate reading content (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      const result = await this.generateContent({
        prompt,
        temperature: 0.7,
        maxTokens: Math.max(2000, limitedQuestions * 150)
      });

      let parsedResult: any;
      try {
        parsedResult = JSON.parse(result);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        if (retryCount < MAX_RETRIES) {
          return this.generateReadingContent(options, retryCount + 1);
        }
        throw new Error('Failed to parse reading content response');
      }

      // Validate the response
      if (!this.validateResponse(parsedResult, { ...options, numberOfQuestions: limitedQuestions })) {
        if (retryCount < MAX_RETRIES) {
          console.log('🔄 Response validation failed, retrying...');
          return this.generateReadingContent(options, retryCount + 1);
        }
        return this.generateDefaultContent(options);
      }

      console.log('✅ Successfully generated reading content!');
      return parsedResult;
    } catch (error) {
      console.error('❌ Error generating reading content:', error);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateReadingContent(options, retryCount + 1);
      }
      return this.generateDefaultContent(options);
    }
  }

  private generateDefaultContent(options: ReadingContentOptions): ReadingGenerationResult {
    const { numberOfQuestions = 10, topic = 'general reading', readingLevel = 'grade 5' } = options;
    
    return {
      title: `${readingLevel} Reading Comprehension: ${topic}`,
      passage: `This is a default reading passage about ${topic}. The actual content generation failed, but this placeholder ensures the worksheet can still be created. Please try generating again or modify your requirements if the issue persists.`,
      questions: Array(numberOfQuestions).fill(null).map((_, i) => ({
        question: `Question ${i + 1}: What did you learn from the passage about ${topic}?`,
        type: 'short_answer',
        answer: 'Answer will vary based on student response.',
        explanation: 'Look for evidence from the text to support the answer.'
      })),
      vocabulary: [
        {
          word: 'comprehension',
          definition: 'The ability to understand something.',
          context: 'Used in reading comprehension exercises.'
        }
      ]
    };
  }

  private formatQuestion(question: any): ReadingQuestion {
    return {
      question: question.question,
      type: question.type || 'multiple_choice',
      options: question.options || [],
      answer: question.answer,
      explanation: question.explanation
    };
  }

  private generateDefaultTitle(options: ReadingContentOptions): string {
    const grade = options.grade || 5;
    const topic = options.topic ? `: ${options.topic}` : '';
    const difficulty = options.difficulty || 'intermediate';
    return `Grade ${grade} Reading Worksheet${topic} (${difficulty} level)`;
  }

  private generateDefaultPassage(options: ReadingContentOptions): string {
    return `This is a sample reading passage for grade ${options.grade || 5} students. 
    It focuses on ${options.topic || 'reading comprehension'} skills.`;
  }

  private generateDefaultObjectives(options: ReadingContentOptions): string[] {
    return [
      'Improve reading comprehension skills',
      'Develop vocabulary understanding',
      'Practice critical thinking'
    ];
  }

  private generateDefaultQuestions(options: ReadingContentOptions): ReadingQuestion[] {
    const count = options.numberOfQuestions || 5;
    return Array(count).fill(null).map((_, index) => ({
      question: `Reading comprehension question ${index + 1}`,
      type: 'multiple_choice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      explanation: 'This is a sample explanation.'
    }));
  }

  protected async enhancePrompt(prompt: string, context: any = {}): Promise<string> {
    return `${prompt}\n\nEnsure all content is grade-appropriate and engaging. Return ONLY valid JSON.`;
  }
} 