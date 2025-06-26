import { BaseAIContentGenerator, GenerationOptions, GenerationResult } from './base';
import { getPromptEnhancements } from './difficulty-scaling';
import { DifficultyLevel, Subject } from '../../types/resource';
import OpenAI from 'openai';

export interface GeneralContentOptions {
  grade?: string;
  difficulty?: DifficultyLevel;
  topic?: string;
  includeVisuals?: boolean;
  numberOfQuestions?: number;
  customInstructions?: string;
  questionTypes?: string[];
  focus?: string[];
}

interface GeneralGenerationResult extends GenerationResult {
  title: string;
  introduction: string;
  questions: {
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    answer?: string;
    explanation?: string;
    points?: number;
    rubric?: string[];
  }[];
  learningObjectives: string[];
}

export class GeneralContentGenerator extends BaseAIContentGenerator {
  private openai: OpenAI;
  private model: string;

  constructor() {
    super();
    this.model = 'gpt-4';
    this.openai = new OpenAI();
  }

  async generateGeneralContent(options: GeneralContentOptions): Promise<GenerationResult> {
    try {
      // Build the prompt
      const prompt = await this.buildGeneralPrompt(options);

      // Make API request
      console.log('🔄 Making API request with model:', this.model);
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an expert educational content creator, specializing in creating engaging, grade-appropriate learning materials. Follow the instructions exactly and return ONLY valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      // Extract and validate the response
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      try {
        return JSON.parse(content);
      } catch (error) {
        console.error('Error parsing generated content:', error);
        return this.generateDefaultContent(options);
      }
    } catch (error) {
      console.error('Error generating general content:', error);
      return this.generateDefaultContent(options);
    }
  }

  private async buildGeneralPrompt(options: GeneralContentOptions): Promise<string> {
    const {
      grade = '5',
      difficulty = 'intermediate',
      topic = '',
      includeVisuals = false,
      numberOfQuestions = 10,
      customInstructions = '',
      questionTypes = ['multiple_choice'],
      focus = []
    } = options;

    // Get difficulty-based enhancements
    const difficultyEnhancements = getPromptEnhancements(grade, 'general', difficulty);

    const prompt = `Generate a general knowledge ${topic ? `assessment about ${topic}` : 'assessment'} for grade ${grade} students.

CRITICAL REQUIREMENTS:
1. You MUST generate EXACTLY ${numberOfQuestions} questions.
2. You MUST ONLY use the following question types: ${questionTypes.join(', ')}.
3. Each question MUST be in the specified format(s).
4. For true/false questions:
   - Question format MUST be a clear statement (not a question)
   - DO NOT include "True or False:" at the start of the question
   - Include clear, unambiguous statements
   - Avoid double negatives
   - Include a mix of true and false statements
   - The correct answer MUST be either "True" or "False"
5. For multiple choice questions:
   - Include 4 options labeled A, B, C, D
   - Make all options plausible
   - Avoid "all/none of the above"
6. For short answer questions:
   - Clearly indicate expected response length
   - Include scoring rubric points
7. Questions should be grade-appropriate (${grade})
8. Difficulty level should be ${difficulty}
9. IMPORTANT: DO NOT mix question types. Only use the types specified in requirement #2.
10. If only one question type is specified, ALL questions must be of that type.

${focus.length > 0 ? `Focus areas to cover: ${focus.join(', ')}\n` : ''}
${customInstructions ? `Additional instructions: ${customInstructions}\n` : ''}
${difficultyEnhancements}

Return the response in this exact JSON format:
{
  "title": "string",
  "introduction": "string",
  "questions": [
    {
      "type": "${questionTypes[0]}",
      "question": "string",
      "options": ["string"] // For multiple choice only
      "correct": "string", // Must be "True" or "False" for true/false questions
      "explanation": "string",
      "points": number,
      "rubric": ["string"] // For short answer only
    }
  ],
  "learningObjectives": ["string"]
}`;

    return prompt;
  }

  private generateDefaultContent(options: GeneralContentOptions): GenerationResult {
    return {
      title: `${options.topic || 'General Knowledge'} Assessment`,
      introduction: `This assessment will test your understanding of ${options.topic || 'general knowledge'}.`,
      questions: this.generateDefaultQuestions(options),
      learningObjectives: [
        `Understand key concepts in ${options.topic || 'the subject'}`,
        'Apply critical thinking skills',
        'Demonstrate comprehension of core ideas'
      ]
    };
  }

  private generateDefaultQuestions(options: GeneralContentOptions): any[] {
    const questions = [];
    const numQuestions = options.numberOfQuestions || 10;
    
    for (let i = 0; i < numQuestions; i++) {
      questions.push({
        question: `Question ${i + 1}: Sample question about ${options.topic || 'general knowledge'}`,
        type: 'multiple_choice',
        options: [
          'Sample option A',
          'Sample option B',
          'Sample option C',
          'Sample option D'
        ],
        answer: 'Sample option A',
        explanation: 'This is a sample explanation.',
        points: 2
      });
    }
    
    return questions;
  }
} 