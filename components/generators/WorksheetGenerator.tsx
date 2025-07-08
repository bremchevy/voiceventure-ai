import { useState, useEffect } from 'react';
import { BaseGeneratorProps, WorksheetSettings, Format, ResourceType, Subject } from '@/lib/types/generator-types';
import { WorksheetResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { themeEmojis } from '@/lib/constants/theme-emojis';

interface ResourceFormat {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

type ResourceFormats = {
  [subject: string]: {
    [K in WorksheetSettings['resourceType']]: ResourceFormat[];
  };
};

type Theme = 'Halloween' | 'Winter' | 'Spring' | 'General';

interface ProcessedRequest {
  subject: string | null;
  grade: string | null;
  resourceType: string | null;
  specifications: {
    format?: string;
    theme?: string;
    topicArea?: string;
    difficulty?: string;
    questionCount?: number;
    customInstructions?: string;
  };
  confidence: number;
}

export function WorksheetGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<WorksheetSettings>({
    grade: "3rd Grade",
    subject: "Math",
    theme: "General" as Theme,
    problemCount: 10,
    topicArea: "",
    resourceType: "worksheet",
    format: "standard"
  });

  const [requestedType, setRequestedType] = useState<string | null>(null);

  // Helper function to determine the best format based on content
  const inferBestFormat = (text: string, subject: string, resourceType: string): Format => {
    if (!text) return 'standard';
    
    const lowerText = text.toLowerCase();

    // Handle quiz formats specifically
    if (resourceType === 'quiz') {
      if (/\b(multiple|choice|options|mcq)\b/i.test(lowerText)) {
        return 'multiple_choice';
      }
      if (/\b(true|false|yes|no)\b/i.test(lowerText)) {
        return 'true_false';
      }
      return 'short_answer'; // New default for quizzes
    }
    
    // Handle worksheet formats by subject
    if (subject === 'Reading') {
      if (/\b(main\s*idea|comprehension|understand|summary|summarize|detail|inference)\b/i.test(lowerText)) {
        return 'comprehension';
      }
      if (/\b(vocabulary|word|definition|meaning|context|spell)\b/i.test(lowerText)) {
        return 'vocabulary_context';
      }
      return 'comprehension';
    }
    
    if (subject === 'Math') {
      if (/\b(step|guide|help|explain|show|work|process)\b/i.test(lowerText)) {
        return 'guided';
      }
      if (/\b(interact|hands[\s-]on|manipulative|activity|game)\b/i.test(lowerText)) {
        return 'interactive';
      }
      return 'standard';
    }
    
    if (subject === 'Science') {
      if (/\b(lab|experiment|procedure|method|equipment|materials)\b/i.test(lowerText)) {
        return 'science_context';
      }
      if (/\b(observe|observation|record|data|collect|measure)\b/i.test(lowerText)) {
        return 'analysis_focus';
      }
      return 'science_context';
    }
    
    return 'standard';
  };

  // Helper function to extract subject from text
  const extractSubject = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Check for science keywords first since they're more specific
    if (lowerText.includes('science') || 
        /\b(experiment|lab|observation|hypothesis|scientific|biology|chemistry|physics|photosynthesis|cells|atoms|molecules|ecosystem)\b/i.test(text)) {
      return 'Science';
    }
    
    // Then check for math keywords
    if (lowerText.includes('math') || 
        /\b(addition|subtraction|multiplication|division|fraction|geometry|algebra|equation|calculate|solve)\b/i.test(text)) {
      return 'Math';
    }
    
    // Finally check for reading keywords
    if (lowerText.includes('reading') || 
        /\b(comprehension|vocabulary|story|text|book|literature|writing|essay|grammar)\b/i.test(text)) {
      return 'Reading';
    }

    // Look for subject-specific content to make a best guess
    if (/\b(plant|animal|weather|earth|space|energy|force|matter|chemical|physical)\b/i.test(text)) {
      return 'Science';
    }
    
    return 'Science'; // Default to Science if scientific terms are detected
  };

  // Helper function to extract grade from text
  const extractGrade = (text: string): string => {
    // First try to match explicit grade numbers with optional suffixes
    const gradeMatch = text.match(/\b(\d+)(?:st|nd|rd|th)?\s*grade\b/i);
    if (gradeMatch) {
      const gradeNum = parseInt(gradeMatch[1]);
      if (gradeNum >= 1 && gradeNum <= 12) {
        const suffix = gradeNum === 1 ? 'st' : 
                      gradeNum === 2 ? 'nd' : 
                      gradeNum === 3 ? 'rd' : 'th';
      return `${gradeNum}${suffix} Grade`;
      }
    }

    // Check for kindergarten
    if (text.toLowerCase().includes('kindergarten')) {
      return 'Kindergarten';
    }

    // Look for grade numbers without 'grade' keyword
    const numMatch = text.match(/\b(\d+)\b/);
    if (numMatch) {
      const gradeNum = parseInt(numMatch[1]);
      if (gradeNum >= 1 && gradeNum <= 12) {
        const suffix = gradeNum === 1 ? 'st' : 
                      gradeNum === 2 ? 'nd' : 
                      gradeNum === 3 ? 'rd' : 'th';
        return `${gradeNum}${suffix} Grade`;
      }
    }

    return '7th Grade'; // Default to 7th Grade if no grade is detected
  };

  // Helper function to extract resource type from text
  const extractResourceType = (text: string): string => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('lesson plan')) return 'lesson_plan';
    if (lowerText.includes('rubric')) return 'rubric';
    if (lowerText.includes('quiz')) return 'quiz';
    if (lowerText.includes('exit slip')) return 'exit_slip';
    return 'worksheet';
  };

  // Helper function to extract theme from text
  const extractTheme = (text: string): Theme => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('halloween') || lowerText.includes('spooky')) {
      return 'Halloween';
    }
    if (lowerText.includes('winter') || lowerText.includes('snow')) {
      return 'Winter';
    }
    if (lowerText.includes('spring') || lowerText.includes('flower')) {
      return 'Spring';
    }
    return 'General';
  };

  // Parse initial request if provided
  useEffect(() => {
    if (request) {
      // Handle object request (from CommandProcessor)
      if (typeof request === 'object' && request !== null) {
        const processedRequest = request as ProcessedRequest;
        const subject = processedRequest.subject || 'Science';
        const resourceType = processedRequest.resourceType || 'worksheet';
        const bestFormat = inferBestFormat(processedRequest.specifications?.topicArea || '', subject, resourceType);
        const theme = extractTheme(processedRequest.specifications?.topicArea || '');
        
        setRequestedType(resourceType);
        
        setSettings(prev => ({
          ...prev,
          grade: processedRequest.grade || prev.grade,
          subject: subject,
          resourceType: resourceType as ResourceType,
          theme: (processedRequest.specifications?.theme || theme || prev.theme) as Theme,
          topicArea: processedRequest.specifications?.topicArea || prev.topicArea,
          problemCount: processedRequest.specifications?.questionCount || prev.problemCount,
          format: bestFormat,
          customInstructions: prev.customInstructions,
        }));
        return;
      }
      
      // Handle string request (legacy support)
      if (typeof request === 'string') {
      if (request.trim().startsWith('{') && request.trim().endsWith('}')) {
        try {
            const parsedRequest = JSON.parse(request) as ProcessedRequest;
            const subject = parsedRequest.subject || 'Science';
          const resourceType = parsedRequest.resourceType || 'worksheet';
            const bestFormat = inferBestFormat(parsedRequest.specifications?.topicArea || '', subject, resourceType);
            const theme = extractTheme(parsedRequest.specifications?.topicArea || '');
            
            setRequestedType(resourceType);
            
            setSettings(prev => ({
              ...prev,
              grade: parsedRequest.grade || prev.grade,
              subject: subject,
              resourceType: resourceType as ResourceType,
              theme: (parsedRequest.specifications?.theme || theme || prev.theme) as Theme,
              topicArea: parsedRequest.specifications?.topicArea || prev.topicArea,
              problemCount: parsedRequest.specifications?.questionCount || prev.problemCount,
              format: bestFormat,
              customInstructions: prev.customInstructions,
            }));
          } catch (e) {
            console.error('Failed to parse request JSON:', e);
          }
        } else {
          // Handle plain text request
          const subject = extractSubject(request);
          const grade = extractGrade(request);
          const resourceType = extractResourceType(request);
          const bestFormat = inferBestFormat(request, subject, resourceType);
          const theme = extractTheme(request);
          
          setRequestedType(resourceType);
          
          setSettings(prev => ({
            ...prev,
            grade: grade,
            subject: subject,
            resourceType: resourceType as ResourceType,
            theme: theme,
            topicArea: request,
            format: bestFormat,
          }));
        }
      }
    }
  }, [request]);

  // Handle problem count change
  const handleProblemCountChange = (value: number[]) => {
    setSettings(prev => ({
      ...prev,
      problemCount: value[0]
    }));
  };

  // Handle format change
  const handleFormatChange = (value: Format) => {
    setSettings(prev => ({
      ...prev,
      format: value
    }));
  };

  // Handle theme change
  const handleThemeChange = (value: Theme) => {
    setSettings(prev => ({
      ...prev,
      theme: value
    }));
  };

  // Subject-specific formats
  const resourceFormats: ResourceFormats = {
    Math: {
      worksheet: [
        { 
          id: "standard", 
          icon: "📝", 
          name: "Standard", 
          desc: "Traditional worksheet with problems and answer spaces" 
        },
        { 
          id: "guided", 
          icon: "📖", 
          name: "Guided Practice", 
          desc: "Step-by-step problem solving with hints" 
        },
        { 
          id: "interactive", 
          icon: "✏️", 
          name: "Interactive", 
          desc: "Hands-on math activities and manipulatives" 
        }
      ],
      quiz: [
        { id: "short_answer", icon: "✍️", name: "Short Answer", desc: "Brief written responses" },
        { id: "true_false", icon: "✅", name: "True/False", desc: "Simple true or false questions" },
        { id: "mixed", icon: "🔄", name: "Mixed Format", desc: "Combination of different question types" }
      ],
      exit_slip: [
        { id: "reflection_prompt", icon: "💭", name: "Reflection Prompt", desc: "Open-ended reflection on learning" },
        { id: "vocabulary_check", icon: "📚", name: "Vocabulary Check", desc: "Key terms and definitions review" },
        { id: "skill_assessment", icon: "🎯", name: "Skill Assessment", desc: "Quick check of specific skills" }
      ],
      lesson_plan: [
        { id: "full_lesson", icon: "📚", name: "Full Lesson", desc: "Complete lesson with objectives, activities, and assessment" },
        { id: "mini_lesson", icon: "⚡", name: "Mini Lesson", desc: "Focused 15-20 minute instruction" },
        { id: "activity", icon: "🎯", name: "Activity", desc: "Hands-on learning experience" }
      ],
      rubric: [
        { 
          id: "4_point", 
          icon: "📊", 
          name: "4-Point Scale", 
          desc: "Excellent, Good, Satisfactory, Needs Improvement" 
        },
        { 
          id: "3_point", 
          icon: "🎯", 
          name: "3-Point Scale", 
          desc: "Exceeds, Meets, Below Expectations" 
        },
        { 
          id: "checklist", 
          icon: "✅", 
          name: "Checklist", 
          desc: "Simple yes/no criteria" 
        }
      ]
    },
    Reading: {
      worksheet: [
        {
          id: "comprehension",
          icon: "📚",
          name: "Reading Comprehension",
          desc: "Passage analysis with main idea, details, and inference questions"
        },
        {
          id: "vocabulary_context",
          icon: "📖",
          name: "Vocabulary in Context",
          desc: "Word meaning, usage, and contextual understanding"
        }
      ],
      quiz: [
        { id: "short_answer", icon: "✍️", name: "Short Answer", desc: "Brief written responses" },
        { id: "true_false", icon: "✅", name: "True/False", desc: "Simple true or false questions" },
        { id: "mixed", icon: "🔄", name: "Mixed Format", desc: "Combination of different question types" }
      ],
      exit_slip: [
        { id: "reflection_prompt", icon: "💭", name: "Reflection Prompt", desc: "Open-ended reflection on learning" },
        { id: "vocabulary_check", icon: "📚", name: "Vocabulary Check", desc: "Key terms and definitions review" },
        { id: "skill_assessment", icon: "🎯", name: "Skill Assessment", desc: "Quick check of specific skills" }
      ],
      lesson_plan: [
        { id: "full_lesson", icon: "📚", name: "Full Lesson", desc: "Complete lesson with objectives, activities, and assessment" },
        { id: "mini_lesson", icon: "⚡", name: "Mini Lesson", desc: "Focused 15-20 minute instruction" },
        { id: "activity", icon: "🎯", name: "Activity", desc: "Hands-on learning experience" }
      ],
      rubric: [
        { 
          id: "4_point", 
          icon: "📊", 
          name: "4-Point Scale", 
          desc: "Excellent, Good, Satisfactory, Needs Improvement" 
        },
        { 
          id: "3_point", 
          icon: "🎯", 
          name: "3-Point Scale", 
          desc: "Exceeds, Meets, Below Expectations" 
        },
        { 
          id: "checklist", 
          icon: "✅", 
          name: "Checklist", 
          desc: "Simple yes/no criteria" 
        }
      ]
    },
    Science: {
      worksheet: [
        {
          id: "science_context",
          icon: "🔬",
          name: "Science Context",
          desc: "Comprehensive topic explanation with varying complexity questions"
        },
        {
          id: "analysis_focus",
          icon: "📊",
          name: "Analysis Focus",
          desc: "Key points analysis with analytical questions"
        }
      ],
      quiz: [
        { id: "short_answer", icon: "✍️", name: "Short Answer", desc: "Brief written responses" },
        { id: "true_false", icon: "✅", name: "True/False", desc: "Simple true or false statements" },
        { id: "multiple_choice", icon: "📝", name: "Multiple Choice", desc: "Multiple choice questions" }
      ],
      exit_slip: [
        { id: "reflection_prompt", icon: "💭", name: "Reflection Prompt", desc: "Open-ended reflection on learning" },
        { id: "vocabulary_check", icon: "📚", name: "Vocabulary Check", desc: "Key terms and definitions review" },
        { id: "skill_assessment", icon: "🎯", name: "Skill Assessment", desc: "Quick check of specific skills" }
      ],
      lesson_plan: [
        { id: "full_lesson", icon: "📚", name: "Full Lesson", desc: "Complete lesson with objectives, activities, and assessment" },
        { id: "mini_lesson", icon: "⚡", name: "Mini Lesson", desc: "Focused 15-20 minute instruction" },
        { id: "activity", icon: "🎯", name: "Activity", desc: "Hands-on learning experience" }
      ],
      rubric: [
        { 
          id: "4_point", 
          icon: "📊", 
          name: "4-Point Scale", 
          desc: "Excellent, Good, Satisfactory, Needs Improvement" 
        },
        { 
          id: "3_point", 
          icon: "🎯", 
          name: "3-Point Scale", 
          desc: "Exceeds, Meets, Below Expectations" 
        },
        { 
          id: "checklist", 
          icon: "✅", 
          name: "Checklist", 
          desc: "Simple yes/no criteria" 
        }
      ]
    }
  };

  const renderSpecificSettings = () => (
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
            const isDisabled = requestedType !== null && requestedType !== resType.type;
            return (
              <div key={resType.type} className="relative">
                <button
                  onClick={() => {
                    if (!isDisabled) {
                      setSettings((prev) => ({ 
                        ...prev, 
                        resourceType: resType.type,
                        // Reset format when changing resource type
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

      {/* Resource Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Format</label>
        <div className="grid grid-cols-1 gap-3">
          {resourceFormats[settings.subject]?.[settings.resourceType]?.map((format: ResourceFormat) => (
          <button
              key={format.id}
              onClick={() => handleFormatChange(format.id as Format)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center justify-between ${
                settings.format === format.id
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
              <div className="flex items-center gap-2">
                <span>{format.icon}</span>
                <div>
                  <div className="font-medium">{format.name}</div>
                  <div className="text-xs text-gray-500">{format.desc}</div>
                </div>
              </div>
              {settings.format === format.id && (
                <span className="text-purple-600">✓</span>
              )}
          </button>
        ))}
        </div>
      </div>

      {/* Number of Questions - Only show for certain resource types */}
      {settings.resourceType !== 'lesson_plan' && settings.resourceType !== 'rubric' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium text-gray-700">Number of Questions</Label>
            <span className="text-sm text-gray-500">{settings.problemCount}</span>
          </div>
          <Slider
            value={[settings.problemCount]}
            onValueChange={handleProblemCountChange}
            max={30}
            min={0}
            step={1}
            className="w-full"
          />
          {settings.problemCount === 0 && (
            <p className="text-sm text-gray-500 italic">
              No questions will be generated. This is useful for reading passages, observation sheets, or other content-only resources.
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <ResourceGenerator<WorksheetSettings, WorksheetResource>
      type={settings.resourceType}
      settings={settings}
      setSettings={setSettings}
      onBack={onBack}
      onComplete={onComplete}
      request={request}
      renderSpecificSettings={renderSpecificSettings}
      icon={resourceFormats[settings.subject]?.[settings.resourceType]?.[0].icon || "📝"}
      title={`${themeEmojis[settings.theme]} ${settings.resourceType.charAt(0).toUpperCase()}${settings.resourceType.slice(1)} ${themeEmojis[settings.theme]}`}
    />
  );
} 