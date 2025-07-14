import { FormatHandler } from '../types/format-handlers';
import { WorksheetResource, VocabularyProblem } from '../types/resource';

// Comprehension format handler
const comprehensionHandler: FormatHandler = {
  transform: (response: any): WorksheetResource => {
    // Preserve the original theme from the request payload
    const theme = response.theme || response.requestPayload?.theme;
    
    return {
      resourceType: 'worksheet',
      title: response.title || '',
      grade_level: response.grade_level || '',
      subject: response.subject || 'Reading',
      topic: response.topic || '',
      theme,
      format: 'comprehension',
      instructions: response.instructions || 'Read the passage carefully. Then, answer each question using evidence from the text to support your answers.',
      passage: response.passage,
      problems: response.problems?.map((p: any) => ({
        question: p.question || '',
        answer: p.answer || '',
        evidence_prompt: p.evidence_prompt || '',
        skill_focus: p.skill_focus || '',
        hints: p.hints || []
      })) || []
    };
  },

  preview: (resource: WorksheetResource) => {
    const problems = resource.problems as ReadingProblem[];
    return (
      <div className="space-y-6">
        {/* Passage Section */}
        {resource.passage && (
          <div className="space-y-2 border-l-4 border-purple-500 pl-4 bg-gray-50 p-4 rounded-r-lg">
            <h3 className="font-semibold">Reading Passage:</h3>
            <p className="whitespace-pre-wrap text-gray-800">
              {typeof resource.passage === 'string' ? resource.passage : resource.passage.text}
            </p>
            {typeof resource.passage === 'object' && resource.passage.target_words && (
              <div className="mt-4">
                <h4 className="font-medium text-sm text-gray-700">Target Words:</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {resource.passage.target_words.map((word, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-sm">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Questions Section */}
        {problems?.map((problem, index) => (
          <div key={index} className="border rounded-lg shadow-sm p-6 space-y-4 bg-white">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="font-semibold text-purple-700">{index + 1}</span>
              </div>
              <div className="flex-1 space-y-3">
                <p className="font-medium text-gray-800">{problem.question}</p>
                {problem.evidence_prompt && (
                  <p className="text-gray-600 italic">{problem.evidence_prompt}</p>
                )}
                {problem.skill_focus && (
                  <p className="text-sm text-purple-600">Skill Focus: {problem.skill_focus}</p>
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

    // Add passage section
    if (resource.passage) {
      const passage = resource.passage;
      const passageText = typeof passage === 'string' ? passage : passage.text;
      const targetWords = typeof passage === 'object' ? passage.target_words : null;

      content += `
        <div class="section">
          ${targetWords && targetWords.length > 0 ? `
            <div class="target-words" style="margin-bottom: 20px;">
              <strong>Target Vocabulary Words:</strong>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                ${targetWords.map(word => `
                  <span style="display: inline-block; padding: 4px 8px; background-color: #f0f9ff; border-radius: 4px; color: #1e40af;">${word}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="section-title">Reading Passage</div>
          <div class="passage-content" style="font-size: 16px; line-height: 1.8; margin: 15px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #6366f1;">
            ${passageText}
          </div>
        </div>
      `;
    }

    // Add questions section
    if (resource.problems && resource.problems.length > 0) {
      content += `
        <div class="section" style="margin-top: 30px;">
          <div class="section-title">Comprehension Questions</div>
          ${(resource.problems as ReadingProblem[]).map((problem, index) => `
            <div class="problem" style="margin: 25px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-weight: 600; color: #374151; min-width: 30px;">${index + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; color: #111827; margin-bottom: 12px;">
                    ${problem.question}
                  </div>
                  ${problem.evidence_prompt ? `
                    <div style="color: #4b5563; font-style: italic; margin-bottom: 12px;">
                      ${problem.evidence_prompt}
                    </div>
                  ` : ''}
                  ${problem.skill_focus ? `
                    <div style="color: #6366f1; font-size: 0.875rem; margin-bottom: 12px;">
                      Skill Focus: ${problem.skill_focus}
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
          ${(resource.problems as ReadingProblem[]).map((problem, index) => `
            <div style="margin-bottom: 20px; padding: 15px; border-left: 3px solid #16a34a; background-color: #f0fdf4;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-weight: 600; color: #16a34a; min-width: 30px;">${index + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; color: #374151; margin-bottom: 8px;">
                    ${problem.question}
                  </div>
                  <div style="color: #16a34a;">
                    Answer: ${problem.answer}
                  </div>
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

// Vocabulary context format handler
const vocabularyContextHandler: FormatHandler = {
  transform: (response: any): WorksheetResource => {
    // Preserve the original theme from the request payload
    const theme = response.theme || response.requestPayload?.theme;
    
    return {
      resourceType: 'worksheet',
      title: response.title || '',
      grade_level: response.grade_level || '',
      subject: response.subject || 'Reading',
      topic: response.topic || '',
      theme,
      format: 'vocabulary_context',
      instructions: response.instructions || 'Study each vocabulary word in context. Define the word, analyze its usage, and apply it in new contexts.',
      passage: response.passage,
      problems: response.problems?.map((p: any) => ({
        word: p.word || '',
        context: p.context || '',
        definition: p.definition || '',
        questions: p.questions?.map((q: any) => ({
          question: q.question || '',
          answer: q.answer || ''
        })) || [],
        application: p.application || ''
      })) as VocabularyProblem[]
    };
  },

  preview: (resource: WorksheetResource) => {
    const problems = resource.problems as VocabularyProblem[];
    return (
      <div className="space-y-6">
        {/* Passage Section */}
        {resource.passage && (
          <div className="space-y-2 border-l-4 border-purple-500 pl-4 bg-gray-50 p-4 rounded-r-lg">
            <h3 className="font-semibold">Text Passage:</h3>
            <p className="whitespace-pre-wrap text-gray-800">
              {typeof resource.passage === 'string' ? resource.passage : resource.passage.text}
            </p>
            {typeof resource.passage === 'object' && resource.passage.target_words && (
              <div className="mt-4">
                <h4 className="font-medium text-sm text-gray-700">Target Words:</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {resource.passage.target_words.map((word, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-sm">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vocabulary Words Section */}
        {problems?.map((problem, index) => (
          <div key={index} className="border rounded-lg shadow-sm p-6 space-y-4 bg-white">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="font-semibold text-purple-700">{index + 1}</span>
              </div>
              <div className="flex-1 space-y-4">
                <h3 className="font-semibold text-lg text-gray-900">Word: {problem.word}</h3>
                
                {problem.context && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Context:</h4>
                    <p className="text-gray-600 italic">"{problem.context}"</p>
                  </div>
                )}

                {problem.definition && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm text-blue-700 mb-2">Definition:</h4>
                    <p className="text-blue-600">{problem.definition}</p>
                  </div>
                )}

                {problem.questions?.map((q: { question: string; answer: string }, qIndex) => (
                  <div key={qIndex} className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm text-purple-700 mb-2">Practice:</h4>
                    <p className="text-purple-600">{q.question}</p>
                    <div className="border-b border-dashed border-purple-300 mt-4"></div>
                  </div>
                ))}

                {problem.application && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm text-green-700 mb-2">Application:</h4>
                    <p className="text-green-600">{problem.application}</p>
                    <div className="border-b border-dashed border-gray-300 mt-4"></div>
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
    const problems = resource.problems as VocabularyProblem[];
    let content = '';

    // Add passage section if available
    if (resource.passage) {
      const passage = resource.passage;
      const passageText = typeof passage === 'string' ? passage : passage.text;
      const targetWords = typeof passage === 'object' ? passage.target_words : null;

      content += `
        <div class="section">
          ${targetWords && targetWords.length > 0 ? `
            <div class="target-words" style="margin-bottom: 20px;">
              <strong>Target Vocabulary Words:</strong>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                ${targetWords.map(word => `
                  <span style="display: inline-block; padding: 4px 8px; background-color: #f0f9ff; border-radius: 4px; color: #1e40af;">${word}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="section-title">Text Passage</div>
          <div class="passage-content" style="font-size: 16px; line-height: 1.8; margin: 15px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #6366f1;">
            ${passageText}
          </div>
        </div>
      `;
    }

    // Add vocabulary section
    if (problems && problems.length > 0) {
      content += `
        <div class="section" style="margin-top: 30px;">
          <div class="section-title">Vocabulary Study</div>
          ${problems.map((problem, index) => `
            <div class="problem" style="margin: 25px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-weight: 600; color: #374151; min-width: 30px;">${index + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; color: #111827; margin-bottom: 12px; font-size: 1.125rem;">
                    Word: ${problem.word}
                  </div>

                  ${problem.context ? `
                    <div style="margin: 15px 0; padding: 12px; background-color: #f9fafb; border-radius: 6px;">
                      <div style="font-weight: 500; color: #4b5563; margin-bottom: 4px;">Context:</div>
                      <div style="color: #6b7280; font-style: italic;">"${problem.context}"</div>
                    </div>
                  ` : ''}

                  ${problem.definition ? `
                    <div style="margin: 15px 0; padding: 12px; background-color: #eff6ff; border-radius: 6px;">
                      <div style="font-weight: 500; color: #1e40af; margin-bottom: 4px;">Definition:</div>
                      <div style="color: #3b82f6;">${problem.definition}</div>
                    </div>
                  ` : ''}

                  ${problem.questions?.map((q, qIndex) => `
                    <div style="margin: 15px 0; padding: 12px; background-color: #f5f3ff; border-radius: 6px;">
                      <div style="font-weight: 500; color: #5b21b6; margin-bottom: 4px;">Practice:</div>
                      <div style="color: #6d28d9;">${q.question}</div>
                      <div style="border-bottom: 2px dashed #ddd1f7; margin-top: 12px;"></div>
                    </div>
                  `).join('')}

                  ${problem.application ? `
                    <div style="margin: 15px 0; padding: 12px; background-color: #ecfdf5; border-radius: 6px;">
                      <div style="font-weight: 500; color: #065f46; margin-bottom: 4px;">Application:</div>
                      <div style="color: #059669;">${problem.application}</div>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="page-break-before: always;" class="section">
          <div class="section-title">Answer Key</div>
          ${problems.map((problem, index) => `
            <div style="margin-bottom: 20px; padding: 15px; border-left: 3px solid #16a34a; background-color: #f0fdf4;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-weight: 600; color: #16a34a; min-width: 30px;">${index + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">
                    Word: ${problem.word}
                  </div>
                  ${problem.questions?.map((q, qIndex) => `
                    <div style="margin: 8px 0;">
                      <div style="color: #374151;">Question: ${q.question}</div>
                      <div style="color: #16a34a;">Answer: ${q.answer}</div>
                    </div>
                  `).join('')}
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

// Literary analysis format handler
const literaryAnalysisHandler: FormatHandler = {
  transform: (response: any): WorksheetResource => {
    // Preserve the original theme from the request payload
    const theme = response.theme || response.requestPayload?.theme;
    
    return {
      resourceType: 'worksheet',
      title: response.title || '',
      grade_level: response.grade_level || '',
      subject: response.subject || 'Reading',
      topic: response.topic || '',
      theme,
      format: 'literary_analysis',
      instructions: response.instructions || 'Analyze the passage focusing on the literary elements. Support your analysis with specific evidence from the text.',
      passage: response.passage,
      problems: response.problems?.map((p: any) => ({
        question: p.question || '',
        answer: p.answer || '',
        literary_element: p.literary_element || '',
        evidence_prompt: p.evidence_prompt || '',
        analysis_points: p.analysis_points || []
      })) || []
    };
  },

  preview: (resource: WorksheetResource) => {
    return (
      <div className="space-y-6">
        {/* Passage Section */}
        {resource.passage && (
          <div className="space-y-2 border-l-4 border-purple-500 pl-4 bg-gray-50 p-4 rounded-r-lg">
            <h3 className="font-semibold">Literary Passage:</h3>
            <p className="whitespace-pre-wrap text-gray-800">
              {typeof resource.passage === 'string' ? resource.passage : resource.passage.text}
            </p>
          </div>
        )}

        {/* Analysis Questions Section */}
        {resource.problems?.map((problem, index) => (
          <div key={index} className="border rounded-lg shadow-sm p-6 space-y-4 bg-white">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="font-semibold text-purple-700">{index + 1}</span>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-800">{problem.question}</h3>
                  {problem.literary_element && (
                    <p className="text-sm text-purple-600 mt-1">
                      Literary Element: {problem.literary_element}
                    </p>
                  )}
                </div>

                {problem.evidence_prompt && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 italic">{problem.evidence_prompt}</p>
                  </div>
                )}

                {problem.analysis_points && problem.analysis_points.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm text-blue-700 mb-2">Analysis Points:</h4>
                    <ul className="list-disc pl-4 space-y-2">
                      {problem.analysis_points.map((point: string, idx: number) => (
                        <li key={idx} className="text-blue-600">{point}</li>
                      ))}
                    </ul>
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

    // Add passage section
    if (resource.passage) {
      const passage = resource.passage;
      const passageText = typeof passage === 'string' ? passage : passage.text;

      content += `
        <div class="section">
          <div class="section-title">Literary Passage</div>
          <div class="passage-content" style="font-size: 16px; line-height: 1.8; margin: 15px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #6366f1;">
            ${passageText}
          </div>
        </div>
      `;
    }

    // Add analysis questions section
    if (resource.problems && resource.problems.length > 0) {
      content += `
        <div class="section" style="margin-top: 30px;">
          <div class="section-title">Literary Analysis</div>
          ${resource.problems.map((problem, index) => `
            <div class="problem" style="margin: 25px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-weight: 600; color: #374151; min-width: 30px;">${index + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; color: #111827; margin-bottom: 12px;">
                    ${problem.question}
                  </div>
                  
                  ${problem.literary_element ? `
                    <div style="color: #6366f1; font-size: 0.875rem; margin-bottom: 12px;">
                      Literary Element: ${problem.literary_element}
                    </div>
                  ` : ''}

                  ${problem.evidence_prompt ? `
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 6px;">
                      <p style="color: #4b5563; font-style: italic; line-height: 1.6;">
                        ${problem.evidence_prompt}
                      </p>
                    </div>
                  ` : ''}

                  ${problem.analysis_points && problem.analysis_points.length > 0 ? `
                    <div style="margin-bottom: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 6px;">
                      <strong style="color: #1e40af;">Consider these points:</strong>
                      <ul style="margin-top: 8px; padding-left: 20px; list-style-type: disc;">
                        ${problem.analysis_points.map(point => `
                          <li style="color: #1e40af; margin-bottom: 4px;">${point}</li>
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

        <div style="page-break-before: always;" class="section">
          <div class="section-title">Answer Key</div>
          ${resource.problems.map((problem, index) => `
            <div style="margin-bottom: 20px; padding: 15px; border-left: 3px solid #16a34a; background-color: #f0fdf4;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-weight: 600; color: #16a34a; min-width: 30px;">${index + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; color: #374151; margin-bottom: 8px;">
                    ${problem.question}
                  </div>
                  <div style="color: #16a34a;">
                    <strong>Analysis:</strong> ${problem.answer}
                  </div>
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

// Export all reading format handlers
export const readingFormats = {
  comprehension: comprehensionHandler,
  vocabulary_context: vocabularyContextHandler,
  literary_analysis: literaryAnalysisHandler
}; 