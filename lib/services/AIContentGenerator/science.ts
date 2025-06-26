import { BaseAIContentGenerator, GenerationOptions, GenerationResult } from './base';
import { getPromptEnhancements } from './difficulty-scaling';
import { DifficultyLevel, Subject } from '../../types/resource';

export interface ScienceContentOptions {
  grade?: string;
  subject?: 'biology' | 'chemistry' | 'physics' | 'earth_science' | 'environmental';
  difficulty?: DifficultyLevel;
  topic?: string;
  includeExperiments?: boolean;
  includeDiagrams?: boolean;
  includeQuestions?: boolean;
  numberOfQuestions?: number;
  customInstructions?: string;
}

interface ScienceQuestion {
  question: string;
  answer?: string;
  explanation?: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
  options?: string[];
}

interface ScienceGenerationResult extends GenerationResult {
  title: string;
  introduction: string;
  learningObjectives: string[];
  questions: ScienceQuestion[];
  keyTerms: Array<{ term: string; definition: string }>;
  additionalResources: string[];
}

export class ScienceContentGenerator extends BaseAIContentGenerator {
  private readonly MAX_QUESTIONS = 20; // Maximum number of questions allowed
  private readonly subjectPrompts: Record<string, string> = {
    biology: 'Create content about living organisms, systems, and processes',
    chemistry: 'Generate content about matter, substances, and chemical reactions',
    physics: 'Develop content about energy, forces, and physical phenomena',
    earth_science: 'Create content about Earth systems and geological processes',
    environmental: 'Generate content about ecosystems and environmental impacts',
  };

  private readonly topicPrompts: Record<string, string> = {
    cells: 'Focus on cell structure, function, and processes',
    genetics: 'Cover inheritance, DNA, and genetic variation',
    ecosystems: 'Explore interactions between organisms and their environment',
    forces: 'Examine Newton\'s laws and types of forces',
    matter: 'Study states of matter and their properties',
    energy: 'Investigate different forms of energy and transformations',
    earth_systems: 'Analyze Earth\'s geological and atmospheric systems',
    space: 'Explore astronomy and space science concepts',
  };

  private async buildSciencePrompt(options: ScienceContentOptions): Promise<string> {
    const {
      grade = '5',
      subject = 'general',
      difficulty = 'intermediate',
      topic,
      includeExperiments = false,
      includeDiagrams = false,
      includeQuestions = true,
      numberOfQuestions = 5,
      customInstructions = ''
    } = options;

    // Enforce maximum question limit
    const limitedQuestions = Math.min(numberOfQuestions, this.MAX_QUESTIONS);
    if (limitedQuestions !== numberOfQuestions) {
      console.log(`⚠️ Requested ${numberOfQuestions} questions exceeds maximum of ${this.MAX_QUESTIONS}. Limiting to ${this.MAX_QUESTIONS} questions.`);
    }

    // Get difficulty-based enhancements
    const difficultyEnhancements = getPromptEnhancements(grade, 'science', difficulty);

    const prompt = `Generate a science ${topic ? `worksheet about ${topic}` : 'worksheet'} for grade ${grade} students.

CRITICAL: You MUST generate EXACTLY ${limitedQuestions} questions in your response.

${difficultyEnhancements}

Please provide the response in the following JSON format:
{
  "title": "A clear title for the worksheet",
  "introduction": "A brief introduction to the topic",
  "learningObjectives": ["objective 1", "objective 2", "objective 3"],
  "questions": [
    {
      "question": "The actual question text",
      "type": "multiple_choice",
      "options": ["option A", "option B", "option C", "option D"],
      "answer": "The correct answer",
      "explanation": "Why this is the correct answer"
    }
  ],
  "keyTerms": [
    {
      "term": "Scientific term",
      "definition": "Definition of the term"
    }
  ],
  "additionalResources": ["Resource 1", "Resource 2"]
}

Requirements:
- Generate EXACTLY ${limitedQuestions} questions
- Make it ${difficulty} difficulty for grade ${grade}
- Focus on ${subject} concepts
${includeExperiments ? '- Include hands-on experiments\n' : ''}
${includeDiagrams ? '- Include diagrams or visual aids\n' : ''}
${customInstructions ? `Additional requirements:\n${customInstructions}` : ''}

Ensure all content is scientifically accurate and grade-appropriate.`;

    return prompt;
  }

  private validateResponse(parsedResult: any, numberOfQuestions: number): boolean {
    if (!parsedResult || typeof parsedResult !== 'object') {
      console.error('❌ Invalid response format: not an object');
      return false;
    }

    if (!Array.isArray(parsedResult.questions)) {
      console.error('❌ Invalid response format: questions is not an array');
      return false;
    }

    if (parsedResult.questions.length !== numberOfQuestions) {
      console.error(`❌ Wrong number of questions: got ${parsedResult.questions.length}, expected ${numberOfQuestions}`);
      return false;
    }

    return true;
  }

  async generateScienceContent(
    options: ScienceContentOptions,
    retryCount = 0
  ): Promise<ScienceGenerationResult> {
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

      const prompt = await this.buildSciencePrompt({ ...otherOptions, numberOfQuestions: limitedQuestions });
      
      console.log(`🔬 Attempting to generate ${limitedQuestions} science questions (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

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
          return this.generateScienceContent(options, retryCount + 1);
        }
        throw new Error('Failed to parse response');
      }

      // Validate the response has the correct number of questions
      if (!this.validateResponse(parsedResult, limitedQuestions)) {
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.generateScienceContent(options, retryCount + 1);
        }
        return this.generateDefaultContent({ ...options, numberOfQuestions: limitedQuestions });
      }

      console.log(`✅ Successfully generated ${limitedQuestions} science questions!`);
      return {
        ...parsedResult,
        title: parsedResult.title || this.generateDefaultTitle(options),
        introduction: parsedResult.introduction || this.generateDefaultIntroduction(options),
        learningObjectives: parsedResult.learningObjectives || this.generateDefaultObjectives(options),
        questions: (parsedResult.questions || []).map(this.formatQuestion),
        keyTerms: parsedResult.keyTerms || [],
        additionalResources: parsedResult.additionalResources || []
      };
    } catch (error: any) {
      console.error('❌ Error:', error);
      if (retryCount < MAX_RETRIES && (
        error?.status === 500 || 
        error?.code === 'connection_error' ||
        error?.message?.includes('Internal server error')
      )) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return this.generateScienceContent(options, retryCount + 1);
      }
      return this.generateDefaultContent(options);
    }
  }

  private generateDefaultContent(options: ScienceContentOptions): ScienceGenerationResult {
    return {
      title: this.generateDefaultTitle(options),
      introduction: this.generateDefaultIntroduction(options),
      learningObjectives: this.generateDefaultObjectives(options),
      questions: this.generateDefaultQuestions(options),
      keyTerms: [],
      additionalResources: []
    };
  }

  private formatQuestion(question: any): ScienceQuestion {
    return {
      question: question.question,
      type: question.type || 'multiple_choice',
      options: question.options || [],
      answer: question.answer,
      explanation: question.explanation
    };
  }

  private generateDefaultTitle(options: ScienceContentOptions): string {
    const grade = options.grade || '5';
    const topic = options.topic ? `: ${options.topic}` : '';
    const difficulty = options.difficulty || 'intermediate';
    return `Grade ${grade} Science Worksheet${topic} (${difficulty} level)`;
  }

  private generateDefaultIntroduction(options: ScienceContentOptions): string {
    return `Welcome to your science exploration! This worksheet will help you understand key concepts through ${
      options.includeExperiments ? 'hands-on experiments and ' : ''
    }interactive questions.`;
  }

  private generateDefaultObjectives(options: ScienceContentOptions): string[] {
    return [
      'Understand basic scientific concepts',
      'Apply scientific thinking to real-world problems',
      'Develop observation and analysis skills'
    ];
  }

  private generateDefaultQuestions(options: ScienceContentOptions): ScienceQuestion[] {
    const count = options.numberOfQuestions || 5;
    return Array(count).fill(null).map((_, index) => ({
      question: `What is the scientific method?`,
      type: 'short_answer',
      answer: 'The scientific method is a systematic approach to investigating phenomena and acquiring new knowledge.',
      explanation: 'This is a fundamental concept in science.',
      options: []
    }));
  }

  protected async enhancePrompt(prompt: string, context: any = {}): Promise<string> {
    return `${prompt}\n\nEnsure all scientific concepts are accurate and grade-appropriate. Return ONLY valid JSON.`;
  }
} 