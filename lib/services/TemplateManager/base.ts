import { Template, TemplateRenderOptions, TemplateSection, TemplateStyles } from './types';
import { mathWorksheetTemplate, scienceWorksheetTemplate, readingWorksheetTemplate } from './templates';

export class TemplateManager {
  private templates: Map<string, Template> = new Map();
  private defaultStyles: TemplateStyles = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    headerStyle: 'font-size: 24px; font-weight: bold;',
    bodyStyle: 'line-height: 1.6;',
    accentColor: '#007bff',
  };

  constructor(templates: Template[] = []) {
    // Register default templates
    this.registerTemplate(mathWorksheetTemplate);
    this.registerTemplate(scienceWorksheetTemplate);
    this.registerTemplate(readingWorksheetTemplate);
    
    // Register any additional templates
    templates.forEach(template => this.registerTemplate(template));
  }

  registerTemplate(template: Template): void {
    if (this.templates.has(template.id)) {
      throw new Error(`Template with ID ${template.id} already exists`);
    }
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): Template {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }
    return template;
  }

  async renderTemplate(templateId: string, options: TemplateRenderOptions): Promise<string> {
    console.log('🎨 Rendering template:', templateId);
    console.log('📝 Template data:', JSON.stringify(options.data, null, 2));

    const template = this.getTemplate(templateId);
    const styles = { ...this.defaultStyles, ...template.styles, ...options.styles };
    
    // Generate HTML
    try {
      const html = this.generateHTML(template, styles, options.data);
      console.log('✅ Template rendered successfully');
      return html;
    } catch (error) {
      console.error('❌ Error rendering template:', error);
      throw error;
    }
  }

  private generateHTML(
    template: Template,
    styles: TemplateStyles,
    data: any
  ): string {
    const styleSheet = this.generateStyleSheet(styles);
    const decorations = this.renderDecorations(data.decorations || []);
    const content = this.renderContent(template, data);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>${styleSheet}</style>
        </head>
        <body>
          <div class="template-container">
            ${decorations}
            ${content}
          </div>
        </body>
      </html>
    `;
  }

  private generateStyleSheet(styles: TemplateStyles): string {
    return `
      .template-container {
        font-family: ${styles.fontFamily};
        font-size: ${styles.fontSize};
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      .decorations {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-bottom: 20px;
        font-size: 24px;
      }
      .decoration {
        display: inline-block;
        padding: 5px;
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
      }
      .header h1 {
        ${styles.headerStyle}
        color: ${styles.accentColor};
        margin-bottom: 20px;
      }
      .student-info {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
      }
      .instructions {
        margin-bottom: 30px;
      }
      .instructions h2 {
        color: ${styles.accentColor};
        font-size: 18px;
        margin-bottom: 10px;
      }
      .problems-container {
        ${styles.bodyStyle}
      }
      .problem {
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
      }
      .problem-number {
        background-color: ${styles.accentColor};
        color: white;
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        margin-right: 10px;
      }
      .problem-content {
        display: inline-block;
        font-family: monospace;
        font-size: 16px;
      }
      .problem-visual {
        margin-top: 10px;
        color: #666;
      }
      .answer-line {
        margin-top: 10px;
        border-bottom: 1px solid #ccc;
        padding: 5px 0;
      }
    `;
  }

  private renderDecorations(decorations: string[]): string {
    if (!decorations.length) return '';
    const decorationElements = decorations.map(d => `<span class="decoration">${d}</span>`).join('');
    return `<div class="decorations">${decorationElements}</div>`;
  }

  private renderContent(template: Template, data: any): string {
    // Header
    const header = `
      <div class="header">
        <h1>${data.title || 'Worksheet'}</h1>
        <div class="student-info">
          <span>Name: ________________</span>
          <span>Date: ________________</span>
        </div>
      </div>
    `;

    // Instructions
    const instructions = `
      <div class="instructions">
        <h2>📝 Instructions:</h2>
        <p>${data.instructions || ''}</p>
      </div>
    `;

    // Problems
    const problems = (data.problems || []).map((problem: any, index: number) => `
      <div class="problem">
        <span class="problem-number">${index + 1}</span>
        <div class="problem-content">
          <div>${problem.question}</div>
          ${problem.visual ? `<div class="problem-visual">${problem.visual}</div>` : ''}
          ${problem.steps ? `
            <div class="problem-steps">
              <p><strong>Steps:</strong></p>
              <ol>${problem.steps.map((step: string) => `<li>${step}</li>`).join('')}</ol>
            </div>
          ` : ''}
          <div class="answer-line">Answer: ________________</div>
        </div>
      </div>
    `).join('');

    return `
      ${header}
      ${instructions}
      <div class="problems-container">
        ${problems}
      </div>
    `;
  }
} 