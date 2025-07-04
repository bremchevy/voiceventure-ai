import { useState } from 'react';
import { BaseGeneratorProps, LessonPlanSettings, Format } from '@/lib/types/generator-types';
import { LessonPlanResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';
import { PDFService } from '@/lib/services/PDFService';

export function LessonPlanGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<LessonPlanSettings>({
    grade: "3rd Grade",
    subject: "Math",
    theme: "General",
    lessonType: "full-lesson",
    lessonDuration: "45 minutes",
    lessonObjectives: ["Students will understand", "Students will be able to"],
    topicArea: "",
    format: "full_lesson" as Format
  });

  const lessonTypes = [
    { 
      type: "full-lesson", 
      label: "Full Lesson", 
      desc: "Complete 45-60 minute lesson",
      icon: "📚",
      format: "full_lesson" as Format
    },
    { 
      type: "mini-lesson", 
      label: "Mini-Lesson", 
      desc: "Short 15-20 minute focused lesson",
      icon: "⚡",
      format: "mini_lesson" as Format
    },
    { 
      type: "activity", 
      label: "Activity", 
      desc: "Standalone learning activity",
      icon: "🎯",
      format: "activity" as Format
    },
  ];

  const renderSpecificSettings = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Lesson Type</label>
      <div className="space-y-2">
        {lessonTypes.map((type) => (
          <button
            key={type.type}
            onClick={() => setSettings((prev) => ({ 
              ...prev, 
              lessonType: type.type as LessonPlanSettings['lessonType'],
              format: type.format
            }))}
            className={`w-full p-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-3 ${
              settings.lessonType === type.type
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <span>{type.icon}</span>
            <div>
              <div className="font-medium">{type.label}</div>
              <div className="text-xs text-gray-500">{type.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const handleDownloadPDF = async (resource: LessonPlanResource) => {
    try {
      const pdfBuffer = await PDFService.generateFromResource(resource);
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      PDFService.downloadPDF(blob, `${resource.title.toLowerCase().replace(/\s+/g, '-')}-lesson-plan.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Handle error appropriately
    }
  };

  return (
    <ResourceGenerator<LessonPlanSettings, LessonPlanResource>
      type="lesson_plan"
      settings={settings}
      setSettings={setSettings}
      onBack={onBack}
      onComplete={onComplete}
      request={request}
      renderSpecificSettings={renderSpecificSettings}
      icon="📚"
      title="Lesson Plan Generator"
      onDownloadPDF={handleDownloadPDF}
    />
  );
} 