import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Edit, Store, CheckCircle, Sparkles, ArrowLeft, Check, Loader2, Share2 } from "lucide-react";
import { generatePDF } from "@/lib/utils/pdf";
import { toast } from "@/components/ui/use-toast";
import { ShareModal } from "@/components/ui/share-modal";
import { BaseGeneratorProps, BaseGeneratorSettings, themeEmojis, suggestedTopics, isFormat1, isFormat2, isFormat3 } from '@/lib/types/generator-types';
import { Resource, WorksheetResource, QuizResource, LessonPlanResource, ExitSlipResource, MathProblem, ReadingProblem, VocabularyProblem } from '@/lib/types/resource';
import { formatHandlerService } from '@/lib/services/FormatHandlerService';


interface ResourceGeneratorProps<T extends BaseGeneratorSettings, R extends Resource> extends BaseGeneratorProps {
  type: string;
  settings: T;
  setSettings: (settings: T | ((prev: T) => T)) => void;
  renderSpecificSettings: () => JSX.Element;
  icon: string;
  title: string;
  onDownloadPDF?: (resource: R) => Promise<void>;
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
  onDownloadPDF,
}: ResourceGeneratorProps<T, R>) {
  const [currentStep, setCurrentStep] = useState("settings");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGenerationStep, setCurrentGenerationStep] = useState(0);
  const [generatedResource, setGeneratedResource] = useState<R | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleResponse = async (response: any) => {
    try {
      // Transform response using format handlers
      const transformedResponse = transformResponse(response);
      console.log('Transformed response:', transformedResponse);
      
      setGeneratedResource(transformedResponse as R);
      updateGenerationProgress(2, 100);
      setCurrentStep("complete");
      
      // Call onComplete callback with transformed response
      if (onComplete) {
        onComplete(transformedResponse as R);
      }
      } catch (error) {
      console.error('Error transforming response:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while processing the response');
      setCurrentStep("error");
    }
  };

  const generateResource = async () => {
    try {
      setCurrentStep("generating");
      setError(null); // Clear any previous errors

      // Step 1: Analyzing request
      updateGenerationProgress(0, 25);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validate required fields
      if (!settings.subject || !settings.grade || !settings.topicArea) {
        throw new Error('Please fill in all required fields: Subject, Grade Level, and Topic Area');
      }

      // Construct the request payload with exact field names expected by the API
      const requestPayload = {
        subject: settings.subject,
        grade: settings.grade,
        topic: settings.topicArea,
        resourceType: type,
        format: settings.format || 'standard',
        questionCount: ('problemCount' in settings) ? settings.problemCount : (settings.questionCount || 10),
        theme: settings.theme, // Remove the default 'General' here
        customInstructions: settings.customInstructions || '',
        selectedQuestionTypes: settings.selectedQuestionTypes || []
      };

      console.log('Sending request with payload:', requestPayload);
      
      const response = await fetch('/api/generate', {
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
        const rawResponse = await response.json();
        console.log('Raw API response:', rawResponse);

        // Transform the response using the format handler service
        const transformedResponse = formatHandlerService.transformResource(
          rawResponse.subject.toLowerCase(),
          rawResponse.format,
          {
          ...rawResponse,
            requestPayload: {
              theme: settings.theme
            }
          }
        );
        console.log('Transformed response:', transformedResponse);

        // Validate the transformed response based on resource type
        if (type === 'quiz') {
          const quizResponse = transformedResponse as unknown as QuizResource;
          if (!quizResponse.title || !quizResponse.questions || !quizResponse.questions.length) {
            console.error('Missing required fields in transformed quiz response:', transformedResponse);
            throw new Error('Generated quiz missing required fields after transformation');
          }
        } else if (type === 'rubric') {
          const rubricResponse = transformedResponse as unknown as any;
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
          const lessonPlanResponse = transformedResponse as unknown as LessonPlanResource;
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

        setGeneratedResource(transformedResponse as R);
        
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

      // Get the PDF blob directly from the response
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
    } catch (error: unknown) {
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
        {!settings.grade && (
          <div className="text-sm text-red-500 mt-2">Please select a grade</div>
        )}
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
        {!settings.subject && (
          <div className="text-sm text-red-500 mt-2">Please select a subject</div>
        )}
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
              onClick={() => {
                console.log('Setting theme to:', theme.name);
                setSettings((prev) => ({
                  ...prev,
                  theme: theme.name as T['theme']
                }));
              }}
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
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto overflow-y-auto max-h-[calc(100vh-200px)]" ref={resourceRef}>
          {/* Title with theme decorations */}
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl font-bold text-center">
              {themeEmojis[settings.theme]} {generatedResource.title} {themeEmojis[settings.theme]}
            </h2>
            <div className="text-gray-600 text-center">
              <div>{generatedResource.subject}</div>
              <div>{generatedResource.grade_level}</div>
            </div>
          </div>

          {/* Instructions */}
          {(generatedResource as WorksheetResource).instructions && (
            <div className="space-y-2 mb-6">
              <h3 className="font-semibold">Instructions:</h3>
              <p>{(generatedResource as WorksheetResource).instructions}</p>
            </div>
          )}

          {/* Content Preview */}
          {type === 'worksheet' && (
            <div className="space-y-6">
              {formatHandlerService.generatePreview(generatedResource as WorksheetResource)}
            </div>
          )}

          {/* Display science content */}
          {(generatedResource as WorksheetResource).science_context && (
            <div className="space-y-2 border-l-4 border-purple-500 pl-4 my-6 bg-gray-50 p-4 rounded-r-lg">
              <h3 className="font-semibold">Content:</h3>
              <div className="space-y-4">
                <div className="mt-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{(generatedResource as WorksheetResource).science_context?.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Remove the duplicate Analysis Focus content section */}
                </div>

          {/* Action Buttons */}
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
        <Button variant="outline" size="sm" onClick={() => setCurrentStep("settings")}>
          <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsShareModalOpen(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isLoading}
          >
              {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                  <Download className="w-4 h-4 mr-2" />
              )}
            Download PDF
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

      {/* Share Modal */}
      {generatedResource && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          resource={generatedResource}
        />
      )}
    </div>
  );
} 