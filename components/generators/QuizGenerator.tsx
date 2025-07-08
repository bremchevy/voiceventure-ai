import { useState, useEffect } from 'react';
import { BaseGeneratorProps, QuizSettings, ResourceType, Format } from '@/lib/types/generator-types';
import { QuizResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';
import { getQuizDifficultyParams, getQuizPromptEnhancements } from '@/lib/services/AIContentGenerator/quiz-difficulty';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

// Transform function to convert API response to required format
const transformQuizResponse = (apiResponse: any, settings: QuizSettings): QuizResource => {
  // Handle the new response format where content is wrapped in a "quiz" object
  const quizData = apiResponse.quiz || apiResponse;
  
  // Transform the questions format
  const transformedQuestions = quizData.questions.map((q: any) => {
    // Handle different question formats
    if (q.options) {
      // Multiple choice format
      const options = Array.isArray(q.options) ? q.options : 
                     typeof q.options === 'object' ? [q.options.a, q.options.b, q.options.c, q.options.d] :
                     [];
      
      return {
        type: "multiple_choice",
        question: q.question,
        options: options,
        answer: q.answer || q.correctAnswer,
        correctAnswer: q.correctAnswer || q.answer,
        explanation: q.explanation || `The correct answer is ${q.correctAnswer || q.answer}`,
        cognitiveLevel: q.cognitiveLevel || "recall",
        points: q.points || 1
      };
    } else {
      // Short answer format
      return {
        type: "short_answer",
        question: q.question,
        options: [],
        answer: q.answer || q.correctAnswer,
        correctAnswer: q.correctAnswer || q.answer,
        explanation: q.explanation || `The correct answer is ${q.answer || q.correctAnswer}`,
        cognitiveLevel: q.cognitiveLevel || "recall",
        points: q.points || 1
      };
    }
  });

  return {
    resourceType: 'quiz',
    title: quizData.title || "Quiz",
    subject: quizData.subject || settings.subject || "General",
    grade_level: quizData.grade_level || settings.grade || "",
    topic: quizData.topic || settings.topicArea || "General",
    format: settings.format || "multiple_choice",
    estimatedTime: quizData.estimatedTime || `${transformedQuestions.length * 2} minutes`,
    questions: transformedQuestions,
    totalPoints: quizData.totalPoints || transformedQuestions.length,
    instructions: quizData.instructions || "Answer each question to the best of your ability.",
    metadata: {
      complexityLevel: quizData.metadata?.complexityLevel || 5,
      languageLevel: quizData.metadata?.languageLevel || 5,
      cognitiveDistribution: quizData.metadata?.cognitiveDistribution || {
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
    grade: typeof request === 'object' ? request?.grade || "" : "",
    subject: typeof request === 'object' ? request?.subject || "" : "",
    theme: (typeof request === 'object' ? request?.theme || "General" : "General") as "General" | "Halloween" | "Winter" | "Spring",
    questionCount: 10,
    selectedQuestionTypes: ["Multiple Choice"],
    topicArea: typeof request === 'object' ? request?.topicArea || "" : "",
    resourceType: typeof request === 'object' ? request?.resourceType || "quiz" : "quiz",
    format: typeof request === 'object' ? request?.format || "multiple_choice" : "multiple_choice"
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
      setSettings(prev => {
        if (typeof request === 'string') return prev;
        const reqObj = request as {
          grade?: string;
          subject?: string;
          theme?: "General" | "Halloween" | "Winter" | "Spring";
          topicArea?: string;
          resourceType?: ResourceType;
          format?: Format;
        };
        return {
        ...prev,
          ...reqObj,
        // Set default format based on resource type if not specified
          format: reqObj.format || (
            reqObj.resourceType === 'quiz' ? 'multiple_choice' as Format :
            reqObj.resourceType === 'worksheet' ? 'standard' as Format :
            reqObj.resourceType === 'exit_slip' ? 'reflection_prompt' as Format :
          prev.format
        )
        };
      });
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
    return (
      <div className="space-y-6">
        {/* Resource Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Resource Type</label>
          <div className="grid grid-cols-1 gap-3">
            {[
              { type: "worksheet" as const, icon: "📝", title: "Worksheet", desc: "Traditional practice with problems and answers" },
              { type: "quiz" as const, icon: "🧠", title: "Quiz", desc: "Assessment with various question types" },
              { type: "rubric" as const, icon: "📋", title: "Rubric", desc: "Evaluation criteria and scoring guide" },
              { type: "lesson_plan" as const, icon: "📚", title: "Lesson Plan", desc: "Structured teaching guide with objectives" },
              { type: "exit_slip" as const, icon: "🚪", title: "Exit Slip / Bell Ringer", desc: "Quick assessments for the beginning or end of class" }
            ].map((resType) => {
              const isDisabled = settings.resourceType !== resType.type;
              return (
                <div key={resType.type} className="relative">
                  <button
                    onClick={() => {
                      if (!isDisabled) {
                        setSettings((prev) => ({ 
                          ...prev, 
                          resourceType: resType.type,
                          format: resType.type === 'rubric' ? '4_point' : 'standard'
                        }));
                      }
                    }}
                    disabled={isDisabled}
                    className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center justify-between ${
                      settings.resourceType === resType.type
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : isDisabled
                        ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{resType.icon}</span>
                      <div>
                        <div className="font-medium">{resType.title}</div>
                        <div className="text-xs text-gray-500">{resType.desc}</div>
                      </div>
                    </div>
                    {settings.resourceType === resType.type && (
                      <span className="text-purple-600">✓</span>
                    )}
                  </button>
                  {isDisabled && (
                    <div className="absolute inset-0 bg-white opacity-50 rounded-lg pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Question Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Question Type</label>
          <div className="grid grid-cols-1 gap-3">
            {formatOptions.quiz.map((format) => (
              <button
                key={format.type}
                onClick={() => {
                  setSettings(prev => ({
                    ...prev,
                    selectedQuestionTypes: [format.type],
                    format: format.format as Format
                  }));
                }}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center justify-between ${
                  settings.selectedQuestionTypes.includes(format.type)
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{format.icon}</span>
                  <div>
                    <div className="font-medium">{format.type}</div>
                    <div className="text-xs text-gray-500">{format.desc}</div>
                    <div className="text-xs text-gray-400 mt-1 italic">
                      Example: {format.examples[settings.subject as keyof typeof format.examples]}
                    </div>
                  </div>
                </div>
                {settings.selectedQuestionTypes.includes(format.type) && (
                  <span className="text-purple-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Questions Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium text-gray-700">Number of Questions</Label>
            <span className="text-sm text-gray-500">{settings.questionCount}</span>
          </div>
          <Slider
            value={[settings.questionCount]}
            onValueChange={(value) => setSettings(prev => ({ ...prev, questionCount: value[0] }))}
            max={30}
            min={1}
            step={1}
            className="w-full"
          />
        </div>
      </div>
    );
  };

  return (
    <ResourceGenerator<QuizSettings, QuizResource>
      type={settings.resourceType || 'quiz'}
      settings={settings}
      setSettings={setSettings}
      onBack={onBack}
      onComplete={onComplete}
      request={request}
      renderSpecificSettings={renderSpecificSettings}
      icon="🧠"
      title={`${settings.resourceType?.charAt(0).toUpperCase()}${settings.resourceType?.slice(1)} Generator`}
    />
  );
} 