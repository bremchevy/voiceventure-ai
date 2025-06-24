import { BaseAIContentGenerator, GenerationOptions, GenerationResult } from './base';

export interface ScienceContentOptions {
  grade?: number;
  subject?: 'biology' | 'chemistry' | 'physics' | 'earth_science' | 'environmental';
  difficulty?: 'basic' | 'intermediate' | 'advanced';
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
      grade = 5,
      subject = 'general',
      difficulty = 'intermediate',
      topic,
      includeExperiments = false,
      includeDiagrams = false,
      includeQuestions = true,
      numberOfQuestions = 5,
      customInstructions = ''
    } = options;

    const prompt = `Generate a science ${topic ? `worksheet about ${topic}` : 'worksheet'} for grade ${grade} students.

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
- Make it ${difficulty} difficulty for grade ${grade}
- Focus on ${subject} concepts
${includeExperiments ? '- Include hands-on experiments\n' : ''}
${includeDiagrams ? '- Include diagrams or visual aids\n' : ''}
${includeQuestions ? `- Include ${numberOfQuestions} questions\n` : ''}
${customInstructions ? `Additional requirements:\n${customInstructions}` : ''}

Ensure all content is scientifically accurate and grade-appropriate.`;

    return prompt;
  }

  async generateScienceContent(
    options: ScienceContentOptions,
    genOptions?: GenerationOptions
  ): Promise<ScienceGenerationResult> {
    const prompt = await this.buildSciencePrompt(options);
    await this.validatePrompt(prompt);

    const generationOptions: GenerationOptions = {
      ...genOptions,
      customInstructions: options.customInstructions,
      temperature: 0.7, // Slightly higher for more creative responses
      maxTokens: 2500 // Increased for more detailed content
    };

    const result = await this.generateContent(prompt, generationOptions);

    try {
      const parsedContent = JSON.parse(result.content);
      return {
        ...result,
        title: parsedContent.title || this.generateDefaultTitle(options),
        introduction: parsedContent.introduction || this.generateDefaultIntroduction(options),
        learningObjectives: parsedContent.learningObjectives || this.generateDefaultObjectives(options),
        questions: parsedContent.questions.map(this.formatQuestion),
        keyTerms: parsedContent.keyTerms || [],
        additionalResources: parsedContent.additionalResources || []
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Provide structured fallback content
      return {
        ...result,
        title: this.generateDefaultTitle(options),
        introduction: this.generateDefaultIntroduction(options),
        learningObjectives: this.generateDefaultObjectives(options),
        questions: this.generateDefaultQuestions(options),
        keyTerms: [],
        additionalResources: []
      };
    }
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
    const grade = options.grade || 5;
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