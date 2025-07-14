import { WorksheetResource } from '../types/resource';

export const generateScienceWorksheetContent = (resource: WorksheetResource): string => {
  let content = '';

  // Add header section
  content += `
    <div style="margin-bottom: 20px;">
      <h1 style="text-align: center; font-size: 24px; margin-bottom: 10px;">${resource.title}</h1>
      <div style="text-align: center; color: #666;">
        <div>Subject: ${resource.subject}</div>
        <div>Grade Level: ${resource.grade_level}</div>
      </div>
    </div>
  `;

  // Handle analysis focus content
  if (resource.format === 'analysis_focus' && resource.analysis_content) {
    content += `
      <div style="margin: 20px 0;">
        <div style="margin-bottom: 20px;">
          <h3 style="font-weight: bold; color: #2563eb; margin-bottom: 10px;">Analysis Focus</h3>
          <p style="line-height: 1.6;">${resource.analysis_content.analysis_focus}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-weight: bold; color: #2563eb; margin-bottom: 10px;">Critical Aspects</h3>
          <p style="line-height: 1.6;">${resource.analysis_content.critical_aspects}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-weight: bold; color: #2563eb; margin-bottom: 10px;">Data Patterns</h3>
          <p style="line-height: 1.6;">${resource.analysis_content.data_patterns}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-weight: bold; color: #2563eb; margin-bottom: 10px;">Key Points</h3>
          <ul style="list-style-type: disc; padding-left: 20px;">
            ${resource.analysis_content.key_points.map(point => `
              <li style="margin-bottom: 8px; line-height: 1.6;">${point}</li>
            `).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-weight: bold; color: #2563eb; margin-bottom: 10px;">Implications</h3>
          <p style="line-height: 1.6;">${resource.analysis_content.implications}</p>
        </div>
      </div>
    `;
  }

  // Handle science context content
  if (resource.format === 'science_context' && resource.science_context) {
    const { explanation, key_concepts = [], applications = [], key_terms, problems = [] } = resource.science_context;
    
    content += `
      <div style="margin: 20px 0;">
        <div style="margin-bottom: 20px;">
          <h3 style="font-weight: bold; margin-bottom: 10px;">Introduction</h3>
          <p style="line-height: 1.6;">${explanation}</p>
        </div>

        ${key_concepts.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h3 style="font-weight: bold; margin-bottom: 10px;">Key Concepts</h3>
            <ul style="list-style-type: disc; padding-left: 20px;">
              ${key_concepts.map(concept => `
                <li style="margin-bottom: 8px; line-height: 1.6;">${concept}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${key_terms ? `
          <div style="margin-bottom: 20px;">
            <h3 style="font-weight: bold; margin-bottom: 10px;">Key Terms</h3>
            ${Object.entries(key_terms).map(([term, definition]) => `
              <div style="margin-bottom: 10px;">
                <strong>${term}:</strong> ${definition}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${applications.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h3 style="font-weight: bold; margin-bottom: 10px;">Applications</h3>
            <ul style="list-style-type: disc; padding-left: 20px;">
              ${applications.map(app => `
                <li style="margin-bottom: 8px; line-height: 1.6;">${app}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${problems.length > 0 ? `
          <div style="margin-top: 30px;">
            <h3 style="font-weight: bold; margin-bottom: 15px;">Questions</h3>
            ${problems.map((problem, index) => `
              <div style="margin-bottom: 25px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <div style="display: flex; gap: 10px; align-items: flex-start;">
                  <div style="font-weight: 600; color: #374151; min-width: 30px;">${index + 1}.</div>
                  <div style="flex: 1;">
                    <div style="font-weight: 500; color: #111827; margin-bottom: 12px;">
                      ${problem.question}
                    </div>
                    <div class="answer-space" style="margin: 15px 0;">
                      <div style="border-bottom: 1px solid #d1d5db; margin: 12px 0;"></div>
                      <div style="border-bottom: 1px solid #d1d5db; margin: 12px 0;"></div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  return content;
}; 