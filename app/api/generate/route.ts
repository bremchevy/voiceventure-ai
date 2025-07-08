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

const MATH_INTERACTIVE_FORMAT = `{
  "title": "string - The title of the worksheet",
  "subject": "Math",
  "grade_level": "string - The grade level",
  "topic": "string - The specific topic area",
  "format": "interactive",
  "problems": [
    {
      "problem": "string - The problem statement",
      "type": "interactive",
      "materials_needed": ["string array - List of required materials"],
      "instructions": ["string array - Step by step instructions"],
      "expected_outcome": "string - What students should observe/conclude",
      "answer": "string - The expected answer",
      "explanation": "string - Explanation of the concept"
    }
  ],
  "vocabulary": {
    "key": "string - Definition of key terms used"
  }
}`;

// Science-specific format templates
const SCIENCE_LAB_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "Science",
  "format": "lab_experiment",
  "content": {
    "introduction": "string (comprehensive introduction to the topic)",
    "main_components": "string (detailed explanation of key components and processes)",
    "importance": "string (significance and real-world applications)",
    "causes_effects": "string (relationships and dependencies)",
    "additional_info": "string (interesting facts, misconceptions, and recent discoveries)"
  },
  "problems": [
    {
      "type": "topic_based",
      "question": "string (question based on the content)",
      "complexity": "string (basic/intermediate/advanced)",
      "answer": "string (correct answer)",
      "explanation": "string (detailed explanation linking back to content)",
      "focus_area": "string (specific aspect of topic being tested)"
    }
  ],
  "key_terms": {
    "term": "string (definition and context)"
  }
}`;

const SCIENCE_OBSERVATION_FORMAT = `{
  "title": "string (descriptive title of the worksheet)",
  "grade_level": "string (the grade level)",
  "topic": "string (the topic area)",
  "subject": "Science",
  "format": "observation_analysis",
  "content": {
    "key_points": ["string (main points about the topic)"],
    "analysis_focus": "string (specific aspects to analyze)",
    "data_patterns": "string (patterns or trends to observe)",
    "critical_aspects": "string (important elements to consider)",
    "implications": "string (broader implications and applications)"
  },
  "problems": [
    {
      "type": "analysis",
      "scenario": "string (specific situation or data to analyze)",
      "question": "string (analysis question)",
      "thinking_points": ["string (guiding points for analysis)"],
      "expected_analysis": "string (what students should consider)",
      "complexity": "string (basic/intermediate/advanced)"
    }
  ],
  "key_terms": {
    "term": "string (definition and context)"
  }
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
  "subject": "Reading",
  "format": "comprehension",
  "passage": {
    "text": "string (REQUIRED: the complete reading passage)",
    "type": "string (fiction/non-fiction/poetry)",
    "lexile_level": "string (reading level)",
    "target_words": ["string (key vocabulary words)"]
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
  "subject": "Reading",
  "format": "literary_analysis",
  "passage": {
    "text": "string (REQUIRED: the complete reading passage)",
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
  "subject": "Reading",
  "format": "vocabulary_context",
  "passage": {
    "text": "string (REQUIRED: the complete reading passage)",
    "type": "string (fiction/non-fiction/poetry)",
    "target_words": ["string (REQUIRED: vocabulary words to study)"]
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
      grade,
      resourceType,
      theme,
      difficulty,
      topicArea,
      questionCount,
      customInstructions,
      selectedQuestionTypes = ['multiple_choice'],
      format,
      lessonDuration
    } = await req.json();

    // Validate required fields
    if (!subject || !grade || !resourceType || !topicArea) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build the system prompt based on resource type
    let systemPrompt = `You are an expert ${subject} teacher specializing in creating educational resources for ${grade} students. `;
    systemPrompt += `Create a ${resourceType} about ${topicArea} at a ${difficulty || 'moderate'} difficulty level. `;

    if (customInstructions) {
      systemPrompt += `Additional instructions: ${customInstructions}. `;
    }

    // Add resource-specific instructions
    switch (resourceType.toLowerCase()) {
      case 'worksheet':
        if (typeof questionCount === 'number') {
          if (questionCount > 0) {
            systemPrompt += `Generate exactly ${questionCount} problems. `;
          } else {
            systemPrompt += `Generate a content-only worksheet without any problems. `;
          }
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
              default:
                systemPrompt += `Include answer spaces after each problem. Provide final answers at the end. Do not include step-by-step explanations. Return the response in this exact JSON format: ${MATH_STANDARD_FORMAT}`;
                break;
            }
            break;
          
          case 'reading':
            // Only add passage-related instructions for reading formats
            if (format === 'comprehension' || format === 'literary_analysis' || format === 'vocabulary_context' || !format || format === 'worksheet') {
              if (questionCount === 0) {
                systemPrompt += `Focus on providing a rich, grade-appropriate passage with clear structure and engaging content. `;
              }
              // Ensure format is set for reading worksheets
              let readingFormat = format;
              if (!format || format === 'worksheet') {
                readingFormat = 'comprehension'; // Default to comprehension if no specific format
              }

              // Add specific instructions for reading passages
              systemPrompt += `Create a grade-appropriate passage about ${topicArea}. The passage should be engaging and suitable for ${grade} students. `;
              
              switch (readingFormat) {
                case 'comprehension':
                  systemPrompt += `Create a reading comprehension worksheet with a passage about ${topicArea}. The passage should demonstrate clear author's purpose and include exactly ${questionCount} questions focusing on main ideas, details, and inferences. The passage MUST be included in the response. Return the response in this exact JSON format: ${READING_COMPREHENSION_FORMAT}`;
                  break;
                case 'literary_analysis':
                  systemPrompt += `Create a literary analysis worksheet with a passage rich in literary elements. Include exactly ${questionCount} analysis questions. The passage MUST be included in the response. Return the response in this exact JSON format: ${READING_LITERARY_ANALYSIS_FORMAT}`;
                  break;
                case 'vocabulary_context':
                  systemPrompt += `Create a vocabulary-in-context worksheet with a passage containing target vocabulary words. Include exactly ${questionCount} vocabulary-focused questions. The passage MUST be included in the response. Return the response in this exact JSON format: ${READING_VOCABULARY_FORMAT}`;
                  break;
                default:
                  systemPrompt += `Create a reading comprehension worksheet with a passage about ${topicArea}. The passage should demonstrate clear author's purpose and include exactly ${questionCount} questions focusing on main ideas, details, and inferences. The passage MUST be included in the response. Return the response in this exact JSON format: ${READING_COMPREHENSION_FORMAT}`;
                  break;
              }
            } else {
              // For non-passage reading formats
              systemPrompt += `Create ${questionCount} questions to assess reading skills. Return the response in this exact JSON format: ${READING_COMPREHENSION_FORMAT}`;
            }
            break;
          
          case 'science':
            switch (format) {
              case 'science_context':
              case 'lab_experiment':
                if (questionCount === 0) {
                  systemPrompt += `Create a comprehensive explanation about ${topicArea}. Return the response in this exact JSON format:
{
  "title": "${topicArea} Overview",
  "grade_level": "${grade}",
  "topic": "${topicArea}",
  "subject": "Science",
  "format": "science_context",
  "instructions": "Read through the content carefully. Pay attention to key concepts and their relationships. Take notes on important points.",
  "content": {
    "introduction": "Provide a thorough explanation of ${topicArea}",
    "main_components": "Detail the key elements and their relationships",
    "importance": "Explain the significance in science and daily life",
    "causes_effects": "Explore factors and relationships",
    "additional_info": "Share interesting facts and discoveries"
  }
}`;
                } else {
                  systemPrompt += `Create a comprehensive explanation about ${topicArea} with ${questionCount} questions. Return the response in this exact JSON format:
{
  "title": "${topicArea} Study",
  "grade_level": "${grade}",
  "topic": "${topicArea}",
  "subject": "Science",
  "format": "science_context",
  "instructions": "Read through the content carefully before answering questions. Each question builds on the content provided. Support your answers with specific details from the text.",
  "content": {
    "introduction": "Provide a thorough explanation of ${topicArea}",
    "main_components": "Detail the key elements and their relationships",
    "importance": "Explain the significance in science and daily life",
    "causes_effects": "Explore factors and relationships",
    "additional_info": "Share interesting facts and discoveries"
  },
  "problems": [
    {
      "type": "topic_based",
      "question": "Question about ${topicArea}",
      "complexity": "basic/intermediate/advanced",
      "answer": "The correct answer",
      "explanation": "Detailed explanation linking back to content",
      "focus_area": "Specific aspect of topic being tested"
    }
  ]
}`;
                }
                break;
              case 'analysis_focus':
              case 'observation_analysis':
                if (questionCount === 0) {
                  systemPrompt += `Create an analytical breakdown of ${topicArea}. Return the response in this exact JSON format:
{
  "title": "${topicArea} Analysis",
  "grade_level": "${grade}",
  "topic": "${topicArea}",
  "subject": "Science",
  "format": "analysis_focus",
  "instructions": "Study the key points and patterns carefully. Focus on understanding relationships between different aspects. Consider how each element connects to the broader topic.",
  "content": {
    "key_points": ["Essential concept 1", "Essential concept 2"],
    "analysis_focus": "Specific aspects to examine",
    "data_patterns": "Notable trends and correlations",
    "critical_aspects": "Key factors to consider",
    "implications": "Broader impacts and applications"
  }
}`;
                } else {
                  systemPrompt += `Create an analytical breakdown of ${topicArea} with ${questionCount} analytical questions. Return the response in this exact JSON format:
{
  "title": "${topicArea} Analysis",
  "grade_level": "${grade}",
  "topic": "${topicArea}",
  "subject": "Science",
  "format": "analysis_focus",
  "instructions": "First, study the content carefully. Then, for each question: 1) Read the scenario, 2) Consider all thinking points, 3) Develop a thorough analysis based on the content and your understanding.",
  "content": {
    "key_points": ["Essential concept 1", "Essential concept 2"],
    "analysis_focus": "Specific aspects to examine",
    "data_patterns": "Notable trends and correlations",
    "critical_aspects": "Key factors to consider",
    "implications": "Broader impacts and applications"
  },
  "problems": [
    {
      "type": "analysis",
      "scenario": "A specific situation or data to analyze",
      "question": "Analysis question about ${topicArea}",
      "thinking_points": ["Point 1 to consider", "Point 2 to consider"],
      "expected_analysis": "What students should consider in their analysis",
      "complexity": "basic/intermediate/advanced"
    }
  ]
}`;
                }
                break;
              default:
                systemPrompt += `Create a comprehensive explanation about ${topicArea}. Return the response in this exact JSON format:
{
  "title": "${topicArea} Overview",
  "grade_level": "${grade}",
  "topic": "${topicArea}",
  "subject": "Science",
  "format": "science_context",
  "instructions": "Read through the content carefully. Pay attention to key concepts and their relationships. Take notes on important points.",
  "content": {
    "introduction": "Provide a thorough explanation of ${topicArea}",
    "main_components": "Detail the key elements and their relationships",
    "importance": "Explain the significance in science and daily life",
    "causes_effects": "Explore factors and relationships",
    "additional_info": "Share interesting facts and discoveries"
  }
}`;
                break;
            }
            break;
        }
        break;

      case 'quiz':
        systemPrompt += `Create a quiz with exactly ${questionCount} questions using these types: ${selectedQuestionTypes.join(', ')}. `;
        break;
      case 'rubric':
        systemPrompt += 'Create a detailed rubric with clear criteria and performance levels. ';
        break;
      case 'lesson plan':
        let lessonFormat;
        switch (format) {
          case 'full_lesson':
            lessonFormat = `Design a comprehensive 45-60 minute lesson plan with detailed objectives, activities, and assessment strategies. Return the response in this exact JSON format:
{
  "title": "${topicArea} Lesson Plan",
  "grade_level": "${grade}",
  "subject": "${subject}",
  "duration": "45-60 minutes",
  "objectives": ["Learning objective 1", "Learning objective 2"],
  "materials": ["Required material 1", "Required material 2"],
  "activities": {
    "opening": {
      "duration": "10-15 minutes",
      "description": "Opening activity description",
      "teacher_actions": ["Action 1", "Action 2"],
      "student_actions": ["Action 1", "Action 2"]
    },
    "main": {
      "duration": "25-30 minutes",
      "description": "Main activity description",
      "teacher_actions": ["Action 1", "Action 2"],
      "student_actions": ["Action 1", "Action 2"]
    },
    "closing": {
      "duration": "10-15 minutes",
      "description": "Closing activity description",
      "teacher_actions": ["Action 1", "Action 2"],
      "student_actions": ["Action 1", "Action 2"]
    }
  },
  "assessment": {
    "formative": ["Assessment method 1", "Assessment method 2"],
    "summative": ["Assessment method 1", "Assessment method 2"]
  },
  "differentiation": {
    "struggling": ["Support strategy 1", "Support strategy 2"],
    "advanced": ["Challenge strategy 1", "Challenge strategy 2"]
  },
  "extensions": ["Extension activity 1", "Extension activity 2"],
  "reflection_points": ["Reflection point 1", "Reflection point 2"]
}`;
            break;
          
          case 'mini_lesson':
            lessonFormat = `Design a focused 15-20 minute mini-lesson that targets a specific skill or concept. Return the response in this exact JSON format:
{
  "title": "${topicArea} Mini-Lesson",
  "grade_level": "${grade}",
  "subject": "${subject}",
  "duration": "15-20 minutes",
  "objectives": ["Focused learning objective"],
  "materials": ["Required material 1", "Required material 2"],
  "activities": {
    "opening": {
      "duration": "3-5 minutes",
      "description": "Brief opening hook or connection",
      "teacher_actions": ["Action 1"],
      "student_actions": ["Action 1"]
    },
    "main": {
      "duration": "10-12 minutes",
      "description": "Focused instruction and guided practice",
      "teacher_actions": ["Action 1", "Action 2"],
      "student_actions": ["Action 1", "Action 2"]
    },
    "closing": {
      "duration": "2-3 minutes",
      "description": "Quick check for understanding",
      "teacher_actions": ["Action 1"],
      "student_actions": ["Action 1"]
    }
  },
  "assessment": {
    "formative": ["Quick check method"],
    "summative": ["Application task"]
  },
  "differentiation": {
    "struggling": ["Support strategy"],
    "advanced": ["Challenge strategy"]
  },
  "extensions": ["Brief extension idea"],
  "reflection_points": ["Key reflection point"]
}`;
            break;
          
          case 'activity':
            lessonFormat = `Design a standalone hands-on learning activity that can be completed in 20-30 minutes. Return the response in this exact JSON format:
{
  "title": "${topicArea} Activity",
  "grade_level": "${grade}",
  "subject": "${subject}",
  "duration": "20-30 minutes",
  "objectives": ["Activity-specific learning objective"],
  "materials": ["Required material 1", "Required material 2"],
  "activities": {
    "opening": {
      "duration": "5 minutes",
      "description": "Activity setup and instructions",
      "teacher_actions": ["Setup action", "Instruction delivery"],
      "student_actions": ["Preparation action"]
    },
    "main": {
      "duration": "15-20 minutes",
      "description": "Hands-on activity execution",
      "teacher_actions": ["Facilitation action", "Support action"],
      "student_actions": ["Activity step 1", "Activity step 2"]
    },
    "closing": {
      "duration": "5 minutes",
      "description": "Share-out and connection",
      "teacher_actions": ["Facilitate sharing"],
      "student_actions": ["Share findings"]
    }
  },
  "assessment": {
    "formative": ["Activity-based assessment"],
    "summative": ["Product or outcome evaluation"]
  },
  "differentiation": {
    "struggling": ["Scaffolding strategy"],
    "advanced": ["Extension option"]
  },
  "extensions": ["Follow-up activity idea"],
  "reflection_points": ["Activity-specific reflection"]
}`;
            break;
          
          default:
            lessonFormat = `Design a comprehensive lesson plan with objectives, activities, and assessment strategies. Return the response in this exact JSON format:
{
  "title": "${topicArea} Lesson Plan",
  "grade_level": "${grade}",
  "subject": "${subject}",
  "duration": "${lessonDuration || '45 minutes'}",
  "objectives": ["Learning objective 1", "Learning objective 2"],
  "materials": ["Required material 1", "Required material 2"],
  "activities": {
    "opening": {
      "duration": "10 minutes",
      "description": "Opening activity description",
      "teacher_actions": ["Action 1", "Action 2"],
      "student_actions": ["Action 1", "Action 2"]
    },
    "main": {
      "duration": "25 minutes",
      "description": "Main activity description",
      "teacher_actions": ["Action 1", "Action 2"],
      "student_actions": ["Action 1", "Action 2"]
    },
    "closing": {
      "duration": "10 minutes",
      "description": "Closing activity description",
      "teacher_actions": ["Action 1", "Action 2"],
      "student_actions": ["Action 1", "Action 2"]
    }
  },
  "assessment": {
    "formative": ["Assessment method 1", "Assessment method 2"],
    "summative": ["Assessment method 1", "Assessment method 2"]
  },
  "differentiation": {
    "struggling": ["Support strategy 1", "Support strategy 2"],
    "advanced": ["Challenge strategy 1", "Challenge strategy 2"]
  },
  "extensions": ["Extension activity 1", "Extension activity 2"],
  "reflection_points": ["Reflection point 1", "Reflection point 2"]
}`;
        }
        systemPrompt += lessonFormat;
        break;
      case 'exit slip':
        let exitSlipFormat = '';
        switch (format) {
          case 'reflection_prompt':
            exitSlipFormat = `Create ${questionCount} reflection prompts following this structure. Return the response in this exact JSON format:
            {
              "title": "${topicArea} Exit Slip",
              "subject": "${subject}",
              "grade_level": "${grade}",
              "exit_slip_topic": "${topicArea}",
              "difficulty_level": "Basic/Intermediate/Advanced",
              "questions": [
                {
                  "question": "Main reflection question",
                  "guides": ["Reflection guide 1", "Reflection guide 2", "Reflection guide 3"],
                  "starters": ["I learned that...", "I wonder about...", "I can use this by..."],
                  "notes": "Optional teacher notes or context"
                }
              ]
            }`;
            break;
          case 'vocabulary_check':
            exitSlipFormat = `Create ${questionCount} vocabulary check items following this structure. Return the response in this exact JSON format:
            {
              "title": "${topicArea} Vocabulary Check",
              "subject": "${subject}",
              "grade_level": "${grade}",
              "exit_slip_topic": "${topicArea}",
              "difficulty_level": "Basic/Intermediate/Advanced",
              "questions": [
                {
                  "term": "Key term to assess",
                  "definition": "Definition of the term",
                  "context": "Context or example sentence",
                  "examples": ["Example 1", "Example 2"],
                  "usagePrompt": "Prompt for using the term",
                  "relationships": ["Related term 1", "Related term 2"],
                  "visualCue": "Description of a visual representation"
                }
              ]
            }`;
            break;
          case 'skill_assessment':
            exitSlipFormat = `Create ${questionCount} skill assessment items following this structure. Return the response in this exact JSON format:
            {
              "title": "${topicArea} Skill Assessment",
              "subject": "${subject}",
              "grade_level": "${grade}",
              "exit_slip_topic": "${topicArea}",
              "difficulty_level": "Basic/Intermediate/Advanced",
              "questions": [
                {
                  "skillName": "Name of the skill being assessed",
                  "task": "Specific task or problem to solve",
                  "steps": ["Step 1", "Step 2", "Step 3"],
                  "criteria": ["Success criterion 1", "Success criterion 2"],
                  "applicationContext": "Real-world context for the skill",
                  "difficultyLevel": "Basic/Intermediate/Advanced"
                }
              ]
            }`;
            break;
          default:
            exitSlipFormat = `Create ${questionCount} exit slip questions to assess student understanding. Return the response in this exact JSON format:
            {
              "title": "${topicArea} Exit Slip",
              "subject": "${subject}",
              "grade_level": "${grade}",
              "exit_slip_topic": "${topicArea}",
              "difficulty_level": "Basic/Intermediate/Advanced",
              "questions": [
                {
                  "question": "Assessment question",
                  "answer": "Expected answer or response",
                  "notes": "Teacher notes or guidance"
                }
              ]
            }`;
        }
        systemPrompt += exitSlipFormat;
        break;
    }

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
          content: `Generate a ${resourceType} about ${topicArea} following the exact JSON format specified above.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
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