import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getErrorMessage } from '@/lib/utils/errors';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Math-specific format templates
const MATH_STANDARD_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "string (the subject)",
  "format": "standard",
  "problems": [
    {
      "problem": "string (the math problem text)",
      "answer": "string (the correct answer)",
      "type": "short_answer"
    }
  ],
  "vocabulary": {
    "term1": "definition1",
    "term2": "definition2"
  }
}`;

const MATH_GUIDED_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "string (the subject)",
  "format": "guided",
  "problems": [
    {
      "problem": "string (the math problem text)",
      "steps": ["string (step 1)", "string (step 2)"],
      "answer": "string (the final answer)",
      "explanation": "string (detailed explanation)",
      "type": "guided"
    }
  ],
  "vocabulary": {
    "term1": "definition1",
    "term2": "definition2"
  }
}`;

// Science-specific format templates
const SCIENCE_LAB_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "string (the subject)",
  "format": "lab_experiment",
  "objective": "string (what students will learn)",
  "safety_notes": "string (safety precautions if any)",
  "materials": ["string (material 1)", "string (material 2)"],
  "problems": [
    {
      "type": "experiment",
      "question": "string (research question)",
      "hypothesis_prompt": "string (guide for forming hypothesis)",
      "procedure": ["string (step 1)", "string (step 2)"],
      "data_collection": {
        "table_headers": ["string (column 1)", "string (column 2)"],
        "rows": number (number of measurements needed)
      },
      "analysis_questions": ["string (question 1)", "string (question 2)"],
      "conclusion_prompt": "string (guide for forming conclusion)"
    }
  ]
}`;

const SCIENCE_OBSERVATION_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "string (the subject)",
  "format": "observation_analysis",
  "objective": "string (what students will learn)",
  "problems": [
    {
      "type": "observation",
      "phenomenon": "string (what to observe)",
      "background": "string (relevant scientific context)",
      "observation_prompts": ["string (what to look for/record)"],
      "data_recording": {
        "type": "string (diagram/table/text)",
        "instructions": "string (how to record observations)"
      },
      "analysis_questions": ["string (question for analysis)"],
      "connections": ["string (real-world connections)"]
    }
  ]
}`;

const SCIENCE_CONCEPT_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "string (the subject)",
  "format": "concept_application",
  "concept": "string (the scientific concept)",
  "problems": [
    {
      "type": "application",
      "scenario": "string (real-world scenario)",
      "concept_connection": "string (how concept applies)",
      "questions": [
        {
          "question": "string (application question)",
          "answer": "string (correct answer)",
          "explanation": "string (why this answer demonstrates understanding)"
        }
      ],
      "extension": "string (prompt for further application)"
    }
  ]
}`;

// Reading-specific format templates
const READING_COMPREHENSION_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "string (the subject)",
  "format": "comprehension",
  "passage": {
    "text": "string (the reading passage)",
    "type": "string (fiction/non-fiction/poetry)",
    "lexile_level": "string (reading level)"
  },
  "problems": [
    {
      "type": "string (main_idea/detail/inference)",
      "question": "string (the question)",
      "answer": "string (correct answer)",
      "evidence_prompt": "string (prompt to cite text evidence)",
      "skill_focus": "string (reading skill being practiced)"
    }
  ]
}`;

const READING_LITERARY_ANALYSIS_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "string (the subject)",
  "format": "literary_analysis",
  "passage": {
    "text": "string (the reading passage)",
    "type": "string (fiction/non-fiction/poetry)",
    "elements_focus": ["string (literary elements to analyze)"]
  },
  "problems": [
    {
      "type": "analysis",
      "element": "string (literary element)",
      "question": "string (analysis question)",
      "guiding_questions": ["string (supporting questions)"],
      "evidence_prompt": "string (text evidence guidance)",
      "response_format": "string (how to structure response)"
    }
  ]
}`;

const READING_VOCABULARY_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "string (the subject)",
  "format": "vocabulary_context",
  "passage": {
    "text": "string (the reading passage)",
    "target_words": ["string (vocabulary words to study)"]
  },
  "problems": [
    {
      "word": "string (vocabulary word)",
      "context": "string (sentence from passage)",
      "definition": "string (word definition)",
      "questions": [
        {
          "type": "string (meaning/usage/context)",
          "question": "string (the question)",
          "answer": "string (correct answer)"
        }
      ],
      "application": "string (prompt for using the word)"
    }
  ]
}`;

export async function POST(req: Request) {
  try {
    const {
      subject,
      gradeLevel,
      resourceType,
      theme,
      difficulty,
      topicArea,
      questionCount = 10,
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
        if (questionCount > 0) {
          systemPrompt += `Generate a worksheet with ${questionCount} problems. `;
        } else {
          systemPrompt += `Generate a content-only worksheet without any problems. `;
        }
        
        // Add subject and format-specific instructions
        switch (subject.toLowerCase()) {
          case 'math':
            if (questionCount === 0) {
              systemPrompt += `Focus on providing clear explanations, visual aids, or reference materials. `;
            }
            switch (format) {
              case 'standard':
                systemPrompt += `Include answer spaces after each problem. Provide final answers at the end. Do not include step-by-step explanations. Return the response in this exact JSON format: ${MATH_STANDARD_FORMAT}`;
                break;
              case 'guided':
                systemPrompt += `Include step-by-step hints and explanations for each problem. Break down complex problems into smaller steps. Return the response in this exact JSON format: ${MATH_GUIDED_FORMAT}`;
                break;
              case 'interactive':
                systemPrompt += `Design problems that involve hands-on activities and manipulatives. Return the response in this exact JSON format: ${MATH_INTERACTIVE_FORMAT}`;
                break;
            }
            break;
          
          case 'reading':
            if (questionCount === 0) {
              systemPrompt += `Focus on providing a rich, grade-appropriate passage with clear structure and engaging content. `;
            }
            switch (format) {
              case 'comprehension':
                systemPrompt += `Create a reading comprehension worksheet with grade-appropriate passage and questions focusing on main ideas, details, and inferences. Return the response in this exact JSON format: ${READING_COMPREHENSION_FORMAT}`;
                break;
              case 'literary_analysis':
                systemPrompt += `Create a literary analysis worksheet focusing on key elements like character, plot, theme, and literary devices. Return the response in this exact JSON format: ${READING_LITERARY_ANALYSIS_FORMAT}`;
                break;
              case 'vocabulary_context':
                systemPrompt += `Create a vocabulary-in-context worksheet that helps students understand and use new words from the text. Return the response in this exact JSON format: ${READING_VOCABULARY_FORMAT}`;
                break;
            }
            break;
          
          case 'science':
            if (questionCount === 0) {
              systemPrompt += `Focus on providing detailed procedures, observation guidelines, or concept explanations. `;
            }
            switch (format) {
              case 'lab_experiment':
                systemPrompt += `Create a laboratory experiment worksheet with clear procedures, safety guidelines, and data collection. Return the response in this exact JSON format: ${SCIENCE_LAB_FORMAT}`;
                break;
              case 'observation_analysis':
                systemPrompt += `Create an observation-based worksheet focusing on scientific phenomena and data recording. Return the response in this exact JSON format: ${SCIENCE_OBSERVATION_FORMAT}`;
                break;
              case 'concept_application':
                systemPrompt += `Create a worksheet that helps students apply scientific concepts to real-world scenarios. Return the response in this exact JSON format: ${SCIENCE_CONCEPT_FORMAT}`;
                break;
            }
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