import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getErrorMessage } from '@/lib/utils/errors';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      subject,
      gradeLevel,
      resourceType,
      theme,
      difficulty,
      topicArea,
      includeVocabulary,
      questionCount = 10,
      focus,
      customInstructions,
      selectedQuestionTypes = ['multiple_choice'],
      format
    } = await req.json();

    // Validate required fields
    if (!subject || !gradeLevel || !resourceType || !topicArea) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build the system prompt based on resource type
    let systemPrompt = `You are an expert ${subject} teacher specializing in creating educational resources for ${gradeLevel} students. `;
    systemPrompt += `Create a ${resourceType} about ${topicArea} at a ${difficulty || 'moderate'} difficulty level. `;

    if (customInstructions) {
      systemPrompt += `Additional instructions: ${customInstructions}. `;
    }

    // Add resource-specific instructions
    switch (resourceType.toLowerCase()) {
      case 'worksheet':
        systemPrompt += `Generate a worksheet with ${questionCount} problems. `;
        if (includeVocabulary) {
          systemPrompt += 'Include relevant vocabulary terms and definitions. ';
        }
        // Add format-specific instructions for worksheets
        switch (format) {
          case 'standard':
            systemPrompt += 'Include answer spaces after each problem. Provide final answers at the end. Do not include step-by-step explanations. ';
            break;
          case 'guided':
            systemPrompt += 'Include step-by-step hints and explanations for each problem. Break down complex problems into smaller steps. Provide detailed explanations for each step. ';
            break;
          case 'interactive':
            systemPrompt += 'Design problems that involve hands-on activities, drawing, or manipulatives. Focus on engaging, interactive elements. Do not include direct answers or explanations. ';
            break;
        }
        break;
      case 'quiz':
        systemPrompt += `Create a quiz with ${questionCount} questions using these types: ${selectedQuestionTypes.join(', ')}. `;
        break;
      case 'rubric':
        systemPrompt += 'Create a detailed rubric with clear criteria and performance levels. ';
        break;
      case 'lesson plan':
        systemPrompt += 'Design a comprehensive lesson plan with objectives, activities, and assessment strategies. ';
        break;
      case 'exit slip':
        systemPrompt += 'Create exit slip questions to assess student understanding. ';
        break;
    }

    systemPrompt += 'Format the response as a JSON object with appropriate structure for the resource type.';

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a ${resourceType} for ${subject} (${gradeLevel}) about ${topicArea}` }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    // Parse and validate the response
    const parsedContent = JSON.parse(content);

    return NextResponse.json(parsedContent);
  } catch (error) {
    console.error('Error in generate route:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
} 