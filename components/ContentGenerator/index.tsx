import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { generatePDF } from '@/lib/utils/pdf';
import { useRouter } from 'next/navigation';
import { CommandProcessor } from '@/lib/services/CommandProcessor';

interface GeneratorProps {
  onGenerate: (options: any) => Promise<void>;
  isGenerating: boolean;
  streamingContent: string;
}

export function ContentGenerator({ onGenerate, isGenerating, streamingContent }: GeneratorProps) {
  const [subject, setSubject] = useState<'math' | 'reading' | 'science'>('math');
  const [grade, setGrade] = useState(5);
  const [problemCount, setProblemCount] = useState(5);
  const [topic, setTopic] = useState('arithmetic');
  const [prompt, setPrompt] = useState('');
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
      
      // Only update subject if we have a high confidence match and explicit subject mention
      if (result.subject && result.confidence >= 0.9) {
        const subjectLower = result.subject.toLowerCase() as 'math' | 'reading' | 'science';
        // Additional validation to ensure it's one of our supported subjects
        if (['math', 'reading', 'science'].includes(subjectLower)) {
          setSubject(subjectLower);
        }
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
        // Update problem count if explicitly specified
        if (result.specifications.problemCount) {
          setProblemCount(result.specifications.problemCount);
        }
        
        // Update difficulty if specified
        if (result.specifications.difficulty) {
          setOptions(prev => ({ ...prev, difficulty: result.specifications.difficulty }));
        }
        
        // Update topic if specified and matches current subject
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
      grade,
      prompt, // Include the original prompt
      ...subjectOptions[subject],
    });
  }, [subject, grade, options, problemCount, topic, prompt, onGenerate]);

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
          
          <Tabs value={subject} onValueChange={(value: any) => setSubject(value)}>
            <TabsList className="mb-4">
              <TabsTrigger value="math">Math</TabsTrigger>
              <TabsTrigger value="reading">Reading</TabsTrigger>
              <TabsTrigger value="science">Science</TabsTrigger>
            </TabsList>

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

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Content'}
              </Button>
            </div>
          </Tabs>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">Generated Content</h3>
          <div 
            ref={contentRef}
            className="whitespace-pre-wrap min-h-[200px] p-4 bg-gray-50 rounded-lg mb-4"
          >
            {streamingContent || 'Content will appear here...'}
          </div>
          
          {streamingContent && (
            <div className="flex gap-4 mt-4">
              <Button onClick={handleBackToSettings} variant="outline">
                Back to Settings
              </Button>
              <Button onClick={handleDownloadPDF}>
                Download PDF
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 