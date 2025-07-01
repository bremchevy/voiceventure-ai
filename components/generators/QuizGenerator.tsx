import { useState, useEffect } from 'react';
import { BaseGeneratorProps, QuizSettings } from '@/lib/types/generator-types';
import { QuizResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';
import { getQuizDifficultyParams, getQuizPromptEnhancements } from '@/lib/services/AIContentGenerator/quiz-difficulty';

// Transform function to convert API response to required format
const transformQuizResponse = (apiResponse: any): QuizResource => {
  // Handle the new response format where content is wrapped in a "quiz" object
  const quizData = apiResponse.quiz || apiResponse;
  
  // Transform the questions format
  const transformedQuestions = quizData.questions.map((q: any) => {
    // Handle different question formats
    if (q.options) {
      // Multiple choice format
      return {
        type: "Multiple Choice",
        question: q.question,
        options: [q.options.a, q.options.b, q.options.c, q.options.d],
        correctAnswer: q.options[q.answer.toLowerCase()],
        explanation: `The correct answer is ${q.options[q.answer.toLowerCase()]}`,
        cognitiveLevel: "recall",
        points: 1
      };
    } else {
      // Short answer format
      return {
        type: "Short Answer",
        question: q.question,
        options: [],
        correctAnswer: q.answer,
        explanation: `The correct answer is ${q.answer}`,
        cognitiveLevel: "recall",
        points: 1
      };
    }
  });

  // Extract grade level from title
  const gradeLevelMatch = quizData.title.match(/(\d+)(st|nd|rd|th)\s+Grade/);
  const gradeLevel = gradeLevelMatch ? gradeLevelMatch[0] : settings.grade;

  // Construct the transformed response with all required fields
  return {
    title: quizData.title || "Quiz",
    subject: settings.subject || "General",
    gradeLevel: gradeLevel,
    topic: settings.topicArea || "General",
    estimatedTime: `${transformedQuestions.length * 2} minutes`,
    questions: transformedQuestions,
    totalPoints: transformedQuestions.length,
    instructions: "Answer each question to the best of your ability.",
    metadata: {
      complexityLevel: 5,
      languageLevel: 5,
      cognitiveDistribution: {
        recall: 0.6,
        comprehension: 0.3,
        application: 0.1,
        analysis: 0
      }
    }
  };
};

export function QuizGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<QuizSettings>(() => ({
    grade: request?.grade || "3rd Grade",
    subject: request?.subject || "Math",
    theme: request?.theme || "General",
    questionCount: 10,
    selectedQuestionTypes: ["Multiple Choice"],
    topicArea: request?.topicArea || "",
    resourceType: request?.resourceType || "quiz",
    format: request?.format || "multiple_choice"
  }));

  // Format options for different resource types
  const formatOptions = {
    quiz: [
      { 
        type: "Multiple Choice", 
        format: "multiple_choice",
        icon: "🔘", 
        desc: "Questions with four options (A, B, C, D)",
        examples: {
          Math: "What is 3/4 of 100?",
          Science: "Which state of matter takes the shape of its container?",
          Reading: "Choose the correct synonym for 'happy'"
        }
      },
      { 
        type: "True/False", 
        format: "true_false",
        icon: "⚖️", 
        desc: "Binary choice questions (True or False)",
        examples: {
          Math: "The sum of angles in a triangle is 180 degrees.",
          Science: "Plants can make their own food through photosynthesis.",
          Reading: "A verb is a word that describes a person, place, or thing."
        }
      },
      { 
        type: "Short Answer", 
        format: "short_answer",
        icon: "✏️", 
        desc: "Brief written responses with clear answers",
        examples: {
          Math: "What is the product of 8 and 7?",
          Science: "Name two types of simple machines.",
          Reading: "Write the past tense of the verb 'run'."
        }
      }
    ],
    worksheet: {
      Math: [
        {
          type: "Standard",
          format: "standard",
          icon: "📝",
          desc: "Traditional worksheet format with step-by-step solutions"
        },
        {
          type: "Guided Practice",
          format: "guided",
          icon: "🎯",
          desc: "Problems with hints and scaffolded learning"
        },
        {
          type: "Word Problems",
          format: "word_problems",
          icon: "💭",
          desc: "Real-world application problems"
        }
      ],
      Reading: [
        {
          type: "Comprehension",
          format: "comprehension",
          icon: "📚",
          desc: "Reading passages with questions"
        },
        {
          type: "Vocabulary",
          format: "vocabulary",
          icon: "📖",
          desc: "Word study and context clues"
        },
        {
          type: "Literary Analysis",
          format: "literary_analysis",
          icon: "🔍",
          desc: "Character, plot, and theme analysis"
        }
      ],
      Science: [
        {
          type: "Lab Worksheet",
          format: "lab",
          icon: "🧪",
          desc: "Scientific method and experiment documentation"
        },
        {
          type: "Observation",
          format: "observation",
          icon: "👁️",
          desc: "Data collection and analysis"
        },
        {
          type: "Concept Map",
          format: "concept_map",
          icon: "🌐",
          desc: "Visual connections between concepts"
        }
      ]
    },
    lesson_plan: [
      {
        type: "Standard",
        format: "standard",
        icon: "📋",
        desc: "Traditional lesson plan with objectives, activities, and assessment"
      },
      {
        type: "5E Model",
        format: "5e",
        icon: "🌟",
        desc: "Engage, Explore, Explain, Elaborate, Evaluate"
      },
      {
        type: "Project-Based",
        format: "project_based",
        icon: "🎨",
        desc: "Hands-on project-centered learning"
      },
      {
        type: "Differentiated",
        format: "differentiated",
        icon: "🎯",
        desc: "Multiple approaches for different learning styles"
      }
    ],
    rubric: [
      {
        type: "Standard",
        format: "standard",
        icon: "📊",
        desc: "Traditional 4-point scale with criteria"
      },
      {
        type: "Single Point",
        format: "single_point",
        icon: "⭐",
        desc: "Yes/No criteria checklist"
      },
      {
        type: "Holistic",
        format: "holistic",
        icon: "🎯",
        desc: "Overall performance assessment"
      },
      {
        type: "Analytic",
        format: "analytic",
        icon: "📈",
        desc: "Detailed criteria with specific scores"
      }
    ],
    exit_slip: [
      {
        type: "Multiple Choice",
        format: "multiple_choice",
        icon: "🔄",
        desc: "Quick check with multiple choice questions"
      },
      {
        type: "Open Response",
        format: "open_response",
        icon: "✍️",
        desc: "Written responses to reflect on learning"
      },
      {
        type: "Rating Scale",
        format: "rating_scale",
        icon: "⭐",
        desc: "Self-assessment using rating scales"
      },
      {
        type: "3-2-1",
        format: "three_two_one",
        icon: "🔢",
        desc: "3 things learned, 2 interesting points, 1 question"
      }
    ]
  };

  useEffect(() => {
    if (request) {
      setSettings(prev => ({
        ...prev,
        ...request,
        // Set default format based on resource type if not specified
        format: request.format || (
          request.resourceType === 'quiz' ? 'multiple_choice' :
          request.resourceType === 'worksheet' ? 'standard' :
          request.resourceType === 'exit_slip' ? 'multiple_choice' :
          prev.format
        )
      }));
    }
  }, [request]);

  const [difficultyParams, setDifficultyParams] = useState<any>(null);

  useEffect(() => {
    if (settings.resourceType === "quiz") {
      const params = getQuizDifficultyParams(settings.grade, settings.subject);
      setDifficultyParams(params);
    }
  }, [settings.grade, settings.subject, settings.resourceType]);

  const renderSpecificSettings = () => {
    let currentFormats;
    if (settings.resourceType === 'worksheet') {
      // For worksheets, show subject-specific formats
      currentFormats = formatOptions.worksheet[settings.subject as keyof typeof formatOptions.worksheet] || [];
    } else {
      // For other resource types, show general formats
      currentFormats = formatOptions[settings.resourceType as keyof typeof formatOptions] || [];
    }
    
    return (
      <div className="space-y-6">
        {/* Format Selection */}
    <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {settings.resourceType === 'quiz' ? 'Quiz Format' : 
             settings.resourceType === 'worksheet' ? `${settings.subject} Worksheet Format` : 
             settings.resourceType === 'exit_slip' ? 'Exit Slip Format' :
             settings.resourceType === 'lesson_plan' ? 'Lesson Plan Format' :
             settings.resourceType === 'rubric' ? 'Rubric Format' :
             'Format'}
          </label>
      <div className="space-y-2">
            {currentFormats.map((format) => (
          <button
            key={format.type}
            onClick={() => {
                  setSettings(prev => ({
                ...prev,
                    selectedQuestionTypes: [format.type],
                    format: format.format
              }));
            }}
            className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center justify-between ${
                  settings.format === format.format
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{format.icon}</span>
              <div>
                <div className="font-medium">{format.type}</div>
                <div className="text-xs text-gray-500">{format.desc}</div>
                    {settings.format === format.format && format.examples && (
                      <div className="mt-2 text-xs text-purple-600">
                        Example: {format.examples[settings.subject as keyof typeof format.examples]}
                      </div>
                    )}
              </div>
            </div>
                {settings.format === format.format && (
              <span className="text-purple-600">✓</span>
            )}
          </button>
        ))}
      </div>
        </div>

        {/* Question/Problem Count */}
        {(settings.resourceType === 'quiz' || settings.resourceType === 'worksheet' || settings.resourceType === 'exit_slip') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">
                {settings.resourceType === 'quiz' ? 'Number of Questions' : 
                 settings.resourceType === 'worksheet' ? 'Number of Problems' :
                 'Number of Questions'}
              </label>
              <span className="text-sm text-gray-500">{settings.questionCount}</span>
            </div>
            <input
              type="range"
              min={settings.resourceType === 'exit_slip' ? 1 : 5}
              max={settings.resourceType === 'exit_slip' ? 5 : 20}
              value={settings.questionCount}
              onChange={(e) => setSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
              className="w-full"
            />
            {settings.resourceType === 'quiz' && difficultyParams && (
              <p className="text-xs text-gray-500">
                Estimated time: {Math.round(settings.questionCount * difficultyParams.timePerQuestion)} minutes
              </p>
            )}
          </div>
      )}
    </div>
  );
  };

  return (
    <ResourceGenerator<QuizSettings, QuizResource>
      type={settings.resourceType}
      settings={settings}
      setSettings={setSettings}
      onBack={onBack}
      onComplete={onComplete}
      request={request}
      renderSpecificSettings={renderSpecificSettings}
      icon="🧠"
      title={`${settings.resourceType?.charAt(0).toUpperCase()}${settings.resourceType?.slice(1)} Generator`}
      transformResponse={transformQuizResponse}
    />
  );
} 