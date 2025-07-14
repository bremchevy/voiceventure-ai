import { FormatHandler } from '../types/format-handlers';
import { WorksheetResource, MathProblem } from '../types/resource';

// Helper function to render visual aid
const renderVisualAid = (visualAid: { type: 'shape' | 'graph' | 'diagram'; data: any }) => {
  // For now, just return the data as a string. You may want to implement specific rendering logic based on type
  return visualAid.data.toString();
};

// Standard format handler
const standardHandler: FormatHandler = {
  transform: (response: any): WorksheetResource => {
    // Preserve the original theme from the request payload
    const theme = response.theme || response.requestPayload?.theme;
    
    const problems = response.problems?.map((p: any): MathProblem => ({
      type: 'standard',
      question: p.question || p.problem || '',
      answer: p.answer || p.solution || '',
      explanation: p.explanation || '',
      visualAid: p.visualAid || undefined,
      hints: p.hints || undefined,
      steps: p.steps || undefined,
      thinking_points: p.thinking_points || undefined
    })) || [];
    
    return {
      resourceType: 'worksheet',
      title: response.title || '',
      grade_level: response.grade_level || '',
      subject: response.subject || 'Math',
      topic: response.topic || '',
      theme,
      format: 'standard',
      instructions: response.instructions || 'Solve each problem and show your work. Include units in your answers where applicable.',
      problems
    };
  },

  preview: (resource: WorksheetResource) => {
    return (
      <div className="space-y-6">
        {(resource.problems as MathProblem[])?.map((problem, index) => (
          <div key={index} className="border rounded-lg shadow-sm p-6 space-y-4 bg-white">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="font-semibold text-purple-700">{index + 1}</span>
              </div>
              <div className="flex-1 space-y-3">
                <p className="font-medium text-gray-800">{problem.question}</p>
                {problem.visualAid && (
                  <div className="mt-2">
                    <img src={renderVisualAid(problem.visualAid)} alt="Problem visual aid" className="max-w-full h-auto" />
                  </div>
                )}
                <div className="border-b border-dashed border-gray-300 pt-4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },

  generatePDF: (resource: WorksheetResource): string => {
    let content = '';

    // Add problems section
    if (resource.problems && resource.problems.length > 0) {
      const mathProblems = resource.problems as MathProblem[];
      content += `
        <div class="section">
          <div class="section-title">Practice Problems</div>
          ${mathProblems.map((problem, index) => `
            <div class="problem" style="margin: 25px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-weight: 600; color: #374151; min-width: 30px;">${index + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; color: #111827; margin-bottom: 12px;">
                    ${problem.question}
                  </div>
                  ${problem.visualAid ? `
                    <div style="margin: 15px 0;">
                      <img src="${renderVisualAid(problem.visualAid)}" alt="Problem visual aid" style="max-width: 100%; height: auto;" />
                    </div>
                  ` : ''}
                  <div class="answer-space"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="page-break-before: always;" class="section">
          <div class="section-title">Answer Key</div>
          ${mathProblems.map((problem, index) => `
            <div style="margin-bottom: 20px; padding: 15px; border-left: 3px solid #16a34a; background-color: #f0fdf4;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-weight: 600; color: #16a34a; min-width: 30px;">${index + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; color: #374151; margin-bottom: 8px;">
                    ${problem.question}
                  </div>
                  <div style="color: #16a34a;">
                    <strong>Answer:</strong> ${problem.answer}
                  </div>
                  ${problem.explanation ? `
                    <div style="color: #059669; margin-top: 8px;">
                      <strong>Explanation:</strong> ${problem.explanation}
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return content;
  }
};

// Guided format handler
const guidedHandler: FormatHandler = {
  transform: (response: any): WorksheetResource => {
    // Preserve the original theme from the request payload
    const theme = response.theme || response.requestPayload?.theme;
    
    const problems = response.problems?.map((p: any): MathProblem => ({
      type: 'guided',
      question: p.question || p.problem || '',
      answer: p.answer || p.solution || '',
      explanation: p.explanation || '',
      visualAid: p.visualAid || undefined,
      hints: p.hints || undefined,
      steps: p.steps || undefined,
      thinking_points: p.thinking_points || undefined
    })) || [];
    
    return {
      resourceType: 'worksheet',
      title: response.title || '',
      grade_level: response.grade_level || '',
      subject: response.subject || 'Math',
      topic: response.topic || '',
      theme,
      format: 'guided',
      instructions: response.instructions || 'Follow the step-by-step guidance for each problem. Show your work at each step.',
      problems
    };
  },

  preview: (resource: WorksheetResource) => {
    return (
      <div className="space-y-6">
        {(resource.problems as MathProblem[])?.map((problem, index) => (
          <div key={index} className="border rounded-lg shadow-sm p-6 space-y-4 bg-white">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="font-semibold text-purple-700">{index + 1}</span>
              </div>
              <div className="flex-1 space-y-4">
                <p className="font-medium text-gray-800">{problem.question}</p>
                
                {problem.visualAid && (
                  <div className="mt-2">
                    <img src={renderVisualAid(problem.visualAid)} alt="Problem visual aid" className="max-w-full h-auto" />
                  </div>
                )}

                {problem.steps && problem.steps.length > 0 && (
                  <div className="pl-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Steps:</h4>
                    <ol className="list-decimal pl-5 space-y-2">
                      {problem.steps.map((step: string, stepIdx: number) => (
                        <li key={stepIdx} className="text-gray-600">
                          {step}
                          <div className="border-b border-dashed border-gray-300 mt-2 mb-4"></div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {problem.hints && problem.hints.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-700 mb-2">Helpful Hints:</h4>
                    <ul className="list-disc pl-4 space-y-2">
                      {problem.hints.map((hint: string, hintIdx: number) => (
                        <li key={hintIdx} className="text-blue-600">{hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },

  generatePDF: (resource: WorksheetResource): string => {
    let content = '';

    // Add problems section
    if (resource.problems && resource.problems.length > 0) {
      const mathProblems = resource.problems as MathProblem[];
      content += `
        <div class="section">
          <div class="section-title">Guided Practice</div>
          ${mathProblems.map((problem, index) => `
            <div class="problem" style="margin: 25px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-weight: 600; color: #374151; min-width: 30px;">${index + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; color: #111827; margin-bottom: 12px;">
                    ${problem.question}
                  </div>
                  ${problem.visualAid ? `
                    <div style="margin: 15px 0;">
                      <img src="${renderVisualAid(problem.visualAid)}" alt="Problem visual aid" style="max-width: 100%; height: auto;" />
                    </div>
                  ` : ''}
                  ${problem.steps && problem.steps.length > 0 ? `
                    <div style="margin: 15px 0;">
                      <h4 style="font-weight: 500; color: #374151; margin-bottom: 8px;">Steps:</h4>
                      <ol style="list-style-type: decimal; padding-left: 20px;">
                        ${problem.steps.map((step: string) => `
                          <li style="color: #4b5563; margin-bottom: 8px;">
                            ${step}
                            <div style="border-bottom: 1px dashed #e5e7eb; margin: 10px 0;"></div>
                          </li>
                        `).join('')}
                      </ol>
                    </div>
                  ` : ''}
                  ${problem.hints && problem.hints.length > 0 ? `
                    <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                      <h4 style="font-weight: 500; color: #1e40af; margin-bottom: 8px;">Helpful Hints:</h4>
                      <ul style="list-style-type: disc; padding-left: 20px;">
                        ${problem.hints.map((hint: string) => `
                          <li style="color: #1e40af; margin-bottom: 4px;">${hint}</li>
                        `).join('')}
                      </ul>
                    </div>
                  ` : ''}
                  <div class="answer-space"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return content;
  }
};

export const mathFormats = {
  standard: standardHandler,
  guided: guidedHandler
}; 