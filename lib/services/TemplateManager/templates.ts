import { Template } from './types';

export const mathWorksheetTemplate: Template = {
  id: 'worksheet-math',
  name: 'Math Worksheet',
  description: 'Template for math practice worksheets',
  subject: 'math',
  type: 'worksheet',
  grade: [1, 2, 3, 4, 5],
  styles: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    headerStyle: 'font-size: 24px; font-weight: bold; text-align: center;',
    bodyStyle: 'line-height: 1.6;',
    accentColor: '#6366f1',
  }
};

export const scienceWorksheetTemplate: Template = {
  id: 'worksheet-science',
  name: 'Science Worksheet',
  description: 'Template for science worksheets and lab reports',
  subject: 'science',
  type: 'worksheet',
  grade: [1, 2, 3, 4, 5],
  styles: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    headerStyle: 'font-size: 24px; font-weight: bold; text-align: center;',
    bodyStyle: 'line-height: 1.6;',
    accentColor: '#10b981',
  }
};

export const readingWorksheetTemplate: Template = {
  id: 'worksheet-reading',
  name: 'Reading Worksheet',
  description: 'Template for reading comprehension worksheets',
  subject: 'reading',
  type: 'worksheet',
  grade: [1, 2, 3, 4, 5],
  styles: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    headerStyle: 'font-size: 24px; font-weight: bold; text-align: center;',
    bodyStyle: 'line-height: 1.6;',
    accentColor: '#f59e0b',
  }
}; 