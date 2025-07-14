'use client';

import { WorksheetResource } from '@/lib/types/resource';

const halloweenWorksheet: WorksheetResource = {
  resourceType: 'worksheet',
  title: 'Fractions and Decimals Practice',
  subject: 'Math',
  grade_level: '3rd Grade',
  theme: 'Halloween',
  format: 'standard',
  topic: 'Fractions and Decimals',
  instructions: 'Solve each problem and include units in your answers where applicable.',
  problems: [
    {
      question: 'Convert 3/5 to a decimal.',
      answer: '0.6',
      explanation: 'Divide 3 by 5 to get 0.6'
    },
    {
      question: 'Convert 0.75 to a fraction.',
      answer: '3/4',
      explanation: '0.75 = 75/100 = 3/4 (simplified)'
    },
    {
      question: 'What is 2/8 as a decimal?',
      answer: '0.25',
      explanation: '2/8 = 1/4 = 0.25'
    }
  ]
};

export default function GeneratePage() {
  const handleGenerate = async () => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Math',
          grade: '3rd Grade',
          topic: 'Fractions and Decimals',
          resourceType: 'worksheet',
          theme: 'Halloween',
          format: 'standard',
          questionCount: 3,
          customInstructions: 'Make the problems Halloween-themed'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Generated worksheet:', data);
    } catch (error) {
      console.error('Error generating worksheet:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <button 
        onClick={handleGenerate}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
      >
        Generate Halloween Worksheet
      </button>
    </div>
  );
} 