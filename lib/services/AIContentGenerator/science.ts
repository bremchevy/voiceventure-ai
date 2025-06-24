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

export interface ScienceQuestion {
  question: string;
  type: 'multiple_choice' | 'short_answer' | 'diagram' | 'experiment';
  answer: string;
  explanation?: string;
  options?: string[];
  diagram?: string;
  experimentSteps?: string[];
  materials?: string[];
  safetyNotes?: string[];
}

export interface ScienceGenerationResult extends GenerationResult {
  title: string;
  introduction: string;
  learningObjectives: string[];
  questions: ScienceQuestion[];
  keyTerms?: { term: string; definition: string }[];
  additionalResources?: string[];
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

  async generateScienceContent(
    options: ScienceContentOptions,
    genOptions?: GenerationOptions
  ): Promise<ScienceGenerationResult> {
    const prompt = await this.buildSciencePrompt(options);
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
        introduction: parsedContent.introduction || this.generateDefaultIntroduction(options),
        learningObjectives: parsedContent.learningObjectives || this.generateDefaultObjectives(options),
        questions: parsedContent.questions.map(this.formatQuestion),
        keyTerms: parsedContent.keyTerms || [],
        additionalResources: parsedContent.additionalResources || [],
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        ...result,
        title: this.generateDefaultTitle(options),
        introduction: this.generateDefaultIntroduction(options),
        learningObjectives: this.generateDefaultObjectives(options),
        questions: this.generateDefaultQuestions(options),
        keyTerms: [],
        additionalResources: [],
      };
    }
  }

  private formatQuestion(q: any): ScienceQuestion {
    return {
      question: q.question,
      type: q.type,
      answer: q.answer,
      explanation: q.explanation,
      options: q.options,
      diagram: q.diagram,
      experimentSteps: q.experimentSteps,
      materials: q.materials,
      safetyNotes: q.safetyNotes,
    };
  }

  private generateDefaultTitle(options: ScienceContentOptions): string {
    const grade = options.grade || 5;
    const subject = options.subject || 'Science';
    const difficulty = options.difficulty || 'intermediate';
    return `Grade ${grade} ${subject} Worksheet (${difficulty} level)`;
  }

  private generateDefaultIntroduction(options: ScienceContentOptions): string {
    return `Welcome to your ${options.subject || 'science'} exploration! This worksheet will help you understand key concepts through ${options.includeExperiments ? 'hands-on experiments and ' : ''}interactive questions.`;
  }

  private generateDefaultObjectives(options: ScienceContentOptions): string[] {
    return [
      'Understand key scientific concepts',
      'Apply scientific method to solve problems',
      'Develop critical thinking skills',
    ];
  }

  private generateDefaultQuestions(options: ScienceContentOptions): ScienceQuestion[] {
    return [{
      question: 'What is the scientific method?',
      type: 'multiple_choice',
      answer: 'A systematic approach to solving problems through observation and experimentation',
      options: [
        'A systematic approach to solving problems through observation and experimentation',
        'A random collection of facts',
        'A type of laboratory equipment',
        'A scientific theory',
      ],
      explanation: 'The scientific method is a structured approach to understanding the natural world.',
    }];
  }

  private async buildSciencePrompt(options: ScienceContentOptions): Promise<string> {
    const {
      grade = 5,
      subject = 'biology',
      difficulty = 'intermediate',
      topic,
      includeExperiments = true,
      includeDiagrams = true,
      includeQuestions = true,
      numberOfQuestions = 5,
    } = options;

    let prompt = `Generate a ${difficulty}-level science worksheet with the following specifications:

1. Create ${numberOfQuestions} questions/activities for grade ${grade} students focusing on ${subject}${topic ? ` (${topic})` : ''}
2. Return the response in the following JSON format:
{
  "title": "An engaging title for the worksheet",
  "introduction": "Brief introduction to the topic",
  "learningObjectives": ["Objective 1", "Objective 2", ...],
  "questions": [
    {
      "question": "The question text",
      "type": "multiple_choice/short_answer/diagram/experiment",
      "answer": "The correct answer",
      "explanation": "Why this is correct",
      "options": ["A", "B", "C", "D"] (for multiple choice),
      "diagram": "ASCII/text diagram if applicable",
      "experimentSteps": ["Step 1", "Step 2", ...] (for experiments),
      "materials": ["Material 1", "Material 2", ...] (for experiments),
      "safetyNotes": ["Safety note 1", "Safety note 2", ...] (for experiments)
    }
  ],
  "keyTerms": [
    { "term": "Term 1", "definition": "Definition 1" }
  ],
  "additionalResources": ["Resource 1", "Resource 2"]
}

Requirements:
- Make content engaging and grade-appropriate
- Use clear scientific terminology
- Include real-world applications
${includeExperiments ? '- Include at least one hands-on experiment' : ''}
${includeDiagrams ? '- Include at least one diagram-based question' : ''}
${includeQuestions ? '- Include multiple types of questions' : ''}

Subject-specific guidelines:
${this.subjectPrompts[subject] || 'Create grade-appropriate science content'}
${topic && this.topicPrompts[topic] ? this.topicPrompts[topic] : ''}`;

    return prompt;
  }

  protected async enhancePrompt(prompt: string, context: any = {}): Promise<string> {
    return `${prompt}\n\nEnsure all scientific concepts are accurate and grade-appropriate. Return ONLY valid JSON.`;
  }
} 