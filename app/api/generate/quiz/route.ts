import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getQuizPromptEnhancements } from '@/lib/services/AIContentGenerator/quiz-difficulty';
import { Subject } from '@/lib/types/resource';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QUIZ_FORMAT = `{
  "title": "string (descriptive title of the quiz)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "string (the subject)",
  "estimated_time": "string (estimated completion time)",
  "questions": [
    {
      "type": "string (multiple_choice/true_false/short_answer)",
      "question": "string (the question text)",
      "options": ["string (option A)", "string (option B)", "string (option C)", "string (option D)"],
      "correct_answer": "string (the correct answer)",
      "explanation": "string (explanation of the correct answer)",
      "cognitive_level": "string (recall/comprehension/application/analysis)",
      "points": "number (question point value)"
    }
  ],
  "total_points": "number (sum of all question points)",
  "instructions": "string (quiz instructions)",
  "metadata": {
    "complexity_level": "number (1-10)",
    "language_level": "number (1-10)",
    "cognitive_distribution": {
      "recall": "number (percentage)",
      "comprehension": "number (percentage)",
      "application": "number (percentage)",
      "analysis": "number (percentage)"
    }
  }
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      grade,
      subject,
      topicArea,
      questionCount,
      selectedQuestionTypes,
      theme
    } = body;

    // Validate required fields
    if (!grade || !subject || !topicArea || !questionCount || !selectedQuestionTypes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get difficulty-based enhancements
    const difficultyPrompt = getQuizPromptEnhancements(grade, subject as Subject);

    // Build the system prompt
    const systemPrompt = `You are an expert ${subject} teacher specializing in creating quizzes for ${grade} students.

${difficultyPrompt}

Create a quiz about ${topicArea} with exactly ${questionCount} questions using these types: ${selectedQuestionTypes.join(', ')}.

Return the response in this exact JSON format:
${QUIZ_FORMAT}

Additional Requirements:
1. For Multiple Choice:
   - ALWAYS provide exactly 4 options in the "options" array format
   - Each option must be a complete, meaningful answer
   - Make all options plausible but only one correct
   - Avoid "all/none of the above" options
   - Example format:
     {
       "type": "multiple_choice",
       "question": "What is the first step of the scientific method?",
       "options": [
         "Making a prediction",
         "Testing a hypothesis",
         "Recording observations",
         "Asking a question"
       ],
       "correct_answer": "Asking a question",
       "explanation": "The scientific method begins with asking a testable question about an observation."
     }

2. For True/False:
   - Use clear, unambiguous statements
   - Avoid double negatives
   - Make statements definitively true or false

3. For Short Answer:
   - Questions should have clear, specific answers
   - Provide sample acceptable answers
   - Keep expected response length appropriate for grade level

4. General Guidelines:
   - Use grade-appropriate vocabulary and concepts
   - Make questions clear and unambiguous
   - Distribute cognitive levels as specified
   - Include relevant explanations for all answers
   - NEVER return options as an object (like {a: "...", b: "..."})
   - ALWAYS return options as an array ["option1", "option2", "option3", "option4"]`;

    // Create the completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate a quiz about ${topicArea} following the exact JSON format specified above.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const result = completion.choices[0].message.content;
    return NextResponse.json(JSON.parse(result));
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    );
  }
} 