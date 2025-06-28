import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Edit, Store, CheckCircle, Sparkles, ArrowLeft, Check, Loader2 } from "lucide-react";
import { generatePDF } from "@/lib/utils/pdf";
import { toast } from "@/components/ui/use-toast";
import { BaseGeneratorProps, BaseGeneratorSettings, themeEmojis, suggestedTopics, isFormat1, isFormat2, isFormat3 } from '@/lib/types/generator-types';
import { Resource } from '@/lib/types/resource';
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

  const transformResponse = (rawResponse: any) => {
    // Extract common fields
    const title = rawResponse.title || `${rawResponse.grade_level} ${rawResponse.topic} Worksheet`;
    const gradeLevel = rawResponse.grade_level;
    const subject = rawResponse.subject;
    const topicArea = rawResponse.topic;
    const format = rawResponse.format || 'standard';
    const vocabulary = rawResponse.vocabulary || {};

    // Initialize problems array
    let problems: Array<{
      question: string;
      answer?: string;
      type: string;
      steps?: string[];
      explanation?: string;
      materials_needed?: string[];
      instructions?: string[];
      expected_outcome?: string;
    }> = [];

    // Transform problems based on format
    if (Array.isArray(rawResponse.problems)) {
      problems = rawResponse.problems.map(problem => {
        switch (format) {
          case 'standard':
            return {
              question: problem.problem,
              answer: problem.answer,
              type: 'short_answer'
            };
          case 'guided':
            return {
              question: problem.problem,
              answer: problem.answer,
              type: 'guided',
              steps: problem.steps || [],
              explanation: problem.explanation
            };
          case 'interactive':
            return {
              question: problem.problem,
              type: 'interactive',
              materials_needed: problem.materials_needed || [],
              instructions: problem.instructions || [],
              expected_outcome: problem.expected_outcome
            };
          default:
            return {
              question: problem.problem || problem.question || '',
              answer: problem.answer || problem.solution || '',
              type: 'short_answer'
            };
        }
      });
    }

    // Get format-specific instructions
    let instructions = '';
    switch (format) {
      case 'standard':
        instructions = "Show your work and write your answers in the spaces provided. Remember to include units where necessary.";
        break;
      case 'guided':
        // No general instructions needed for guided format as each problem has its own steps
        instructions = "";
        break;
      case 'interactive':
        instructions = "Follow the instructions carefully and gather all required materials before starting each activity.";
        break;
      default:
        instructions = "Show your work and write your answers in the spaces provided.";
    }

    // Return in the expected format
    return {
      title,
      subject,
      gradeLevel,
      topicArea,
      type: 'worksheet',
      format,
      instructions,
      problems,
      vocabulary
    };
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
        difficulty: settings.difficulty,
        topicArea: settings.topicArea,
        includeVocabulary: settings.includeVocabulary || false,
        questionCount: settings.questionCount || 10,
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

        // Validate the transformed response
        if (!transformedResponse.title || !transformedResponse.subject || !transformedResponse.gradeLevel) {
          console.error('Missing required fields in transformed response:', transformedResponse);
          throw new Error('Generated resource missing required fields after transformation');
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
          <p className="text-sm text-purple-700 font-medium">"{request}"</p>
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

      {/* Resource Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Resource Type</label>
        <div className="grid grid-cols-1 gap-3">
          {resourceTypes.map((resType) => (
            <button
              key={resType.type}
              onClick={() => setSettings((prev) => ({ ...prev, resourceType: resType.type }))}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center justify-between ${
                settings.resourceType === resType.type
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{resType.icon}</span>
                <div>
                  <div className="font-medium capitalize">{resType.type.replace('_', ' ')}</div>
                  <div className="text-xs text-gray-500">{resType.desc}</div>
                </div>
              </div>
              {settings.resourceType === resType.type && (
                <span className="text-purple-600">✓</span>
              )}
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
      <div className="space-y-6 text-gray-800">
        {/* Title and Subject Info */}
        <div>
          <h2 className="text-2xl font-bold">{generatedResource.title}</h2>
          <div className="text-sm text-gray-600">
            <span>{generatedResource.subject}</span>
            <span className="mx-2">•</span>
            <span>{generatedResource.gradeLevel}</span>
          </div>
        </div>

        {/* Instructions */}
        <div>
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <p className="text-sm">{getFormatSpecificInstructions(generatedResource)}</p>
        </div>

        {/* Format Type */}
        <div className="text-sm font-medium text-purple-600">
          {capitalizeFirstLetter(generatedResource.format)} Format
        </div>

        {/* Reading Passage (if present) */}
        {generatedResource.passage && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-2">Reading Passage:</h3>
            <p className="text-sm whitespace-pre-wrap">{generatedResource.passage.text}</p>
            {generatedResource.passage.type && (
              <p className="text-xs text-gray-500 mt-2">
                Type: {capitalizeFirstLetter(generatedResource.passage.type)}
                {generatedResource.passage.lexile_level && ` • Lexile Level: ${generatedResource.passage.lexile_level}`}
              </p>
            )}
          </div>
        )}

        {/* Problems */}
        {generatedResource.problems && generatedResource.problems.length > 0 && (
          <div className="space-y-4">
            {generatedResource.problems.map((problem: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="font-medium">{index + 1}</div>
                <div>{problem.question}</div>
                {problem.options && (
                  <div className="pl-4 space-y-1">
                    {problem.options.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="flex items-start gap-2">
                        <span>{String.fromCharCode(65 + optIndex)}.</span>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper function to get format-specific instructions
  const getFormatSpecificInstructions = (response: any) => {
    const baseInstructions = response.instructions || "";
    
    switch (response.subject?.toLowerCase()) {
      case 'reading':
        switch (response.format) {
          case 'comprehension':
            return "Read the passage carefully. Then answer the questions using evidence from the text to support your answers.";
          case 'literary_analysis':
            return "Analyze the passage focusing on literary elements. Support your answers with specific examples from the text.";
          case 'vocabulary_context':
            return "Study how each word is used in the passage. Use context clues to understand their meanings and usage.";
          default:
            return baseInstructions;
        }
      
      case 'science':
        switch (response.format) {
          case 'lab_experiment':
            return "Follow the lab procedure carefully. Record your observations and data accurately. Answer analysis questions based on your findings.";
          case 'observation_analysis':
            return "Observe the phenomena carefully. Record detailed observations and analyze the patterns you notice.";
          case 'concept_application':
            return "Apply scientific concepts to real-world scenarios. Explain your reasoning clearly using scientific principles.";
          default:
            return baseInstructions;
        }
      
      case 'math':
        switch (response.format) {
          case 'standard':
            return "Solve each problem and show your work clearly in the space provided.";
          case 'guided':
            return "Follow the step-by-step hints. Show your work for each step of the solution process.";
          case 'interactive':
            return "Use the suggested tools and manipulatives to solve each problem. Record your solutions and explain your thinking.";
          default:
            return baseInstructions;
        }
      
      default:
        return baseInstructions;
    }
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