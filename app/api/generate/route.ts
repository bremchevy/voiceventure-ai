import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getErrorMessage } from '@/lib/utils/errors';
import { formatHandlerService } from '@/lib/services/FormatHandlerService';

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
      format,
      topic,
      grade,
      gradeLevel,
      theme,  // Remove the default value here
      resourceType = 'worksheet',
      questionCount = 5,
      selectedQuestionTypes = [],
      customInstructions = '',
      ...otherParams
    } = await req.json();

    // Function to generate content with retry handling
    async function generateWithRetry(retryCount = 0) {
    let systemPrompt = `You are an expert ${subject} teacher with years of experience creating engaging educational content. `;

    // Add theme-specific instructions
      if (theme && theme !== 'General') {
        switch (theme) {
          case 'Halloween':
            systemPrompt += `Create a Halloween-themed worksheet that incorporates spooky but age-appropriate elements. Use Halloween-themed word problems, scenarios, and vocabulary where appropriate, but ensure the core educational content remains clear and effective. `;
            break;
          case 'Winter':
            systemPrompt += `Create a Winter-themed worksheet that incorporates seasonal elements like snow, holidays, and winter activities. Use winter-themed word problems, scenarios, and vocabulary where appropriate, but ensure the core educational content remains clear and effective. `;
            break;
          case 'Spring':
            systemPrompt += `Create a Spring-themed worksheet that incorporates seasonal elements like flowers, growth, and renewal. Use spring-themed word problems, scenarios, and vocabulary where appropriate, but ensure the core educational content remains clear and effective. `;
            break;
        }
    }

    // Create the resource prompt
    systemPrompt += `Create a ${resourceType} about ${topic} that is appropriate for ${grade} students. `;

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
              systemPrompt += `Create a grade-appropriate passage about ${topic}. The passage should be engaging and suitable for ${grade} students. `;
              
              switch (readingFormat) {
                case 'comprehension':
                  systemPrompt += `Create a reading comprehension worksheet with a passage about ${topic}. The passage should demonstrate clear author's purpose and include exactly ${questionCount} questions focusing on main ideas, details, and inferences. The passage MUST be included in the response. Return the response in this exact JSON format: ${READING_COMPREHENSION_FORMAT}`;
                  break;
                case 'literary_analysis':
                  systemPrompt += `Create a literary analysis worksheet with a passage rich in literary elements. Include exactly ${questionCount} analysis questions. The passage MUST be included in the response. Return the response in this exact JSON format: ${READING_LITERARY_ANALYSIS_FORMAT}`;
                  break;
                case 'vocabulary_context':
                  systemPrompt += `Create a vocabulary-in-context worksheet with a passage containing target vocabulary words. Include exactly ${questionCount} vocabulary-focused questions. The passage MUST be included in the response. Return the response in this exact JSON format: ${READING_VOCABULARY_FORMAT}`;
                  break;
                default:
                  systemPrompt += `Create a reading comprehension worksheet with a passage about ${topic}. The passage should demonstrate clear author's purpose and include exactly ${questionCount} questions focusing on main ideas, details, and inferences. The passage MUST be included in the response. Return the response in this exact JSON format: ${READING_COMPREHENSION_FORMAT}`;
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
                if (questionCount === 0) {
                  systemPrompt += `Create a comprehensive explanation about ${topic}. Return the response in this exact JSON format:
{
  "title": "${topic} Study",
  "grade_level": "${grade}",
  "topic": "${topic}",
  "subject": "Science",
  "format": "science_context",
  "instructions": "Read through the content carefully. Pay attention to key concepts and their relationships. Take notes on important points.",
  "scienceContent": {
    "explanation": "Provide a thorough, grade-appropriate explanation that clearly defines and distinguishes the main concepts. Use clear, concise language that ${grade} students can understand.",
    "concepts": [
      "Detailed explanation of the first main concept, including its definition, characteristics, and how it works",
      "Comprehensive breakdown of the second main concept, including examples and real-world connections",
      "In-depth explanation of the third main concept, including its significance and relationship to other concepts"
    ],
    "applications": ["Provide specific, real-world examples and practical applications that demonstrate the importance and relevance of these concepts"],
    "key_terms": {
      "term1": "Clear, grade-appropriate definition with an example",
      "term2": "Clear, grade-appropriate definition with an example"
    }
  }
}`;
                } else {
                  systemPrompt += `Create a comprehensive explanation about ${topic} with ${questionCount} questions. Return the response in this exact JSON format:
{
  "title": "${topic} Study",
  "grade_level": "${grade}",
  "topic": "${topic}",
  "subject": "Science",
  "format": "science_context",
  "instructions": "Read through the content carefully before answering questions. Each question builds on the content provided. Support your answers with specific details from the text.",
  "scienceContent": {
    "explanation": "Provide a thorough, grade-appropriate explanation that clearly defines and distinguishes the main concepts. Use clear, concise language that ${grade} students can understand.",
    "concepts": [
      "Detailed explanation of the first main concept, including its definition, characteristics, and how it works. For example, if discussing weather vs. climate, explain how weather refers to short-term conditions (like today's temperature and rainfall) while climate describes long-term patterns (like average yearly rainfall and seasonal temperatures).",
      "Comprehensive breakdown of the second main concept, including examples and real-world connections. For example, when discussing factors influencing weather, explain how the sun heats the Earth unevenly, creating air pressure differences that lead to wind and weather patterns.",
      "In-depth explanation of the third main concept, including its significance and relationship to other concepts. For example, when discussing the importance of studying weather patterns, explain how meteorologists use this information to predict severe weather events and help communities prepare."
    ],
    "applications": [
      "Provide specific, real-world examples and practical applications that demonstrate the importance and relevance of these concepts. Include examples relevant to ${grade} students' daily lives."
    ],
    "key_terms": {
      "term1": "Clear, grade-appropriate definition with a concrete example that students can relate to",
      "term2": "Clear, grade-appropriate definition with a concrete example that students can relate to"
    }
  },
  "problems": [
    {
      "type": "topic_based",
      "question": "Question that tests understanding of one of the detailed concepts",
      "complexity": "grade-appropriate",
      "answer": "Clear, complete answer that references the detailed concept explanation",
      "explanation": "Detailed explanation that connects back to the concept and its real-world applications",
      "focus_area": "Specific concept being tested"
    }
  ]
}`;
                }
                break;
              case 'analysis_focus':
              case 'observation_analysis':
                if (questionCount === 0) {
                    systemPrompt += `Create a detailed analytical breakdown of ${topic}. For each section, provide comprehensive explanations that help ${grade} students deeply understand the topic. Return the response in this exact JSON format:
{
  "title": "${topic} Analysis",
  "grade_level": "${grade}",
  "topic": "${topic}",
  "subject": "Science",
  "format": "analysis_focus",
  "instructions": "Study each section carefully. Take time to understand how different aspects connect and influence each other. Consider real-world applications and implications.",
  "content": {
    "analysis_focus": "Provide a detailed explanation of the specific aspects to examine. Include: 1) Main concept breakdown, 2) Key relationships between components, 3) Critical factors to consider, 4) Methods of analysis appropriate for ${grade} level. This should be 3-4 paragraphs of clear, engaging explanation.",
    "implications": "Explain the broader impacts and applications in detail, including: 1) Real-world significance, 2) Future implications, 3) Societal impacts, 4) Personal relevance to students, 5) Connections to other scientific concepts. Provide concrete examples that ${grade} students can relate to.",
    "key_points": [
      "Essential concept 1 with detailed explanation and examples",
      "Essential concept 2 with real-world applications",
      "Essential concept 3 with connections to other topics",
      "Essential concept 4 focusing on practical understanding"
    ],
    "critical_aspects": "Detailed breakdown of crucial elements to consider, including: 1) Core principles, 2) Variable relationships, 3) Common misconceptions, 4) Special considerations. Each aspect should include examples and explanations.",
    "data_patterns": "Comprehensive explanation of observable patterns and trends, including: 1) What to look for, 2) How to identify patterns, 3) Why these patterns matter, 4) How to analyze them effectively."
  }
}`;
                } else {
                    systemPrompt += `Create a detailed analytical breakdown of ${topic} with ${questionCount} analytical questions. For each section, provide comprehensive explanations that help ${grade} students deeply understand the topic. Return the response in this exact JSON format:
{
  "title": "${topic} Analysis",
  "grade_level": "${grade}",
  "topic": "${topic}",
  "subject": "Science",
  "format": "analysis_focus",
  "instructions": "First, study each section carefully. Take time to understand how different aspects connect and influence each other. Then answer each question using evidence from the content provided.",
  "content": {
    "analysis_focus": "Provide a detailed explanation of the specific aspects to examine. Include: 1) Main concept breakdown, 2) Key relationships between components, 3) Critical factors to consider, 4) Methods of analysis appropriate for ${grade} level. This should be 3-4 paragraphs of clear, engaging explanation.",
    "implications": "Explain the broader impacts and applications in detail, including: 1) Real-world significance, 2) Future implications, 3) Societal impacts, 4) Personal relevance to students, 5) Connections to other scientific concepts. Provide concrete examples that ${grade} students can relate to.",
    "key_points": [
      "Essential concept 1 with detailed explanation and examples",
      "Essential concept 2 with real-world applications",
      "Essential concept 3 with connections to other topics",
      "Essential concept 4 focusing on practical understanding"
    ],
    "critical_aspects": "Detailed breakdown of crucial elements to consider, including: 1) Core principles, 2) Variable relationships, 3) Common misconceptions, 4) Special considerations. Each aspect should include examples and explanations.",
    "data_patterns": "Comprehensive explanation of observable patterns and trends, including: 1) What to look for, 2) How to identify patterns, 3) Why these patterns matter, 4) How to analyze them effectively."
  },
  "problems": [
    {
      "type": "analysis",
      "question": "Thought-provoking question about ${topic} that requires analysis of multiple aspects",
      "answer": "Detailed answer that demonstrates understanding of key concepts and their relationships",
      "explanation": "Comprehensive explanation that connects the answer to the content, real-world applications, and broader implications",
      "thinking_points": [
        "Specific aspect to consider when analyzing the problem",
        "Connection to real-world applications",
        "Relationship to key concepts",
        "Consideration of variables and patterns"
      ],
      "data_analysis": "Guidance on how to analyze relevant data or patterns for this specific question"
    }
  ]
}`;
                }
                break;
              default:
                systemPrompt += `Create a comprehensive explanation about ${topic}. Return the response in this exact JSON format:
{
  "title": "${topic} Overview",
  "grade_level": "${grade}",
  "topic": "${topic}",
  "subject": "Science",
  "format": "science_context",
  "instructions": "Read through the content carefully. Pay attention to key concepts and their relationships. Take notes on important points.",
  "content": {
    "introduction": "Provide a thorough explanation of ${topic}",
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
      case 'lesson_plan':
        systemPrompt += `Design a comprehensive lesson plan about ${topic} for ${grade} students. `;
            break;
          case 'mini_lesson':
        systemPrompt += `Design a focused 15-20 minute mini-lesson that targets a specific skill or concept. `;
            break;
          case 'activity':
        systemPrompt += `Design a standalone hands-on learning activity that can be completed in 20-30 minutes. `;
        break;
      case 'exit slip':
        let exitSlipFormat = '';
        switch (format) {
          case 'reflection_prompt':
            exitSlipFormat = `Create ${questionCount} reflection prompts following this structure. Return the response in this exact JSON format:
            {
              "title": "${topic} Exit Slip",
              "subject": "${subject}",
              "grade_level": "${grade}",
              "exit_slip_topic": "${topic}",
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
              "title": "${topic} Vocabulary Check",
              "subject": "${subject}",
              "grade_level": "${grade}",
              "exit_slip_topic": "${topic}",
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
              "title": "${topic} Skill Assessment",
              "subject": "${subject}",
              "grade_level": "${grade}",
              "exit_slip_topic": "${topic}",
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
              "title": "${topic} Exit Slip",
              "subject": "${subject}",
              "grade_level": "${grade}",
              "exit_slip_topic": "${topic}",
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
            content: `Generate a ${resourceType} about ${topic} following the exact JSON format specified above. You MUST generate EXACTLY ${questionCount} questions/problems - no more, no less. This is a strict requirement.`
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

      // Validate number of questions/problems if questionCount was specified
      if (typeof questionCount === 'number' && questionCount > 0) {
        const problems = parsedContent.problems || parsedContent.questions || [];
        
        // If we don't have the right number of questions, try to fix it
        if (problems.length !== questionCount) {
          // Log the mismatch but don't throw an error
          console.warn(`Generated ${problems.length} questions instead of the requested ${questionCount}. Adjusting response...`);
          
          // If we have too many questions, trim the excess
          if (problems.length > questionCount) {
            if (parsedContent.problems) {
              parsedContent.problems = problems.slice(0, questionCount);
            } else if (parsedContent.questions) {
              parsedContent.questions = problems.slice(0, questionCount);
            }
            console.log(`Trimmed excess questions to match requested count of ${questionCount}`);
          }
          // If we have too few questions, duplicate some existing ones
          else if (problems.length < questionCount) {
            const additional = [];
            for (let i = problems.length; i < questionCount; i++) {
              // Use modulo to cycle through existing problems
              const sourceProblem = problems[i % problems.length];
              // Create a variation of the problem
              const newProblem = {
                ...sourceProblem,
                question: sourceProblem.question ? 
                  `${sourceProblem.question} (variation ${Math.floor(i / problems.length) + 1})` :
                  sourceProblem.problem ? 
                    `${sourceProblem.problem} (variation ${Math.floor(i / problems.length) + 1})` :
                    `Question ${i + 1}`,
              };
              additional.push(newProblem);
            }
            
            if (parsedContent.problems) {
              parsedContent.problems = [...problems, ...additional];
            } else if (parsedContent.questions) {
              parsedContent.questions = [...problems, ...additional];
            }
            console.log(`Added ${additional.length} variations to match requested count of ${questionCount}`);
          }
        }
      }

      return parsedContent;
    }

    const generatedContent = await generateWithRetry();
    
    // Transform the response to match our expected format
    let transformedContent = generatedContent;
    
    if (format === 'science_context' && generatedContent.scienceContent) {
      transformedContent = {
        ...generatedContent,
        science_context: {
          topic: generatedContent.topic || '',
          explanation: generatedContent.scienceContent.explanation || '',
          key_concepts: generatedContent.scienceContent.concepts || [],
          key_terms: generatedContent.scienceContent.key_terms || {},
          applications: generatedContent.scienceContent.applications || [],
          problems: generatedContent.problems || []
        }
      };
      delete transformedContent.scienceContent;
    }

    return NextResponse.json(transformedContent);

  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to generate resource' },
      { status: 500 }
    );
  }
} 