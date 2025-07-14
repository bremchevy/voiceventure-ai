import { FormatHandler } from '../types/format-handlers';
import { WorksheetResource } from '../types/resource';
import { generateScienceWorksheetContent } from '../utils/science-worksheet';

// Science format handlers
const scienceContext: FormatHandler = {
  transform: (response: any): WorksheetResource => {
    // Handle both direct and nested response structures
    const scienceData = response.science_context || response;
    // Preserve the original theme from the request payload
    const theme = response.theme || response.requestPayload?.theme;
    
    return {
      resourceType: 'worksheet',
      subject: 'Science',
      format: 'science_context',
      title: response.title || 'Science Context Worksheet',
      grade_level: response.grade_level || '',
      theme,
      science_context: {
        topic: scienceData.topic || '',
        explanation: scienceData.explanation || '',
        key_concepts: scienceData.key_concepts || [],
        key_terms: scienceData.key_terms || {},
        applications: scienceData.applications || [],
        problems: scienceData.problems || []
      }
    };
  },
  preview: (resource: WorksheetResource) => {
    return <div dangerouslySetInnerHTML={{ __html: generateScienceWorksheetContent(resource) }} />;
  },
  generatePDF: (resource: WorksheetResource): string => {
    return generateScienceWorksheetContent(resource);
  }
};

const analysisFormat: FormatHandler = {
  transform: (response: any): WorksheetResource => {
    // Extract content from response, handling potential nesting
    const content = response.content || response;
    // Preserve the original theme from the request payload
    const theme = response.theme || response.requestPayload?.theme;
    
    // Extract analysis content, handling both direct and nested structures
    const analysis_focus = content.analysis_focus || '';
    const critical_aspects = content.critical_aspects || '';
    const data_patterns = content.data_patterns || '';
    const implications = content.implications || '';
    const key_points = Array.isArray(content.key_points) ? content.key_points : [];
    
    return {
      resourceType: 'worksheet',
      subject: 'Science',
      format: 'analysis_focus',
      title: response.title || content.title || 'Science Analysis Worksheet',
      grade_level: response.grade_level || content.grade_level || '',
      theme,
      topic: response.topic || content.topic || '',
      analysis_content: {
        analysis_focus,
        critical_aspects,
        data_patterns,
        implications,
        key_points
      },
      problems: response.problems || content.problems || []
    };
  },
  preview: (resource: WorksheetResource) => {
    return <div dangerouslySetInnerHTML={{ __html: generateScienceWorksheetContent(resource) }} />;
  },
  generatePDF: (resource: WorksheetResource): string => {
    return generateScienceWorksheetContent(resource);
  }
};

const labExperiment: FormatHandler = {
  transform: (response: any): WorksheetResource => {
    // Preserve the original theme from the request payload
    const theme = response.theme || response.requestPayload?.theme;
    
    return {
      resourceType: 'worksheet',
      subject: 'Science',
      format: 'lab_experiment',
      title: response.title || 'Lab Experiment Worksheet',
      grade_level: response.grade_level || '',
      theme,
      experiment: response.experiment || {},
      materials: response.materials || [],
      procedure: response.procedure || []
    };
  },
  preview: (resource: WorksheetResource) => {
    return <div dangerouslySetInnerHTML={{ __html: generateScienceWorksheetContent(resource) }} />;
  },
  generatePDF: (resource: WorksheetResource): string => {
    return generateScienceWorksheetContent(resource);
  }
};

// Export format handlers
export const scienceFormats = {
  science_context: scienceContext,
  analysis_focus: analysisFormat,
  lab_experiment: labExperiment
}; 