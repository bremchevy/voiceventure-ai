import { useState } from 'react';
import { BaseGeneratorProps, QuizSettings } from '@/lib/types/generator-types';
import { QuizResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';

export function QuizGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<QuizSettings>({
    grade: "3rd Grade",
    subject: "Math",
    theme: "General",
    questionCount: 10,
    selectedQuestionTypes: ["Multiple Choice"],
    topicArea: "",
  });

  const quizFormats = [
    { type: "Multiple Choice", icon: "🔘", desc: "Questions with multiple options" },
    { type: "True/False", icon: "⚖️", desc: "Binary choice questions" },
    { type: "Short Answer", icon: "✏️", desc: "Brief written responses" }
  ];

  const renderSpecificSettings = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Quiz Format</label>
      <div className="space-y-2">
        {quizFormats.map((format) => (
          <button
            key={format.type}
            onClick={() => {
              const newTypes = [format.type];
              setSettings((prev) => ({
                ...prev,
                selectedQuestionTypes: newTypes,
                questionCount: prev.questionCount || 5
              }));
            }}
            className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center justify-between ${
              settings.selectedQuestionTypes?.includes(format.type)
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{format.icon}</span>
              <div>
                <div className="font-medium">{format.type}</div>
                <div className="text-xs text-gray-500">{format.desc}</div>
              </div>
            </div>
            {settings.selectedQuestionTypes?.includes(format.type) && (
              <span className="text-purple-600">✓</span>
            )}
          </button>
        ))}
      </div>
      {(!settings.selectedQuestionTypes || settings.selectedQuestionTypes.length === 0) && (
        <p className="text-sm text-red-500 mt-2">Please select at least one quiz format</p>
      )}
    </div>
  );

  return (
    <ResourceGenerator<QuizSettings, QuizResource>
      type="quiz"
      settings={settings}
      setSettings={setSettings}
      onBack={onBack}
      onComplete={onComplete}
      request={request}
      renderSpecificSettings={renderSpecificSettings}
      icon="🧠"
      title="Quiz Generator"
    />
  );
} 