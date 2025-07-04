import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Edit, Store, CheckCircle, Sparkles, ArrowLeft, Check, Loader2 } from "lucide-react";
import { generatePDF } from "@/lib/utils/pdf";
import { toast } from "@/components/ui/use-toast";
import { BaseGeneratorProps, BaseGeneratorSettings, themeEmojis, suggestedTopics, isFormat1, isFormat2, isFormat3 } from '@/lib/types/generator-types';
import { Resource, WorksheetResource, QuizResource, LessonPlanResource } from '@/lib/types/resource';
import { generateWorksheetPDF } from '@/lib/utils/pdf-generator';

interface ResourceGeneratorProps<T extends BaseGeneratorSettings, R extends Resource> extends BaseGeneratorProps {
  type: string;
  settings: T;
  setSettings: (settings: T | ((prev: T) => T)) => void;
  renderSpecificSettings: () => JSX.Element;
  icon: string;
  title: string;
}

// BackArrow component for consistent navigation
const BackArrow = ({
  onBack,
  label = "Back",
  className = "",
}: { onBack: () => void; label?: string; className?: string }) => (
  <button
    onClick={onBack}
    className={`absolute top-4 left-4 z-10 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors ${className}`}
    aria-label={label}
  >
    <ChevronLeft className="w-5 h-5" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

// Add these type definitions at the top of the file
interface RubricLevel {
  score: string;
  description: string;
}

interface RubricCriterion {
  name: string;
  description: string;
  levels: RubricLevel[];
}

export function ResourceGenerator<T extends BaseGeneratorSettings, R extends Resource>({
  type,
  settings,
  setSettings,
  onBack,
  onComplete,
  request,
  renderSpecificSettings,
  icon,
  title,
}: ResourceGeneratorProps<T, R>) {
  const [currentStep, setCurrentStep] = useState("settings");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGenerationStep, setCurrentGenerationStep] = useState(0);
  const [generatedResource, setGeneratedResource] = useState<R | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resourceRef = useRef<HTMLDivElement>(null);

  // Extract readable text from request
  const getReadableRequest = (req: any): string => {
    if (!req) return '';
    
    if (typeof req === 'string') {
      try {
        // Check if it's a JSON string
        if (req.trim().startsWith('{') && req.trim().endsWith('}')) {
          const parsed = JSON.parse(req);
          return parsed.text || req;
        }
        return req;
      } catch {
        return req;
      }
    }
    
    // If it's already an object
    if (typeof req === 'object') {
      return req.text || req.topicArea || JSON.stringify(req);
    }
    
    return String(req);
  };

  const generationSteps = [
    { icon: "🔍", text: "Analyzing your request", completed: false },
    { icon: "⚡", text: "Generating content", completed: false },
    { icon: "🎨", text: "Adding educational elements", completed: false },
    { icon: "✨", text: "Finalizing design", completed: false },
  ];

  // Add function to update generation progress
  const updateGenerationProgress = (step: number, progress: number) => {
    setCurrentGenerationStep(step);
    setGenerationProgress(progress);
  };

  // Parse initial request if provided
  useEffect(() => {
    if (request) {
      // Request parsing logic here
      // This would be similar to the existing logic in worksheet-generator.tsx
      // but adapted for the specific resource type
    }
  }, [request]);

  const transformResponse = (response: any): R => {
    // Handle exit slip response
    if (type === 'exit_slip' || response.exit_slip_questions) {
      // Get questions from either questions array or reflection_prompts array
      const questions = response.questions || response.reflection_prompts || [];
      
      // Transform questions based on format
      const transformedQuestions = questions.map((q: any) => {
        switch (settings.format) {
          case 'reflection_prompt':
            return {
              type: 'reflection_prompt',
              mainQuestion: q.question || 'Reflect on your learning:',
              reflectionGuides: q.guides || [
                'What was the most important thing you learned?',
                'What questions do you still have?',
                'How can you apply this learning?'
              ],
              sentenceStarters: q.starters || [
                'I learned that...',
                'I wonder about...',
                'I can use this by...'
              ],
              notes: q.notes || 'Consider how this connects to previous learning.'
            };

          case 'vocabulary_check':
            return {
              type: 'vocabulary_check',
              term: q.term || q.question,
              definition: q.definition || q.answer,
              context: q.context || '',
              examples: q.examples || [],
              usagePrompt: q.usagePrompt || 'Use this term in a new sentence:',
              relationships: q.relationships || [], // Related terms or concepts
              visualCue: q.visualCue || '' // Optional image or symbol reference
            };

          case 'skill_assessment':
            return {
              type: 'skill_assessment',
              skillName: q.skillName || q.question,
              task: q.task || '',
              steps: q.steps || [],
              criteria: q.criteria || [],
              applicationContext: q.applicationContext || '',
              difficultyLevel: q.difficultyLevel || response.difficulty_level || 'Basic'
            };

          default:
            return q;
        }
      });

      const instructions = response.instructions || 
        (settings.format === 'reflection_prompt' ? 'Take a moment to reflect on today\'s learning. Use the prompts to guide your thinking and express your understanding.' :
         settings.format === 'vocabulary_check' ? 'Review and demonstrate your understanding of key terms from today\'s lesson.' :
         settings.format === 'skill_assessment' ? 'Show your mastery of today\'s skills by completing the following tasks.' :
         'Complete the following exit slip to demonstrate your understanding.');
      
      const exitSlipResource = {
        resourceType: 'exit_slip' as const,
        title: response.title || `${settings.subject} Exit Slip`,
        subject: settings.subject,
        grade_level: settings.grade,
        topic: settings.topicArea || response.exit_slip_topic,
        format: settings.format || 'reflection_prompt',
        questions: transformedQuestions,
        instructions,
        metadata: {
          timeEstimate: '5-10 minutes',
          focusArea: settings.topicArea || response.exit_slip_topic,
          learningObjectives: response.learningObjectives || [],
          assessmentType: 'formative'
        }
      };

      console.log('Transformed exit slip:', exitSlipResource);
      return exitSlipResource as unknown as R;
    }

    // Handle rubric response
    if (type === 'rubric') {
      let criteria = [];
      console.log('Raw response before transformation:', response);

      try {
        // Auto-generate criteria if no criteria in response
        if ((!response.ObjectCriteria || !Array.isArray(response.ObjectCriteria) || response.ObjectCriteria.length === 0) &&
            (!response.criteria || !Object.keys(response.criteria).length)) {
          
          // Default criteria based on common assessment areas
          const defaultCriteria = [
            {
              name: 'Content',
              description: `Understanding and presentation of ${settings.topicArea} content`,
              levels: [
                'Demonstrates comprehensive understanding and presents content with exceptional clarity and depth',
                'Shows good understanding and presents content clearly with some detail',
                'Demonstrates basic understanding with limited presentation of content',
                'Shows minimal understanding with unclear or incomplete content presentation'
              ]
            },
            {
              name: 'Organization',
              description: 'Structure and flow of the presentation',
              levels: [
                'Exceptionally well-organized with clear structure, logical flow, and effective transitions',
                'Well-organized with good structure and generally smooth transitions',
                'Basic organization present but structure or transitions need improvement',
                'Lacks clear organization, structure unclear or confusing'
              ]
            },
            {
              name: 'Critical Thinking',
              description: `Analysis and evaluation of ${settings.topicArea} concepts`,
              levels: [
                'Shows exceptional analytical skills with insightful evaluation and connections',
                'Demonstrates good analysis with clear evaluation and some connections',
                'Shows basic analysis with limited evaluation',
                'Minimal analysis or evaluation present'
              ]
            },
            {
              name: 'Communication',
              description: 'Clarity and effectiveness of communication',
              levels: [
                'Communicates ideas with exceptional clarity, precision, and engagement',
                'Communicates ideas clearly and effectively most of the time',
                'Communication is generally understandable but lacks consistency',
                'Communication is unclear or ineffective'
              ]
            }
          ];

          // Transform default criteria into expected format
          criteria = defaultCriteria.map(criterion => ({
            name: criterion.name,
            description: criterion.description,
            levels: criterion.levels.map((desc, index) => ({
              score: (4 - index).toString(),
              description: desc
            }))
          }));
        }
        // Handle existing criteria from response
        else if (response.ObjectCriteria && Array.isArray(response.ObjectCriteria)) {
          criteria = response.ObjectCriteria.map((criterion: any) => {
            // Handle both array formats for performance levels
            const performanceLevels = criterion.PerformanceLevels || criterion['Performance Levels'] || [];
            
            const levels = Array.isArray(performanceLevels) ? performanceLevels.map((level: any, index: number) => {
              // Handle object format with level, description, points
              if (typeof level === 'object' && level !== null) {
                return {
                  score: (level.points || level.level || (4 - index)).toString(),
                  description: level.description || level.level_description || 'No description available'
                };
              }
              // Handle string format
              return {
                score: (4 - index).toString(),
                description: level || 'No description available'
              };
            }) : [];
            
            return {
              name: criterion.Criterion || '',
              description: criterion.Description || '',
              levels: levels.sort((a, b) => Number(b.score) - Number(a.score))
            };
          });
        }
        else if (response.criteria && typeof response.criteria === 'object') {
          criteria = Object.entries(response.criteria).map(([name, data]: [string, any]) => {
            const levels = Object.entries(data.levels || {}).map(([score, description]) => ({
              score: score.toString(),
              description: description as string
            }));
            
            return {
        name,
        description: data.description || '',
              levels: levels.sort((a, b) => Number(b.score) - Number(a.score))
            };
          });
        }

        // Additional validation and cleanup
        criteria = criteria
          .filter((criterion: RubricCriterion) => 
            criterion.name && // Must have a name
            criterion.levels && 
            Array.isArray(criterion.levels) && 
            criterion.levels.length > 0 // Must have at least one level
          )
          .map((criterion: RubricCriterion) => ({
            ...criterion,
            description: criterion.description || `Criteria for ${criterion.name}`,
            levels: criterion.levels.map((level: RubricLevel) => ({
              ...level,
              description: level.description || 'No description available'
        }))
      }));

        console.log('Transformed criteria:', criteria);

        // Final validation
        if (!Array.isArray(criteria) || criteria.length === 0) {
          console.error('Criteria array is empty or invalid:', criteria);
          console.error('Original response:', response);
          throw new Error('No valid criteria found in the response');
        }

        const rubricResource = {
          resourceType: 'rubric' as const,
            title: response['Rubric Name'] || response.Rubric || response['Rubric Title'] || response.title || `${settings.topicArea} Rubric`,
          subject: settings.subject,
          grade_level: settings.grade,
          topic: settings.topicArea,
          format: settings.format || '4_point',
          criteria
        };

        console.log('Final transformed rubric:', rubricResource);
      return rubricResource as unknown as R;
      } catch (error) {
        console.error('Error transforming rubric response:', error);
        console.error('Raw response that caused error:', response);
        throw new Error('Failed to transform rubric response: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    // Check if this is a quiz response
    if (type === 'quiz' || response.quiz) {
      const quizData = response.quiz || response;
      
      // Transform the questions format
      const transformedQuestions = quizData.questions.map((q: any) => {
        // Convert options object to array if needed
        let optionsArray: string[] = [];
        if (q.options) {
          if (Array.isArray(q.options)) {
            optionsArray = q.options;
          } else if (typeof q.options === 'object') {
            // Handle options in object format (e.g., {a: "option1", b: "option2", ...})
            optionsArray = [
              q.options.a || q.options['1'] || '',
              q.options.b || q.options['2'] || '',
              q.options.c || q.options['3'] || '',
              q.options.d || q.options['4'] || ''
            ].filter(Boolean);
          }
        }

        // Handle different question formats
        if (q.type === 'multiple_choice' || optionsArray.length > 0 || q.answer?.match(/^[a-d]$/i)) {
          // Multiple choice format
          return {
            type: 'multiple_choice',
            question: q.question,
            options: optionsArray.length > 0 ? optionsArray : 
                    ['Option A', 'Option B', 'Option C', 'Option D'], // Default options if none provided
            correctAnswer: q.correct_answer || 
                         (q.answer && optionsArray[q.answer.toLowerCase().charCodeAt(0) - 97]) || 
                         q.answer,
            answer: q.answer || q.correct_answer,
            explanation: q.explanation || `The correct answer is ${q.correct_answer || q.answer}`,
            cognitiveLevel: q.cognitive_level || "recall",
            points: q.points || 1
          };
        } else if (q.answer === 'True' || q.answer === 'False' || q.type === 'true_false') {
          // True/False format
          return {
            type: 'true_false',
            question: q.question,
            options: ['True', 'False'],
            correctAnswer: q.answer || q.correct_answer,
            answer: q.answer || q.correct_answer,
            explanation: q.explanation || `The correct answer is ${q.answer || q.correct_answer}`,
            cognitiveLevel: q.cognitive_level || "recall",
            points: q.points || 1
          };
        } else {
          // Short answer format
          return {
            type: 'short_answer',
            question: q.question,
            options: [],
            correctAnswer: q.answer || q.correct_answer,
            answer: q.answer || q.correct_answer,
            explanation: q.explanation || `The correct answer is ${q.answer || q.correct_answer}`,
            cognitiveLevel: q.cognitive_level || "recall",
            points: q.points || 1
          };
        }
      });

      const quizResource: QuizResource = {
        resourceType: 'quiz',
        title: quizData.title || quizData.subject || "Quiz",
        subject: quizData.subject || settings.subject || "General",
        grade_level: quizData.grade_level || settings.grade || "",
        topic: settings.topicArea || "General",
        format: settings.format || "multiple_choice",
        questions: transformedQuestions,
        estimatedTime: quizData.estimated_time || `${transformedQuestions.length * 2} minutes`,
        totalPoints: quizData.total_points || transformedQuestions.length,
        instructions: quizData.instructions || "Answer each question to the best of your ability.",
        metadata: quizData.metadata || {
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

      return quizResource as R;
    }

    // Handle lesson plan response
    if (type === 'lesson plan' || (response.objectives && response.activities && response.assessment)) {
      console.log('Raw lesson plan response:', response);
      
      // Ensure we have a valid response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid lesson plan response format');
      }

      const lessonPlan: LessonPlanResource = {
        resourceType: 'lesson_plan',
        title: response.title || `${settings.topicArea} Lesson Plan`,
        grade_level: response.grade_level || settings.grade,
        subject: response.subject || settings.subject,
        topic: settings.topicArea,
        format: (settings as any).lessonType || 'full-lesson',
        duration: response.duration || (settings as any).lessonDuration || '45 minutes',
        objectives: Array.isArray(response.objectives) ? response.objectives : [],
        materials: Array.isArray(response.materials) ? response.materials : [],
        activities: {
          opening: {
            duration: response.activities?.opening?.duration || '10 minutes',
            description: response.activities?.opening?.description || '',
            teacher_actions: (response.activities?.opening?.teacher_actions || []).map((action: string) => action),
            student_actions: (response.activities?.opening?.student_actions || []).map((action: string) => action)
          },
          main: {
            duration: response.activities?.main?.duration || '25 minutes',
            description: response.activities?.main?.description || '',
            teacher_actions: (response.activities?.main?.teacher_actions || []).map((action: string) => action),
            student_actions: (response.activities?.main?.student_actions || []).map((action: string) => action)
          },
          closing: {
            duration: response.activities?.closing?.duration || '10 minutes',
            description: response.activities?.closing?.description || '',
            teacher_actions: (response.activities?.closing?.teacher_actions || []).map((action: string) => action),
            student_actions: (response.activities?.closing?.student_actions || []).map((action: string) => action)
          }
        },
        assessment: {
          formative: Array.isArray(response.assessment?.formative) ? response.assessment.formative : [],
          summative: Array.isArray(response.assessment?.summative) ? response.assessment.summative : []
        },
        differentiation: {
          struggling: Array.isArray(response.differentiation?.struggling) ? response.differentiation.struggling : [],
          advanced: Array.isArray(response.differentiation?.advanced) ? response.differentiation.advanced : []
        },
        extensions: Array.isArray(response.extensions) ? response.extensions : [],
        reflection_points: Array.isArray(response.reflection_points) ? response.reflection_points : []
      };
      return lessonPlan as R;
    }

    // Handle worksheet response
    // Get format-specific instructions
    let instructions = 'Write your answers in the spaces provided.';
    switch (response.format) {
      case 'comprehension':
        instructions = 'Read the passage carefully. Then, answer each question using evidence from the text to support your answers.';
        break;
      case 'literary_analysis':
        instructions = 'Analyze the passage focusing on the literary elements. Support your analysis with specific evidence from the text.';
        break;
      case 'vocabulary_context':
        instructions = 'Study each vocabulary word in context. Define the word, analyze its usage, and apply it in new contexts.';
        break;
      case 'lab_experiment':
        instructions = 'Follow the lab procedure carefully. Record your observations, collect data, and answer analysis questions.';
        break;
      case 'observation_analysis':
        instructions = 'Observe the phenomenon carefully. Record detailed observations and analyze the patterns you notice.';
        break;
      case 'concept_application':
        instructions = 'Apply the scientific concept to each scenario. Explain your reasoning and support it with evidence.';
        break;
      case 'guided':
        instructions = 'Follow the step-by-step guidance for each problem.';
        break;
      case 'interactive':
        instructions = 'Use the provided materials to solve each problem. Follow the activity instructions carefully.';
        break;
      default:
        if (response.subject === 'Math') {
          instructions = 'Solve each problem and include units in your answers where applicable.';
        } else {
          instructions = 'Write your answers in the spaces provided.';
        }
    }

    // Base transformation for worksheet
    const worksheetResource: WorksheetResource = {
      resourceType: 'worksheet',
      title: response.title || '',
      grade_level: response.grade_level || '',
      subject: response.subject || '',
      topic: response.topic || '',
      format: response.subject === 'Reading' ? (response.format === 'worksheet' ? 'comprehension' : response.format) : (response.format || 'standard'),
      instructions: response.instructions || instructions,
      problems: [],
      vocabulary: response.vocabulary || {}
    };

    // Handle passage for reading formats
    if (response.passage || response.subject === 'Reading') {
      worksheetResource.passage = {
        text: response.passage?.text || 'No passage provided',
        type: response.passage?.type || 'fiction',
        lexile_level: response.passage?.lexile_level || '',
        target_words: response.passage?.target_words || [],
        elements_focus: response.passage?.elements_focus || []
      };
    }

    // Handle science content-only format
    if (response.subject === 'Science' && response.content) {
      if (response.format === 'science_context' || response.format === 'lab_experiment') {
        worksheetResource.scienceContent = {
          explanation: response.content.introduction || '',
          concepts: [
            response.content.main_components || '',
            response.content.importance || '',
            response.content.causes_effects || ''
          ].filter(Boolean),
          applications: [response.content.additional_info || ''].filter(Boolean),
          key_terms: response.key_terms || {}
        };
      } else if (response.format === 'analysis_focus' || response.format === 'observation_analysis') {
        worksheetResource.scienceContent = {
          explanation: response.content.key_points?.join('\n\n') || '',
          concepts: [
            response.content.analysis_focus || '',
            response.content.data_patterns || '',
            response.content.critical_aspects || ''
          ].filter(Boolean),
          applications: [response.content.implications || ''].filter(Boolean),
          key_terms: response.key_terms || {}
        };
      }
    }

    // Handle different problem formats
    if (response.problems) {
      switch (response.format) {
        case 'comprehension':
          worksheetResource.comprehensionProblems = response.problems.map((p: any) => ({
            type: p.type || 'main_idea',
            question: p.question || '',
            answer: p.answer || '',
            evidence_prompt: p.evidence_prompt || '',
            skill_focus: p.skill_focus || ''
          }));
          break;

        case 'vocabulary_context':
          worksheetResource.vocabularyProblems = response.problems.map((p: any) => ({
            word: p.word || '',
            context: p.context || '',
            definition: p.definition || '',
            questions: p.questions || [],
            application: p.application || ''
          }));
          break;

        case 'lab_experiment':
          // Only set science content if not already set
          if (!worksheetResource.scienceContent) {
            worksheetResource.scienceContent = {
              explanation: response.content?.introduction || '',
              concepts: [
                response.content?.main_components || '',
                response.content?.importance || '',
                response.content?.causes_effects || ''
              ].filter(Boolean),
              applications: [response.content?.additional_info || ''].filter(Boolean),
              key_terms: response.key_terms || {}
            };
          }
          // Handle the questions
          worksheetResource.problems = response.problems.map((p: any) => ({
            type: p.type || 'topic_based',
            question: p.question || '',
            complexity: p.complexity || 'intermediate',
            answer: p.answer || '',
            explanation: p.explanation || '',
            focus_area: p.focus_area || ''
          }));
          break;

        case 'observation_analysis':
          // Only set science content if not already set
          if (!worksheetResource.scienceContent) {
            worksheetResource.scienceContent = {
              explanation: response.content?.key_points?.join('\n\n') || '',
              concepts: [
                response.content?.analysis_focus || '',
                response.content?.data_patterns || '',
                response.content?.critical_aspects || ''
              ].filter(Boolean),
              applications: [response.content?.implications || ''].filter(Boolean),
              key_terms: response.key_terms || {}
            };
          }
          worksheetResource.problems = response.problems.map((p: any) => ({
            type: p.type || 'analysis',
            question: p.question || '',
            scenario: p.scenario || '',
            thinking_points: p.thinking_points || [],
            expected_analysis: p.expected_analysis || '',
            complexity: p.complexity || 'intermediate'
          }));
          break;

        default:
          // Handle standard problems
          worksheetResource.problems = response.problems.map((p: any) => ({
            type: p.type || 'standard',
            question: p.problem || p.question || '',
            answer: p.answer || '',
            explanation: p.explanation || '',
            steps: p.steps || [],
            hints: p.hints || [],
            visuals: p.visuals || []
          }));
      }
    }

    return worksheetResource as R;
  };

  const generateResource = async () => {
    try {
      setCurrentStep("generating");

      // Step 1: Analyzing request
      updateGenerationProgress(0, 25);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const requestPayload = {
        subject: settings.subject,
        gradeLevel: settings.grade,
        resourceType: type.replace('_', ' '),
        theme: settings.theme,
        difficulty: ('difficulty' in settings) ? settings.difficulty : undefined,
        topicArea: settings.topicArea,
        includeVocabulary: ('includeVocabulary' in settings) ? settings.includeVocabulary : false,
        questionCount: ('problemCount' in settings) ? settings.problemCount : (settings.questionCount || 10),
        customInstructions: settings.customInstructions || '',
        selectedQuestionTypes: settings.selectedQuestionTypes,
        format: settings.format
      };

      console.log('Sending request with payload:', requestPayload);
      
      const response = await fetch(`${window.location.origin}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Server response:', errorData);
        throw new Error(`Server error: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
      }

      // Step 2: Generating content
      updateGenerationProgress(1, 50);
      await new Promise(resolve => setTimeout(resolve, 1000));

      let content;
      try {
        content = await response.text();
        const rawResponse = JSON.parse(content);
        console.log('Raw API response:', rawResponse);

        // Transform the response into our expected format
        const transformedResponse = transformResponse(rawResponse);
        console.log('Transformed response:', transformedResponse);

        // Validate the transformed response based on resource type
        if (type === 'quiz') {
          const quizResponse = transformedResponse as QuizResource;
          if (!quizResponse.title || !quizResponse.questions || !quizResponse.questions.length) {
            console.error('Missing required fields in transformed quiz response:', transformedResponse);
            throw new Error('Generated quiz missing required fields after transformation');
          }
        } else if (type === 'rubric') {
          const rubricResponse = transformedResponse as any;
          if (!rubricResponse.title || !rubricResponse.criteria) {
            console.error('Missing required fields in transformed rubric response:', transformedResponse);
            throw new Error('Generated rubric missing required fields after transformation');
          }
          // Check if criteria is an array and has at least one item
          if (!Array.isArray(rubricResponse.criteria) || rubricResponse.criteria.length === 0) {
            console.error('Invalid or empty criteria in rubric response:', transformedResponse);
            throw new Error('Generated rubric has no criteria');
          }
        } else if (type === 'worksheet') {
          const worksheetResponse = transformedResponse as WorksheetResource;
          if (!worksheetResponse.title || !worksheetResponse.subject || !worksheetResponse.grade_level) {
            console.error('Missing required fields in transformed worksheet response:', transformedResponse);
            throw new Error('Generated worksheet missing required fields after transformation');
          }
        } else if (type === 'lesson_plan') {
          const lessonPlanResponse = transformedResponse as LessonPlanResource;
          if (!lessonPlanResponse.objectives || !lessonPlanResponse.materials || !lessonPlanResponse.activities) {
            console.error('Missing required fields in transformed lesson plan response:', transformedResponse);
            throw new Error('Generated lesson plan missing required fields after transformation');
          }
          // Check if activities has opening and closing sections
          if (!lessonPlanResponse.activities.opening || !lessonPlanResponse.activities.closing) {
            console.error('Invalid activities structure in lesson plan response:', transformedResponse);
            throw new Error('Generated lesson plan has invalid activities structure');
          }
        }
        
        // Step 4: Finalizing
        updateGenerationProgress(3, 90);
        await new Promise(resolve => setTimeout(resolve, 1000));

        setGeneratedResource(transformedResponse);
        
        setGenerationProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCurrentStep("preview");
      } catch (parseError) {
        console.error('Error parsing or transforming response:', parseError);
        console.error('Raw content:', content);
        throw new Error('Failed to process server response');
      }
    } catch (error) {
      console.error('Error generating resource:', error);
      setCurrentStep("settings");
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedResource) return;

    try {
      setIsLoading(true);
      
      // Debug logging
      console.log('Resource data being sent to PDF generation:', generatedResource);
      
      // Call the PDF generation API
      const response = await fetch('/api/generate/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generatedResource),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Debug logging
      console.log('PDF generation response status:', response.status);

      // Get the PDF blob from the response
      const pdfBlob = await response.blob();
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generatedResource.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PDF downloaded successfully!",
        variant: "default"
      });
    } catch (error) {
      console.error('Error in PDF generation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resourceTypes = [
    { type: "worksheet", icon: "📝", desc: "Practice problems and exercises" },
    { type: "quiz", icon: "🧠", desc: "Assessment questions with scoring" },
    { type: "rubric", icon: "📊", desc: "Evaluation criteria and scoring guide" },
    { type: "lesson_plan", icon: "📚", desc: "Detailed teaching plan and activities" },
    { type: "exit_slip", icon: "🎯", desc: "Quick end-of-lesson assessment" }
  ];

  const renderSettings = () => (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="p-0 h-auto">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{icon} {title}</h1>
          <p className="text-sm text-gray-600">Create customized educational resources</p>
        </div>
      </div>

      {/* Initial Request Display */}
      {request && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">I heard you say:</span>
          </div>
          <p className="text-sm text-purple-700 font-medium">"{getReadableRequest(request)}"</p>
          <div className="mt-2 text-xs text-purple-600">
            <p>I've set up your {type} based on this request. You can adjust any settings below.</p>
          </div>
        </div>
      )}

      {/* Grade Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Grade Level</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            "Kindergarten",
            "1st Grade",
            "2nd Grade", 
            "3rd Grade",
            "4th Grade",
            "5th Grade",
            "6th Grade",
            "7th Grade",
            "8th Grade",
            "9th Grade",
            "10th Grade",
            "11th Grade",
            "12th Grade"
          ].map((grade) => (
            <button
              key={grade}
              onClick={() => setSettings((prev) => ({ ...prev, grade }))}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                settings.grade === grade
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Subject</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            "Math",
            "Reading",
            "Science"
          ].map((subject) => (
            <button
              key={subject}
              onClick={() => setSettings((prev) => ({ ...prev, subject }))}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                settings.subject === subject
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Halloween", emoji: "🎃" },
            { name: "Winter", emoji: "❄️" },
            { name: "Spring", emoji: "🌸" },
            { name: "General", emoji: "⭐" },
          ].map((theme) => (
            <button
              key={theme.name}
              onClick={() => setSettings((prev) => ({ ...prev, theme: theme.name as T['theme'] }))}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 ${
                settings.theme === theme.name
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-lg">{theme.emoji}</span>
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      {/* Resource-specific settings */}
      {renderSpecificSettings()}

      {/* Topic Area Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 required-field">
          Topic Area
          <span className="text-xs text-gray-500 ml-2">(What specific topic would you like to cover?)</span>
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={settings.topicArea}
            onChange={(e) => setSettings((prev) => ({ ...prev, topicArea: e.target.value }))}
            placeholder="e.g., Water Cycle, Fractions, Character Traits..."
            className={`w-full p-3 rounded-lg border-2 ${
              !settings.topicArea.trim() ? 'border-red-200' : 'border-gray-200'
            } text-sm focus:border-purple-500 focus:outline-none`}
            required
          />
          {!settings.topicArea.trim() && (
            <p className="text-sm text-red-500 mt-1">Please select or enter a topic area</p>
          )}
          <div className="flex flex-wrap gap-2">
            {suggestedTopics[settings.subject]?.[type]?.map((topic, index) => (
              <button
                key={index}
                onClick={() => setSettings(prev => ({ ...prev, topicArea: topic }))}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  settings.topicArea === topic
                    ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                    : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Instructions Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Custom Instructions
          <span className="text-xs text-gray-500 ml-2">(Optional - any specific requirements)</span>
        </label>
        <textarea
          value={settings.customInstructions || ""}
          onChange={(e) => setSettings((prev) => ({ ...prev, customInstructions: e.target.value }))}
          placeholder="Add any specific requirements, topics, or instructions..."
          className="w-full p-3 rounded-lg border-2 border-gray-200 text-sm resize-none focus:border-purple-500 focus:outline-none"
          rows={3}
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={generateResource}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg font-semibold"
        size="lg"
      >
        ✨ Generate {type.charAt(0).toUpperCase() + type.slice(1)}
      </Button>
    </div>
  );

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 relative">
      {/* Back Arrow */}
      <BackArrow onBack={() => setCurrentStep("settings")} label="Cancel" className="text-gray-500" />

      {/* Orbital Animation */}
      <div className="relative w-32 h-32">
        {/* Center circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Orbiting dots */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`absolute w-3 h-3 rounded-full transition-all duration-500 ${
              i <= currentGenerationStep ? 'bg-purple-400' : 'bg-gray-300'
            }`}
            style={{
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-40px)`,
              animation: `orbit 2s linear infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Progress Steps */}
      <div className="w-full max-w-sm space-y-4">
        {generationSteps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              index < currentGenerationStep
                ? "bg-green-50 border border-green-200"
                : index === currentGenerationStep
                  ? "bg-purple-50 border border-purple-200 animate-pulse"
                  : "bg-gray-50 border border-gray-200"
            }`}
          >
            <div
              className={`text-lg ${
                index < currentGenerationStep
                  ? "text-green-600"
                  : index === currentGenerationStep
                    ? "text-purple-600"
                    : "text-gray-400"
              }`}
            >
              {index < currentGenerationStep ? "✅" : step.icon}
            </div>
            <span
              className={`text-sm font-medium ${
                index < currentGenerationStep
                  ? "text-green-800"
                  : index === currentGenerationStep
                    ? "text-purple-800"
                    : "text-gray-600"
              }`}
            >
              {step.text}
            </span>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Generating...</span>
          <span>{Math.round(generationProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
      </div>

      {/* Educational Tip */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600">💡</span>
          <span className="text-sm font-medium text-blue-800">Did you know?</span>
        </div>
        <p className="text-sm text-blue-700">
          AI-generated resources save teachers 2 hours per item and increase student engagement by 40%!
        </p>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!generatedResource) return null;

    return (
      <div className="space-y-6 relative">
        {/* Header with Back Button */}
        <div className="flex items-start justify-between mb-6 pt-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep("settings")} className="p-0 h-auto">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">📄 Resource Preview</h1>
              <p className="text-sm text-gray-600">Review your {type === 'exit_slip' ? 'Exit Slip' : type.replace('_', ' ')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentStep("settings")}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        {/* Resource Preview */}
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto" ref={resourceRef}>
          {/* Title */}
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl font-bold">{generatedResource.title}</h2>
            <div className="text-gray-600">
              <div>{generatedResource.subject}</div>
              <div>{generatedResource.grade_level}</div>
            </div>
          </div>

          {/* Instructions */}
          {generatedResource.instructions && (
            <div className="space-y-2 mb-6">
              <h3 className="font-semibold">Instructions:</h3>
              <p>{generatedResource.instructions}</p>
            </div>
          )}

          {/* Exit Slip Content */}
          {type === 'exit_slip' && (
            <div className="space-y-6">
              {/* Format Header */}
              <div className="flex items-center gap-2 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <span className="text-2xl">
                  {settings.format === 'reflection_prompt' ? '💭' :
                   settings.format === 'vocabulary_check' ? '📚' :
                   settings.format === 'skill_assessment' ? '🎯' : '✏️'}
                </span>
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {settings.format === 'reflection_prompt' ? 'Reflection Exit Slip' :
                     settings.format === 'vocabulary_check' ? 'Vocabulary Check' :
                     settings.format === 'skill_assessment' ? 'Skill Assessment' : 'Exit Slip'}
                  </h3>
                  <p className="text-sm text-blue-700">{generatedResource.instructions}</p>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-6">
                {generatedResource.questions?.map((question: any, index: number) => (
                  <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                    {question.type === 'reflection_prompt' && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <span>💭</span> {question.mainQuestion}
                        </h4>
                        {question.reflectionGuides && (
                          <div className="space-y-2">
                            <p className="font-medium text-sm text-gray-700">Consider these points:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              {question.reflectionGuides.map((guide: string, i: number) => (
                                <li key={i} className="text-gray-600">{guide}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {question.sentenceStarters && (
                          <div className="space-y-2">
                            <p className="font-medium text-sm text-gray-700">Sentence Starters:</p>
                            <ul className="list-none space-y-2">
                              {question.sentenceStarters.map((starter: string, i: number) => (
                                <li key={i} className="pl-5 border-b border-dotted border-gray-300 pb-2">
                                  {starter} _____________________
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {question.notes && (
                          <div className="mt-3 text-sm text-gray-500 italic">
                            Note: {question.notes}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {question.type === 'vocabulary_check' && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <span>📚</span> {question.term}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium text-sm text-gray-700">Definition:</p>
                            <p className="pl-4 text-gray-600">{question.definition}</p>
                          </div>
                          {question.context && (
                            <div>
                              <p className="font-medium text-sm text-gray-700">Context:</p>
                              <p className="pl-4 text-gray-600">{question.context}</p>
                            </div>
                          )}
                          {question.examples && question.examples.length > 0 && (
                            <div>
                              <p className="font-medium text-sm text-gray-700">Examples:</p>
                              <ul className="list-disc pl-8">
                                {question.examples.map((example: string, i: number) => (
                                  <li key={i} className="text-gray-600">{example}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {question.usagePrompt && (
                            <div className="mt-3">
                              <p className="font-medium text-sm text-gray-700">{question.usagePrompt}</p>
                              <div className="pl-4 mt-2 border-b border-dotted border-gray-300">
                                ________________________________________________
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {question.type === 'skill_assessment' && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <span>🎯</span> {question.skillName}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium text-sm text-gray-700">Task:</p>
                            <p className="pl-4 text-gray-600">{question.task}</p>
                          </div>
                          {question.steps && question.steps.length > 0 && (
                            <div>
                              <p className="font-medium text-sm text-gray-700">Steps:</p>
                              <ol className="list-decimal pl-8">
                                {question.steps.map((step: string, i: number) => (
                                  <li key={i} className="text-gray-600">{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {question.criteria && question.criteria.length > 0 && (
                            <div>
                              <p className="font-medium text-sm text-gray-700">Success Criteria:</p>
                              <ul className="list-none pl-4">
                                {question.criteria.map((criterion: string, i: number) => (
                                  <li key={i} className="text-gray-600 flex items-center gap-2">
                                    <input type="checkbox" className="form-checkbox h-4 w-4 text-purple-600" />
                                    {criterion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {question.applicationContext && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md">
                              <p className="font-medium text-sm text-gray-700">Real-world Application:</p>
                              <p className="text-gray-600">{question.applicationContext}</p>
                            </div>
                          )}
                          {question.difficultyLevel && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium text-gray-700">Difficulty: </span>
                              <span className={`px-2 py-1 rounded ${
                                question.difficultyLevel === 'Basic' ? 'bg-green-100 text-green-700' :
                                question.difficultyLevel === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {question.difficultyLevel}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz Questions */}
          {type === 'quiz' && (generatedResource as QuizResource).questions && (
            <div className="space-y-6">
              {(generatedResource as QuizResource).questions.map((question, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="font-medium">
                    {index + 1}. {question.question}
                  </div>
                  
                  {/* Multiple Choice Options */}
                  {question.type === 'multiple_choice' && (
                    <div className="pl-6 space-y-2">
                      {['A', 'B', 'C', 'D'].map((letter, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm">
                            {letter}
                          </div>
                          <span>{question.options?.[optIndex] || `Option ${letter}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* True/False Options */}
                  {question.type === 'true_false' && (
                    <div className="pl-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm">
                          T
                        </div>
                        <span>True</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm">
                          F
                        </div>
                        <span>False</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Short Answer Space */}
                  {question.type === 'short_answer' && (
                    <div className="pl-6">
                      <div className="border-b-2 border-gray-300 h-8 w-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Rubric Content */}
          {type === 'rubric' && (
            <div className="space-y-4">
              {/* Rubric Format Header */}
              <div className="flex items-center gap-2 mb-4 bg-purple-50 p-4 rounded-lg border border-purple-100">
                <span className="text-2xl">{
                  settings.format === 'checklist' ? '✅' :
                  settings.format === '3_point' ? '🎯' : '📊'
                }</span>
                <div>
                  <h3 className="font-semibold text-purple-900">
                    {settings.format === 'checklist' ? 'Checklist Format' :
                     settings.format === '3_point' ? '3-Point Scale' : '4-Point Scale'}
                  </h3>
                  <p className="text-sm text-purple-700">
                    {settings.format === 'checklist' ? 'Yes/No Criteria' :
                     settings.format === '3_point' ? 'Exceeds, Meets, Below Expectations' :
                     'Excellent, Good, Satisfactory, Needs Improvement'}
                  </p>
                </div>
              </div>

              {(generatedResource as any).criteria?.map((criterion: any, index: number) => (
                <div key={index} className="mb-6 bg-white rounded-lg overflow-hidden border border-gray-200">
                  {/* Criterion header */}
                  <div className="bg-gray-50 p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">{criterion.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
                  </div>
                  {/* Performance levels stacked vertically */}
                  <div className="divide-y divide-gray-100">
                    {settings.format === 'checklist' ? (
                      // Checklist Format
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border-2 border-gray-300"></div>
                          <div className="text-gray-700">Yes/Complete</div>
                        </div>
                        <div className="mt-2 text-gray-600 pl-11">
                          {criterion.levels[0]?.description || 'Criteria met successfully'}
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                          <div className="w-8 h-8 rounded-lg border-2 border-gray-300"></div>
                          <div className="text-gray-700">No/Incomplete</div>
                        </div>
                        <div className="mt-2 text-gray-600 pl-11">
                          {criterion.levels[1]?.description || 'Criteria not met'}
                        </div>
                      </div>
                    ) : settings.format === '3_point' ? (
                      // 3-Point Scale
                      ['Exceeds', 'Meets', 'Below'].map((label, idx) => (
                        <div key={idx} className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="font-semibold text-purple-700">{3 - idx}</span>
                            </div>
                            <div className="font-medium text-gray-700">{label} Expectations</div>
                          </div>
                          <div className="text-gray-600 pl-10">
                            {criterion.levels.find((l: any) => l.score === (3 - idx).toString())?.description || 
                             <span className="text-gray-400 italic">No description available</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      // 4-Point Scale
                      ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'].map((label, idx) => (
                        <div key={idx} className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="font-semibold text-purple-700">{4 - idx}</span>
                            </div>
                            <div className="font-medium text-gray-700">{label}</div>
                          </div>
                          <div className="text-gray-600 pl-10">
                            {criterion.levels.find((l: any) => l.score === (4 - idx).toString())?.description || 
                             <span className="text-gray-400 italic">No description available</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Worksheet Content */}
          {type === 'worksheet' && (
            <>
              {/* Display passage for reading formats */}
              {(generatedResource as WorksheetResource).passage?.text && (
                <div className="space-y-2 border-l-4 border-purple-500 pl-4 my-6 bg-gray-50 p-4 rounded-r-lg">
                  <h3 className="font-semibold">Text:</h3>
                  <p className="whitespace-pre-wrap text-gray-800">{(generatedResource as WorksheetResource).passage?.text}</p>
                </div>
              )}

              {/* Display science content */}
              {(generatedResource as WorksheetResource).scienceContent && (
                <div className="space-y-2 border-l-4 border-purple-500 pl-4 my-6 bg-gray-50 p-4 rounded-r-lg">
                  <h3 className="font-semibold">Content:</h3>
                  <div className="space-y-4">
                    <p className="whitespace-pre-wrap text-gray-800">{(generatedResource as WorksheetResource).scienceContent?.explanation ?? ''}</p>
                    {((generatedResource as WorksheetResource).scienceContent?.concepts ?? []).length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-700">Key Concepts:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-gray-600">
                          {(generatedResource as WorksheetResource).scienceContent?.concepts?.map((concept, idx) => (
                            <li key={idx}>{concept}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Worksheet Problems section */}
              {(generatedResource as WorksheetResource)?.problems && (generatedResource as WorksheetResource).problems.length > 0 && (
                <>
                  {/* Format Header */}
                  <div className="flex items-center gap-2 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <span className="text-2xl">
                      {settings.format === 'guided' ? '📖' : '📝'}
                    </span>
                    <div>
                      <h3 className="font-semibold text-blue-900">
                        {settings.format === 'guided' ? 'Guided Practice' : 'Standard Practice'}
                      </h3>
                      <p className="text-sm text-blue-700">
                        {settings.format === 'guided' ? 'Step-by-step problem solving with hints' : 
                         'Traditional worksheet with problems and answer spaces'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {(generatedResource as WorksheetResource).problems.map((problem, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {/* Problem Header */}
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">Problem {index + 1}</span>
                            {(problem as any).complexity && (
                              <span className="text-sm text-gray-600">
                                Complexity: {(problem as any).complexity}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Problem Content */}
                        <div className="p-4">
                          {settings.format === 'guided' ? (
                            // Guided Practice Format
                            <div className="space-y-4">
                              <div className="font-medium text-gray-800">{problem.question}</div>
                              {problem.steps && problem.steps.length > 0 && (
                                <div className="space-y-3 mt-4">
                                  {problem.steps.map((step: string, stepIdx: number) => (
                                    <div key={stepIdx} className="flex gap-3">
                                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-sm text-blue-700">{stepIdx + 1}</span>
                                      </div>
                                      <div>
                                        <p className="text-gray-700">{step}</p>
                                        <div className="mt-2 border-b-2 border-gray-200 h-8"></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {problem.hints && problem.hints.length > 0 && (
                                <div className="mt-4 bg-yellow-50 p-3 rounded-lg">
                                  <div className="font-medium text-yellow-800 mb-2">💡 Helpful Hints:</div>
                                  <ul className="list-disc list-inside space-y-1">
                                    {problem.hints.map((hint: string, hintIdx: number) => (
                                      <li key={hintIdx} className="text-sm text-yellow-700">{hint}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Standard Format
                            <div className="border rounded-lg p-4 bg-white">
                              <div className="font-medium text-gray-800 mb-4">{problem.question}</div>
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-700 mb-2">Answer:</div>
                                {/* Single line for response */}
                                <div className="py-2">
                                  <div className="h-6 border-b border-gray-300"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Comprehension Problems section */}
              {(generatedResource as WorksheetResource).comprehensionProblems?.map((problem, index) => (
                    <div key={index} className="space-y-3">
                      <div className="font-medium">{(index + 1)}. {problem.question.replace(/^\d+\.\s*/, '')}</div>
                      {problem.evidence_prompt && (
                        <div className="text-sm text-gray-600 italic pl-4 mb-2">
                          {problem.evidence_prompt}
                        </div>
                      )}
                      <div className="pl-4">
                        <div className="border-b-2 border-gray-300 h-16 w-full" />
                      </div>
                    </div>
                  ))}

              {/* Literary Analysis Problems section */}
              {(generatedResource as WorksheetResource).literaryAnalysisProblems?.map((problem, index) => (
                    <div key={index} className="space-y-3">
                      <div className="font-medium">{(index + 1)}. Analyze: {problem.element}</div>
                      <div>{problem.question}</div>
                      <div className="pl-4">
                        <div className="border-b-2 border-gray-300 h-16 w-full" />
                      </div>
                    </div>
                  ))}

              {/* Vocabulary Problems section */}
              {(generatedResource as WorksheetResource).vocabularyProblems?.map((problem, index) => (
                    <div key={index} className="space-y-3 border p-4 rounded-lg">
                      <div className="font-semibold text-lg">{problem.word}</div>
                      <div className="text-gray-600">Context: "{problem.context}"</div>
                      <div>Definition: {problem.definition}</div>
                          </div>
                        ))}
            </>
          )}

          {/* Lesson Plan Content */}
          {type === 'lesson_plan' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Duration and Objectives */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">⏱️</span>
                  <div className="font-semibold text-blue-900">{(generatedResource as LessonPlanResource).duration}</div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-blue-900">Learning Objectives:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(generatedResource as LessonPlanResource).objectives.map((objective, idx) => (
                      <li key={idx} className="text-blue-700">{objective}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Materials */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-2">Materials Needed:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {(generatedResource as LessonPlanResource).materials.map((material, idx) => (
                    <li key={idx} className="text-gray-700">{material}</li>
                  ))}
                </ul>
              </div>

              {/* Activities */}
              <div className="space-y-4">
                {/* Opening */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-green-50 p-4 border-b border-green-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-green-900">Opening Activity</h3>
                      <span className="text-sm text-green-700">{(generatedResource as LessonPlanResource).activities.opening.duration}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="text-gray-800">{(generatedResource as LessonPlanResource).activities.opening.description}</p>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Teacher Actions:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {(generatedResource as LessonPlanResource).activities.opening.teacher_actions.map((action, idx) => (
                            <li key={idx} className="text-gray-600">{action}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Student Actions:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {(generatedResource as LessonPlanResource).activities.opening.student_actions.map((action, idx) => (
                            <li key={idx} className="text-gray-600">{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Activity */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-purple-50 p-4 border-b border-purple-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-purple-900">Main Activity</h3>
                      <span className="text-sm text-purple-700">{(generatedResource as LessonPlanResource).activities.main.duration}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="text-gray-800">{(generatedResource as LessonPlanResource).activities.main.description}</p>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Teacher Actions:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {(generatedResource as LessonPlanResource).activities.main.teacher_actions.map((action, idx) => (
                            <li key={idx} className="text-gray-600">{action}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Student Actions:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {(generatedResource as LessonPlanResource).activities.main.student_actions.map((action, idx) => (
                            <li key={idx} className="text-gray-600">{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Closing Activity */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-orange-50 p-4 border-b border-orange-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-orange-900">Closing Activity</h3>
                      <span className="text-sm text-orange-700">{(generatedResource as LessonPlanResource).activities.closing.duration}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="text-gray-800">{(generatedResource as LessonPlanResource).activities.closing.description}</p>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Teacher Actions:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {(generatedResource as LessonPlanResource).activities.closing.teacher_actions.map((action, idx) => (
                            <li key={idx} className="text-gray-600">{action}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Student Actions:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {(generatedResource as LessonPlanResource).activities.closing.student_actions.map((action, idx) => (
                            <li key={idx} className="text-gray-600">{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessment */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-2">Formative Assessment:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(generatedResource as LessonPlanResource).assessment.formative.map((item, idx) => (
                      <li key={idx} className="text-gray-700">{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-2">Summative Assessment:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(generatedResource as LessonPlanResource).assessment.summative.map((item, idx) => (
                      <li key={idx} className="text-gray-700">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Differentiation */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-2">Support for Struggling Students:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(generatedResource as LessonPlanResource).differentiation.struggling.map((item, idx) => (
                      <li key={idx} className="text-gray-700">{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-2">Extensions for Advanced Students:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(generatedResource as LessonPlanResource).differentiation.advanced.map((item, idx) => (
                      <li key={idx} className="text-gray-700">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Extensions and Reflection */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-2">Extension Activities:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(generatedResource as LessonPlanResource).extensions.map((item, idx) => (
                      <li key={idx} className="text-gray-700">{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-2">Reflection Points:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(generatedResource as LessonPlanResource).reflection_points.map((item, idx) => (
                      <li key={idx} className="text-gray-700">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="outline" onClick={() => setCurrentStep("settings")}>
              Edit
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderScienceExperiment = (problem: any) => {
    return (
      <div className="space-y-6">
        {problem.content ? (
          // Render structured content when available
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            {problem.content.introduction && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Introduction</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{problem.content.introduction}</p>
              </div>
            )}
            {problem.content.main_components && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Main Components and Processes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{problem.content.main_components}</p>
              </div>
            )}
            {problem.content.importance && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Importance and Applications</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{problem.content.importance}</p>
              </div>
            )}
            {problem.content.causes_effects && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Causes and Effects</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{problem.content.causes_effects}</p>
              </div>
            )}
            {problem.content.additional_info && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Additional Information</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{problem.content.additional_info}</p>
              </div>
            )}
          </div>
        ) : (
          // Fallback for legacy format
          <div className="bg-white p-6 rounded-lg shadow">
            {problem.type === 'experiment' && (
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-3">Question</h3>
                  <p className="text-gray-700">{problem.question}</p>
                </div>
                {problem.hypothesis_prompt && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-3">Hypothesis</h3>
                    <p className="text-gray-700">{problem.hypothesis_prompt}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Questions Section */}
        {problem.questions && problem.questions.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h3 className="text-xl font-semibold mb-4">Questions</h3>
            <ol className="list-decimal list-inside space-y-4">
              {problem.questions.map((q: any, index: number) => (
                <li key={index} className="text-gray-700">
                  {q.question}
                  {q.complexity && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Complexity: {q.complexity})
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          {currentStep === "settings" && renderSettings()}
          {currentStep === "generating" && renderGenerating()}
          {currentStep === "preview" && renderPreview()}
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes orbit {
          from {
            transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg);
          }
        }
        
        .required-field::after {
          content: "*";
          color: #dc2626;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
} 