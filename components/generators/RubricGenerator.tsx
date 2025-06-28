import { useState } from 'react';
import { BaseGeneratorProps, RubricSettings } from '@/lib/types/generator-types';
import { RubricResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';

export function RubricGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<RubricSettings>({
    grade: "3rd Grade",
    subject: "Math",
    theme: "General",
    rubricStyle: "4-point",
    rubricCriteria: ["Content", "Organization", "Grammar"],
    topicArea: "",
  });

  const rubricStyles = [
    { 
      type: "4-point", 
      label: "4-Point Scale", 
      desc: "Excellent, Good, Satisfactory, Needs Improvement" 
    },
    { 
      type: "3-point", 
      label: "3-Point Scale", 
      desc: "Exceeds, Meets, Below Expectations" 
    },
    { 
      type: "checklist", 
      label: "Checklist Style", 
      desc: "Simple yes/no criteria" 
    },
  ];

  const renderSpecificSettings = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Rubric Style</label>
      <div className="space-y-2">
        {rubricStyles.map((style) => (
          <button
            key={style.type}
            onClick={() => setSettings((prev) => ({ ...prev, rubricStyle: style.type as RubricSettings['rubricStyle'] }))}
            className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
              settings.rubricStyle === style.type
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="font-medium">{style.label}</div>
            <div className="text-xs text-gray-500">{style.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ResourceGenerator<RubricSettings, RubricResource>
      type="rubric"
      settings={settings}
      setSettings={setSettings}
      onBack={onBack}
      onComplete={onComplete}
      request={request}
      renderSpecificSettings={renderSpecificSettings}
      icon="📋"
      title="Rubric Generator"
    />
  );
} 