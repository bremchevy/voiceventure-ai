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
  private readonly MAX_PROBLEMS = 20; // Maximum number of problems allowed
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

  private validateResponse(parsedResult: any, numberOfProblems: number): boolean {
    if (!parsedResult || typeof parsedResult !== 'object') {
      console.error('❌ Invalid response format: not an object');
      return false;
    }

    if (!Array.isArray(parsedResult.problems)) {
      console.error('❌ Invalid response format: problems is not an array');
      return false;
    }

    if (parsedResult.problems.length !== numberOfProblems) {
      console.error(`❌ Wrong number of problems: got ${parsedResult.problems.length}, expected ${numberOfProblems}`);
      return false;
    }

    return true;
  }

  async generateMathContent(options: MathProblemOptions, retryCount = 0): Promise<GenerationResult> {
    const MAX_RETRIES = 3;
    try {
      const {
        grade = 5,
        difficulty = 'medium',
        topic = 'general',
        includeSteps = false,
        includeVisuals = false,
        numberOfProblems = 10,
        customInstructions = ''
      } = options;

      // Enforce maximum problem limit
      const limitedProblems = Math.min(numberOfProblems, this.MAX_PROBLEMS);
      if (limitedProblems !== numberOfProblems) {
        console.log(`⚠️ Requested ${numberOfProblems} problems exceeds maximum of ${this.MAX_PROBLEMS}. Limiting to ${this.MAX_PROBLEMS} problems.`);
      }

      console.log(`🎲 Attempting to generate ${limitedProblems} math problems (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      const result = await this.generateContent({
        prompt: `Generate EXACTLY ${limitedProblems} math problems for grade ${grade} students.

Topic: ${topic}
Difficulty: ${difficulty}

CRITICAL: You MUST generate EXACTLY ${limitedProblems} problems in your response.

Return your response in this JSON format:
{
  "title": "Grade ${grade} ${topic} Practice",
  "instructions": "Clear instructions for students",
  "problems": [
    {
      "question": "The actual problem text",
      "answer": "The correct answer",
      ${includeVisuals ? `"visual": "A text description of a visual aid",` : ''}
      ${includeSteps ? `"steps": ["Step 1", "Step 2", "Step 3"],` : ''}
      "difficulty": "${difficulty}"
    }
  ]
}

Requirements:
- Generate EXACTLY ${limitedProblems} problems
- Make all problems ${difficulty} difficulty
- Focus on ${topic} concepts
${includeVisuals ? '- Include visual aids\n' : ''}
${includeSteps ? '- Include step-by-step solutions\n' : ''}
${customInstructions ? `${customInstructions}\n` : ''}`,
        maxTokens: Math.max(2500, limitedProblems * 150),
        temperature: 0.2
      });

      let parsedResult: GenerationResult;
      try {
        parsedResult = JSON.parse(result);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        if (retryCount < MAX_RETRIES) {
          return this.generateMathContent(options, retryCount + 1);
        }
        throw new Error('Failed to parse response');
      }

      if (!this.validateResponse(parsedResult, limitedProblems)) {
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.generateMathContent(options, retryCount + 1);
        }
      return {
          title: `Grade ${options.grade} ${options.topic} Practice`,
          instructions: 'Solve the following problems. Show your work where necessary.',
          problems: this.generateDefaultProblems(options),
          warning: `Could not generate ${limitedProblems} problems after ${MAX_RETRIES} attempts.`
        };
      }

      console.log(`✅ Successfully generated ${limitedProblems} math problems!`);
      return parsedResult;
    } catch (error: any) {
      console.error('❌ Error:', error);
      if (retryCount < MAX_RETRIES && (
        error?.status === 500 || 
        error?.code === 'connection_error' ||
        error?.message?.includes('Internal server error')
      )) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return this.generateMathContent(options, retryCount + 1);
      }
      return {
        title: `Grade ${options.grade} ${options.topic} Practice`,
        instructions: 'Solve the following problems. Show your work where necessary.',
        problems: this.generateDefaultProblems(options),
        error: error?.message || 'Failed to generate content'
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

  private generateDefaultProblems(options: MathProblemOptions): any[] {
    const { numberOfProblems = 10, grade = 5, topic = 'general' } = options;
    return Array(numberOfProblems).fill(null).map((_, index) => ({
      question: `Problem ${index + 1}: Basic ${topic} problem for grade ${grade}`,
      answer: 'Please try generating the worksheet again',
      difficulty: 'medium'
    }));
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
} 