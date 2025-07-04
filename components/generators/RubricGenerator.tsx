import React from 'react';
import { BaseGeneratorProps, Subject, Format } from '@/lib/types/generator-types';
import { RubricResource } from '@/lib/types/resource';

interface RubricSettings {
  style: '4-point' | '3-point' | 'checklist';
  criteria: Array<{
    name: string;
    description: string;
  }>;
}

const generateLevels = (style: '4-point' | '3-point' | 'checklist', criterionName: string, criterionDescription: string) => {
  switch (style) {
    case 'checklist':
      return [
        {
          score: 1,
          description: `Demonstrates ${criterionName.toLowerCase()}: ${criterionDescription}`
        },
        {
          score: 0,
          description: `Does not demonstrate ${criterionName.toLowerCase()}: ${criterionDescription}`
        }
      ];
    case '3-point':
      return [
        {
          score: 3,
          description: `Exceeds Expectations: Demonstrates comprehensive ${criterionName.toLowerCase()} with exceptional clarity and depth`
        },
        {
          score: 2,
          description: `Meets Expectations: Shows good ${criterionName.toLowerCase()} with clear presentation and some detail`
        },
        {
          score: 1,
          description: `Below Expectations: Demonstrates basic ${criterionName.toLowerCase()} with limited presentation`
        }
      ];
    case '4-point':
      return [
        {
          score: 4,
          description: `Excellent: Demonstrates exceptional ${criterionName.toLowerCase()} with comprehensive detail and insight`
        },
        {
          score: 3,
          description: `Good: Shows thorough ${criterionName.toLowerCase()} with clear and detailed presentation`
        },
        {
          score: 2,
          description: `Satisfactory: Demonstrates basic ${criterionName.toLowerCase()} with some relevant details`
        },
        {
          score: 1,
          description: `Needs Improvement: Shows limited ${criterionName.toLowerCase()} with minimal or inaccurate details`
        }
      ];
  }
};

export function RubricGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = React.useState<RubricSettings>({
    style: "3-point",
    criteria: [
      { 
        name: "Content",
        description: "Understanding and presentation of content"
      },
      {
        name: "Organization",
        description: "Structure and flow of the presentation"
      },
      {
        name: "Critical Thinking",
        description: "Analysis and evaluation of concepts"
      }
    ]
  });

  const handleComplete = () => {
    if (!onComplete) return;

    const format = settings.style === '4-point' ? '4_point' : 
                  settings.style === '3-point' ? '3_point' : 
                  'checklist';

    const rubricResource: RubricResource = {
      resourceType: 'rubric',
      title: request?.theme ? `${request.theme} Rubric` : 'Assessment Rubric',
      subject: (request?.subject as Subject) || 'Math',
      grade_level: request?.grade || 'Any Grade',
      topic: request?.topicArea || 'General Assessment',
      format: format as Format,
      rubricStyle: settings.style,
      criteria: settings.criteria.map(criterion => ({
        name: criterion.name,
        description: criterion.description,
        levels: generateLevels(settings.style, criterion.name, criterion.description)
      }))
    };

    console.log("Generated rubric resource:", rubricResource);
    onComplete(rubricResource);
  };

  const rubricStyles = [
    { type: 'checklist', label: 'Checklist Format (✓/✗)', description: 'Simple yes/no criteria evaluation' },
    { type: '3-point', label: '3-Point Scale', description: 'Basic scale with three levels of achievement' },
    { type: '4-point', label: '4-Point Scale', description: 'Detailed scale with four levels of achievement' }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Select Rubric Style</h2>
        <div className="grid gap-3">
          {rubricStyles.map((style) => (
            <button
              key={style.type}
              onClick={() => setSettings(prev => ({ ...prev, style: style.type as RubricSettings['style'] }))}
              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                settings.style === style.type
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="font-medium">{style.label}</div>
              <div className="text-sm text-gray-500">{style.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-6">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        )}
        <button
          onClick={handleComplete}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Generate Rubric
        </button>
      </div>
    </div>
  );
} 