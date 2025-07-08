import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { generatePDF } from '@/lib/utils/pdf';
import { useRouter } from 'next/navigation';
import { CommandProcessor } from '@/lib/services/CommandProcessor';
import { Subject, ResourceType } from '@/lib/types/generator-types';

interface GeneratorProps {
  onGenerate: (options: any) => Promise<void>;
  isGenerating: boolean;
  streamingContent: string;
}

export function ContentGenerator({ onGenerate, isGenerating, streamingContent }: GeneratorProps) {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [resourceType, setResourceType] = useState<ResourceType | null>(null);
  const [grade, setGrade] = useState(5);
  const [problemCount, setProblemCount] = useState(5);
  const [topic, setTopic] = useState('arithmetic');
  const [prompt, setPrompt] = useState('');
  const [showSelectionPrompt, setShowSelectionPrompt] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const commandProcessor = new CommandProcessor();
  
  const [options, setOptions] = useState({
    includeQuestions: true,
    includeVisuals: true,
    difficulty: 'intermediate',
  });

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
    if (e.target.value) {
      const result = commandProcessor.processCommand(e.target.value);
      
      // Handle subject selection
      if (result.subject && result.confidence >= 0.9) {
        const subjectLower = result.subject.toLowerCase() as Subject;
        if (['math', 'reading', 'science'].includes(subjectLower)) {
          setSubject(subjectLower);
          setShowSelectionPrompt(false);
        }
      } else {
        setSubject(null);
        setShowSelectionPrompt(true);
      }

      // Handle resource type selection
      if (result.resourceType && result.confidence >= 0.8) {
        setResourceType(result.resourceType);
      } else {
        setResourceType(null);
        setShowSelectionPrompt(true);
      }
      
      // Update grade if detected
      if (result.gradeLevel) {
        const gradeNumber = parseInt(result.gradeLevel.replace(/[^\d]/g, ''));
        if (!isNaN(gradeNumber) && gradeNumber >= 1 && gradeNumber <= 12) {
          setGrade(gradeNumber);
        }
      }
      
      // Update other options based on specifications
      if (result.specifications) {
        if (result.specifications.problemCount) {
          setProblemCount(result.specifications.problemCount);
        }
        
        if (result.specifications.difficulty) {
          setOptions(prev => ({ ...prev, difficulty: result.specifications.difficulty }));
        }
        
        if (result.specifications.topicArea) {
          const topicArea = result.specifications.topicArea.toLowerCase();
          if (subject === 'math' && ['algebra', 'geometry', 'arithmetic', 'word problems'].includes(topicArea)) {
            setTopic(topicArea);
          }
        }
      }
    }
  };

  const handleGenerate = useCallback(async () => {
    // Validate required selections
    if (!subject || !resourceType) {
      setShowSelectionPrompt(true);
      return;
    }

    const subjectOptions = {
      math: {
        topic: topic,
        includeSteps: options.includeQuestions,
        includeVisuals: options.includeVisuals,
        numberOfProblems: problemCount,
      },
      reading: {
        genre: 'fiction',
        includeQuestions: options.includeQuestions,
        includeVocabulary: true,
        readingLevel: options.difficulty,
        numberOfQuestions: problemCount,
      },
      science: {
        subject: 'biology',
        includeExperiments: true,
        includeDiagrams: options.includeVisuals,
        includeQuestions: options.includeQuestions,
        difficultyLevel: options.difficulty,
        numberOfProblems: problemCount,
      },
    };

    await onGenerate({
      subject,
      resourceType,
      grade,
      prompt,
      ...subjectOptions[subject],
    });
  }, [subject, resourceType, grade, options, problemCount, topic, prompt, onGenerate]);

  const handleDownloadPDF = async () => {
    if (contentRef.current && streamingContent) {
      await generatePDF(contentRef.current, `${subject}-worksheet.pdf`);
    }
  };

  const handleBackToSettings = () => {
    router.push('/');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Content Generator</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">What would you like to generate?</label>
            <Input
              type="text"
              placeholder="E.g., Generate a science worksheet about the water cycle for 4th grade"
              value={prompt}
              onChange={handlePromptChange}
              className="w-full"
            />
          </div>

          {showSelectionPrompt && (
            <Alert className="mb-4">
              <p>Please select the following required options:</p>
              {!subject && (
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-2">Subject Area:</label>
                  <Select
                    value={subject || ''}
                    onValueChange={(value) => {
                      setSubject(value as Subject);
                      setShowSelectionPrompt(false);
                    }}
                  >
                    <option value="">Select a subject</option>
                    <option value="math">Math</option>
                    <option value="reading">Reading</option>
                    <option value="science">Science</option>
                  </Select>
                </div>
              )}
              {!resourceType && (
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-2">Resource Type:</label>
                  <Select
                    value={resourceType || ''}
                    onValueChange={(value) => {
                      setResourceType(value as ResourceType);
                      setShowSelectionPrompt(false);
                    }}
                  >
                    <option value="">Select a resource type</option>
                    <option value="worksheet">Worksheet</option>
                    <option value="quiz">Quiz</option>
                    <option value="exit_slip">Exit Slip / Bell Ringer</option>
                    <option value="lesson_plan">Lesson Plan</option>
                    <option value="rubric">Rubric</option>
                  </Select>
                </div>
              )}
            </Alert>
          )}
          
          {subject && (
            <Tabs value={subject} onValueChange={(value: any) => setSubject(value)}>
              <TabsList className="mb-4">
                <TabsTrigger value="math">Math</TabsTrigger>
                <TabsTrigger value="reading">Reading</TabsTrigger>
                <TabsTrigger value="science">Science</TabsTrigger>
              </TabsList>
              {!subject && (
                <div className="text-sm text-red-500 mt-1">Please select a subject</div>
              )}

              <div className="space-y-6">
                {subject === 'math' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Topic</label>
                    <Select
                      value={topic}
                      onValueChange={(value) => setTopic(value)}
                    >
                      <option value="arithmetic">Arithmetic</option>
                      <option value="algebra">Algebra</option>
                      <option value="geometry">Geometry</option>
                      <option value="wordProblems">Word Problems</option>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Grade Level</label>
                  <Slider
                    value={[grade]}
                    min={1}
                    max={12}
                    step={1}
                    onValueChange={([value]) => setGrade(value)}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500 mt-1">Grade {grade}</div>
                  {!grade && (
                    <div className="text-sm text-red-500 mt-1">Please select a grade</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Number of Problems</label>
                  <Slider
                    value={[problemCount]}
                    min={3}
                    max={10}
                    step={1}
                    onValueChange={([value]) => setProblemCount(value)}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-500 mt-1">{problemCount} problems</div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Include Questions</label>
                  <Switch
                    checked={options.includeQuestions}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeQuestions: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Include Visuals</label>
                  <Switch
                    checked={options.includeVisuals}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, includeVisuals: checked }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <Select
                    value={options.difficulty}
                    onValueChange={(value) =>
                      setOptions((prev) => ({ ...prev, difficulty: value }))
                    }
                  >
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </div>
              </div>
            </Tabs>
          )}

          <div className="mt-6 flex justify-end space-x-4">
            <Button onClick={handleBackToSettings} variant="outline">
              Back
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !subject || !resourceType}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Card>

      {streamingContent && (
        <Card className="p-6">
          <div ref={contentRef} className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: streamingContent }} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleDownloadPDF} variant="outline">
              Download PDF
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
} 