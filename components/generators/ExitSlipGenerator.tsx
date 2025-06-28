import { useState, useEffect } from 'react';
import { BaseGeneratorProps, ExitSlipSettings } from '@/lib/types/generator-types';
import { ExitSlipResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';

export function ExitSlipGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<ExitSlipSettings>({
    grade: "3rd Grade",
    subject: "Math",
    theme: "General",
    exitSlipFormat: "multiple-choice",
    questionCount: 3,
    topicArea: "",
  });

  const exitSlipFormats = [
    { 
      type: "multiple-choice", 
      label: "Multiple Choice", 
      desc: "Quick selection questions",
      icon: "🔘" 
    },
    { 
      type: "open-response", 
      label: "Open Response", 
      desc: "Written reflection prompts",
      icon: "✏️" 
    },
    { 
      type: "rating-scale", 
      label: "Rating Scale", 
      desc: "1-5 understanding scale",
      icon: "⭐" 
    },
  ];

  const renderSpecificSettings = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Exit Slip Format</label>
      <div className="space-y-2">
        {exitSlipFormats.map((format) => (
          <button
            key={format.type}
            onClick={() => setSettings((prev) => ({ ...prev, exitSlipFormat: format.type as ExitSlipSettings['exitSlipFormat'] }))}
            className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-3 ${
              settings.exitSlipFormat === format.type
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
      type="exit slip"
      settings={settings}
      setSettings={setSettings}
      onBack={onBack}
      onComplete={onComplete}
      request={request}
      renderSpecificSettings={renderSpecificSettings}
      icon="🚪"
      title="Exit Slip Generator"
    />
  );
} 