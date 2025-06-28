import { useState } from 'react';
import { BaseGeneratorProps, WorksheetSettings, themeEmojis } from '@/lib/types/generator-types';
import { WorksheetResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ResourceFormat {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

type ResourceFormats = {
  [K in WorksheetSettings['resourceType']]: ResourceFormat[];
};

export function WorksheetGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<WorksheetSettings>({
    grade: "3rd Grade",
    subject: "Math",
    theme: "General",
    problemType: "math",
    problemCount: 10,
    topicArea: "",
    resourceType: "worksheet",
    format: "standard"
  });

  // Resource type specific formats
  const resourceFormats: ResourceFormats = {
    worksheet: [
      { id: "standard", icon: "📝", name: "Standard", desc: "Traditional worksheet with problems and answer spaces" },
      { id: "guided", icon: "📖", name: "Guided Practice", desc: "Step-by-step problem solving with hints" },
      { id: "interactive", icon: "✏️", name: "Interactive", desc: "Engaging activities with manipulatives" }
    ],
    quiz: [
      { id: "short_answer", icon: "✍️", name: "Short Answer", desc: "Brief written responses" },
      { id: "true_false", icon: "✅", name: "True/False", desc: "Simple true or false questions" },
      { id: "mixed", icon: "🔄", name: "Mixed Format", desc: "Combination of different question types" }
    ],
    exit_slip: [
      { id: "multiple_choice", icon: "🔘", name: "Multiple Choice", desc: "Quick check with options" },
      { id: "open_response", icon: "📝", name: "Open Response", desc: "Written reflection on learning" },
      { id: "rating_scale", icon: "⭐", name: "Rating Scale", desc: "Self-assessment of understanding" }
    ],
    lesson_plan: [
      { id: "full_lesson", icon: "📚", name: "Full Lesson", desc: "Complete lesson with objectives, activities, and assessment" },
      { id: "mini_lesson", icon: "⚡", name: "Mini Lesson", desc: "Focused 15-20 minute instruction" },
      { id: "activity", icon: "🎯", name: "Activity", desc: "Hands-on learning experience" }
    ],
    rubric: [
      { id: "4_point", icon: "📊", name: "4-Point Scale", desc: "Detailed criteria with four performance levels" },
      { id: "3_point", icon: "🎯", name: "3-Point Scale", desc: "Simple criteria with three performance levels" },
      { id: "checklist", icon: "✅", name: "Checklist", desc: "Binary yes/no criteria evaluation" }
    ]
  };

  const problemTypes = [
    { type: "math", label: "Math", desc: "Addition, Subtraction, Mixed Operations" },
    { type: "language", label: "Language Arts", desc: "Spelling, Vocabulary, Reading Comprehension" },
    { type: "writing", label: "Writing", desc: "Sentence Writing, Handwriting Practice" },
    { type: "science", label: "Science", desc: "Labeling, Matching, Observation" },
    { type: "social", label: "Social Studies", desc: "Geography, History, Civics" }
  ];

  const renderSpecificSettings = () => (
    <div className="space-y-6">
      {/* Focus Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Focus Area</label>
        <div className="space-y-2">
          {problemTypes.map((category) => (
            <button
              key={category.type}
              onClick={() => setSettings((prev) => ({ ...prev, problemType: category.type }))}
              className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                settings.problemType === category.type
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="font-medium">{category.label}</div>
              <div className="text-xs text-gray-500">{category.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Include Vocabulary Section */}
      <div className="flex items-center space-x-2">
        <Switch
          id="vocabulary"
          checked={settings.includeVocabulary || false}
          onCheckedChange={(checked) => 
            setSettings((prev) => ({ ...prev, includeVocabulary: checked }))
          }
        />
        <Label htmlFor="vocabulary" className="text-sm font-medium text-gray-700">
          Include Vocabulary Section
        </Label>
      </div>

      {/* Resource Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Format</label>
        <div className="grid grid-cols-1 gap-3">
          {resourceFormats[settings.resourceType]?.map((format: ResourceFormat) => (
            <button
              key={format.id}
              onClick={() => setSettings((prev) => ({ ...prev, format: format.id }))}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center justify-between ${
                settings.format === format.id
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{format.icon}</span>
                <div>
                  <div className="font-medium">{format.name}</div>
                  <div className="text-xs text-gray-500">{format.desc}</div>
                </div>
              </div>
              {settings.format === format.id && (
                <span className="text-purple-600">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <ResourceGenerator<WorksheetSettings, WorksheetResource>
      type="worksheet"
      settings={settings}
      setSettings={setSettings}
      onBack={onBack}
      onComplete={onComplete}
      request={request}
      renderSpecificSettings={renderSpecificSettings}
      icon="📝"
      title="Worksheet Generator"
    />
  );
} 