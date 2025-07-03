import { useState } from 'react';
import { BaseGeneratorProps, ExitSlipSettings } from '@/lib/types/generator-types';
import { ExitSlipResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';

export function ExitSlipGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<ExitSlipSettings>({
    grade: request?.grade || "",
    subject: request?.subject || "Math",
    theme: request?.theme as 'Halloween' | 'Winter' | 'Spring' | 'General' || "General",
    format: "reflection_prompt",
    questionCount: 3,
    topicArea: request?.topicArea || "",
  });

  const exitSlipFormats = [
    { 
      type: "reflection_prompt", 
      label: "Reflection Prompt", 
      desc: "Open-ended reflection on learning",
      icon: "💭" 
    },
    { 
      type: "vocabulary_check", 
      label: "Vocabulary Check", 
      desc: "Key terms and definitions review",
      icon: "📚" 
    },
    { 
      type: "skill_assessment", 
      label: "Skill Assessment", 
      desc: "Quick check of specific skills",
      icon: "🎯" 
    }
  ];

  const renderSpecificSettings = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Format</label>
      <div className="space-y-2">
        {exitSlipFormats.map((format) => (
          <button
            key={format.type}
            onClick={() => setSettings((prev) => ({ ...prev, format: format.type as ExitSlipSettings['format'] }))}
            className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-3 ${
              settings.format === format.type
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <span>{format.icon}</span>
            <div>
              <div className="font-medium">{format.label}</div>
              <div className="text-xs text-gray-500">{format.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ResourceGenerator<ExitSlipSettings, ExitSlipResource>
      type="exit_slip"
      settings={settings}
      setSettings={setSettings}
      onBack={onBack}
      onComplete={onComplete}
      request={request}
      renderSpecificSettings={renderSpecificSettings}
      icon="🚪"
      title="Exit Slip / Bell Ringer"
    />
  );
} 