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

  const transformResponse = (response: any): WorksheetResource => {
    // Get format-specific instructions
    let instructions = 'Show your work and write your answers in the spaces provided.';
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
        instructions = 'Follow the step-by-step guidance for each problem. Show your work at each step.';
        break;
      case 'interactive':
        instructions = 'Use the provided materials to solve each problem. Follow the activity instructions carefully.';
        break;
      default:
        if (response.subject === 'Math') {
          instructions = 'Show your work and include units in your answers where applicable.';
        } else {
          instructions = 'Show your work and write your answers in the spaces provided.';
        }
    }

    // Base transformation
    const transformed: WorksheetResource = {
      type: 'worksheet',
      title: response.title || '',
      gradeLevel: response.grade_level || '',
      subject: response.subject || '',
      topicArea: response.topic || '',
      format: response.subject === 'Reading' ? (response.format === 'worksheet' ? 'comprehension' : response.format) : (response.format || 'standard'),
      instructions: response.instructions || instructions,
      problems: [],
      vocabulary: response.vocabulary || {}
    };

    // Handle passage for reading formats
    if (response.passage || response.subject === 'Reading') {
      transformed.passage = {
        text: response.passage?.text || 'No passage provided',
        type: response.passage?.type || 'fiction',
        lexile_level: response.passage?.lexile_level || '',
        target_words: response.passage?.target_words || [],
        elements_focus: response.passage?.elements_focus || []
      };
    }

    // Handle different problem formats
    if (response.problems) {
      switch (response.format) {
        case 'comprehension':
          transformed.comprehensionProblems = response.problems.map((p: any) => ({
            type: p.type || 'main_idea',
            question: p.question || '',
            answer: p.answer || '',
            evidence_prompt: p.evidence_prompt || '',
            skill_focus: p.skill_focus || ''
          }));
          break;

        case 'literary_analysis':
          transformed.literaryAnalysisProblems = response.problems.map((p: any) => ({
            type: 'analysis',
            element: p.element || '',
            question: p.question || '',
            guiding_questions: p.guiding_questions || [],
            evidence_prompt: p.evidence_prompt || '',
            response_format: p.response_format || ''
          }));
          break;

        case 'vocabulary_context':
          transformed.vocabularyProblems = response.problems.map((p: any) => ({
            word: p.word || '',
            context: p.context || '',
            definition: p.definition || '',
            questions: p.questions || [],
            application: p.application || ''
          }));
          break;

        case 'lab_experiment':
          transformed.objective = response.objective || '';
          transformed.safety_notes = response.safety_notes || '';
          transformed.materials = response.materials || [];
          transformed.labProblems = response.problems.map((p: any) => ({
            type: 'experiment',
            question: p.question || '',
            hypothesis_prompt: p.hypothesis_prompt || '',
            procedure: p.procedure || [],
            data_collection: p.data_collection || { table_headers: [], rows: 0 },
            analysis_questions: p.analysis_questions || [],
            conclusion_prompt: p.conclusion_prompt || ''
          }));
          break;

        case 'observation_analysis':
          transformed.objective = response.objective || '';
          transformed.observationProblems = response.problems.map((p: any) => ({
            type: 'observation',
            phenomenon: p.phenomenon || '',
            background: p.background || '',
            observation_prompts: p.observation_prompts || [],
            data_recording: p.data_recording || { type: 'text', instructions: '' },
            analysis_questions: p.analysis_questions || [],
            connections: p.connections || []
          }));
          break;

        case 'concept_application':
          transformed.conceptProblems = response.problems.map((p: any) => ({
            type: 'application',
            scenario: p.scenario || '',
            concept_connection: p.concept_connection || '',
            questions: p.questions || [],
            extension: p.extension || ''
          }));
          break;

        default:
          // Handle standard math problems
          transformed.problems = response.problems.map((p: any) => ({
            type: p.type || 'standard',
            question: p.problem || p.question || '', // Try problem field first, then question field
            answer: p.answer || '',
            explanation: p.explanation || '',
            steps: p.steps || [],
            hints: p.hints || [],
            visuals: p.visuals || []
          }));
      }
    }

    return transformed;
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
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{generatedResource.title}</h2>
            <div className="text-gray-600">
              <div>{generatedResource.subject}</div>
              <div>{generatedResource.gradeLevel}</div>
            </div>
          </div>

          {/* Instructions */}
          {generatedResource.instructions && (
            <div className="space-y-2">
              <h3 className="font-semibold">Instructions:</h3>
              <p>{generatedResource.instructions}</p>
            </div>
          )}

          {/* Display passage for reading formats */}
          {generatedResource.passage && (
            <div className="space-y-2 border-l-4 border-purple-500 pl-4 my-6 bg-gray-50 p-4 rounded-r-lg">
              <h3 className="font-semibold">Reading Passage:</h3>
              <p className="whitespace-pre-wrap text-gray-800">{generatedResource.passage.text}</p>
            </div>
          )}

          {/* Problems section */}
          <div className="space-y-6">
            {generatedResource.problems?.map((problem, index) => (
              <div key={index} className="space-y-3">
                <div className="font-medium">{(index + 1)}. {problem.question.replace(/^\d+\.\s*/, '')}</div>
                <div className="pl-4">
                  <div className="border-b-2 border-gray-300 h-8 w-full" />
                  {problem.steps && problem.steps.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {problem.steps.map((step, stepIndex) => (
                        <div key={stepIndex} className="text-sm text-gray-600">
                          • {step}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Comprehension problems */}
            {generatedResource.comprehensionProblems?.map((problem, index) => (
              <div key={index} className="space-y-3">
                <div className="font-medium">{(index + 1)}. {problem.question.replace(/^\d+\.\s*/, '')}</div>
                {problem.evidence_prompt && (
                  <div className="text-sm text-gray-600 italic pl-4">
                    {problem.evidence_prompt}
                  </div>
                )}
                <div className="pl-4">
                  <div className="border-b-2 border-gray-300 h-16 w-full" />
                </div>
              </div>
            ))}

            {/* Literary analysis problems */}
            {generatedResource.literaryAnalysisProblems?.map((problem, index) => (
              <div key={index} className="space-y-3">
                <div className="font-medium">{(index + 1)}. Analyze: {problem.element.replace(/^\d+\.\s*/, '')}</div>
                <div>{problem.question}</div>
                {problem.guiding_questions && (
                  <div className="pl-4 space-y-1">
                    {problem.guiding_questions.map((q, qIndex) => (
                      <div key={qIndex} className="text-sm text-gray-600">
                        • {q}
                      </div>
                    ))}
                  </div>
                )}
                <div className="pl-4">
                  <div className="border-b-2 border-gray-300 h-16 w-full" />
                </div>
              </div>
            ))}

            {/* Vocabulary problems */}
            {generatedResource.vocabularyProblems?.map((problem, index) => (
              <div key={index} className="space-y-3 border p-4 rounded-lg">
                <div className="font-semibold text-lg">{problem.word}</div>
                <div className="text-gray-600">Context: "{problem.context}"</div>
                <div>Definition: {problem.definition}</div>
                <div className="space-y-3">
                  {problem.questions.map((q, qIndex) => (
                    <div key={qIndex}>
                      <div className="font-medium">{(qIndex + 1)}. {q.question.replace(/^\d+\.\s*/, '')}</div>
                      <div className="pl-4 mt-2">
                        <div className="border-b-2 border-gray-300 h-8 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="font-medium">Application:</div>
                  <div className="text-sm text-gray-600">{problem.application}</div>
                  <div className="pl-4 mt-2">
                    <div className="border-b-2 border-gray-300 h-12 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show vocabulary section only for math and science subjects */}
          {generatedResource.subject !== 'Reading' && 
           generatedResource.vocabulary && 
           Object.keys(generatedResource.vocabulary).length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold text-lg mb-4">Key Terms:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(generatedResource.vocabulary).map(([term, definition], index) => (
                  <div key={index} className="border p-3 rounded-lg">
                    <div className="font-medium">{term}</div>
                    <div className="text-sm text-gray-600">{definition}</div>
                  </div>
                ))}
              </div>
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