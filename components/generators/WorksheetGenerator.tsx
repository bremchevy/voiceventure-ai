import { useState } from 'react';
import { BaseGeneratorProps, WorksheetSettings } from '@/lib/types/generator-types';
import { WorksheetResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { themeEmojis } from '@/lib/constants/theme-emojis';

interface ResourceFormat {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

type ResourceFormats = {
  [subject: string]: {
    [K in WorksheetSettings['resourceType']]: ResourceFormat[];
  };
};

export function WorksheetGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<WorksheetSettings>({
    grade: "3rd Grade",
    subject: "Math",
    theme: "General",
    problemCount: 10,
    topicArea: "",
    resourceType: "worksheet",
    format: "standard"
  });

  // Subject-specific formats
  const resourceFormats: ResourceFormats = {
    Math: {
      worksheet: [
        { 
          id: "standard", 
          icon: "📝", 
          name: "Standard", 
          desc: "Traditional worksheet with problems and answer spaces" 
        },
        { 
          id: "guided", 
          icon: "📖", 
          name: "Guided Practice", 
          desc: "Step-by-step problem solving with hints" 
        },
        { 
          id: "interactive", 
          icon: "✏️", 
          name: "Interactive", 
          desc: "Hands-on math activities and manipulatives" 
        }
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
    },
    Reading: {
      worksheet: [
        {
          id: "comprehension",
          icon: "📚",
          name: "Reading Comprehension",
          desc: "Passage analysis with main idea, details, and inference questions"
        },
        {
          id: "vocabulary_context",
          icon: "📖",
          name: "Vocabulary in Context",
          desc: "Word meaning, usage, and contextual understanding"
        }
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
    },
    Science: {
      worksheet: [
        {
          id: "lab_experiment",
          icon: "🔬",
          name: "Science Context",
          desc: "Topic-based questions with varying complexity levels"
        },
        {
          id: "observation_analysis",
          icon: "🔬",
          name: "Observation & Analysis",
          desc: "Scientific observations, diagrams, and explanations"
        }
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
    }
  };

  const renderSpecificSettings = () => (
    <div className="space-y-6">
      {/* Resource Format Selection */}
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Format</label>
        <div className="grid grid-cols-1 gap-3">
          {resourceFormats[settings.subject]?.worksheet?.map((format: ResourceFormat) => (
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

      {/* Number of Questions */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium text-gray-700">Number of Questions</Label>
          <span className="text-sm text-gray-500">{settings.problemCount}</span>
        </div>
        <Slider
          value={[settings.problemCount]}
          onValueChange={(value) => setSettings(prev => ({ ...prev, problemCount: value[0] }))}
          max={20}
          min={0}
          step={1}
          className="w-full"
        />
        {settings.problemCount === 0 && (
          <p className="text-sm text-gray-500 italic">
            No questions will be generated. This is useful for reading passages, observation sheets, or other content-only resources.
          </p>
        )}
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