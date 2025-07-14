import { useState, useEffect } from 'react';
import { BaseGeneratorProps, ExitSlipSettings } from '@/lib/types/generator-types';
import { ExitSlipResource } from '@/lib/types/resource';
import { ResourceGenerator } from './ResourceGenerator';
import { PDFService } from '@/lib/services/PDFService';

export function ExitSlipGenerator({ onBack, onComplete, request }: BaseGeneratorProps) {
  const [settings, setSettings] = useState<ExitSlipSettings>({
    grade: "",
    subject: "",
    topicArea: "",
    resourceType: "exit_slip",
    format: "reflection_prompt",
    questionCount: 3
  });

  // Helper function to extract subject from text
  const extractSubject = (text: string): string => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('math') || /\b(addition|subtraction|multiplication|division|fraction|geometry|algebra)\b/i.test(text)) {
      return 'Math';
    }
    if (lowerText.includes('reading') || /\b(comprehension|vocabulary|story|text|book|literature|writing)\b/i.test(text)) {
      return 'Reading';
    }
    if (lowerText.includes('science') || /\b(experiment|lab|observation|hypothesis|scientific|biology|chemistry|physics)\b/i.test(text)) {
      return 'Science';
    }
    return 'Math'; // Default to Math if no subject is detected
  };

  // Helper function to extract grade from text
  const extractGrade = (text: string): string => {
    const gradeMatch = text.match(/\b(\d+)(st|nd|rd|th)?\s*grade\b/i);
    if (gradeMatch) {
      const gradeNum = gradeMatch[1];
      const suffix = ['1', '2', '3'].includes(gradeNum) ? 
        ['st', 'nd', 'rd'][parseInt(gradeNum) - 1] : 'th';
      return `${gradeNum}${suffix} Grade`;
    }
    if (text.toLowerCase().includes('kindergarten')) {
      return 'Kindergarten';
    }
    return '3rd Grade'; // Default to 3rd Grade if no grade is detected
  };

  // Helper function to infer best format from text
  const inferBestFormat = (text: string): ExitSlipSettings['format'] => {
    const lowerText = text.toLowerCase();
    if (/\b(reflect|reflection|think|thoughts|opinion|feel|understand)\b/i.test(lowerText)) {
      return 'reflection_prompt';
    }
    if (/\b(vocabulary|word|term|definition|meaning|concept)\b/i.test(lowerText)) {
      return 'vocabulary_check';
    }
    if (/\b(skill|ability|can do|demonstrate|show|practice)\b/i.test(lowerText)) {
      return 'skill_assessment';
    }
    return 'reflection_prompt'; // Default to reflection prompt
  };

  // Parse initial request if provided
  useEffect(() => {
    if (request) {
      // First, check if it looks like a JSON string
      if (typeof request === 'string' && request.trim().startsWith('{') && request.trim().endsWith('}')) {
        try {
          const parsedRequest = JSON.parse(request);
          setSettings(prev => ({
            ...prev,
            grade: parsedRequest.grade || extractGrade(parsedRequest.text) || prev.grade,
            subject: parsedRequest.subject || extractSubject(parsedRequest.text) || prev.subject,
            theme: parsedRequest.theme || prev.theme,
            format: parsedRequest.format || inferBestFormat(parsedRequest.text) || prev.format,
            topicArea: parsedRequest.topicArea || parsedRequest.text || prev.topicArea,
            questionCount: parsedRequest.questionCount || prev.questionCount
          }));
        } catch (e) {
          console.error('Error parsing JSON request:', e);
          // Fall back to text processing
          handleTextRequest(request);
        }
      } else if (typeof request === 'string') {
        // Process as plain text
        handleTextRequest(request);
      } else {
        // Handle object request (from BaseGeneratorProps type)
        setSettings(prev => ({
          ...prev,
          grade: request.grade || prev.grade,
          subject: request.subject || prev.subject,
          theme: (request.theme as ExitSlipSettings['theme']) || prev.theme,
          topicArea: request.topicArea || prev.topicArea,
          format: (request.format as ExitSlipSettings['format']) || prev.format
        }));
      }
    }
  }, [request]);

  // Function to handle text-based requests
  const handleTextRequest = (text: string) => {
    setSettings(prev => ({
      ...prev,
      grade: extractGrade(text),
      subject: extractSubject(text),
      topicArea: text,
      format: inferBestFormat(text)
    }));
  };

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

  const handleDownloadPDF = async (resource: ExitSlipResource) => {
    try {
      const pdfBuffer = await PDFService.generateFromResource(resource);
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      PDFService.downloadPDF(blob, `${resource.title.toLowerCase().replace(/\s+/g, '-')}-exit-slip.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Handle error appropriately
    }
  };

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
      onDownloadPDF={handleDownloadPDF}
    />
  );
} 