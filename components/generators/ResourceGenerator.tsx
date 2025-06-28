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
    const topicArea = rawResponse.topic;
    const vocabulary = rawResponse.vocabulary || {};

    let problems: Array<{ question: string; answer: string; type: 'short_answer' }> = [];

    // Handle different response formats using type guards
    if (isFormat1(rawResponse)) {
      problems = rawResponse.problems.map(item => ({
        question: item.problem,
        answer: rawResponse.final_answers[item.problem] || '',
        type: 'short_answer'
      }));
    } else if (isFormat2(rawResponse)) {
      problems = rawResponse.questions.map(item => ({
        question: item.question,
        answer: item.answer,
        type: 'short_answer'
      }));
    } else if (isFormat3(rawResponse)) {
      problems = rawResponse.worksheet.map((item, index) => ({
        question: item.problem,
        answer: item.solution || rawResponse.answers?.[index + 1] || '',
        type: 'short_answer'
      }));
    } else {
      // Fallback for unknown format - try to extract problems and answers
      const extractedProblems = rawResponse.problems || 
                               rawResponse.questions || 
                               rawResponse.worksheet || [];
      
      problems = extractedProblems.map((item: any) => ({
        question: item.problem || item.question || '',
        answer: item.answer || item.solution || '',
        type: 'short_answer'
      }));
    }

    // Return in the expected format
    return {
      title,
      subject: 'Math', // Since this is coming from math generator
      gradeLevel,
      topicArea,
      type: 'worksheet' as const,
      format: 'standard' as const,
      instructions: "Show your work and write your answers in the spaces provided. Remember to include units where necessary.",
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
        topicArea: settings.topicArea,
        includeVocabulary: settings.includeVocabulary || false,
        questionCount: settings.questionCount || 10,
        focus: settings.focus || [],
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
      <div className="space-y-6 relative">
        {/* Header with Back Button */}
        <div className="flex items-start justify-between mb-6 pt-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep("settings")} className="p-0 h-auto">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">📄 Resource Preview</h1>
              <p className="text-sm text-gray-600">Review your generated {type}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentStep("settings")}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        {/* Resource Preview */}
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto" ref={resourceRef}>
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{generatedResource.title}</h1>
          
          {/* Metadata */}
          <div className="flex flex-wrap gap-3 mb-6">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
              {generatedResource.subject}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {generatedResource.gradeLevel}
            </span>
          </div>

          {/* Instructions */}
          {generatedResource.instructions && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-800">Instructions:</p>
              <p className="text-sm text-blue-700 mt-1">{generatedResource.instructions}</p>
            </div>
          )}

          {/* Description */}
          {generatedResource.description && (
            <p className="text-gray-600 mb-6">{generatedResource.description}</p>
          )}

          {/* Worksheet Problems */}
          {'problems' in generatedResource && (
            <div className="space-y-6">
              {/* Format Badge */}
              {'format' in generatedResource && (
                <div className="mb-4">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                    {generatedResource.format.charAt(0).toUpperCase() + generatedResource.format.slice(1)} Format
                  </span>
                </div>
              )}

              {generatedResource.problems.map((problem, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <div className="flex-grow space-y-4">
                      <p className="text-lg font-medium text-gray-900">{problem.question}</p>
                      
                      {/* Multiple Choice Options */}
                      {problem.options && (
                        <div className="space-y-3">
                          {problem.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-3">
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-sm">{String.fromCharCode(65 + optIndex)}</span>
                              </div>
                              <span className="text-gray-700">{option}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Standard Format: Answer Space */}
                      {generatedResource.format === 'standard' && !problem.options && (
                        <div className="mt-4 border-b-2 border-gray-300 pb-8 min-h-[60px]" />
                      )}

                      {/* Explanation (for Guided Format) */}
                      {problem.explanation && generatedResource.format === 'guided' && (
                        <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <span className="font-medium">Explanation: </span>
                          {problem.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Standard Format: Answers Section */}
              {generatedResource.format === 'standard' && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Answers</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {generatedResource.problems.map((problem, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">Problem {index + 1}: </span>
                        <span className="text-gray-600">{problem.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quiz Questions */}
          {'questions' in generatedResource && (
            <div className="space-y-6">
              {generatedResource.questions.map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <div className="flex-grow space-y-4">
                      <p className="text-lg font-medium text-gray-900">{question.question}</p>
                      
                      {/* Question Options */}
                      {question.type === 'multiple_choice' && question.options && (
                        <div className="space-y-3">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-3">
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-sm">{String.fromCharCode(65 + optIndex)}</span>
                              </div>
                              <span className="text-gray-700">{option}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Points */}
                      <div className="text-sm text-gray-500">
                        Points: {question.points}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rubric Criteria */}
          {'criteria' in generatedResource && (
            <div className="space-y-6">
              {generatedResource.criteria.map((criterion, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">{criterion.name}</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {criterion.levels.map((level, levelIndex) => (
                      <div key={levelIndex} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-purple-700">{level.level}</span>
                          {level.points && (
                            <span className="text-sm text-gray-600">{level.points} points</span>
                          )}
                        </div>
                        <p className="text-gray-700">{level.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lesson Plan */}
          {'objectives' in generatedResource && (
            <div className="space-y-8">
              {/* Duration */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Duration</h2>
                <p className="text-gray-700">{generatedResource.duration}</p>
              </div>

              {/* Objectives */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Learning Objectives</h2>
                <ul className="list-disc list-inside space-y-2">
                  {generatedResource.objectives.map((objective, index) => (
                    <li key={index} className="text-gray-700">{objective}</li>
                  ))}
                </ul>
              </div>

              {/* Materials */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Materials Needed</h2>
                <ul className="list-disc list-inside space-y-2">
                  {generatedResource.materials.map((material, index) => (
                    <li key={index} className="text-gray-700">{material}</li>
                  ))}
                </ul>
              </div>

              {/* Activities */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Activities</h2>
                <div className="space-y-4">
                  {generatedResource.activities.map((activity, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{activity.name}</h3>
                        <span className="text-sm text-gray-600">{activity.duration}</span>
                      </div>
                      <p className="text-gray-700">{activity.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Assessment</h2>
                <p className="text-gray-700">{generatedResource.assessment}</p>
              </div>
            </div>
          )}

          {/* Exit Slip */}
          {'questions' in generatedResource && generatedResource.type === 'exit slip' && (
            <div className="space-y-6">
              {generatedResource.questions.map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <div className="flex-grow space-y-4">
                      <p className="text-lg font-medium text-gray-900">{question.question}</p>
                      
                      {/* Multiple Choice */}
                      {question.type === 'multiple_choice' && question.options && (
                        <div className="space-y-3">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-3">
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-sm">{String.fromCharCode(65 + optIndex)}</span>
                              </div>
                              <span className="text-gray-700">{option}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rating Scale */}
                      {question.type === 'rating_scale' && (
                        <div className="flex items-center gap-4">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <div key={rating} className="flex flex-col items-center">
                              <div className="w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center">
                                {rating}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Open Response */}
                      {question.type === 'open_response' && (
                        <div className="mt-2 border-b-2 border-gray-300 pb-2">
                          <span className="text-gray-400 text-sm">Write your response here...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vocabulary Section */}
          {'vocabulary' in generatedResource && generatedResource.vocabulary && generatedResource.vocabulary.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Vocabulary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(generatedResource.vocabulary).map(([term, definition]) => (
                  <div key={term} className="bg-gray-50 p-4 rounded-lg">
                    <span className="font-medium text-purple-700">{term}: </span>
                    <span className="text-gray-700">{definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Points (for quiz) */}
          {'totalPoints' in generatedResource && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-lg font-semibold text-gray-900">
                Total Points: {generatedResource.totalPoints}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" onClick={() => setCurrentStep("settings")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
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