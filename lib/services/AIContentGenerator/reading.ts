import { BaseAIContentGenerator, GenerationOptions, GenerationResult } from './base';
import { getPromptEnhancements } from './difficulty-scaling';
import { DifficultyLevel, Subject } from '../../types/resource';

export interface ReadingContentOptions {
  grade?: string;
  difficulty?: DifficultyLevel;
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
      console.log('❌ Validation failed: Missing required fields');
      return false;
    }

    if (!Array.isArray(response.questions)) {
      console.log('❌ Validation failed: Questions is not an array');
      return false;
    }

    const expectedQuestions = options.numberOfQuestions || 10;
    if (response.questions.length !== expectedQuestions) {
      console.log(`❌ Validation failed: Expected ${expectedQuestions} questions, got ${response.questions.length}`);
      return false;
    }

    // Special validation for kindergarten
    const isKindergarten = options.grade?.toLowerCase() === 'k' || options.grade?.toLowerCase() === 'kindergarten';
    if (isKindergarten) {
      // For kindergarten, we're more lenient with validation
      const validQuestions = response.questions.every((q: any) => 
        q.question && 
        q.type && 
        (q.type === 'multiple_choice' || q.type === 'true_false')
      );

      if (!validQuestions) {
        console.log('❌ Validation failed: Invalid kindergarten question format');
        return false;
      }

      // Validate passage is appropriate for kindergarten
      const passageLines = response.passage.split('\n').filter(Boolean);
      if (passageLines.length > 5) {
        console.log('❌ Validation failed: Kindergarten passage too long');
        return false;
      }

      return true;
    }

    // Regular validation for other grades
    const validQuestions = response.questions.every((q: any) => 
      q.question && 
      q.type && 
      q.answer && 
      (q.type !== 'multiple_choice' || (Array.isArray(q.options) && q.options.length >= 2))
    );

    if (!validQuestions) {
      console.log('❌ Validation failed: Invalid question format');
      return false;
    }

    if (!response.passage.trim()) {
      console.log('❌ Validation failed: Empty passage');
      return false;
    }

    return true;
  }

  private async buildReadingPrompt(options: ReadingContentOptions): Promise<string> {
    const {
      grade = '5',
      difficulty = 'intermediate',
      topic = '',
      includeVocabulary = true,
      includeComprehension = true,
      numberOfQuestions = 5,
      customInstructions = '',
      readingLevel,
      genre,
      focus = []
    } = options;

    const isKindergarten = grade.toLowerCase() === 'k' || grade.toLowerCase() === 'kindergarten';

    if (isKindergarten) {
      return `Generate a kindergarten-level reading activity about ${topic || 'basic concepts'}.

CRITICAL REQUIREMENTS:
1. The passage MUST:
   - Be 3-5 simple sentences MAXIMUM
   - Use ONLY basic sight words
   - Have one sentence per line
   - Use repetitive patterns
   - Focus on ${topic} at a very basic level

2. Generate EXACTLY ${numberOfQuestions} questions that:
   - Are yes/no only
   - Use simple language
   - Focus on basic comprehension

Return the response in this exact JSON format:
{
  "title": "Simple, engaging title",
  "passage": "Very simple passage",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Simple question",
      "options": ["Yes", "No"],
      "correct": "Yes or No"
    }
  ],
  "vocabulary": [
    {
      "word": "Simple word from the passage",
      "definition": "Very basic 3-4 word definition"
    }
  ]
}

${customInstructions ? `\nAdditional Instructions:\n${customInstructions}` : ''}`;
    }

    // Enforce maximum question limit
    const limitedQuestions = Math.min(numberOfQuestions, this.MAX_QUESTIONS);

    // Get difficulty-based enhancements
    const difficultyEnhancements = getPromptEnhancements(grade, 'reading', difficulty);

    // Grade-specific guidelines based on cognitive levels and complexity
    const gradeStr = String(grade).toLowerCase();
    const gradeNum = gradeStr === 'k' || gradeStr === 'kindergarten' ? 0 : parseInt(gradeStr) || 5;
    
    const getGradeSpecificPrompt = (grade: number) => {
      // Kindergarten (Grade 0)
      if (grade === 0) {
        return `
KINDERGARTEN-SPECIFIC GUIDELINES:
Content Structure:
- Use ONLY one simple sentence per line (3-5 words maximum per sentence)
- Maximum 3-4 lines total for the entire passage
- Each line must follow a predictable pattern for emergent reading
- Include repetitive sight words (e.g., "I see", "I like", "we can")
- Use only kindergarten-level sight words from Dolch or Fry lists

Language Requirements:
- Use ONLY CVC (consonant-vowel-consonant) words
- Include basic color words and number words (one to five)
- Focus on concrete objects and immediate experiences
- Use present tense only
- Avoid any complex words or contractions
`;
      }
      
      // Early Elementary (Grades 1-2)
      if (grade >= 1 && grade <= 2) {
        return `
EARLY ELEMENTARY (GRADES 1-2) GUIDELINES:
Content Structure:
- Grade 1: 2-3 simple sentences per paragraph, 2 paragraphs maximum
- Grade 2: 3-4 sentences per paragraph, 2-3 paragraphs maximum
- Clear beginning, middle, and end
- Use grade-appropriate sight words from Dolch/Fry lists
- Include basic punctuation (periods, question marks)

Language Requirements:
- Simple and compound sentences only
- Present and past tense only
- Basic adjectives and common verbs
- Phonics-based vocabulary
- Grade 1: Focus on CVC words and basic blends
- Grade 2: Include common digraphs and simple vowel patterns

Story Elements:
- One main character with clear actions
- Simple, linear plot
- Familiar settings (home, school, park)
- Clear sequence words (first, then, last)
- Basic emotions and motivations

Questions Distribution:
- Grade 1:
  * 50% recall (direct from text)
  * 30% sequencing
  * 20% basic inference
- Grade 2:
  * 40% recall
  * 30% basic inference
  * 20% sequencing
  * 10% simple prediction

Question Types:
- Multiple choice (3 options maximum)
- Yes/no questions
- Simple fill-in-the-blank
- Picture-supported questions
- One-word or short phrase answers

Assessment Focus:
- Reading fluency
- Basic comprehension
- Sequence of events
- Character identification
- Setting recognition
- Simple cause and effect`;
      }
      
      // Upper Elementary (Grades 3-5)
      if (grade >= 3 && grade <= 5) {
        return `
UPPER ELEMENTARY (GRADES 3-5) GUIDELINES:
Content Structure:
- Grade 3: 3-4 paragraphs (4-5 sentences each)
- Grade 4: 4-5 paragraphs (5-6 sentences each)
- Grade 5: 5-6 paragraphs (6-7 sentences each)
- Clear paragraph structure with topic sentences
- Varied sentence beginnings
- Include dialogue and descriptions

Language Requirements:
- Mix of simple, compound, and complex sentences
- Grade-appropriate academic vocabulary
- Figurative language introduction
- Multiple verb tenses
- Descriptive language and sensory details

Literary Elements:
- Character development through actions and dialogue
- Clear plot structure with rising action
- Multiple story elements (setting, conflict, resolution)
- Theme introduction
- Basic literary devices (similes, metaphors)

Questions Distribution:
- 20% recall/comprehension
- 30% inference/interpretation
- 25% analysis/evaluation
- 15% vocabulary in context
- 10% author's purpose/craft

Question Types:
- Multiple choice (4 options)
- Short answer requiring evidence
- Text-dependent analysis
- Compare and contrast
- Sequence and summarize

Assessment Focus:
- Reading comprehension strategies
- Character analysis
- Plot development
- Theme identification
- Text evidence support
- Vocabulary in context
- Literary device recognition`;
      }
      
      // Middle School (Grades 6-8)
      if (grade >= 6 && grade <= 8) {
        return `
MIDDLE SCHOOL (GRADES 6-8) GUIDELINES:
Content Structure:
- 6-8 paragraphs with varied lengths
- Complex paragraph organization
- Multiple text structures (cause/effect, compare/contrast)
- Integrated dialogue and internal monologue
- Sophisticated transitions between ideas

Language Requirements:
- Advanced vocabulary with context clues
- Complex sentence structures
- Varied literary devices
- Academic language integration
- Domain-specific terminology

Literary Elements:
- Multi-dimensional characters
- Complex plot development
- Multiple themes and subthemes
- Varied points of view
- Sophisticated literary devices
- Mood and tone development

Questions Distribution:
- 15% comprehension
- 25% analysis
- 30% evaluation
- 20% inference
- 10% synthesis

Question Types:
- Text-dependent analysis
- Evidence-based responses
- Multiple-perspective analysis
- Theme development tracking
- Character motivation analysis
- Literary device impact analysis

Assessment Focus:
- Critical reading strategies
- Complex inference making
- Author's craft analysis
- Theme development
- Character motivation
- Literary device effectiveness
- Text structure analysis
- Cross-textual connections`;
      }
      
      // High School (Grades 9-12)
      if (grade >= 9 && grade <= 12) {
        const gradeSpecific = grade === 12 ? `
GRADE 12 ADVANCED ELEMENTS:
- College-level vocabulary integration
- Complex philosophical themes
- Advanced literary theory application
- Cross-disciplinary connections
- Sophisticated rhetorical analysis
- Research integration requirements
- Critical theory frameworks
- Meta-analytical approaches` : '';

        return `
HIGH SCHOOL (GRADES ${grade}-12) GUIDELINES:
Content Structure:
- Complex, multi-layered narrative structure
- Sophisticated paragraph organization
- Multiple narrative techniques
- Varied text structures and formats
- Integration of multiple perspectives
- Advanced literary techniques

Language and Style:
- College-preparatory vocabulary
- Complex syntactical structures
- Advanced rhetorical devices
- Sophisticated tone and voice
- Multiple registers and styles
- Academic language mastery

Literary Elements:
- Complex characterization
- Multiple plot lines/subplots
- Sophisticated theme development
- Advanced literary devices
- Cultural and historical context
- Intertextual references
- Symbolic representation

Critical Analysis Requirements:
- Literary theory application
- Cultural criticism integration
- Historical context analysis
- Philosophical implications
- Social commentary evaluation
- Author's craft analysis
- Comparative literature approaches

Questions Distribution:
- 10% comprehension
- 20% analysis
- 25% evaluation
- 25% synthesis
- 20% creation/application

Question Types:
- Advanced literary analysis
- Critical theory application
- Comparative analysis
- Research-based inquiry
- Theoretical framework application
- Cross-textual analysis
- Rhetorical analysis
- Synthesis questions

Assessment Focus:
- Advanced critical reading
- Literary theory application
- Complex theme analysis
- Style and rhetoric analysis
- Context interpretation
- Intertextual connections
- Research integration
- Theoretical frameworks${gradeSpecific}

Required Elements:
- MLA/APA citation practice
- Research integration
- Critical theory application
- Cross-disciplinary connections
- Advanced vocabulary usage
- Complex literary analysis
- Sophisticated writing prompts`;
      }
      
      // Default case (should never happen due to previous validation)
      return `
GENERAL GUIDELINES:
- Age-appropriate content
- Clear learning objectives
- Structured assessment
- Vocabulary development
- Comprehension focus`;
    };

    const gradeSpecificPrompt = getGradeSpecificPrompt(gradeNum);

    return `
Generate a grade-appropriate reading passage with comprehension questions.

PASSAGE REQUIREMENTS:
1. Write a ${gradeStr === 'k' || gradeStr === 'kindergarten' ? 'VERY SHORT story (4-5 lines)' : 'SHORT story (2-3 paragraphs)'} about a character showing specific traits through their actions
2. The story must be appropriate for ${readingLevel || `grade ${grade}`} students
3. Focus on the topic: ${topic}
4. Difficulty level: ${difficulty}
5. Include clear examples of character traits in action${gradeSpecificPrompt}

${difficultyEnhancements}

RESPONSE FORMAT:
{
  "title": "A clear, engaging title",
  "passage": "The story showing character traits",
  "questions": [
    {
      "question": "Question about character traits",
      "type": "${gradeStr === 'k' || gradeStr === 'kindergarten' ? 'true_false' : 'multiple_choice'}",
      "options": ${gradeStr === 'k' || gradeStr === 'kindergarten' ? '["A) Yes", "B) No"]' : '["A) ...", "B) ...", "C) ...", "D) ..."]'},
      "answer": "Correct letter (${gradeStr === 'k' || gradeStr === 'kindergarten' ? 'A or B' : 'A, B, C, or D'})",
      "explanation": "Why this shows understanding of character traits"
    }
  ],
  "vocabulary": [
    {
      "word": "A character trait word from the story",
      "definition": "Simple definition (5-7 words)",
      "context": "How it was used in the story"
    }
  ]
}

REQUIREMENTS:
- Generate EXACTLY ${limitedQuestions} questions
- Questions should focus on identifying and understanding character traits
- Include ${gradeStr === 'k' || gradeStr === 'kindergarten' ? '2-3' : '3-5'} character trait vocabulary words
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

      const prompt = await this.buildReadingPrompt({ ...otherOptions, numberOfQuestions: limitedQuestions });

      const result = await this.generateContent({
        prompt,
        temperature: 0.7,
        maxTokens: Math.max(2000, limitedQuestions * 150)
      });

      let parsedResult: any;
      try {
        parsedResult = JSON.parse(result);
      } catch (parseError) {
        if (retryCount < MAX_RETRIES) {
          return this.generateReadingContent(options, retryCount + 1);
        }
        throw new Error('Failed to parse reading content response');
      }

      // Validate the response
      if (!this.validateResponse(parsedResult, { ...options, numberOfQuestions: limitedQuestions })) {
        if (retryCount < MAX_RETRIES) {
          return this.generateReadingContent(options, retryCount + 1);
        }
        return this.generateDefaultContent(options);
      }

      return parsedResult;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.generateReadingContent(options, retryCount + 1);
      }
      return this.generateDefaultContent(options);
    }
  }

  private generateDefaultContent(options: ReadingContentOptions): ReadingGenerationResult {
    const isKindergarten = options.grade?.toLowerCase() === 'k' || options.grade?.toLowerCase() === 'kindergarten';

    if (isKindergarten) {
      return {
        title: "My Friend",
        passage: `I see a friend.
I see them being kind.
They share their toys.
They help others.
They make me smile.`,
        questions: Array(options.numberOfQuestions || 3).fill(null).map((_, i) => ({
          type: 'multiple_choice',
          question: `Is this friend being ${i === 0 ? 'kind' : i === 1 ? 'helpful' : 'nice'}?`,
          options: ['Yes', 'No'],
          answer: 'Yes',
        })),
        vocabulary: [
          {
            word: 'kind',
            definition: 'being nice to others'
          },
          {
            word: 'share',
            definition: 'let others use your things'
          }
        ],
        learningObjectives: [
          'Understand what makes a good friend',
          'Learn about kindness',
          'Practice reading simple sentences'
        ]
      };
    }
    
    return {
      title: this.generateDefaultTitle(options),
      passage: this.generateDefaultPassage(options),
      questions: this.generateDefaultQuestions(options),
      vocabulary: options.includeVocabulary ? [
        {
          word: 'example',
          definition: 'a thing characteristic of its kind',
          context: 'This is an example of default content.'
        }
      ] : undefined,
      learningObjectives: this.generateDefaultObjectives(options)
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
    const grade = options.grade || '5';
    const topic = options.topic ? `: ${options.topic}` : '';
    const difficulty = options.difficulty || 'intermediate';
    return `Grade ${grade} Reading Worksheet${topic} (${difficulty} level)`;
  }

  private generateDefaultPassage(options: ReadingContentOptions): string {
    return `This is a sample reading passage for grade ${options.grade || '5'} students. 
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

  private buildHighSchoolPrompt(options: ReadingContentOptions): string {
    return `
Generate a complex reading passage with the following requirements:

PASSAGE STRUCTURE:
- Multiple paragraphs with sophisticated narrative structure
- Complex characterization showing character evolution and internal conflicts
- Integration of at least 3 sophisticated literary devices
- Multiple themes exploring moral ambiguity
- Clear social or historical commentary
- Rich sensory details and symbolic elements

REQUIRED THEMES:
- Primary theme: ${options.topic || 'character development'}
- Secondary themes: moral ambiguity, societal implications
- Philosophical undertones or ethical dilemmas

QUESTION DISTRIBUTION (${options.numberOfQuestions} total):
- 10% (${Math.ceil(options.numberOfQuestions * 0.1)}) Remember: Basic recall/identification
- 20% (${Math.ceil(options.numberOfQuestions * 0.2)}) Understand: Interpretation questions
- 20% (${Math.ceil(options.numberOfQuestions * 0.2)}) Apply: Scenario-based application
- 30% (${Math.ceil(options.numberOfQuestions * 0.3)}) Analyze: Critical/comparative analysis
- 10% (${Math.ceil(options.numberOfQuestions * 0.1)}) Evaluate: Judgment/critique
- 10% (${Math.ceil(options.numberOfQuestions * 0.1)}) Create: Synthesis/alternative perspectives

VOCABULARY:
- Include sophisticated vocabulary with nuanced meanings
- Provide context-rich examples
- Connect to broader themes

Format the response as valid JSON with:
{
  "title": "Engaging title",
  "passage": "Complex passage following requirements",
  "vocabulary": [
    {
      "term": "Sophisticated word",
      "definition": "Nuanced definition",
      "context": "How it's used in passage"
    }
  ],
  "questions": [
    {
      "type": "cognitive_level",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "Correct option",
      "explanation": "Detailed explanation"
    }
  ]
}

${options.customInstructions ? `\nAdditional Requirements:\n${options.customInstructions}` : ''}`;
  }
} 