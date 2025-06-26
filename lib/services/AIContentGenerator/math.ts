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
    fractions: `Create fraction problems that include:
- Adding and subtracting fractions with like and unlike denominators
- Multiplying and dividing fractions
- Converting between mixed numbers and improper fractions
- Comparing and ordering fractions
- Real-world word problems involving fractions
Make sure ALL problems involve fractions, not just whole numbers.`,
    decimals: 'Generate decimal problems including operations and conversions',
    percentages: 'Create percentage problems including conversions and applications',
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
      temperature: 0.2, // Lower temperature for more consistent JSON output
    };

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
    const result = await this.generateContent(prompt, generationOptions);
        const content = result.content.trim();

        // Validate the response
        if (await this.validateResponse(content)) {
          const parsedContent = JSON.parse(content);
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
        }
        
        // If validation fails, increment attempts and try again
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Retrying content generation (attempt ${attempts + 1}/${maxAttempts})`);
          continue;
        }
    } catch (error) {
        console.error('Error in content generation:', error);
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Retrying after error (attempt ${attempts + 1}/${maxAttempts})`);
          continue;
        }
      }
    }

    // If all attempts fail, return default content
    console.log('Falling back to default content after failed attempts');
      return {
      content: '',
        title: this.generateDefaultTitle(options),
        instructions: this.generateDefaultInstructions(options),
        problems: this.generateDefaultProblems(options),
        decorations: this.getThemeDecorations(options),
      };
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
    // Add theme-specific decorations
    if (options.customInstructions?.toLowerCase().includes('dinosaur') || 
        options.topic?.toLowerCase().includes('dinosaur')) {
      return ['🦖', '🦕', '🦴', '🌋', '🌿'];
    }
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

    // Extract theme and core math concept
    const theme = customInstructions?.toLowerCase().includes('dinosaur') ? 'dinosaurs' : 
                 topic.toLowerCase().includes('dinosaur') ? 'dinosaurs' : undefined;
    
    const mathConcepts = ['addition', 'subtraction', 'multiplication', 'division', 'fractions', 'decimals', 'geometry', 'measurement']
      .find(concept => topic.toLowerCase().includes(concept)) || 'arithmetic';

    let prompt = `Generate a math worksheet with the following specifications:

1. Create EXACTLY ${numberOfProblems} ${difficulty} level math problems for grade ${grade}
2. Core math concept: ${mathConcepts}
${theme ? `3. IMPORTANT: Every problem MUST be themed around ${theme}. Use real facts and scenarios about ${theme}.` : ''}
4. Return ONLY a valid JSON object with this structure:
{
  "title": "Grade ${grade} ${theme ? theme + '-themed ' : ''}${mathConcepts} Practice",
  "instructions": "Clear instructions for students",
  "problems": [
    {
      "question": "The problem text",
      "steps": ["Step 1", "Step 2"],
      "answer": "The answer",
      "visual": "Optional ASCII art or text diagram"
    }
  ]
}

${theme ? `Example themed problem:
If the theme is dinosaurs: "A Tyrannosaurus Rex could eat 500 pounds of meat in one bite. If it took 6 bites to finish its meal, how many pounds of meat did it eat in total?"

Requirements for themed problems:
- Every problem MUST incorporate ${theme} in a meaningful way
- Use real facts about ${theme} when possible
- Make the ${theme} theme central to the problem, not just decoration
- Include ${theme}-related visuals when appropriate` : ''}

Requirements for all problems:
- Grade-appropriate difficulty
- Clear, concise wording
- Step-by-step solutions when helpful
${includeVisuals ? '- Include ASCII art or text diagrams when helpful' : ''}
${includeSteps ? '- Show solution steps for complex problems' : ''}
${customInstructions ? `\nAdditional Requirements:\n${customInstructions}` : ''}`;

    return prompt;
  }

  protected async enhancePrompt(prompt: string, context: any = {}): Promise<string> {
    return `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object. Do not include any additional text, comments, or explanations.`;
  }

  private async validateResponse(content: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(content.trim());
      if (!parsed.title || !parsed.instructions || !Array.isArray(parsed.problems)) {
        console.error('Invalid response structure:', parsed);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Invalid JSON in response:', error);
      return false;
    }
  }
} 