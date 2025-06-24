import { BaseAIContentGenerator, GenerationOptions, GenerationResult } from './base';

export interface MathProblemOptions {
  grade?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  includeSteps?: boolean;
  includeVisuals?: boolean;
  numberOfProblems?: number;
  customInstructions?: string;
}

export interface MathProblem {
  question: string;
  answer: string | number;
  visual?: string;
  steps?: string[];
}

export interface MathGenerationResult extends GenerationResult {
  title: string;
  instructions: string;
  problems: MathProblem[];
  decorations?: string[];
}

export class MathContentGenerator extends BaseAIContentGenerator {
  private readonly topicPrompts: Record<string, string> = {
    algebra: 'Create algebra problems involving equations and variables',
    geometry: 'Generate geometry problems with shapes and measurements',
    arithmetic: 'Create arithmetic problems with basic operations',
    wordProblems: 'Generate real-world word problems',
  };

  async generateMathContent(
    options: MathProblemOptions,
    genOptions?: GenerationOptions
  ): Promise<MathGenerationResult> {
    const prompt = await this.buildMathPrompt(options);
    await this.validatePrompt(prompt);

    // Pass custom instructions to the base generator
    const generationOptions: GenerationOptions = {
      ...genOptions,
      customInstructions: options.customInstructions,
    };

    const result = await this.generateContent(prompt, generationOptions);

    // Parse the generated content into our template format
    try {
      const parsedContent = JSON.parse(result.content);
      return {
        ...result,
        title: parsedContent.title || this.generateDefaultTitle(options),
        instructions: parsedContent.instructions || this.generateDefaultInstructions(options),
        problems: parsedContent.problems.map((p: any) => ({
          question: p.question,
          answer: p.answer,
          visual: p.visual,
          steps: p.steps,
        })),
        decorations: this.getThemeDecorations(options),
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Fallback to default format if parsing fails
      return {
        ...result,
        title: this.generateDefaultTitle(options),
        instructions: this.generateDefaultInstructions(options),
        problems: this.generateDefaultProblems(options),
        decorations: this.getThemeDecorations(options),
      };
    }
  }

  private generateDefaultTitle(options: MathProblemOptions): string {
    const grade = options.grade || 5;
    const topic = options.topic || 'Math';
    const difficulty = options.difficulty || 'medium';
    return `Grade ${grade} ${topic} Practice (${difficulty} level)`;
  }

  private generateDefaultInstructions(options: MathProblemOptions): string {
    return `Solve each problem carefully. Show your work where needed. ${
      options.includeSteps ? 'Follow the step-by-step guides for help.' : ''
    }`;
  }

  private generateDefaultProblems(options: MathProblemOptions): MathProblem[] {
    return [{
      question: 'Example: 2 + 2 = ?',
      answer: 4,
      visual: '⭐⭐ + ⭐⭐ = ____',
    }];
  }

  private getThemeDecorations(options: MathProblemOptions): string[] {
    return ['⭐', '📝', '🔢', '✏️', '📐'];
  }

  private async buildMathPrompt(options: MathProblemOptions): Promise<string> {
    const {
      grade = 5,
      difficulty = 'medium',
      topic = 'arithmetic',
      includeSteps = true,
      includeVisuals = false,
      numberOfProblems = 5,
      customInstructions,
    } = options;

    let prompt = `Generate a math worksheet with the following specifications:

1. Create EXACTLY ${numberOfProblems} ${difficulty} level ${topic} problems for grade ${grade}
2. Return the response in the following JSON format:
{
  "title": "An engaging title for the worksheet",
  "instructions": "Clear instructions for students",
  "problems": [
    {
      "question": "The problem text",
      "answer": "The correct answer (number or text)",
      "visual": "A visual representation using text/emoji (if applicable)",
      "steps": ["Step 1", "Step 2", ...] (if steps are requested)
    }
  ]
}

IMPORTANT: The response MUST contain EXACTLY ${numberOfProblems} problems, no more and no less.

Requirements:
- Make problems engaging and grade-appropriate
- Use clear mathematical notation
- Include real-world contexts where possible
${includeSteps ? '- Include step-by-step solutions' : ''}
${includeVisuals ? '- Add text-based visual representations' : ''}

Topic-specific guidelines:
${this.topicPrompts[topic] || 'Create grade-appropriate math problems'}`;

    return prompt;
  }

  protected async enhancePrompt(prompt: string, context: any = {}): Promise<string> {
    return `${prompt}\n\nEnsure all mathematical notation is clear and properly formatted. Return ONLY valid JSON.`;
  }
} 